import { ssdSpecialist } from "../../../src/mastra/agents/ssd-specialist";

describe("Kiểm tra chuyên gia SSD", () => {
	it("nên cung cấp thông tin liên quan đến thông số kỹ thuật SSD", async () => {
		const query = "Sự khác biệt giữa SSD SATA và NVMe là gì?";
		const result = await ssdSpecialist.generate(query, {});

		expect(result).toBeDefined();
		expect(typeof result.text).toBe("string");
		expect(result.text.length).toBeGreaterThan(0);

		// Kiểm tra nội dung có chứa từ khóa liên quan
		const lowerText = result.text.toLowerCase();
		expect(lowerText).toMatch(/sata|nvme|ssd|giao tiếp/);
	});

	it("nên đề xuất SSD phù hợp cho trường hợp chơi game", async () => {
		const query =
			"Tôi đang xây dựng một PC chơi game với ngân sách 3 triệu VND, tôi nên chọn SSD nào?";
		const result = await ssdSpecialist.generate(query, {});

		expect(result).toBeDefined();
		expect(typeof result.text).toBe("string");
		expect(result.text.length).toBeGreaterThan(0);

		// Kiểm tra phản hồi có chứa từ khóa liên quan đến chơi game
		const lowerText = result.text.toLowerCase();
		expect(lowerText).toMatch(/chơi game|game|nvme|tải|hiệu năng/);
	});

	it("nên cung cấp chi tiết kỹ thuật về giao tiếp SSD", async () => {
		const query =
			"Giải thích về dạng thức M.2 và cách nó liên quan đến giao tiếp SATA và NVMe";
		const result = await ssdSpecialist.generate(query, {});

		expect(result).toBeDefined();
		expect(typeof result.text).toBe("string");
		expect(result.text.length).toBeGreaterThan(0);

		// Kiểm tra các thuật ngữ kỹ thuật
		const lowerText = result.text.toLowerCase();
		expect(lowerText).toMatch(/m.2|dạng thức|sata|nvme/);
	});

	it("nên có thể truy cập các phương thức cơ sở tri thức", async () => {
		// Kiểm tra chuyên gia có thể truy cập cơ sở tri thức của mình
		const isReady = ssdSpecialist.isKnowledgeBaseReady();
		expect(typeof isReady).toBe("boolean");
	});
});
