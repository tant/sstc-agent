// src/mastra/knowledge/services/cpu-service.ts
import { Product, CPU } from '../products-data';

export class CpuService {
  private products: { products: { cpus: CPU[] } };

  constructor(products: any) {
    this.products = products;
  }

  // Detect CPU requirements from query - socket and optional linked system model
  detectCpuRequirements(query: string): { socket?: string; linkedSystemModel?: string } {
    const q = query.toLowerCase();
    const result: any = {};

    // Simple socket detection examples: 'lga1200', 'lga1700', 'am4' (we only sell Intel so AM4 would be ignored)
    const socketMatch = q.match(/lga\s*\d{3,4}|lga\d{3,4}|socket\s*lga\s*\d{3,4}/i);
    if (socketMatch) {
      result.socket = socketMatch[0].toLowerCase().replace(/socket|\s+/g, '');
    }

    // Detect linked system model like 'for asus tuf b560' or 'dòng hp pavilion'
    const modelMatch = q.match(/(for|cho|dành cho)\s+([a-z0-9\-\s]+)/i);
    if (modelMatch) {
      result.linkedSystemModel = modelMatch[2].trim();
    }

    console.log('[CpuService] detectCpuRequirements ->', result);
    return result;
  }

  // Recommend CPUs (Intel-only). Match by socket primarily, prefer linkedSystemModel if provided.
  recommendCpus(options: { socket?: string; linkedSystemModel?: string; budget?: number } = {}): CPU[] {
    const { socket, linkedSystemModel, budget } = options;
    console.log('[CpuService] recommendCpus with', options);

    // Filter Intel CPUs only (assume tag 'intel' present)
    let candidates = this.products.products.cpus.filter(cpu => cpu.tags?.includes('intel'));

    if (socket) {
      candidates = candidates.filter(cpu => (cpu.specs?.socket || '').toLowerCase() === socket.toLowerCase());
    }

    if (linkedSystemModel) {
      // Prefer CPUs that mention the linked system model in tags or specs.recommendedFor
      const preferred = candidates.filter(cpu => {
        const tagsMatch = (cpu.tags || []).some(t => t.toLowerCase().includes(linkedSystemModel.toLowerCase()));
        const recommendedFor = (cpu.specs && (cpu.specs as any).recommendedFor) ? String((cpu.specs as any).recommendedFor).toLowerCase() : '';
        const specsMatch = recommendedFor.includes(linkedSystemModel.toLowerCase());
        return tagsMatch || specsMatch;
      });
      if (preferred.length > 0) {
        candidates = preferred;
      }
    }

    if (budget) {
      candidates = candidates.filter(cpu => cpu.price <= budget);
    }

    // Sort by price ascending
    candidates.sort((a, b) => (a.price || 0) - (b.price || 0));

    return candidates.slice(0, 5);
  }

  // Example method: Find CPUs compatible with a given socket
  findCpusBySocket(socket: string): CPU[] {
    console.log(`[CpuService] Finding CPUs for socket: ${socket}`);
    return this.products.products.cpus.filter(cpu => cpu.specs.socket === socket);
  }
}
