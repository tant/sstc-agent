import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Mock product data for compatibility checking
const MOCK_PRODUCT_DATA = {
  // Mainboards
  motherboards: {
    'AM4-B450': {
      socket: 'AM4',
      chipset: 'B450',
      supportedCpus: ['Ryzen 2000', 'Ryzen 3000', 'Ryzen 4000', 'Ryzen 5000'],
      pcIeVersion: '3.0',
      ramType: 'DDR4',
      maxRamSpeed: 3200,
      notes: 'Good for budget builds with Ryzen 3000/4000 series'
    },
    'AM5-B650': {
      socket: 'AM5',
      chipset: 'B650',
      supportedCpus: ['Ryzen 7000'],
      pcIeVersion: '4.0',
      ramType: 'DDR5',
      maxRamSpeed: 6400,
      notes: 'High-end motherboard with PCIe 4.0 and DDR5 support'
    },
    'INTEL-LGA1700': {
      socket: 'LGA1700',
      chipset: 'B660',
      supportedCpus: ['Intel 12th Gen', 'Intel 13th Gen', 'Intel 14th Gen'],
      pcIeVersion: '4.0',
      ramType: 'DDR4',
      maxRamSpeed: 3200,
      notes: 'Intel platform with PCIe 4.0 support'
    }
  },

  // GPUs
  gpus: {
    'RTX-3060': {
      name: 'RTX 3060',
      chipset: 'GA106',
      pcieRequirements: '4.0 x16',
      recommendedMinPSU: '600W',
      powerConnectors: ['8-pin'],
      ram: '12GB GDDR6',
      notes: 'Excellent 1440p gaming performance'
    },
    'RTX-4070-SUPER': {
      name: 'RTX 4070 Super',
      chipset: 'AD103',
      pcieRequirements: '4.0 x16',
      recommendedMinPSU: '700W',
      powerConnectors: ['8-pin', '8-pin'],
      ram: '12GB GDDR6X',
      notes: 'High-end gaming GPU with 4K capability'
    },
    'RTX-3050': {
      name: 'RTX 3050',
      chipset: 'GA107',
      pcieRequirements: '4.0 x16',
      recommendedMinPSU: '550W',
      powerConnectors: ['8-pin'],
      ram: '8GB GDDR6',
      notes: 'Entry-level RTX 30 series, great value for 1080p gaming'
    }
  },

  // Compatibility matrix
  compatibilityMatrix: {
    'AM4-B450': ['RTX-3060', 'RTX-4070-SUPER'],
    'AM5-B650': ['RTX-4070-SUPER', 'RTX-3050'],
    'INTEL-LGA1700': ['RTX-3060', 'RTX-3050']
  }
};

// Compatibility check input schema
const compatibilityCheckInputSchema = z.object({
  motherboardId: z.string().min(1, 'Motherboard ID is required'),
  gpuId: z.string().min(1, 'GPU ID is required'),
  requirements: z.object({
    intendedUse: z.enum(['gaming', 'streaming', 'content-creation', 'office']).optional(),
    budget: z.number().optional()
  }).optional()
});

// Compatibility check output schema
const compatibilityCheckOutputSchema = z.object({
  isCompatible: z.boolean(),
  confidence: z.enum(['high', 'medium', 'low']),
  motherboard: z.object({
    id: z.string(),
    socket: z.string(),
    chipset: z.string(),
    pcieVersion: z.string()
  }),
  gpu: z.object({
    id: z.string(),
    name: z.string(),
    pcieRequirements: z.string()
  }),
  warnings: z.array(z.string()),
  recommendations: z.array(z.string()),
  alternatives: z.array(z.object({
    motherboardId: z.string(),
    gpuId: z.string(),
    reason: z.string()
  })).optional(),
  message: z.string()
});

export const productCompatibilityTool = createTool({
  id: 'product-compatibility-checker',
  description: 'Check compatibility between SSTC motherboard and GPU components',
  inputSchema: compatibilityCheckInputSchema,
  outputSchema: compatibilityCheckOutputSchema,
  execute: async (context) => {
    const { motherboardId, gpuId } = (context as any);

    console.log('🔍 [Compatibility Tool] Checking:', { motherboardId, gpuId });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get product data
    const motherboard = MOCK_PRODUCT_DATA.motherboards[motherboardId as keyof typeof MOCK_PRODUCT_DATA.motherboards];
    const gpu = MOCK_PRODUCT_DATA.gpus[gpuId as keyof typeof MOCK_PRODUCT_DATA.gpus];

    if (!motherboard) {
      console.log('❌ [Compatibility Tool] Motherboard not found:', motherboardId);
      return {
        isCompatible: false,
        confidence: 'low',
        motherboard: { id: motherboardId, socket: 'Unknown', chipset: 'Unknown', pcieVersion: 'Unknown' },
        gpu: { id: gpuId, name: 'Unknown', pcieRequirements: 'Unknown' },
        warnings: ['Motherboard not found in database'],
        recommendations: ['Contact SSTC support for motherboard verification'],
        message: `Không tìm thấy thông tin mainboard "${motherboardId}". Vui lòng liên hệ SSTC để được hỗ trợ.`
      };
    }

    if (!gpu) {
      console.log('❌ [Compatibility Tool] GPU not found:', gpuId);
      return {
        isCompatible: false,
        confidence: 'low',
        motherboard: {
          id: motherboardId,
          socket: motherboard.socket,
          chipset: motherboard.chipset,
          pcieVersion: motherboard.pcIeVersion
        },
        gpu: { id: gpuId, name: 'Unknown', pcieRequirements: 'Unknown' },
        warnings: ['GPU not found in database'],
        recommendations: ['Contact SSTC support for GPU verification'],
        message: `Không tìm thấy thông tin card đồ họa "${gpuId}". Vui lòng liên hệ SSTC để được hỗ trợ.`
      };
    }

    // Check basic compatibility
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let isCompatible = true;
    let confidence: 'high' | 'medium' | 'low' = 'high';

    // PCIe version compatibility
    const motherboardPcieVersion = parseFloat(motherboard.pcIeVersion);
    const gpuPcieRequirement = parseFloat(gpu.pcieRequirements.split(' ')[0]);

    if (gpuPcieRequirement > motherboardPcieVersion) {
      warnings.push(`GPU yêu cầu PCIe ${gpuPcieRequirement} nhưng mainboard chỉ hỗ trợ PCIe ${motherboardPcieVersion}`);
      warnings.push(`GPU sẽ hoạt động ở tốc độ PCIe ${motherboardPcieVersion} thay vì ${gpuPcieRequirement} tối ưu`);
      confidence = 'medium';
    } else {
      recommendations.push('PCIe compatibility: ✅ GPU hoạt động tối ưu');
    }

    // Check official compatibility matrix
    const compatibleGPUs = MOCK_PRODUCT_DATA.compatibilityMatrix[motherboardId as keyof typeof MOCK_PRODUCT_DATA.compatibilityMatrix] || [];
    const isInCompatibilityMatrix = compatibleGPUs.includes(gpuId);

    if (!isInCompatibilityMatrix) {
      warnings.push('Combo này chưa được test chính thức bởi SSTC');
      warnings.push('Có thể gặp vấn đề tương thích nhỏ');
      confidence = confidence === 'high' ? 'medium' : 'low';
    } else {
      recommendations.push('✅ Combo đã được test và chứng nhận bởi SSTC');
    }

    // RAM type considerations for Intel motherboards
    if (motherboardId.includes('INTEL') && motherboard.pcIeVersion === '4.0') {
      recommendations.push('💡 Với Intel 12th-14th gen, PCIe 4.0/5.0 chỉ hoạt động tối ưu khi dùng H670/Z690+ motherboards');
    }

    // PSU requirements
    if (gpu.recommendedMinPSU) {
      recommendations.push(`⚡ Nguồn điện tối thiểu khuyến nghị: ${gpu.recommendedMinPSU}`);
    }

    // Generate alternatives if needed
    const alternatives = [];
    if (confidence === 'low') {
      // Suggest better alternatives
      if (motherboardId === 'AM4-B450' && gpuId === 'RTX-4070-SUPER') {
        alternatives.push({
          motherboardId: 'AM5-B650',
          gpuId: 'RTX-4070-SUPER',
          reason: 'AM5 socket cho AMD Ryzen 7000 series với PCIe 4.0 native, phù hợp hơn với RTX 4070 Super'
        });
      }
    }

    console.log('✅ [Compatibility Tool] Check completed:', {
      isCompatible,
      confidence,
      warningsCount: warnings.length,
      recommendationsCount: recommendations.length
    });

    if (confidence === 'high') {
      return {
        isCompatible,
        confidence: 'high' as const,
        motherboard: {
          id: motherboardId,
          socket: motherboard.socket,
          chipset: motherboard.chipset,
          pcieVersion: motherboard.pcIeVersion
        },
        gpu: {
          id: gpuId,
          name: gpu.name,
          pcieRequirements: gpu.pcieRequirements
        },
        warnings,
        recommendations,
        alternatives,
        message: `✅ Mainboard ${motherboardId} và GPU ${gpuId} hoàn toàn tương thích! Đây là combo được khuyến nghị.`
      };
    } else if (confidence === 'medium') {
      return {
        isCompatible,
        confidence: 'medium' as const,
        motherboard: {
          id: motherboardId,
          socket: motherboard.socket,
          chipset: motherboard.chipset,
          pcieVersion: motherboard.pcIeVersion
        },
        gpu: {
          id: gpuId,
          name: gpu.name,
          pcieRequirements: gpu.pcieRequirements
        },
        warnings,
        recommendations,
        alternatives,
        message: `⚠️ Có thể chạy được nhưng cần chú ý một số điểm. Xem warnings để biết thêm chi tiết.`
      };
    } else {
      return {
        isCompatible,
        confidence: 'low' as const,
        motherboard: {
          id: motherboardId,
          socket: motherboard.socket,
          chipset: motherboard.chipset,
          pcieVersion: motherboard.pcIeVersion
        },
        gpu: {
          id: gpuId,
          name: gpu.name,
          pcieRequirements: gpu.pcieRequirements
        },
        warnings,
        recommendations,
        alternatives,
        message: `❌ Không khuyến nghị combo này do có vấn đề tương thích. Xem alternatives để có lựa chọn tốt hơn.`
      };
    }
  }
});
