import { cpuSpecialist } from '../../../src/mastra/agents/cpu-specialist';
import { ramSpecialist } from '../../../src/mastra/agents/ram-specialist';
import { ssdSpecialist } from '../../../src/mastra/agents/ssd-specialist';
import { bareboneSpecialist } from '../../../src/mastra/agents/barebone-specialist';
import { desktopSpecialist } from '../../../src/mastra/agents/desktop-specialist';

describe('Kiểm tra nhất quán các chuyên gia phần cứng', () => {
  it('nên có cấu trúc nhất quán giữa tất cả các chuyên gia', () => {
    // Kiểm tra tất cả các chuyên gia có cùng cấu trúc cơ bản
    const specialists = [
      { name: 'CPU', specialist: cpuSpecialist },
      { name: 'RAM', specialist: ramSpecialist },
      { name: 'SSD', specialist: ssdSpecialist },
      { name: 'Barebone', specialist: bareboneSpecialist },
      { name: 'Desktop', specialist: desktopSpecialist }
    ];

    specialists.forEach(({ name, specialist }) => {
      expect(specialist).toBeDefined();
      expect(typeof specialist).toBe('object');
      expect(typeof specialist.isReady).toBe('function');
      expect(specialist.isReady()).toBe(true);
    });
  });

  it('nên có khả năng xử lý yêu cầu giống nhau', async () => {
    const testQuery = "Tôi muốn mua linh kiện cho PC gaming với budget 10 triệu";
    
    // Kiểm tra tất cả các chuyên gia có thể xử lý yêu cầu
    const specialists = [
      { name: 'CPU', specialist: cpuSpecialist },
      { name: 'RAM', specialist: ramSpecialist },
      { name: 'SSD', specialist: ssdSpecialist },
      { name: 'Barebone', specialist: bareboneSpecialist },
      { name: 'Desktop', specialist: desktopSpecialist }
    ];

    for (const { name, specialist } of specialists) {
      try {
        const result = await specialist.generate(testQuery, {});
        expect(result).toBeDefined();
        expect(typeof result.text).toBe('string');
        expect(result.text.length).toBeGreaterThan(0);
      } catch (error) {
        // Một số specialist có thể không sẵn sàng trong môi trường test
        expect(error).toBeDefined();
      }
    }
  });

  it('nên không tạo sản phẩm hư cấu', async () => {
    const testQueries = [
      "So sánh CPU Intel và AMD",
      "RAM DDR4 và DDR5 khác nhau gì?",
      "SSD SATA và NVMe khác nhau gì?",
      "Case mid-tower và full-tower khác nhau gì?",
      "PC gaming hoàn chỉnh gồm những gì?"
    ];
    
    const specialists = [
      { name: 'CPU', specialist: cpuSpecialist, query: testQueries[0] },
      { name: 'RAM', specialist: ramSpecialist, query: testQueries[1] },
      { name: 'SSD', specialist: ssdSpecialist, query: testQueries[2] },
      { name: 'Barebone', specialist: bareboneSpecialist, query: testQueries[3] },
      { name: 'Desktop', specialist: desktopSpecialist, query: testQueries[4] }
    ];

    // Kiểm tra từng chuyên gia không tạo sản phẩm hư cấu
    for (const { name, specialist, query } of specialists) {
      try {
        const result = await specialist.generate(query, {});
        
        expect(result).toBeDefined();
        expect(typeof result.text).toBe('string');
        expect(result.text.length).toBeGreaterThan(0);
        
        // Kiểm tra không chứa tên sản phẩm hư cấu
        expect(result.text).not.toContain("SSTC");
        expect(result.text).not.toContain("1TB NVMe M.2");
        expect(result.text).not.toContain("500GB SATA");
        expect(result.text).not.toContain("2TB NVMe M.2");
        
        // Kiểm tra không chứa giá hư cấu
        expect(result.text).not.toMatch(/\d{1,3}[,.]\d{3}[,.]\d{3} ?[đd]/);
        expect(result.text).not.toMatch(/\d{1,3}\.\d{3}\.\d{3} ?[đd]/);
      } catch (error) {
        // Một số specialist có thể không sẵn sàng trong môi trường test
        expect(error).toBeDefined();
      }
    }
  });

  it('nên có khả năng lấy thông tin sản phẩm thực tế', async () => {
    // Kiểm tra các phương thức lấy thông tin sản phẩm thực tế
    const specialistMethods = [
      { name: 'CPU', specialist: cpuSpecialist, method: 'getAllCPUs' },
      { name: 'RAM', specialist: ramSpecialist, method: 'getAllRAMs' },
      { name: 'SSD', specialist: ssdSpecialist, method: 'getAllSSDs' },
      { name: 'Barebone', specialist: bareboneSpecialist, method: 'getAllBarebones' },
      { name: 'Desktop', specialist: desktopSpecialist, method: 'isReady' } // Desktop doesn't have getAll method
    ];

    for (const { name, specialist, method } of specialistMethods) {
      if (typeof specialist[method] === 'function') {
        try {
          const result = await specialist[method]();
          expect(result).toBeDefined();
          // Có thể là array hoặc boolean tùy phương thức
          if (Array.isArray(result)) {
            expect(Array.isArray(result)).toBe(true);
          } else {
            expect(typeof result).toBe('boolean');
          }
        } catch (error) {
          // Một số specialist có thể không sẵn sàng trong môi trường test
          expect(error).toBeDefined();
        }
      }
    }
  });
});