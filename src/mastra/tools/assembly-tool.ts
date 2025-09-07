import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { productManager, companyPolicies } from '../knowledge/product-manager';

// Load products on module load
productManager.loadProducts().catch(console.error);

export const assemblyTool = createTool({
  id: 'assembly-tool',
  description: 'Calculate PC assembly service costs for compatible component combinations or desktop builds',
  inputSchema: z.object({
    buildType: z.enum(['custom', 'desktop']).default('custom'),
    desktopBuildId: z.string().optional(), // For desktop builds
    bareboneSku: z.string().optional(), // For custom builds
    cpuSku: z.string().optional(),
    ramSku: z.string().optional(),
    ssdSku: z.string().optional(),
    ramQuantity: z.number().default(1),
    ssdQuantity: z.number().default(1),
  }),
  outputSchema: z.object({
    buildType: z.string(),
    components: z.array(z.object({
      type: z.string(),
      sku: z.string(),
      name: z.string(),
      price: z.number(),
      quantity: z.number(),
    })),
    componentTotal: z.number(),
    assemblyFee: z.number(),
    totalCost: z.number(),
    currency: z.string(),
    estimatedTime: z.string(),
    compatibilityNotes: z.string(),
    useCase: z.string().optional(),
  }),
  execute: async ({ context }) => {
    console.log('🔧 ASSEMBLY-TOOL EXECUTING:', context);

    const { buildType = 'custom', desktopBuildId, bareboneSku, cpuSku, ramSku, ssdSku, ramQuantity = 1, ssdQuantity = 1 } = context as any;

    console.log('📋 ASSEMBLY PARAMS:', {
      buildType,
      desktopBuildId,
      bareboneSku,
      cpuSku,
      ramSku,
      ssdSku,
      ramQuantity,
      ssdQuantity
    });

    let components: any[] = [];
    let componentTotal = 0;
    let compatibilityNotes = '';
    let useCase = '';

    if (buildType === 'desktop' && desktopBuildId) {
      console.log('🖥️ DESKTOP BUILD MODE:', desktopBuildId);

      // Handle desktop build
      const desktopBuild = productManager.getDesktopBuildById(desktopBuildId);
      if (desktopBuild) {
        console.log('✅ DESKTOP BUILD FOUND:', desktopBuild.name);

        useCase = desktopBuild.useCase.join(', ');

        // Add desktop build as component
        components.push({
          type: 'Desktop PC',
          sku: desktopBuild.sku,
          name: desktopBuild.name,
          price: desktopBuild.totalPrice,
          quantity: 1,
        });
        componentTotal = desktopBuild.totalPrice;

        console.log('💰 DESKTOP TOTAL:', componentTotal);
      } else {
        console.log('❌ DESKTOP BUILD NOT FOUND');
        compatibilityNotes = 'Desktop build not found';
      }
    } else {
      console.log('🔧 CUSTOM BUILD MODE');

      // Handle custom build
      if (bareboneSku) {
        console.log('🔍 LOOKING FOR BAREBONE:', bareboneSku);
        const barebone = productManager.findBySku(bareboneSku);
        if (barebone) {
          console.log('✅ BAREBONE FOUND:', barebone.name);
          components.push({
            type: 'Barebone',
            sku: barebone.sku,
            name: barebone.name,
            price: barebone.price,
            quantity: 1,
          });
          componentTotal += barebone.price;
        } else {
          console.log('❌ BAREBONE NOT FOUND');
        }
      }

      if (cpuSku) {
        console.log('🔍 LOOKING FOR CPU:', cpuSku);
        const cpu = productManager.findBySku(cpuSku);
        if (cpu) {
          console.log('✅ CPU FOUND:', cpu.name);
          components.push({
            type: 'CPU',
            sku: cpu.sku,
            name: cpu.name,
            price: cpu.price,
            quantity: 1,
          });
          componentTotal += cpu.price;
        } else {
          console.log('❌ CPU NOT FOUND');
        }
      }

      if (ramSku) {
        console.log('🔍 LOOKING FOR RAM:', ramSku, 'x', ramQuantity);
        const ram = productManager.findByVariantSku(ramSku);
        if (ram) {
          console.log('✅ RAM FOUND:', ram.capacityGB, 'GB');
          const parentProduct = productManager.findParentProductByVariantSku(ram.sku);
          components.push({
            type: 'RAM',
            sku: ram.sku,
            name: parentProduct ? `${parentProduct.name} - ${ram.capacityGB}GB` : `RAM ${ram.capacityGB}GB`,
            price: ram.price * ramQuantity,
            quantity: ramQuantity,
          });
          componentTotal += ram.price * ramQuantity;
        } else {
          console.log('❌ RAM NOT FOUND');
        }
      }

      if (ssdSku) {
        console.log('🔍 LOOKING FOR SSD:', ssdSku, 'x', ssdQuantity);
        const ssd = productManager.findByVariantSku(ssdSku);
        if (ssd) {
          console.log('✅ SSD FOUND:', ssd.capacityGB, 'GB');
          const parentProduct = productManager.findParentProductByVariantSku(ssd.sku);
          components.push({
            type: 'SSD',
            sku: ssd.sku,
            name: parentProduct ? `${parentProduct.name} - ${ssd.capacityGB}GB` : `SSD ${ssd.capacityGB}GB`,
            price: ssd.price * ssdQuantity,
            quantity: ssdQuantity,
          });
          componentTotal += ssd.price * ssdQuantity;
        } else {
          console.log('❌ SSD NOT FOUND');
        }
      }
    }

    const assemblyFee = 0; // FREE assembly
    const totalCost = componentTotal + assemblyFee;

    console.log('💰 ASSEMBLY CALCULATION:', {
      componentTotal,
      assemblyFee,
      totalCost,
      componentsCount: components.length
    });

    const result = {
      buildType,
      components,
      componentTotal,
      assemblyFee,
      totalCost,
      currency: 'VND',
      estimatedTime: '3-5 ngày làm việc',
      compatibilityNotes,
      useCase
    };

    console.log('🎯 ASSEMBLY-TOOL RESULT:', result);
    return result;
  },
});
