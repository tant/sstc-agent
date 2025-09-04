#!/usr/bin/env tsx

/**
 * SSTC Product Database Sync Script
 * Syncs CSV product data to LibSQL and Chroma databases
 * WARNING: This script will DELETE ALL existing product data and recreate it
 */

import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import project modules at top level
import { getLibSQLConfig } from '../src/mastra/database/libsql.js';
import { chromaVector } from '../src/mastra/vector/chroma.js';
import { embedder } from '../src/mastra/embedding/provider.js';

// Configuration
const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCT_FILES = [
  'products-ram.csv',
  // Add more files later: 'products-ssd.csv', 'products-cpu.csv', etc.
];

// Product data interface
interface ProductData {
  SKU: string;
  'Tên sản phẩm': string;
  'Ráp cho'?: string;
  'Loại sản phẩm'?: string;
  'Tương thích CPU'?: string;
  Model?: string;
  Giá?: string;
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
  Warranty?: string;
  Availability?: string;
  Rating?: string;
  Tags?: string;
  'Recommended_Use'?: string;
  Image_URL?: string;
}

// Validation function
function validateProduct(product: any, fileName: string): ProductData {
  if (!product.SKU || (typeof product.SKU === 'string' && product.SKU.trim() === '')) {
    throw new Error(`Missing SKU in ${fileName} for product: ${product['Tên sản phẩm'] || 'Unknown'}`);
  }
  if (!product['Tên sản phẩm'] || (typeof product['Tên sản phẩm'] === 'string' && product['Tên sản phẩm'].trim() === '')) {
    throw new Error(`Missing product name in ${fileName} for SKU: ${product.SKU}`);
  }

  return product as ProductData;
}

// Parse CSV file
async function parseCSVFile(filePath: string): Promise<ProductData[]> {
  return new Promise((resolve, reject) => {
    const results: ProductData[] = [];

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      resolve([]);
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => {
        try {
          // Normalize header keys: remove BOM, trim spaces
          const normalized: any = {};
          Object.keys(data).forEach((rawKey) => {
            const cleanKey = rawKey.replace(/^\uFEFF/, '').trim();
            const value = data[rawKey];
            normalized[cleanKey] = typeof value === 'string' ? value.trim() : value;
          });

          const validatedProduct = validateProduct(normalized, path.basename(filePath));
          results.push(validatedProduct);
        } catch (error) {
          console.error(`❌ Validation error in ${path.basename(filePath)}:`, (error as Error).message);
          // Continue processing other rows
        }
      })
      .on('end', () => {
        console.log(`✅ Parsed ${results.length} products from ${path.basename(filePath)}`);
        resolve(results);
      })
      .on('error', (error) => {
        reject(new Error(`Failed to parse ${filePath}: ${error.message}`));
      });
  });
}

// Clear LibSQL database
async function clearLibSQL(db: any): Promise<void> {
  console.log('🗑️  Clearing LibSQL database...');

  // Drop table if exists and recreate
  await db.execute(`
    DROP TABLE IF EXISTS products;
  `);

  await db.execute(`
    CREATE TABLE products (
      sku TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      category TEXT,
      compatible_cpu TEXT,
      model TEXT,
      price REAL,
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
      warranty TEXT,
      availability TEXT,
      rating TEXT,
      tags TEXT,
      recommended_use TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ LibSQL database cleared and schema created');
}

// Sync to LibSQL
async function syncToLibSQL(db: any, products: ProductData[]): Promise<void> {
  console.log(`📥 Syncing ${products.length} products to LibSQL...`);

  for (const product of products) {
    try {
      await db.execute(`
        INSERT OR REPLACE INTO products (
          sku, name, type, category, compatible_cpu, model, price, linked_system_model,
          speed, latency, voltage, form_factor, ecc, brand, quantity, channel,
          usp, warranty, availability, rating, tags, recommended_use, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        product.SKU,
        product['Tên sản phẩm'],
        product['Ráp cho'] || null,
        product['Loại sản phẩm'] || null,
        product['Tương thích CPU'] || null,
        product.Model || null,
        product.Giá ? parseFloat(product.Giá.replace(/[^\d.]/g, '')) || null : null,
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
        product.Warranty || null,
        product.Availability || null,
        product.Rating || null,
        product.Tags || null,
        product['Recommended_Use'] || null,
        product.Image_URL || null
      ]);
    } catch (error) {
      console.error(`❌ Failed to insert product ${product.SKU}:`, error);
    }
  }

  console.log('✅ LibSQL sync completed');
}

// Chroma collection management and upsert are handled inline in the main
// sync flow using the project's `chromaVector` wrapper and `embedder`.
// The old ChromaClient-typed helper functions were removed to avoid
// referencing the external ChromaClient type directly in this script.

// Main sync function
async function syncProducts(): Promise<void> {
  console.log('🚀 Starting SSTC Product Database Sync...');
  console.log('⚠️  WARNING: This will DELETE ALL existing product data!');

  try {
    // Load all product data
    const allProducts: ProductData[] = [];

    for (const fileName of PRODUCT_FILES) {
      const filePath = path.join(DATA_DIR, fileName);
      const products = await parseCSVFile(filePath);
      allProducts.push(...products);
    }

    if (allProducts.length === 0) {
      console.log('❌ No products found to sync. Check your CSV files.');
      return;
    }

    console.log(`📊 Total products to sync: ${allProducts.length}`);

    // Initialize databases
    const libsqlConfig = getLibSQLConfig();

    if (!libsqlConfig.url) {
      throw new Error('LibSQL URL is not configured. Set LIBSQL_URL in .env');
    }

    const db = createClient({
      url: libsqlConfig.url,
      authToken: libsqlConfig.authToken
    });

    // Clear LibSQL
    await clearLibSQL(db);

    // Sync data to LibSQL first
    await syncToLibSQL(db, allProducts);

    // Sync to Chroma using project's chromaVector + embedder
    // Build documents and metadatas same as before
    const indexName = 'products';
    
    // Delete index if exists
    try {
      await chromaVector.deleteIndex({ indexName }).catch(() => {});
    } catch (e) {
      // ignore
    }
    
    // Create collection with proper embedding dimensions
    try {
      // First, let's get the embedding dimension by testing with one document
      const testEmbedding = await embedder.doEmbed({
        values: ['test document']
      });
      
      const dimension = testEmbedding.embeddings[0].length;
      console.log(`Creating collection with dimension: ${dimension}`);
      
      await chromaVector.createIndex({ 
        indexName, 
        dimension,
        metric: 'cosine' 
      });
    } catch (e) {
      console.error('Failed to create collection:', e);
      // ignore and continue, let chromaVector handle it
    }

    // Prepare arrays
    const ids: string[] = [];
    const documents: string[] = [];
    const metadatas: any[] = [];
    for (const product of allProducts) {
      ids.push(product.SKU);
      const docText = [
        product.USP || '',
        product.Tags || '',
        product['Tên sản phẩm'] || '',
        product.speed || '',
        product.latency || '',
        product.brand || '',
        product['Recommended_Use'] || ''
      ].filter(Boolean).join(' ');
      documents.push(docText);
      metadatas.push({
        sku: product.SKU,
        name: product['Tên sản phẩm'],
        type: product['Ráp cho'],
        category: product['Loại sản phẩm'],
        compatible_cpu: product['Tương thích CPU'],
        model: product.Model,
        price: product.Giá,
        linked_system_model: product['Linked System Model'],
        speed: product.speed,
        latency: product.latency,
        voltage: product.voltage,
        form_factor: product.form_factor,
        ecc: product.ecc,
        brand: product.brand,
        quantity: product.quantity,
        channel: product.channel,
        usp: product.USP,
        warranty: product.Warranty,
        availability: product.Availability,
        rating: product.Rating,
        tags: product.Tags,
        recommended_use: product['Recommended_Use'],
        image_url: product.Image_URL
      });
    }

    // Compute embeddings using project's embedder
    console.log('🔗 Generating embeddings for Chroma upsert...');
    let vectors: number[][] = [];
    try {
      // Use the embedder's doEmbed method
      const result = await embedder.doEmbed({
        values: documents
      });
      vectors = result.embeddings;
    } catch (err) {
      console.error('❌ Failed to generate embeddings:', err);
      throw err;
    }

    console.log(`📥 Syncing ${ids.length} products to Chroma (via chromaVector.upsert)...`);
    try {
      await chromaVector.upsert({ indexName, vectors, ids, documents, metadata: metadatas });
      console.log('✅ Chroma sync completed');
    } catch (err) {
      console.error('❌ Chroma upsert failed:', err);
      throw err;
    }

    // Close connections
    try { db.close(); } catch(e) { /* ignore */ }

    console.log('🎉 Product sync completed successfully!');
    console.log(`📈 Synced ${allProducts.length} products to both databases`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
if (import.meta.url === `file://${process.argv[1]}`) {
  syncProducts();
}

export { syncProducts };
