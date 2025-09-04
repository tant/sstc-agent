import { cpuSpecialist } from "../../../src/mastra/agents/cpu-specialist";

describe("Kiểm tra chuyên gia CPU", () => {
	it("nên cung cấp thông tin liên quan đến thông số kỹ thuật CPU", async () => {
		const query = "Sự khác biệt chính giữa Intel i7 và AMD Ryzen 7 là gì?";
		const result = await cpuSpecialist.generate(query, {});

		expect(result).toBeDefined();
		expect(typeof result.text).toBe("string");
		expect(result.text.length).toBeGreaterThan(0);

		// Kiểm tra nội dung có chứa từ khóa liên quan
		const lowerText = result.text.toLowerCase();
		expect(lowerText).toMatch(/intel|amd|core|ryzen|bộ xử lý/);
	});

	it("nên đề xuất CPU phù hợp cho trường hợp chơi game", async () => {
		const query =
			"Tôi đang xây dựng một PC chơi game với ngân sách 8 triệu VND, tôi nên chọn CPU nào?";
		const result = await cpuSpecialist.generate(query, {});

		expect(result).toBeDefined();
		expect(typeof result.text).toBe("string");
		expect(result.text.length).toBeGreaterThan(0);

		// Kiểm tra phản hồi có chứa từ khóa liên quan đến chơi game
		const lowerText = result.text.toLowerCase();
		expect(lowerText).toMatch(/chơi game|game|fps|hiệu năng/);
	});

	it("nên cung cấp chi tiết kỹ thuật khi được hỏi", async () => {
		const query =
			"So sánh số lượng nhân và luồng của Intel i7-12700K và AMD Ryzen 7 5800X";
		const result = await cpuSpecialist.generate(query, {});

		expect(result).toBeDefined();
		expect(typeof result.text).toBe("string");
		expect(result.text.length).toBeGreaterThan(0);

		// Kiểm tra các thuật ngữ kỹ thuật
		const lowerText = result.text.toLowerCase();
		expect(lowerText).toMatch(/nhân|luồng|intel|amd/);
	});
});
