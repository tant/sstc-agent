#!/usr/bin/env tsx

// Load environment variables
import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath, override: true });

import { createClient } from "@libsql/client";

async function queryActualSSDProducts() {
    console.log("🔍 Querying actual SSD products from database...\n");
    
    try {
        // Connect to the database
        const db = createClient({ 
            url: process.env.LIBSQL_URL || "file:./database/mastra.db" 
        });
        
        // Query for SSD products sorted by price
        console.log("📋 Actual SSD Products (Sorted by Price):");
        console.log("========================================");
        
        const ssdProducts = await db.execute({
            sql: "SELECT name, model, sku, price, tags FROM products WHERE model LIKE '%E130%' OR model LIKE '%MAX%' OR name LIKE '%M110%' ORDER BY price ASC",
            args: []
        });
        
        if (ssdProducts.rows.length === 0) {
            console.log("❌ No SSD products found with current query!");
        } else {
            ssdProducts.rows.forEach((row: any, index: number) => {
                const modelName = row.model || row.name;
                const displayName = modelName.replace(/\n/g, ' ').trim();
                
                console.log(`${index + 1}. ${displayName}`);
                console.log(`   Model: ${row.model}`);
                console.log(`   SKU: ${row.sku}`);
                console.log(`   Price: ${Math.round(row.price).toLocaleString()}đ`);
                if (row.tags) {
                    console.log(`   Tags: ${row.tags}`);
                }
                console.log("");
            });
            
            console.log(`✅ Total SSD products found: ${ssdProducts.rows.length}`);
        }
        
        // Also show the highest priced SSD products
        console.log("📋 Highest-Priced SSD Products:");
        console.log("===============================");
        
        const highEndSSD = await db.execute({
            sql: "SELECT name, model, sku, price FROM products WHERE (model LIKE '%MAX IV%' OR model LIKE '%MAX IV%') ORDER BY price DESC LIMIT 3",
            args: []
        });
        
        highEndSSD.rows.forEach((row: any, index: number) => {
            console.log(`${index + 1}. ${row.model || row.name}`);
            console.log(`   Price: ${Math.round(row.price).toLocaleString()}đ`);
            console.log(`   SKU: ${row.sku}`);
            console.log("");
        });
        
    } catch (error) {
        console.error("❌ Error querying database:", error);
    }
}

queryActualSSDProducts();