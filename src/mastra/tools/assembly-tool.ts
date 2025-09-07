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
    const { buildType = 'custom', desktopBuildId, bareboneSku, cpuSku, ramSku, ssdSku, ramQuantity = 1, ssdQuantity = 1 } = context as any;

    let components: any[] = [];
    let componentTotal = 0;
    let compatibilityNotes = '';
    let useCase = '';

    if (buildType === 'desktop' && desktopBuildId) {
      // Handle desktop build
      const desktopBuild = productManager.getDesktopBuildById(desktopBuildId);
      if (desktopBuild) {
        useCase = desktopBuild.useCase.join(', ');
        componentTotal = desktopBuild.totalPrice;
        compatibilityNotes = 'Pre-configured desktop build - all components guaranteed compatible';

        // Add components from desktop build with proper names
        if (desktopBuild.components.barebone) {
          const barebone = productManager.findBySku(desktopBuild.components.barebone);
          if (barebone) {
            components.push({
              type: 'Barebone',
              sku: barebone.sku,
              name: barebone.name,
              price: barebone.price,
              quantity: 1,
            });
          }
        }

        if (desktopBuild.components.cpu) {
          const cpu = productManager.findBySku(desktopBuild.components.cpu);
          if (cpu) {
            components.push({
              type: 'CPU',
              sku: cpu.sku,
              name: cpu.name,
              price: cpu.price,
              quantity: 1,
            });
          }
        }

        if (desktopBuild.components.ram) {
          const ram = productManager.findByVariantSku(desktopBuild.components.ram);
          if (ram) {
            const parentProduct = productManager.findParentProductByVariantSku(ram.sku);
            components.push({
              type: 'RAM',
              sku: ram.sku,
              name: parentProduct ? `${parentProduct.name} - ${ram.capacityGB}GB` : `RAM ${ram.capacityGB}GB`,
              price: ram.price,
              quantity: 1,
            });
          }
        }

        if (desktopBuild.components.ssd) {
          const ssd = productManager.findByVariantSku(desktopBuild.components.ssd);
          if (ssd) {
            const parentProduct = productManager.findParentProductByVariantSku(ssd.sku);
            components.push({
              type: 'SSD',
              sku: ssd.sku,
              name: parentProduct ? `${parentProduct.name} - ${ssd.capacityGB}GB` : `SSD ${ssd.capacityGB}GB`,
              price: ssd.price,
              quantity: 1,
            });
          }
        }
      }
    } else {
      // Handle custom build
      if (bareboneSku) {
        const barebone = productManager.findBySku(bareboneSku);
        if (barebone) {
          components.push({
            type: 'Barebone',
            sku: barebone.sku,
            name: barebone.name,
            price: barebone.price,
            quantity: 1,
          });
          componentTotal += barebone.price;
        }
      }

      if (cpuSku) {
        const cpu = productManager.findBySku(cpuSku);
        if (cpu) {
          components.push({
            type: 'CPU',
            sku: cpu.sku,
            name: cpu.name,
            price: cpu.price,
            quantity: 1,
          });
          componentTotal += cpu.price;
        }
      }

      if (ramSku) {
        const ram = productManager.findBySku(ramSku);
        if (ram) {
          components.push({
            type: 'RAM',
            sku: ram.sku,
            name: ram.name,
            price: ram.price,
            quantity: ramQuantity,
          });
          componentTotal += ram.price * ramQuantity;
        }
      }

      if (ssdSku) {
        const ssd = productManager.findBySku(ssdSku);
        if (ssd) {
          components.push({
            type: 'SSD',
            sku: ssd.sku,
            name: ssd.name,
            price: ssd.price,
            quantity: ssdQuantity,
          });
          componentTotal += ssd.price * ssdQuantity;
        }
      }

      compatibilityNotes = 'Custom build - please verify component compatibility';
    }

    // Assembly fee: FREE (temporarily)
    const assemblyFee = 0;
    const totalCost = componentTotal + assemblyFee;

    return {
      buildType,
      components,
      componentTotal,
      assemblyFee,
      totalCost,
      currency: 'VND',
      estimatedTime: buildType === 'desktop' ? '1-2 business days' : '3-5 business days',
      compatibilityNotes,
      useCase,
    };
  },
});
