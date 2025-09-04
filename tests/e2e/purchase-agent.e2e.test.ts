import { TestLogger, sendLoggedMessage } from './test-utils';

describe('Purchase Agent - SSTC Product Specialist', () => {
  // Test 1: SSD Product Consultation
  describe('SSD Product Recommendations', () => {
    test('should provide SSD recommendations for gaming laptops', async () => {
      const logger = new TestLogger('purchase-ssd-gaming-laptop');
      const messages = [
        { role: 'user', content: 'Tôi đang tìm mua SSD cho laptop gaming, budget khoảng 3 triệu' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-ssd-gaming-laptop', logger);

      logger.logTestResult(true);

      // Should identify SSD as focus product
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('gaming');
      expect(response.text.toLowerCase()).toMatch(/[0-9]+[mtb]|[0-9]+\s*(triệu|tr|trieu)/i);
    }, 45000);

    test('should differentiate between SSD series (Value, Plus, Premium)', async () => {
      const logger = new TestLogger('purchase-ssd-series-comparison');
      const messages = [
        { role: 'user', content: 'Tôi cần SSD NVMe đọc nhanh cho editing video, 2TB' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-ssd-series-comparison', logger);

      logger.logTestResult(true);

      // Should mention different series or performance characteristics
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('nvme');
      expect(response.text.toLowerCase()).toContain('2tb');
      // Should differentiate performance levels
      expect(response.text.toLowerCase()).toMatch(/(premium|plus|value|3\.0|4\.0|mb\/s|mbps)/i);
    }, 45000);
  });

  // Test 2: VGA Zotac Consultation
  describe('VGA Zotac Recommendations', () => {
    test('should recommend gaming GPU for specific budget and use case', async () => {
      const logger = new TestLogger('purchase-vga-gaming-budget');
      const messages = [
        { role: 'user', content: 'Tôi cần VGA Zotac chơi game, FHD 144hz, budget 6-8 triệu' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-vga-gaming-budget', logger);

      logger.logTestResult(true);

      // Should focus on GPU recommendations
      expect(response.text.toLowerCase()).toContain('zotac');
      expect(response.text.toLowerCase()).toContain('gpu');
      expect(response.text.toLowerCase()).toContain('144hz');
      expect(response.text.toLowerCase()).toMatch(/[0-9]+[mtb]|[0-9]+\s*(triệu|tr|trieu)/i);
    }, 45000);

    test('should handle content creation GPU requirements', async () => {
      const logger = new TestLogger('purchase-vga-content-creation');
      const messages = [
        { role: 'user', content: 'Tôi làm design đồ họa, cần VGA Zotac hỗ trợ CUDA' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-vga-content-creation', logger);

      logger.logTestResult(true);

      // Should address professional workloads
      expect(response.text.toLowerCase()).toContain('zotac');
      expect(response.text.toLowerCase()).toMatch(/(nvidia|rtx|cuda|creator|professional|đồ họa)/i);
    }, 45000);
  });

  // Test 3: Motherboard Compatibility
  describe('Mainboard Compatibility Checking', () => {
    test('should provide motherboard recommendations for AMD Ryzen', async () => {
      const logger = new TestLogger('purchase-mainboard-amd-compatibility');
      const messages = [
        { role: 'user', content: 'Tôi có CPU Ryzen 7 5700X3D, cần mainboard SSTC tương thích' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-mainboard-amd-compatibility', logger);

      logger.logTestResult(true);

      // Should show motherboard expertise
      expect(response.text.toLowerCase()).toContain('mainboard');
      expect(response.text.toLowerCase()).toContain('sstc');
      expect(response.text.toLowerCase()).toContain('ryzen');
      // Should address AM4 socket compatibility
      expect(response.text.toLowerCase()).toMatch(/(am4|5700x3d|chipset|b550|x570)/i);
    }, 45000);

    test('should handle Intel platform motherboard consultation', async () => {
      const logger = new TestLogger('purchase-mainboard-intel-compatible');
      const messages = [
        { role: 'user', content: 'Tôi có i7-13700K, motherboard SSTC nào phù hợp cho gaming?' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-mainboard-intel-compatible', logger);

      logger.logTestResult(true);

      // Should address Intel platform
      expect(response.text.toLowerCase()).toContain('mainboard');
      expect(response.text.toLowerCase()).toMatch(/(intel|lga1700|13700k|z690|b660|gaming)/i);
    }, 45000);
  });

  // Test 4: Hardware Compatibility Analysis
  describe('Hardware Compatibility & System Building', () => {
    test('should verify GPU and CPU compatibility', async () => {
      const logger = new TestLogger('purchase-gpu-cpu-compatibility');
      const messages = [
        { role: 'user', content: 'Tôi có CPU i5-12600K và VGA RTX 4070 Super. Có tương thích không?' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-gpu-cpu-compatibility', logger);

      logger.logTestResult(true);

      // Should provide compatibility analysis
      expect(response.text.toLowerCase()).toMatch(/(i5-12600k|rtx.*4070|tương thích|compatible|pcie)/i);
    }, 45000);

    test('should provide complete system build recommendations', async () => {
      const logger = new TestLogger('purchase-complete-system-build');
      const messages = [
        { role: 'user', content: 'Thông số PC gaming full setup: i7-13700F + RTX 4080 + 32GB RAM + 1TB SSD, budget khoảng 30 triệu' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-complete-system-build', logger);

      logger.logTestResult(true);

      // Should provide holistic system advice
      expect(response.text.toLowerCase()).toMatch(/(i7.*13700|rtx.*4080|ram|ssd|mainboard|psu|case)/i);
      expect(response.text.toLowerCase()).toMatch(/[0-9]+\s*(triệu|tr|trieu)/i);
    }, 45000);
  });

  // Test 5: Budget-Aware Recommendations
  describe('Budget Optimization & Options', () => {
    test('should provide multiple options within budget ranges', async () => {
      const logger = new TestLogger('purchase-budget-options');
      const messages = [
        { role: 'user', content: 'SSD NVMe tốt nhất trong khoảng 2-3 triệu, phải khuyên gì?' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-budget-options', logger);

      logger.logTestResult(true);

      // Should show budget awareness and options
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('nvme');
      expect(response.text.toLowerCase()).toMatch(/[23]\s*(triệu|tr|trieu)/i);
      // Should show multiple options approach
      expect(response.text.toLowerCase()).toMatch(/(premium|plus|value|lựa chọn|tùy chọn)/i);
    }, 45000);

    test('should optimize for value while meeting requirements', async () => {
      const logger = new TestLogger('purchase-value-optimization');
      const messages = [
        { role: 'user', content: 'VGA Zotac để chơi 2K 144Hz, không cần flagship 4090, tiết kiệm nhất có thể' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-value-optimization', logger);

      logger.logTestResult(true);

      // Should address performance needs while optimizing cost
      expect(response.text.toLowerCase()).toContain('zotac');
      expect(response.text.toLowerCase()).toMatch(/(2k|144hz|value|sweet spot|lựa chọn tốt)/i);
    }, 45000);
  });

  // Test 6: Use Case Specific Consultation
  describe('Use Case Specific Expertise', () => {
    test('should tailor recommendations for gaming focus', async () => {
      const logger = new TestLogger('purchase-gaming-focused');
      const messages = [
        { role: 'user', content: 'Mình chơi game nhiều, đặc biệt là AAA titles ở 1440p. Nênưu tiên VGA trước đúng không?' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-gaming-focused', logger);

      logger.logTestResult(true);

      // Should confirm gaming priorities
      expect(response.text.toLowerCase()).toMatch(/(gaming|game|1440p|aaa|fps|performance)/i);
    }, 45000);

    test('should address content creation workstation needs', async () => {
      const logger = new TestLogger('purchase-workstation-focused');
      const messages = [
        { role: 'user', content: 'Tôi làm 3D modeling, render nặng, mình cần workstation với GPU mạnh' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-workstation-focused', logger);

      logger.logTestResult(true);

      // Should address pro workstation requirements
      expect(response.text.toLowerCase()).toMatch(/(3d|render|modeling|workstation|professional|creator)/i);
    }, 45000);
  });

  // Test 7: Future-Proofing & Upgradability
  describe('Future Upgrades & Long-term Planning', () => {
    test('should consider upgrade path and compatibility', async () => {
      const logger = new TestLogger('purchase-future-upgrade-path');
      const messages = [
        { role: 'user', content: 'Tôi định mua Z690 motherboard bây giờ, sau này nâng lên i9 được không?' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-future-upgrade-path', logger);

      logger.logTestResult(true);

      // Should address upgrade compatibility
      expect(response.text.toLowerCase()).toMatch(/(z690|i9|(tương thích|nâng cấp|upgrade).*i9)/i);
    }, 45000);

    test('should recommend products with long-term viability', async () => {
      const logger = new TestLogger('purchase-longevity-considerations');
      const messages = [
        { role: 'user', content: 'Tôi cần SSD có warranty lâu dài, ít nhất 5 năm bảo hành' }
      ];
      const response = await sendLoggedMessage(messages, 'purchase-longevity-considerations', logger);

      logger.logTestResult(true);

      // Should demonstrate warranty awareness
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toMatch(/(5.*?năm|bảo hành|warranty|durable)/i);
    }, 45000);
  });
});
