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
import * as path from 'path';
import csvParser from 'csv-parser';
import { createClient, type Client } from '@libsql/client';
import { Readable } from 'stream';

// Import project modules
import { chromaVector } from '../src/mastra/vector/chroma.js';
// We will create the embedder instance locally in main()
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
  
  // A single, comprehensive table to hold all product types
  await db.execute(`
    CREATE TABLE products (
      sku TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT,
      price REAL,
      warranty TEXT,
      availability TEXT,
      rating TEXT,
      tags TEXT,
      image_url TEXT,
      comparison_with_other_models TEXT,
      upsell_suggestions TEXT,
      sales_pitch TEXT,
      bundles TEXT,
      suitable_applications TEXT,
      type TEXT,
      category TEXT,
      compatible_cpu TEXT,
      linked_system_model TEXT,
      speed TEXT,
      latency TEXT,
      voltage TEXT,
      form_factor TEXT,
      ecc TEXT,
      brand TEXT,
      quantity TEXT,
      channel TEXT,
      usp TEXT,
      recommended_use TEXT,
      benchmark_score TEXT,
      power_consumption TEXT,
      tdp TEXT,
      price_per_performance TEXT,
      future_proofing TEXT,
      benchmarks_passmark TEXT,
      power_supply TEXT,
      level TEXT,
      system_model TEXT,
      barebone_linked_sku TEXT,
      linked_sku_ram TEXT,
      linked_sku_ssd TEXT,
      gia_tong REAL,
      total_specs TEXT,
      performance_benchmark TEXT,
      customer_reviews_rating TEXT,
      environmental_impact TEXT,
      benchmark_gaming_fps TEXT,
      weight_dimensions TEXT,
      future_upgrade_path TEXT,
      noise_level_db TEXT,
      weight TEXT,
      noise TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ LibSQL table "products" created successfully.');
}

/**
 * Syncs all products to the LibSQL database using a single transaction.
 * @param db The LibSQL client instance.
 * @param products An array of all products to sync.
 */
async function syncToLibSQL(db: Client, products: ProductData[]): Promise<void> {
  console.log(`🔂 Starting LibSQL transaction to sync ${products.length} products...`);
  const tx = await db.transaction('write');
  try {
    const insertStmt = `
      INSERT OR REPLACE INTO products (
        sku, name, model, price, warranty, availability, rating, tags, image_url,
        comparison_with_other_models, upsell_suggestions, sales_pitch, bundles,
        suitable_applications, type, category, compatible_cpu, linked_system_model,
        speed, latency, voltage, form_factor, ecc, brand, quantity, channel, usp,
        recommended_use, benchmark_score, power_consumption, tdp, price_per_performance,
        future_proofing, benchmarks_passmark, power_supply, level, system_model,
        barebone_linked_sku, linked_sku_ram, linked_sku_ssd, gia_tong, total_specs,
        performance_benchmark, customer_reviews_rating, environmental_impact,
        benchmark_gaming_fps, weight_dimensions, future_upgrade_path, noise_level_db,
        weight, noise
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const product of products) {
      await tx.execute({
        sql: insertStmt,
        args: [
          product.SKU,
          product['Tên sản phẩm'],
          product.Model || null,
          product.Giá ? parseFloat(product.Giá.replace(/[^\d.]/g, '')) : null,
          product.Warranty || null,
          product.Availability || null,
          product.Rating || null,
          product.Tags || null,
          product.Image_URL || null,
          product['Comparison with Other Models'] || null,
          product['Upsell Suggestions'] || null,
          product['Sales Pitch'] || null,
          product.Bundles || null,
          product['Suitable Applications'] || null,
          product['Ráp cho'] || null,
          product['Loại sản phẩm'] || null,
          product['Tương thích CPU'] || null,
          product['Linked System Model'] || null,
          product.speed || null,
          product.latency || null,
          product.voltage || null,
          product.form_factor || null,
          product.ecc || null,
          product.brand || null,
          product.quantity || null,
          product.channel || null,
          product.USP || null,
          product['Recommended_Use'] || null,
          product['Benchmark Score (Read/Write MB/s)'] || null,
          product['Power Consumption (W)'] || null,
          product.TDP || null,
          product['Price per Performance'] || null,
          product['Future Proofing'] || null,
          product['Benchmarks (PassMark)'] || null,
          product['Power Supply (W)'] || null,
          product.Level || null,
          product['System Model'] || null,
          product['Barebone Linked SKU'] || null,
          product['Linked SKU RAM'] || null,
          product['Linked SKU SSD'] || null,
          product['Giá Tổng'] ? parseFloat(product['Giá Tổng'].replace(/[^\d.]/g, '')) : null,
          product['Total Specs'] || null,
          product['Performance Benchmark'] || null,
          product['Customer Reviews/Rating'] || null,
          product['Environmental Impact'] || null,
          product['Benchmark Gaming (FPS)'] || null,
          product['Weight/Dimensions'] || null,
          product['Future Upgrade Path'] || null,
          product['Noise Level (dB)'] || null,
          product.Weight || null,
          product.Noise || null,
        ],
      });
    }
    await tx.commit();
    console.log('✅ LibSQL transaction committed successfully.');
  } catch (error) {
    console.error('❌ LibSQL transaction failed. Rolling back...', error);
    await tx.rollback();
    throw error; // Re-throw to stop the sync process
  }
}

/**
 * Syncs all products to the ChromaDB vector store.
 * @param products An array of all products to sync.
 * @param embedder The embedding model instance.
 */
async function syncToChroma(products: ProductData[], embedder: any): Promise<void> {
  const indexName = 'products';
  console.log(`🗑️  Preparing ChromaDB (deleting and recreating index "${indexName}")...`);

  try {
    await chromaVector.deleteIndex({ indexName });
  } catch (e) {
    // Ignore if index doesn't exist
  }

  try {
    const testEmbedding = await embedder.doEmbed({ values: ['test'] });
    const dimension = testEmbedding.embeddings[0].length;
    await chromaVector.createIndex({ indexName, dimension, metric: 'cosine' });
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
  await chromaVector.upsert({
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
    // 1. Initialize Embedder locally now that .env is loaded
    const embedding_base_url = process.env.EMBEDDING_BASE_URL;
    const embedding_api_key = process.env.EMBEDDING_API_KEY ?? '';
    const embedding_model_id = process.env.EMBEDDING_MODEL_ID ?? 'text-embedding-3-small';

    if (!embedding_base_url) {
      throw new Error('EMBEDDING_BASE_URL is not set in .env file. Please check your .env file.');
    }
    
    console.log(`[Embedding Provider] Initializing with URL: ${embedding_base_url}`);
    const embedder = createOpenAI({
      baseURL: embedding_base_url,
      apiKey: embedding_api_key,
    }).embedding(embedding_model_id);


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
    await syncToChroma(allProducts, embedder);

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
