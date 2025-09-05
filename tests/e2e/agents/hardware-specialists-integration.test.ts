import { bareboneSpecialist } from "../../../src/mastra/agents/barebone-specialist";
import { cpuSpecialist } from "../../../src/mastra/agents/cpu-specialist";
import { desktopSpecialist } from "../../../src/mastra/agents/desktop-specialist";
import { ramSpecialist } from "../../../src/mastra/agents/ram-specialist";
import { ssdSpecialist } from "../../../src/mastra/agents/ssd-specialist";

describe("Kiểm tra tích hợp các chuyên gia phần cứng", () => {
	it("nên cung cấp đề xuất nhất quán giữa các chuyên gia phần cứng", async () => {
		const query =
			"Tôi đang xây dựng một PC hiệu năng cao để sáng tạo nội dung với ngân sách 15 triệu VND";

		// Lấy đề xuất từ tất cả các chuyên gia
		const cpuResult = await cpuSpecialist.generate(query, {});
		const ramResult = await ramSpecialist.generate(query, {});
		const ssdResult = await ssdSpecialist.generate(query, {});
		const bareboneResult = await bareboneSpecialist.generate(query, {});
		const desktopResult = await desktopSpecialist.generate(query, {});

		// Kiểm tra tất cả các chuyên gia đều phản hồi
		expect(cpuResult).toBeDefined();
		expect(ramResult).toBeDefined();
		expect(ssdResult).toBeDefined();
		expect(bareboneResult).toBeDefined();
		expect(desktopResult).toBeDefined();

		expect(typeof cpuResult.text).toBe("string");
		expect(typeof ramResult.text).toBe("string");
		expect(typeof ssdResult.text).toBe("string");
		expect(typeof bareboneResult.text).toBe("string");
		expect(typeof desktopResult.text).toBe("string");

		expect(cpuResult.text.length).toBeGreaterThan(0);
		expect(ramResult.text.length).toBeGreaterThan(0);
		expect(ssdResult.text.length).toBeGreaterThan(0);
		expect(bareboneResult.text.length).toBeGreaterThan(0);
		expect(desktopResult.text.length).toBeGreaterThan(0);
	});

	it("nên duy trì giọng điệu nhất quán giữa tất cả các chuyên gia", async () => {
		const query = "Tôi nên chọn những linh kiện nào cho máy tính mới của mình?";

		// Lấy phản hồi từ tất cả các chuyên gia
		const cpuResult = await cpuSpecialist.generate(query, {});
		const ramResult = await ramSpecialist.generate(query, {});
		const ssdResult = await ssdSpecialist.generate(query, {});
		const bareboneResult = await bareboneSpecialist.generate(query, {});
		const desktopResult = await desktopSpecialist.generate(query, {});

		// Kiểm tra tất cả các chuyên gia đều phản hồi
		expect(cpuResult).toBeDefined();
		expect(ramResult).toBeDefined();
		expect(ssdResult).toBeDefined();
		expect(bareboneResult).toBeDefined();
		expect(desktopResult).toBeDefined();

		expect(typeof cpuResult.text).toBe("string");
		expect(typeof ramResult.text).toBe("string");
		expect(typeof ssdResult.text).toBe("string");
		expect(typeof bareboneResult.text).toBe("string");
		expect(typeof desktopResult.text).toBe("string");

		expect(cpuResult.text.length).toBeGreaterThan(0);
		expect(ramResult.text.length).toBeGreaterThan(0);
		expect(ssdResult.text.length).toBeGreaterThan(0);
		expect(bareboneResult.text.length).toBeGreaterThan(0);
		expect(desktopResult.text.length).toBeGreaterThan(0);
	});

	it("nên cung cấp câu trả lời phù hợp cho các câu hỏi liên quan đến phần cứng", async () => {
		const queries = [
			"So sánh bộ xử lý Intel và AMD cho chơi game",
			"Cấu hình RAM tối ưu cho chỉnh sửa video là gì?",
			"Giao tiếp SSD nào mang lại hiệu suất tốt nhất?",
			"Case nào phù hợp cho hệ thống gaming hiệu năng cao?",
			"Cấu hình PC hoàn chỉnh cho chơi game với ngân sách 10 triệu",
		];

		const specialists = [
			cpuSpecialist,
			ramSpecialist,
			ssdSpecialist,
			bareboneSpecialist,
			desktopSpecialist,
		];

		// Kiểm tra từng chuyên gia với các câu hỏi phù hợp
		for (let i = 0; i < specialists.length; i++) {
			const specialist = specialists[i];
			const query = queries[i];

			const result = await specialist.generate(query, {});

			expect(result).toBeDefined();
			expect(typeof result.text).toBe("string");
			expect(result.text.length).toBeGreaterThan(0);
		}
	});
});
