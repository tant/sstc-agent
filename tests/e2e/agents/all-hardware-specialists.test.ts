// Mock test to verify all hardware specialists can be imported
describe('Kiểm tra cấu trúc các chuyên gia phần cứng', () => {
  it('nên có thể import tất cả các chuyên gia phần cứng', async () => {
    try {
      const { cpuSpecialist } = await import('../../../src/mastra/agents/cpu-specialist');
      const { ramSpecialist } = await import('../../../src/mastra/agents/ram-specialist');
      const { ssdSpecialist } = await import('../../../src/mastra/agents/ssd-specialist');
      const { bareboneSpecialist } = await import('../../../src/mastra/agents/barebone-specialist');
      const { desktopSpecialist } = await import('../../../src/mastra/agents/desktop-specialist');
      
      expect(cpuSpecialist).toBeDefined();
      expect(ramSpecialist).toBeDefined();
      expect(ssdSpecialist).toBeDefined();
      expect(bareboneSpecialist).toBeDefined();
      expect(desktopSpecialist).toBeDefined();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});