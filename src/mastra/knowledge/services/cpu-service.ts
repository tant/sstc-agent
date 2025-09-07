// src/mastra/knowledge/services/cpu-service.ts
import { Product, CPU } from '../products-data';

export class CpuService {
  private products: { products: { cpus: CPU[] } };

  constructor(products: any) {
    this.products = products;
  }

  // Example method: Find CPUs compatible with a given socket
  findCpusBySocket(socket: string): CPU[] {
    console.log(`[CpuService] Finding CPUs for socket: ${socket}`);
    return this.products.products.cpus.filter(cpu => cpu.specs.socket === socket);
  }
}
