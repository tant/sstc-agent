#!/usr/bin/env tsx

// Load environment variables
import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath, override: true });

// Check SQLite database directly
import { createClient } from "@libsql/client";

async function queryActualProducts() {
    console.log("🔍 Querying SQLite database for actual SSD products...\n");
    
    try {
        const db = createClient({ 
            url: process.env.LIBSQL_URL || "file:./database/mastra.db" 
        });
        
        // Query for SSD products
        const result = await db.execute({
            sql: "SELECT \"Tên sản phẩm\", Model, SKU, Giá, \"Benchmark Score (Read/Write MB/s)\", \"Suitable Applications\" FROM products WHERE \"Loại sản phẩm\" LIKE '%SSD%' OR Model LIKE '%SSD%' ORDER BY CAST(REPLACE(Giá, ',', '') AS INTEGER)",
            args: []
        });
        
        console.log("📋 Actual SSD Products in Database:");
        console.log("====================================");
        
        if (result.rows.length === 0) {
            console.log("❌ No SSD products found in database!");
            console.log("💡 Try running 'pnpm run sync:products' first");
        } else {
            result.rows.forEach((row: any, index: number) => {
                console.log(`${index + 1}. ${row["Tên sản phẩm"]} (${row.Model})`);
                console.log(`   SKU: ${row.SKU}`);
                console.log(`   Price: ${row.Giá}đ`);
                console.log(`   Speed: ${row["Benchmark Score (Read/Write MB/s)"]}`);
                console.log(`   Use Cases: ${row["Suitable Applications"]}`);
                console.log("");
            });
        }
        
    } catch (error) {
        console.error("❌ Error querying SQLite DB:", error);
        console.log("\n💡 Try running 'pnpm run sync:products' to populate the database");
    }
}

async function main() {
    await queryActualProducts();
}

main();