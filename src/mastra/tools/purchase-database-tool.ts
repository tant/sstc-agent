import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Mock SSTC Product Database
const MOCK_PRODUCT_DATABASE = {
  ssd: {
    'SSD-Premium-500GB': {
      id: 'SSD-Premium-500GB',
      name: 'SSTC Premium SSD 500GB',
      type: 'SSD',
      capacity: '500GB',
      series: 'Premium',
      price: 2990000,
      warranty: 5,
      readSpeed: '7000 MB/s',
      writeSpeed: '6800 MB/s',
      interface: 'PCIe 4.0 x4',
      formFactor: 'M.2 2280',
      compatible: ['AM4 Motherboards', 'AM5 Motherboards', 'Intel LGA1700'],
      useCases: ['gaming', 'content-creation', 'professional'],
      stockStatus: 'in_stock',
      description: 'SSD tốc độ cao cho gaming và sáng tạo nội dung'
    },
    'SSD-Plus-1TB': {
      id: 'SSD-Plus-1TB',
      name: 'SSTC Plus SSD 1TB',
      type: 'SSD',
      capacity: '1TB',
      series: 'Plus',
      price: 4490000,
      warranty: 3,
      readSpeed: '3400 MB/s',
      writeSpeed: '3000 MB/s',
      interface: 'PCIe 3.0 x4',
      formFactor: 'M.2 2280',
      compatible: ['AM4 Motherboards', 'AM5 Motherboards', 'Intel LGA1700'],
      useCases: ['gaming', 'office', 'multimedia'],
      stockStatus: 'in_stock',
      description: 'SSD cân bằng giữa hiệu năng và giá thành'
    },
    'SSD-Value-250GB': {
      id: 'SSD-Value-250GB',
      name: 'SSTC Value SSD 250GB',
      type: 'SSD',
      capacity: '250GB',
      series: 'Value',
      price: 1590000,
      warranty: 3,
      readSpeed: '550 MB/s',
      writeSpeed: '500 MB/s',
      interface: 'SATA III',
      formFactor: '2.5"',
      compatible: ['All Motherboards with SATA'],
      useCases: ['office', 'basic-use', 'budget'],
      stockStatus: 'low_stock',
      description: 'SSD tiết kiệm cho nhu cầu cơ bản'
    }
  },

  vga: {
    'VGA-RTX4070S-12GB': {
      id: 'VGA-RTX4070S-12GB',
      name: 'Zotac RTX 4070 Super Gaming 12GB',
      type: 'VGA',
      chipset: 'RTX 4070 Super',
      vram: '12GB GDDR6X',
      coreClock: '1980 MHz',
      memoryClock: '14 Gbps',
      powerConsumption: '220W',
      recommendedPSU: '700W',
      price: 18990000,
      warranty: 3,
      interface: 'PCIe 4.0 x16',
      useCases: ['gaming-4k', 'content-creation', 'streaming'],
      stockStatus: 'in_stock',
      description: 'Card đồ họa mạnh mẽ cho gaming 4K và sáng tạo'
    },
    'VGA-RTX4060-8GB': {
      id: 'VGA-RTX4060-8GB',
      name: 'Zotac RTX 4060 Gaming 8GB',
      type: 'VGA',
      chipset: 'RTX 4060',
      vram: '8GB GDDR6',
      coreClock: '1280 MHz',
      memoryClock: '8500 MHz',
      powerConsumption: '128W',
      recommendedPSU: '500W',
      price: 11990000,
      warranty: 3,
      interface: 'PCIe 4.0 x16',
      useCases: ['gaming-1440p', 'streaming', 'office'],
      stockStatus: 'in_stock',
      description: 'Card gaming mạnh mẽ cho 1440p gaming'
    },
    'VGA-RTX3050-8GB': {
      id: 'VGA-RTX3050-8GB',
      name: 'Zotac RTX 3050 Gaming 8GB',
      type: 'VGA',
      chipset: 'RTX 3050',
      vram: '8GB GDDR6',
      coreClock: '1046 MHz',
      memoryClock: '7000 MHz',
      powerConsumption: '130W',
      recommendedPSU: '550W',
      price: 7790000,
      warranty: 3,
      interface: 'PCIe 4.0 x16',
      useCases: ['gaming-1080p', 'office', 'casual-gaming'],
      stockStatus: 'in_stock',
      description: 'Card entry-level cho gaming 1080p'
    }
  },

  motherboard: {
    'MAIN-AM4-B450': {
      id: 'MAIN-AM4-B450',
      name: 'SSTC AM4 B450 Motherboard',
      type: 'Motherboard',
      socket: 'AM4',
      chipset: 'B450',
      supportedCpus: ['Ryzen 2000', 'Ryzen 3000', 'Ryzen 4000', 'Ryzen 5000'],
      ramType: 'DDR4',
      maxRam: 128,
      ramSlots: 4,
      pcieVersion: '3.0',
      sataPorts: 6,
      m2Slots: 2,
      usbPorts: ['USB 2.0 x2', 'USB 3.0 x4'],
      price: 4290000,
      warranty: 3,
      useCases: ['gaming-budget', 'office', 'budget-builds'],
      stockStatus: 'in_stock',
      description: 'Mainboard giá tốt cho CPU AMD mainstream'
    },
    'MAIN-AM5-B650': {
      id: 'MAIN-AM5-B650',
      name: 'SSTC AM5 B650 Motherboard',
      type: 'Motherboard',
      socket: 'AM5',
      chipset: 'B650',
      supportedCpus: ['Ryzen 7000'],
      ramType: 'DDR5',
      maxRam: 128,
      ramSlots: 4,
      pcieVersion: '4.0',
      sataPorts: 4,
      m2Slots: 3,
      usbPorts: ['USB 2.0 x3', 'USB 3.2 x6', 'USB-C x1'],
      price: 6990000,
      warranty: 3,
      useCases: ['gaming-high-end', 'content-creation', 'future-proof'],
      stockStatus: 'in_stock',
      description: 'Mainboard high-end với PCIe 4.0 và DDR5'
    },
    'MAIN-INTEL-LGA1700': {
      id: 'MAIN-INTEL-LGA1700',
      name: 'SSTC LGA1700 B660 Motherboard',
      type: 'Motherboard',
      socket: 'LGA1700',
      chipset: 'B660',
      supportedCpus: ['Intel 12th Gen', 'Intel 13th Gen', 'Intel 14th Gen'],
      ramType: 'DDR4',
      maxRam: 128,
      ramSlots: 4,
      pcieVersion: '4.0',
      sataPorts: 6,
      m2Slots: 2,
      usbPorts: ['USB 2.0 x4', 'USB 3.2 x6', 'Thunderbolt x1'],
      price: 6490000,
      warranty: 3,
      useCases: ['gaming-mid', 'office-pro', 'intel-systems'],
      stockStatus: 'in_stock',
      description: 'Mainboard mạnh mẽ cho hệ thống Intel thế hệ 12/13'
    }
  }
};

// Search input schema
const productSearchInputSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  category: z.enum(['ssd', 'vga', 'motherboard', 'all']).optional(),
  budget: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }).optional(),
  useCase: z.array(z.string()).optional(),
  requirements: z.object({
    minRam: z.number().optional(),
    minStorage: z.number().optional(),
    gamingFocused: z.boolean().optional()
  }).optional()
});

// Search output schema
const productSearchOutputSchema = z.object({
  products: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    price: z.number(),
    score: z.number(),
    stockStatus: z.string(),
    description: z.string(),
    specifications: z.record(z.any())
  })),
  totalResults: z.number(),
  searchSummary: z.string(),
  recommendations: z.array(z.string())
});

export const purchaseDatabaseTool = createTool({
  id: 'purchase-database-search',
  description: 'Search SSTC product database for purchase recommendations',
  inputSchema: productSearchInputSchema,
  outputSchema: productSearchOutputSchema,
  execute: async (context) => {
    const { query, category = 'all', budget, useCase, requirements } = (context as any);

    console.log('🔍 [Purchase DB] Searching:', {
      query,
      category,
      budget,
      useCase,
      requirements
    });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    let allProducts: any[] = [];

    // Collect products based on category
    if (category === 'all' || category === 'ssd') {
      Object.values(MOCK_PRODUCT_DATABASE.ssd).forEach(product => allProducts.push(product));
    }
    if (category === 'all' || category === 'vga') {
      Object.values(MOCK_PRODUCT_DATABASE.vga).forEach(product => allProducts.push(product));
    }
    if (category === 'all' || category === 'motherboard') {
      Object.values(MOCK_PRODUCT_DATABASE.motherboard).forEach(product => allProducts.push(product));
    }

    // Filter by budget
    if (budget) {
      if (budget.min) {
        allProducts = allProducts.filter(p => p.price >= budget.min);
      }
      if (budget.max) {
        allProducts = allProducts.filter(p => p.price <= budget.max);
      }
    }

    // Simple text search in name and description
    const lowerQuery = query.toLowerCase();
    let searchResults = allProducts.filter(product =>
      product.name.toLowerCase().includes(lowerQuery) ||
      (product.description && product.description.toLowerCase().includes(lowerQuery)) ||
      product.type.toLowerCase().includes(lowerQuery)
    );

    // Score products based on relevance
    searchResults = searchResults.map(product => {
      let score = 0;

      // Exact name match gets high score
      if (product.name.toLowerCase().includes(lowerQuery)) {
        score += 5;
      }

      // Use case relevance
      if (useCase) {
        const matches = useCase.filter(uc => product.useCases && product.useCases.includes(uc));
        score += matches.length * 2;
      }

      // Budget compatibility
      if (budget) {
        if (budget.min && product.price >= budget.min && product.price <= (budget.max || Infinity)) {
          score += 3;
        }
      }

      // Requirements matching
      if (requirements && requirements.minStorage && product.capacity) {
        const productGb = parseInt(product.capacity.replace('GB', ''));
        if (productGb >= requirements.minStorage) {
          score += 2;
        }
      }

      return { ...product, score };
    });

    // Sort by score and limit results
    searchResults.sort((a, b) => b.score - a.score);
    const topResults = searchResults.slice(0, 5);

    // Generate recommendations
    const recommendations = [];

    if (topResults.length === 0) {
      recommendations.push('Không tìm thấy sản phẩm phù hợp. Hãy thử mở rộng ngân sách hoặc điều chỉnh yêu cầu.');
    } else {
      const avgPrice = topResults.reduce((sum, p) => sum + p.price, 0) / topResults.length;
      if (avgPrice > 10000000) {
        recommendations.push('Xem xét phiên bản cấu hình thấp hơn để tiết kiệm ngân sách');
      }

      if (topResults.some(p => p.useCases?.includes('gaming'))) {
        recommendations.push('Thêm PSU mạnh để đảm bảo hiệu năng gaming tối ưu');
      }

      recommendations.push('Kiểm tra compatibility trước khi mua combo linh kiện');
    }

    const summary = searchResults.length === 0
      ? `Không tìm thấy sản phẩm nào cho "${query}"`
      : `Tìm thấy ${searchResults.length} sản phẩm, ${topResults.length} kết quả phù hợp nhất`;

    const formattedResults = topResults.map(product => ({
      id: product.id,
      name: product.name,
      type: product.type,
      price: product.price,
      score: product.score,
      stockStatus: product.stockStatus,
      description: product.description,
      specifications: {
        warranty: product.warranty + ' năm',
        keySpecs: product.readSpeed || product.chipset || product.socket || product.vram
      }
    }));

    console.log('✅ [Purchase DB] Results:', {
      totalFound: searchResults.length,
      returned: formattedResults.length,
      averageScore: formattedResults.length > 0
        ? (formattedResults.reduce((sum, p) => sum + p.score, 0) / formattedResults.length).toFixed(1)
        : 0
    });

    return {
      products: formattedResults,
      totalResults: searchResults.length,
      searchSummary: summary,
      recommendations
    };
  }
});
