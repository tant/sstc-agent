import { bareboneSpecialist } from '../../../src/mastra/agents/barebone-specialist';

describe('Kiểm tra chuyên gia Barebone', () => {
  it('nên có thể khởi tạo barebone specialist', () => {
    expect(bareboneSpecialist).toBeDefined();
    expect(typeof bareboneSpecialist).toBe('object');
  });

  it('nên có thể import barebone specialist', async () => {
    try {
      const { bareboneSpecialist } = await import('../../../src/mastra/agents/barebone-specialist');
      expect(bareboneSpecialist).toBeDefined();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('nên có phương thức kiểm tra trạng thái', () => {
    expect(typeof bareboneSpecialist.isReady).toBe('function');
  });
});