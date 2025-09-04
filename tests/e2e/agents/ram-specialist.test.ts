import { ramSpecialist } from "../../../src/mastra/agents/ram-specialist";

describe("Kiểm tra chuyên gia RAM", () => {
	it("nên cung cấp thông tin liên quan đến thông số kỹ thuật RAM", async () => {
		const query = "Sự khác biệt giữa RAM DDR4 và DDR5 là gì?";
		const result = await ramSpecialist.generate(query, {});

		expect(result).toBeDefined();
		expect(typeof result.text).toBe("string");
		expect(result.text.length).toBeGreaterThan(0);

		// Kiểm tra nội dung có chứa từ khóa liên quan
		const lowerText = result.text.toLowerCase();
		expect(lowerText).toMatch(/ddr4|ddr5|ram|bộ nhớ/);
	});

	it("nên đề xuất RAM phù hợp cho trường hợp chơi game", async () => {
		const query =
			"Tôi đang xây dựng một PC chơi game, tôi cần bao nhiêu RAM và tốc độ bao nhiêu là đủ?";
		const result = await ramSpecialist.generate(query, {});

		expect(result).toBeDefined();
		expect(typeof result.text).toBe("string");
		expect(result.text.length).toBeGreaterThan(0);

		// Kiểm tra phản hồi có chứa từ khóa liên quan đến chơi game
		const lowerText = result.text.toLowerCase();
		expect(lowerText).toMatch(/chơi game|game|16gb|32gb|tốc độ|hiệu năng/);
	});

	it("nên cung cấp chi tiết kỹ thuật về thời gian trễ RAM", async () => {
		const query =
			"Giải thích về thời gian trễ RAM như CL16, CL18, v.v. và cách chúng ảnh hưởng đến hiệu suất";
		const result = await ramSpecialist.generate(query, {});

		expect(result).toBeDefined();
		expect(typeof result.text).toBe("string");
		expect(result.text.length).toBeGreaterThan(0);

		// Kiểm tra các thuật ngữ kỹ thuật
		const lowerText = result.text.toLowerCase();
		expect(lowerText).toMatch(/cl16|cl18|thời gian|trễ/);
	});
});
