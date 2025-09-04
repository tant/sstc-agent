# Data Workflow Documentation

## Tổng quan

Tài liệu này mô tả workflow quản lý dữ liệu sản phẩm cho dự án SSTC Agent. Workflow được thiết kế để hỗ trợ việc cập nhật dữ liệu liên tục trong quá trình phát triển (dev), bao gồm thay đổi nội dung, thêm/bớt/đổi tên trường. Chúng tôi sử dụng CSV làm source chính để đơn giản hóa, sau đó convert tự động sang JSON hoặc database để tích hợp với hệ thống AI (RAG, vector search).

## Lý do chọn CSV
- **Đơn giản**: Dễ edit bằng bất kỳ text editor (VS Code), không cần phần mềm chuyên dụng như Excel.
- **Git-friendly**: Dễ track changes, diff, và merge.
- **Hiệu quả**: Nhanh parse, phù hợp với tabular data.
- **Nhược điểm**: Không hỗ trợ nested structures tốt; nếu specs sản phẩm phức tạp, cân nhắc JSON.

## Quản lý Nhiều File CSV
Để hỗ trợ các danh mục sản phẩm khác nhau, chúng ta sử dụng nhiều file CSV riêng biệt trong thư mục `data/` (đặt tại root của project):
- `data/products-ram.csv`: Dữ liệu RAM (DDR4, DDR5, capacity, speed).
- `data/products-ssd.csv`: Dữ liệu SSD (NVMe, SATA, capacity, read/write speed).
- `data/products-barebone.csv`: Dữ liệu barebone PC (case, motherboard, PSU).
- `data/products-cpu.csv`: Dữ liệu CPU (Intel, AMD, cores, clock speed).
- `data/products-desktop.csv`: Dữ liệu PC desktop hoàn chỉnh (gaming, office).

**Lý do**: Tách file giúp dễ quản lý, update độc lập, và tránh file quá lớn. Mỗi file có schema riêng phù hợp với category.

**Ví dụ cấu trúc**:
- `products-ram.csv`:
  ```
  SKU,Tên sản phẩm,Loại sản phẩm,Model,speed,latency,voltage,form_factor,brand,quantity,channel,USP,Warranty,Availability,Rating,Tags,Recommended_Use,Image_URL
  U3200I-C22-8G,Bộ nhớ máy tính...,DDR4,U3200I-C22,DDR4-3200,CL22,1.2V,UDIMM,Generic,1,single,"High-performance DDR4 RAM...",1 year,In Stock,4.5,"gaming,high-speed","Gaming, Office",https://example.com/image.jpg
  ```
- `products-ssd.csv`:
  ```
  id,name,capacity,interface,price,brand
  SSD001,"Samsung 970 EVO 1TB",1TB,NVMe,2500000,Samsung
  ```

## Enrich Dữ liệu (Thêm Cột Để Giàu Thông Tin)
Sau khi tạo CSV cơ bản, chúng ta enrich bằng cách thêm các cột sau để hỗ trợ agent tư vấn tốt hơn:
- **Specs chi tiết**: speed, latency, voltage, form_factor (UDIMM/SODIMM), ecc, brand.
- **Metadata**: quantity (1 hoặc 2), channel (single/dual), USP (Unique Selling Proposition).
- **Thông tin bổ sung**: Warranty, Availability, Rating, Tags, Recommended_Use, Image_URL.

**Ví dụ enrich cho RAM**:
- Thêm cột speed (DDR4-3200), latency (CL22), voltage (1.2V).
- Thêm USP: "High-performance DDR4 RAM optimized for Intel systems..."
- Thêm Tags: "gaming,high-speed" để dễ search.
- Thêm Image_URL: Link hình ảnh sản phẩm.

**Lý do**: Dữ liệu giàu hơn giúp agent generate responses personalized, như recommend dựa trên tags hoặc hiển thị image.

## Workflow Chi Tiết

### 1. Thiết lập Source of Truth
- Lưu các file CSV trong thư mục `data/` tại root của project (ví dụ: `data/products-ram.csv`, `data/products-ssd.csv`, v.v.).
- Edit trực tiếp bằng VS Code. Thêm/bớt cột khi cần (ví dụ: thêm `warranty` cho tất cả file).
- Enrich data: Thêm specs, USP, tags, image để dữ liệu đầy đủ.

### 2. Version Control
- Commit tất cả CSV: `git add data/*.csv && git commit -m "Update all product CSVs"`
- Sử dụng branch riêng cho data updates lớn: `git checkout -b feature/data-update`
- Nếu file lớn, dùng Git LFS.

### 3. Conversion và Sync
- Tạo script `scripts/sync-products.ts` để convert tất cả CSV sang insert vào LibSQL/Chroma.
- Chạy script: `pnpm tsx scripts/sync-products.ts`
- Automation: Hook Git pre-commit hoặc cron job.
- **Sync vào Agent**: Load vào LibSQL (memory) và Chroma (vector) để agent query và generate responses.
- **Collection Products**: Script tự động tạo collection `products` trong Chroma với dimension 1024, chứa embeddings được tạo từ USP, Tags và các thông tin text khác của sản phẩm.

### 4. Tích hợp với Hệ thống AI
- **LibSQL (Memory Database)**: Store structured data (specs, price, brand) cho queries chính xác (SQL). Ví dụ: SELECT products WHERE brand = 'Generic' AND price < 1000000.
- **Chroma (Vector Database)**: Store embeddings từ USP/Tags trong collection `products` cho semantic search (RAG). Ví dụ: Tìm sản phẩm "RAM gaming" dựa trên similarity, không cần match exact.
- **Tại sao dùng cả hai?**:
  - LibSQL: Hiệu quả cho data tabular, queries nhanh, reliable cho business logic (inventory, pricing).
  - Chroma: Tốt cho AI search (fuzzy matching, recommendations dựa trên context). Agent dùng Chroma để find top matches, rồi query LibSQL cho details.
- Reload embeddings tự động sau sync cho từng category.

### 5. Validation và Testing
- Validate schema cho từng file: Check required fields (SKU, Tên sản phẩm).
- Unit tests: `tests/data-sync.test.ts` (test từng file).
- E2E tests: Test agent responses với data mới từ tất cả categories (ví dụ: query "RAM gaming" và check recommend đúng).
- Linting: Chạy Biome trên scripts.

## 6. Tích hợp Data với Agent
**Trạng thái hiện tại**: Agent chỉ sử dụng mock data trong tools, chưa tích hợp với CSV data chúng ta tạo.

### Về Collection Products trong Chroma
Collection `products` trong Chroma được tạo tự động bởi script sync và chứa:
- **Embeddings**: Vector representations của text kết hợp từ USP, Tags, Tên sản phẩm, speed, latency, brand và Recommended_Use
- **Metadata**: Toàn bộ thông tin sản phẩm từ CSV để có thể truy xuất chi tiết sau khi search
- **Dimension**: 1024 (xác định tự động từ model embedding đang sử dụng)

### Các bước tích hợp:
1. **Tạo Product Tools thực tế**:
   - Thay thế mock data trong `purchase-database-tool.ts` bằng queries từ LibSQL/Chroma.
   - Thêm tool để search products từ vector embeddings (USP/Tags).

2. **Cập nhật Agent Tools**:
   - Thêm `purchaseDatabaseTool` và `productCompatibilityTool` vào `tools: {}` của `mai-agent.ts`.
   - Thêm tool mới cho semantic search products sử dụng collection `products` trong Chroma.

3. **Sync Data tự động**:
   - Chạy script sync sau mỗi update CSV.
   - Script sẽ tự động tạo/recreate collection `products` trong Chroma với dimension phù hợp

### Ví dụ Tool mới (Semantic Product Search):
```typescript
export const semanticProductSearchTool = createTool({
  id: 'semantic-product-search',
  description: 'Search products using semantic similarity (USP/Tags)',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    // Sử dụng chromaVector từ project (đã được cấu hình)
    const results = await chromaVector.query({
      indexName: 'products',
      queryText: query,
      topK: 5
    });
    return results;
  }
});
```

### Cập nhật Agent:
```typescript
export const maiSale = new Agent({
  // ...existing code...
  tools: {
    purchaseDatabase: purchaseDatabaseTool,
    productCompatibility: productCompatibilityTool,
    semanticSearch: semanticProductSearchTool
  },
  // ...existing code...
});
```

## Công cụ và Thư viện
- **Thư viện**: `csv-parser` (npm install csv-parser), `zod` cho validation, `chromadb` cho vector search.
- **Database**: LibSQL cho memory (structured queries), Chroma cho vector (semantic search).
- **Tools**: VS Code cho edit, Git cho version control.

## Ví dụ Script Conversion (Multiple Files)
```typescript
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { createClient } from '@libsql/client';
import { getLibSQLConfig } from '../src/mastra/database/libsql.js';
import { chromaVector } from '../src/mastra/vector/chroma.js';
import { embedder } from '../src/mastra/embedding/provider.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCT_FILES = [
  'products-ram.csv',
  'products-ssd.csv',
  'products-barebone.csv',
  'products-cpu.csv',
  'products-desktop.csv'
];

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

// Parse and validate CSV files
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

          // Validate required fields
          if (!normalized.SKU || !normalized['Tên sản phẩm']) {
            throw new Error(`Missing required fields in ${path.basename(filePath)}`);
          }

          results.push(normalized as ProductData);
        } catch (error) {
          console.error(`❌ Validation error in ${path.basename(filePath)}:`, (error as Error).message);
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

// Main sync function
async function syncAll(): Promise<void> {
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

  // Initialize LibSQL
  const libsqlConfig = getLibSQLConfig();
  const db = createClient({
    url: libsqlConfig.url,
    authToken: libsqlConfig.authToken
  });

  // Clear and recreate LibSQL table
  await db.execute(`DROP TABLE IF EXISTS products;`);
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

  // Sync data to LibSQL
  await syncToLibSQL(db, allProducts);

  // Sync to Chroma using project's chromaVector + embedder
  const indexName = 'products';
  
  // Delete existing collection
  try {
    await chromaVector.deleteIndex({ indexName }).catch(() => {});
  } catch (e) {
    // ignore
  }
  
  // Create collection with proper embedding dimensions
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

  // Prepare arrays for Chroma
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

  // Generate embeddings and sync to Chroma
  const result = await embedder.doEmbed({
    values: documents
  });
  const vectors = result.embeddings;

  await chromaVector.upsert({ 
    indexName, 
    vectors, 
    ids, 
    documents, 
    metadata: metadatas 
  });

  // Close connections
  try { db.close(); } catch(e) { /* ignore */ }

  console.log('🎉 Product sync completed successfully!');
  console.log(`📈 Synced ${allProducts.length} products to both databases`);
}

syncAll();
```

## Best Practices
- Backup tất cả CSV trước updates lớn.
- Log changes trong `src/mastra/core/signals/`.
- Nếu data >10k records, chuyển sang PostgreSQL.
- Test thoroughly sau mỗi schema change cho từng file.
- Enrich data incrementally: Thêm cột một cách có hệ thống để tránh lỗi format.

## Kết luận
Workflow này giúp dev focus vào logic AI thay vì manual data handling. Dữ liệu được enrich để agent tư vấn chính xác và personalized. Nếu cần nested data, chuyển sang JSON source. Liên hệ dev team để refine.

## Chạy Sync Script
Sau khi update CSV files, chạy lệnh sau để sync data:

```bash
pnpm run sync:products
```

**Lưu ý quan trọng:**
- Script sẽ **XÓA TOÀN BỘ** data products hiện có trong database
- Đảm bảo Chroma server đang chạy (nếu dùng local)
- Check logs để xem có lỗi validation nào không
- Script tự động tạo collection `products` trong Chroma với dimension phù hợp (1024)

### Ví dụ Output:
```
🚀 Starting SSTC Product Database Sync...
⚠️  WARNING: This will DELETE ALL existing product data!
✅ Parsed 18 products from products-ram.csv
📊 Total products to sync: 18
🗑️  Clearing LibSQL database...
✅ LibSQL database cleared and schema created
📥 Syncing 18 products to LibSQL...
✅ LibSQL sync completed
Creating collection with dimension: 1024
🔗 Generating embeddings for Chroma upsert...
📥 Syncing 18 products to Chroma (via chromaVector.upsert)...
✅ Chroma sync completed
🎉 Product sync completed successfully!
📈 Synced 18 products to both databases
```
