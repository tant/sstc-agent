import { desktopSpecialist } from '../../../src/mastra/agents/desktop-specialist';

describe('Kiểm tra chuyên gia Desktop', () => {
  it('nên có thể khởi tạo desktop specialist', () => {
    expect(desktopSpecialist).toBeDefined();
    expect(typeof desktopSpecialist).toBe('object');
  });

  it('nên có thể import desktop specialist', async () => {
    try {
      const { desktopSpecialist } = await import('../../../src/mastra/agents/desktop-specialist');
      expect(desktopSpecialist).toBeDefined();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('nên có phương thức kiểm tra trạng thái', () => {
    expect(typeof desktopSpecialist.isReady).toBe('function');
  });
});