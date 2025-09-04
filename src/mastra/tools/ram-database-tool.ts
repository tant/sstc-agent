import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const ramSearchInputSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  capacity: z.enum(['8GB', '16GB', '32GB', '64GB']).optional(),
  type: z.enum(['DDR4', 'DDR5']).optional(),
  speed: z.string().optional(),
  formFactor: z.enum(['UDIMM', 'SODIMM']).optional(),
  budget: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }).optional(),
  useCase: z.enum(['gaming', 'office', 'content-creation', 'professional']).optional(),
  motherboardCompatibility: z.string().optional()
});

const ramSearchOutputSchema = z.object({
  products: z.array(z.object({
    sku: z.string(),
    name: z.string(),
    type: z.string(),
    capacity: z.string(),
    speed: z.string(),
    latency: z.string(),
    voltage: z.string(),
    formFactor: z.string(),
    price: z.number(),
    compatibility: z.array(z.string()),
    useCases: z.array(z.string()),
    score: z.number(),
    stockStatus: z.string(),
    description: z.string()
  })),
  totalResults: z.number(),
  searchSummary: z.string(),
  recommendations: z.array(z.string())
});

export const ramDatabaseTool = createTool({
  id: 'ram-database-search',
  description: 'Search SSTC RAM product database for purchase recommendations',
  inputSchema: ramSearchInputSchema,
  outputSchema: ramSearchOutputSchema,
  execute: async ({ context, mastra }) => {
    const inputData = context as any;
    const { query, capacity, type, speed, formFactor, budget, useCase, motherboardCompatibility } = inputData;

    console.log('🔍 [RAM DB] Searching:', {
      query,
      capacity,
      type,
      speed,
      formFactor,
      budget,
      useCase,
      motherboardCompatibility
    });

    try {
      // Get database connection
      const db = mastra.getStorage();
      
      // Build query based on filters
      let sqlQuery = `
        SELECT * FROM products 
        WHERE category = 'RAM' OR Loại sản phẩm = 'RAM'
      `;
      
      const params: any[] = [];
      
      // Add search term filter
      if (query) {
        sqlQuery += ` AND (Tên sản phẩm LIKE ? OR USP LIKE ? OR Tags LIKE ?)`;
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      // Add capacity filter
      if (capacity) {
        sqlQuery += ` AND quantity = ?`;
        params.push(capacity);
      }
      
      // Add type filter
      if (type) {
        sqlQuery += ` AND Loại sản phẩm = ?`;
        params.push(type);
      }
      
      // Add form factor filter
      if (formFactor) {
        sqlQuery += ` AND form_factor = ?`;
        params.push(formFactor);
      }
      
      // Add budget filter
      if (budget) {
        if (budget.min) {
          sqlQuery += ` AND Giá >= ?`;
          params.push(budget.min);
        }
        if (budget.max) {
          sqlQuery += ` AND Giá <= ?`;
          params.push(budget.max);
        }
      }
      
      // Add use case filter
      if (useCase) {
        sqlQuery += ` AND Recommended_Use LIKE ?`;
        params.push(`%${useCase}%`);
      }
      
      // Add motherboard compatibility filter
      if (motherboardCompatibility) {
        sqlQuery += ` AND Tương thích CPU LIKE ?`;
        params.push(`%${motherboardCompatibility}%`);
      }
      
      // Order by price and limit results
      sqlQuery += ` ORDER BY CAST(REPLACE(Giá, ',', '') AS REAL) ASC LIMIT 10`;
      
      console.log('Executing SQL query:', sqlQuery, params);
      
      // Execute query
      const result: any = await db.query({
        sql: sqlQuery,
        args: params
      });
      
      console.log('Database query result:', result);
      
      // Process results
      const products = result.rows.map((row: any) => {
        // Parse price (remove currency formatting)
        const priceText = row.Giá?.toString() || '0';
        const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
        
        return {
          sku: row.SKU || '',
          name: row['Tên sản phẩm'] || '',
          type: row['Loại sản phẩm'] || '',
          capacity: row.quantity || '',
          speed: row.speed || '',
          latency: row.latency || '',
          voltage: row.voltage || '',
          formFactor: row.form_factor || '',
          price: price,
          compatibility: row['Tương thích CPU'] ? row['Tương thích CPU'].split(',') : [],
          useCases: row['Recommended_Use'] ? row['Recommended_Use'].split(',') : [],
          score: 0, // Will be calculated later
          stockStatus: row.Availability || 'unknown',
          description: row.USP || ''
        };
      });
      
      // Score products based on relevance
      const scoredProducts = products.map((product: any) => {
        let score = 0;
        
        // Exact name match gets high score
        if (product.name.toLowerCase().includes(query.toLowerCase())) {
          score += 5;
        }
        
        // Use case relevance
        if (useCase) {
          const matches = product.useCases.filter((uc: string) => uc.toLowerCase().includes(useCase.toLowerCase()));
          score += matches.length * 2;
        }
        
        // Budget compatibility
        if (budget) {
          if (budget.min && product.price >= budget.min && product.price <= (budget.max || Infinity)) {
            score += 3;
          }
        }
        
        // Capacity matching
        if (capacity && product.capacity.toLowerCase().includes(capacity.toLowerCase())) {
          score += 2;
        }
        
        // Speed matching
        if (speed && product.speed && product.speed.toLowerCase().includes(speed.toLowerCase())) {
          score += 2;
        }
        
        // Type matching
        if (type && product.type && product.type.toLowerCase().includes(type.toLowerCase())) {
          score += 2;
        }
        
        return { ...product, score };
      });
      
      // Sort by score
      scoredProducts.sort((a: any, b: any) => b.score - a.score);
      
      // Generate recommendations
      const recommendations = [];
      
      if (scoredProducts.length === 0) {
        recommendations.push('Không tìm thấy sản phẩm RAM phù hợp. Hãy thử mở rộng ngân sách hoặc điều chỉnh yêu cầu.');
      } else {
        const avgPrice = scoredProducts.reduce((sum: number, p: any) => sum + p.price, 0) / scoredProducts.length;
        if (avgPrice > 2000000) {
          recommendations.push('Xem xét phiên bản cấu hình thấp hơn để tiết kiệm ngân sách');
        }
        
        if (scoredProducts.some((p: any) => p.useCases.some((uc: string) => uc.toLowerCase().includes('gaming')))) {
          recommendations.push('Đảm bảo chọn kit dual-channel để tối ưu hiệu năng gaming');
        }
        
        recommendations.push('Kiểm tra tương thích motherboard trước khi mua để đảm bảo hiệu suất tối ưu');
      }
      
      const summary = scoredProducts.length === 0
        ? `Không tìm thấy sản phẩm RAM nào cho "${query}"`
        : `Tìm thấy ${scoredProducts.length} sản phẩm RAM phù hợp`;
      
      console.log('✅ [RAM DB] Results:', {
        totalFound: scoredProducts.length,
        averageScore: scoredProducts.length > 0
          ? (scoredProducts.reduce((sum: number, p: any) => sum + p.score, 0) / scoredProducts.length).toFixed(1)
          : 0
      });
      
      return {
        products: scoredProducts,
        totalResults: scoredProducts.length,
        searchSummary: summary,
        recommendations
      };
    } catch (error) {
      console.error('❌ [RAM DB] Search failed:', error);
      throw new Error(`RAM database search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});