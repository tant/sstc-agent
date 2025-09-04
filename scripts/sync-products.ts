#!/usr/bin/env tsx

// Load environment variables at the very top
import dotenv from 'dotenv';
dotenv.config();

/**
 * SSTC Product Database Sync Script (Optimized)
 *
 * Features:
 * - Dynamically reads all .csv files from the data directory.
 * - Parses CSV files in parallel for improved performance.
 * - Uses LibSQL transactions for atomic and fast database writes.
 * - Enriched document creation for better ChromaDB semantic search.
 * - Refactored for better readability and maintainability.
 *
 * WARNING: This script will DELETE ALL existing product data and recreate it.
 */

import * as fs from 'fs/promises'; // Use promise-based fs
import path from 'path';
import csvParser from 'csv-parser';
import { createClient, type Client, type InValue } from '@libsql/client';
import { Readable } from 'stream';

// Import project modules
// We will create the chroma and embedder instances locally in main()
import { ChromaVector } from '@mastra/chroma';
import { createOpenAI } from '@ai-sdk/openai';

// --- CONFIGURATION ---

const DATA_DIR = path.join(process.cwd(), 'data');

// --- INTERFACES ---

// A comprehensive interface to hold all possible product fields from all CSVs.
interface ProductData {
  // Common fields
  SKU: string;
  'Tên sản phẩm': string;
  Model?: string;
  Giá?: string;
  Warranty?: string;
  Availability?: string;
  Rating?: string;
  Tags?: string;
  Image_URL?: string;
  'Comparison with Other Models'?: string;
  'Upsell Suggestions'?: string;
  'Sales Pitch'?: string;
  Bundles?: string;
  'Suitable Applications'?: string;

  // RAM specific
  'Ráp cho'?: string;
  'Loại sản phẩm'?: string;
  'Tương thích CPU'?: string;
  'Linked System Model'?: string;
  speed?: string;
  latency?: string;
  voltage?: string;
  form_factor?: string;
  ecc?: string;
  brand?: string;
  quantity?: string;
  channel?: string;
  USP?: string;
  'Recommended_Use'?: string;

  // SSD specific
  'Benchmark Score (Read/Write MB/s)'?: string;
  'Power Consumption (W)'?: string;

  // CPU specific
  TDP?: string;
  'Price per Performance'?: string;
  'Future Proofing'?: string;
  'Benchmarks (PassMark)'?: string;

  // Barebone specific
  'Power Supply (W)'?: string;

  // Desktop specific
  Level?: string;
  'System Model'?: string;
  'Barebone Linked SKU'?: string;
  'Linked SKU RAM'?: string;
  'Linked SKU SSD'?: string;
  'Giá Tổng'?: string;
  'Total Specs'?: string;
  'Performance Benchmark'?: string;
  'Customer Reviews/Rating'?: string;
  'Environmental Impact'?: string;
  'Benchmark Gaming (FPS)'?: string;
  'Weight/Dimensions'?: string;
  'Future Upgrade Path'?: string;
  'Noise Level (dB)'?: string;
  Weight?: string;
  Noise?: string;
}

// --- SCHEMA DEFINITION ---

/**
 * Single source of truth for the product database schema.
 * This drives the CREATE TABLE statement, INSERT statement, and data mapping.
 */
const PRODUCT_SCHEMA: { name: string; type: string; value: (p: ProductData) => InValue }[] = [
  { name: 'sku', type: 'TEXT PRIMARY KEY', value: (p) => p.SKU },
  { name: 'name', type: 'TEXT NOT NULL', value: (p) => p['Tên sản phẩm'] },
  { name: 'model', type: 'TEXT', value: (p) => p.Model ?? null },
  { name: 'price', type: 'REAL', value: (p) => (p.Giá ? parseFloat(p.Giá.replace(/[^\d.]/g, '')) : null) },
  { name: 'warranty', type: 'TEXT', value: (p) => p.Warranty ?? null },
  { name: 'availability', type: 'TEXT', value: (p) => p.Availability ?? null },
  { name: 'rating', type: 'TEXT', value: (p) => p.Rating ?? null },
  { name: 'tags', type: 'TEXT', value: (p) => p.Tags ?? null },
  { name: 'image_url', type: 'TEXT', value: (p) => p.Image_URL ?? null },
  { name: 'comparison_with_other_models', type: 'TEXT', value: (p) => p['Comparison with Other Models'] ?? null },
  { name: 'upsell_suggestions', type: 'TEXT', value: (p) => p['Upsell Suggestions'] ?? null },
  { name: 'sales_pitch', type: 'TEXT', value: (p) => p['Sales Pitch'] ?? null },
  { name: 'bundles', type: 'TEXT', value: (p) => p.Bundles ?? null },
  { name: 'suitable_applications', type: 'TEXT', value: (p) => p['Suitable Applications'] ?? null },
  { name: 'type', type: 'TEXT', value: (p) => p['Ráp cho'] ?? null },
  { name: 'category', type: 'TEXT', value: (p) => p['Loại sản phẩm'] ?? null },
  { name: 'compatible_cpu', type: 'TEXT', value: (p) => p['Tương thích CPU'] ?? null },
  { name: 'linked_system_model', type: 'TEXT', value: (p) => p['Linked System Model'] ?? null },
  { name: 'speed', type: 'TEXT', value: (p) => p.speed ?? null },
  { name: 'latency', type: 'TEXT', value: (p) => p.latency ?? null },
  { name: 'voltage', type: 'TEXT', value: (p) => p.voltage ?? null },
  { name: 'form_factor', type: 'TEXT', value: (p) => p.form_factor ?? null },
  { name: 'ecc', type: 'TEXT', value: (p) => p.ecc ?? null },
  { name: 'brand', type: 'TEXT', value: (p) => p.brand ?? null },
  { name: 'quantity', type: 'TEXT', value: (p) => p.quantity ?? null },
  { name: 'channel', type: 'TEXT', value: (p) => p.channel ?? null },
  { name: 'usp', type: 'TEXT', value: (p) => p.USP ?? null },
  { name: 'recommended_use', type: 'TEXT', value: (p) => p['Recommended_Use'] ?? null },
  { name: 'benchmark_score', type: 'TEXT', value: (p) => p['Benchmark Score (Read/Write MB/s)'] ?? null },
  { name: 'power_consumption', type: 'TEXT', value: (p) => p['Power Consumption (W)'] ?? null },
  { name: 'tdp', type: 'TEXT', value: (p) => p.TDP ?? null },
  { name: 'price_per_performance', type: 'TEXT', value: (p) => p['Price per Performance'] ?? null },
  { name: 'future_proofing', type: 'TEXT', value: (p) => p['Future Proofing'] ?? null },
  { name: 'benchmarks_passmark', type: 'TEXT', value: (p) => p['Benchmarks (PassMark)'] ?? null },
  { name: 'power_supply', type: 'TEXT', value: (p) => p['Power Supply (W)'] ?? null },
  { name: 'level', type: 'TEXT', value: (p) => p.Level ?? null },
  { name: 'system_model', type: 'TEXT', value: (p) => p['System Model'] ?? null },
  { name: 'barebone_linked_sku', type: 'TEXT', value: (p) => p['Barebone Linked SKU'] ?? null },
  { name: 'linked_sku_ram', type: 'TEXT', value: (p) => p['Linked SKU RAM'] ?? null },
  { name: 'linked_sku_ssd', type: 'TEXT', value: (p) => p['Linked SKU SSD'] ?? null },
  { name: 'gia_tong', type: 'REAL', value: (p) => (p['Giá Tổng'] ? parseFloat(p['Giá Tổng'].replace(/[^\d.]/g, '')) : null) },
  { name: 'total_specs', type: 'TEXT', value: (p) => p['Total Specs'] ?? null },
  { name: 'performance_benchmark', type: 'TEXT', value: (p) => p['Performance Benchmark'] ?? null },
  { name: 'customer_reviews_rating', type: 'TEXT', value: (p) => p['Customer Reviews/Rating'] ?? null },
  { name: 'environmental_impact', type: 'TEXT', value: (p) => p['Environmental Impact'] ?? null },
  { name: 'benchmark_gaming_fps', type: 'TEXT', value: (p) => p['Benchmark Gaming (FPS)'] ?? null },
  { name: 'weight_dimensions', type: 'TEXT', value: (p) => p['Weight/Dimensions'] ?? null },
  { name: 'future_upgrade_path', type: 'TEXT', value: (p) => p['Future Upgrade Path'] ?? null },
  { name: 'noise_level_db', type: 'TEXT', value: (p) => p['Noise Level (dB)'] ?? null },
  { name: 'weight', type: 'TEXT', value: (p) => p.Weight ?? null },
  { name: 'noise', type: 'TEXT', value: (p) => p.Noise ?? null },
];

// --- HELPER FUNCTIONS ---

/**
 * Validates a single product record.
 * Throws an error if essential fields are missing.
 */
function validateProduct(product: any, fileName: string): ProductData {
  if (!product.SKU || String(product.SKU).trim() === '') {
    throw new Error(`Missing or empty SKU in ${fileName} for product: ${product['Tên sản phẩm'] || 'Unknown'}`);
  }
  if (!product['Tên sản phẩm'] || String(product['Tên sản phẩm']).trim() === '') {
    throw new Error(`Missing or empty product name in ${fileName} for SKU: ${product.SKU}`);
  }
  return product as ProductData;
}

/**
 * Parses a single CSV file from a buffer into an array of ProductData.
 * @param fileBuffer The buffer containing the CSV data.
 * @param fileName The name of the file for logging purposes.
 * @returns A promise that resolves to an array of products.
 */
async function parseCSV(fileBuffer: Buffer, fileName: string): Promise<ProductData[]> {
  return new Promise((resolve, reject) => {
    const products: ProductData[] = [];
    const stream = Readable.from(fileBuffer);

    stream
      .pipe(csvParser())
      .on('data', (data) => {
        try {
          const normalized: { [key: string]: any } = {};
          for (const rawKey in data) {
            const cleanKey = rawKey.replace(/^\uFEFF/, '').trim();
            normalized[cleanKey] = data[rawKey];
          }
          const validatedProduct = validateProduct(normalized, fileName);
          products.push(validatedProduct);
        } catch (error) {
          console.error(`❌ Validation error in ${fileName}:`, (error as Error).message);
        }
      })
      .on('end', () => {
        console.log(`✅ Parsed ${products.length} products from ${fileName}`);
        resolve(products);
      })
      .on('error', (error) => reject(new Error(`Failed to parse ${fileName}: ${error.message}`)));
  });
}

/**
 * Loads all products from .csv files in the data directory.
 * Reads and parses files in parallel.
 * @returns A promise that resolves to a flattened array of all products.
 */
async function loadAllProducts(): Promise<ProductData[]> {
  console.log(`📂 Reading CSV files from ${DATA_DIR}...`);
  const allFiles = await fs.readdir(DATA_DIR);
  const csvFiles = allFiles.filter((file) => file.endsWith('.csv'));

  if (csvFiles.length === 0) {
    console.warn('⚠️ No CSV files found in the data directory.');
    return [];
  }

  console.log(`Found ${csvFiles.length} CSV files: ${csvFiles.join(', ')}`);

  const parsingPromises = csvFiles.map(async (fileName) => {
    const filePath = path.join(DATA_DIR, fileName);
    const fileContent = await fs.readFile(filePath);
    return parseCSV(fileContent, fileName);
  });

  const nestedProducts = await Promise.all(parsingPromises);
  return nestedProducts.flat();
}


// --- DATABASE SYNC FUNCTIONS ---

/**
 * Clears the database and recreates the products table schema.
 * @param db The LibSQL client instance.
 */
async function prepareLibSQL(db: Client): Promise<void> {
  console.log('🗑️  Preparing LibSQL database (dropping and recreating table)...');
  await db.execute('DROP TABLE IF EXISTS products;');
  
  const columnDefs = PRODUCT_SCHEMA.map(col => `${col.name} ${col.type}`).join(',\n      ');
  const createTableStmt = `
    CREATE TABLE products (
      ${columnDefs},
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await db.execute(createTableStmt);
  console.log('✅ LibSQL table "products" created successfully.');
}

/**
 * Syncs all products to the LibSQL database using a single transaction.
 * This now uses db.batch() for significantly better performance.
 * @param db The LibSQL client instance.
 * @param products An array of all products to sync.
 */
async function syncToLibSQL(db: Client, products: ProductData[]): Promise<void> {
  if (products.length === 0) {
    console.log('No products to sync to LibSQL.');
    return;
  }
  console.log(`🚀 Starting batch sync of ${products.length} products to LibSQL...`);

  const columnNames = PRODUCT_SCHEMA.map(col => col.name).join(', ');
  const placeholders = PRODUCT_SCHEMA.map(() => '?').join(', ');
  const insertStmt = `INSERT OR REPLACE INTO products (${columnNames}) VALUES (${placeholders});`;

  const statements = products.map(product => {
    const args = PRODUCT_SCHEMA.map(col => col.value(product));
    return { sql: insertStmt, args };
  });

  try {
    await db.batch(statements, 'write');
    console.log('✅ LibSQL batch sync completed successfully.');
  } catch (error) {
    console.error('❌ LibSQL batch sync failed.', error);
    throw error; // Re-throw to stop the sync process
  }
}

/**
 * Syncs all products to the ChromaDB vector store.
 * @param products An array of all products to sync.
 * @param embedder The embedding model instance.
 * @param chroma The ChromaDB client instance.
 */
async function syncToChroma(products: ProductData[], embedder: any, chroma: ChromaVector): Promise<void> {
  const indexName = 'products';
  console.log(`🗑️  Preparing ChromaDB (deleting and recreating index "${indexName}")...`);

  try {
    await chroma.deleteIndex({ indexName });
  } catch (e) {
    // Ignore if index doesn't exist
  }

  try {
    const testEmbedding = await embedder.doEmbed({ values: ['test'] });
    const dimension = testEmbedding.embeddings[0].length;
    await chroma.createIndex({ indexName, dimension, metric: 'cosine' });
    console.log(`✅ ChromaDB index "${indexName}" created with dimension ${dimension}.`);
  } catch (e) {
    console.error('❌ Failed to create ChromaDB index:', e);
    throw e; // Stop the process if we can't create the index
  }

  console.log(`🧠 Generating embeddings for ${products.length} products...`);
  const ids = products.map((p) => p.SKU);
  const documents = products.map((p) =>
    [
      p['Tên sản phẩm'],
      p.Model,
      p.Tags,
      p.USP,
      p['Suitable Applications'],
      p['Sales Pitch'],
      p['Total Specs'],
    ]
      .filter(Boolean)
      .join(' | ')
  );
  const metadatas = products.map((p) => ({ ...p })); // Simple clone for metadata

  const embeddings = await embedder.doEmbed({ values: documents });

  console.log(`📥 Upserting ${products.length} products to ChromaDB...`);
  await chroma.upsert({
    indexName,
    vectors: embeddings.embeddings,
    ids,
    documents,
    metadata: metadatas,
  });
  console.log('✅ ChromaDB sync completed.');
}


// --- MAIN EXECUTION ---

// Load LibSQL config after dotenv (avoid module caching issues)
const LIBSQL_URL = process.env.LIBSQL_URL || '';
const LIBSQL_AUTH_TOKEN = process.env.LIBSQL_AUTH_TOKEN || '';

function getLibSQLConfig() {
  return {
    url: LIBSQL_URL,
    authToken: LIBSQL_AUTH_TOKEN,
  };
}

/**
 * Main sync function to orchestrate the entire process.
 */
async function main() {
  console.log('🚀 Starting SSTC Product Database Sync...');
  console.log('⚠️  WARNING: This will DELETE ALL existing product data!');

  let db: Client | undefined;
  try {
    // 1. Initialize services locally now that .env is loaded
    
    // Embedder
    const embedder_base_url = process.env.EMBEDDER_BASE_URL;
    const embedder_api_key = process.env.EMBEDDER_API_KEY ?? '';
    const embedder_model_id = process.env.EMBEDDER_MODEL ?? 'text-embedding-3-small';

    if (!embedder_base_url) {
      throw new Error('EMBEDDER_BASE_URL is not set in .env file. Please check your .env file.');
    }
    
    console.log(`[Embedding Provider] Initializing with URL: ${embedder_base_url}`);
    const embedder = createOpenAI({
      baseURL: embedder_base_url,
      apiKey: embedder_api_key,
    }).embedding(embedder_model_id);

    // ChromaDB
    const chromaHost = process.env.CHROMA_HOST ?? 'localhost';
    const chromaPort = process.env.CHROMA_PORT ?? '8000';
    const chromaSsl = process.env.CHROMA_SSL === 'true';
    console.log(`[Chroma Vector] Initializing with host: ${chromaHost} port: ${chromaPort} ssl: ${chromaSsl}`);
    const chroma = new ChromaVector({
      host: chromaHost,
      port: parseInt(chromaPort, 10),
      ssl: chromaSsl,
    });


    // 2. Load all products from CSVs in parallel
    const allProducts = await loadAllProducts();
    if (allProducts.length === 0) {
      console.log('⏹️  No products found to sync. Exiting.');
      return;
    }
    console.log(`📊 Total products to sync: ${allProducts.length}`);

    // 3. Initialize LibSQL Database
    const { url, authToken } = getLibSQLConfig();
    if (!url) {
      throw new Error('LibSQL URL is not configured. Set LIBSQL_URL in .env');
    }
    db = createClient({ url, authToken });

    // 4. Clear and prepare LibSQL schema
    await prepareLibSQL(db);

    // 5. Sync to LibSQL using a transaction
    await syncToLibSQL(db, allProducts);

    // 6. Sync to ChromaDB
    await syncToChroma(allProducts, embedder, chroma);

    console.log('\n🎉 Product sync completed successfully!');
    console.log(`📈 Synced ${allProducts.length} products to both databases.`);
  } catch (error) {
    console.error('\n❌ FATAL: Sync process failed:', error);
    process.exit(1);
  } finally {
    db?.close();
  }
}

// Execute the main function if the script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
