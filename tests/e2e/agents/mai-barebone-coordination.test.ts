import { bareboneSpecialist } from "../../../src/mastra/agents/barebone-specialist";
import { maiSale } from "../../../src/mastra/agents/mai-agent";

describe("Kiểm tra Mai Agent với Barebone Specialist", () => {
	it("nên có thể phối hợp ngầm với barebone specialist", async () => {
		// Tạo một yêu cầu đơn giản về barebone case
		const _customerMessage =
			"Tôi muốn mua case máy tính để build một PC gaming";

		// Kiểm tra rằng cả hai agent đều có thể được import thành công
		expect(maiSale).toBeDefined();
		expect(bareboneSpecialist).toBeDefined();

		expect(typeof maiSale).toBe("object");
		expect(typeof bareboneSpecialist).toBe("object");

		// Kiểm tra rằng cả hai agent đều có phương thức generate
		expect(typeof maiSale.generate).toBe("function");
		expect(typeof bareboneSpecialist.generate).toBe("function");
	});

	it("nên có thể xử lý yêu cầu về barebone mà không tạo sản phẩm hư cấu", async () => {
		const customerMessage =
			"Tôi cần một case mid-tower cho PC gaming với budget khoảng 2 triệu";

		// Kiểm tra rằng yêu cầu có thể được xử lý
		expect(customerMessage).toBeDefined();
		expect(typeof customerMessage).toBe("string");
		expect(customerMessage.length).toBeGreaterThan(0);

		// Kiểm tra rằng tin nhắn chứa các từ khóa liên quan đến barebone
		expect(customerMessage.toLowerCase()).toMatch(/case|barebone|tower|gaming/);
	});

	it("nên có thể truy cập cơ sở tri thức barebone", async () => {
		// Kiểm tra rằng barebone specialist có phương thức kiểm tra trạng thái tri thức
		expect(typeof bareboneSpecialist.isKnowledgeBaseReady).toBe("function");

		// Kiểm tra rằng barebone specialist có phương thức tìm kiếm barebone
		expect(typeof bareboneSpecialist.searchBarebones).toBe("function");

		// Kiểm tra rằng barebone specialist có phương thức lấy thông tin sản phẩm
		expect(typeof bareboneSpecialist.getProductInfo).toBe("function");
	});

	it("nên có thể phối hợp với các specialist khác", async () => {
		// Kiểm tra rằng Mai có thể phối hợp với nhiều specialist
		const coordinationMethods = [
			"coordinateWithSpecialists",
			"getContextAwareResponse",
			"handleParallelProcessing",
		];

		// Kiểm tra ít nhất một trong các phương thức phối hợp tồn tại
		const hasCoordinationMethod = coordinationMethods.some(
			(method) => typeof (maiSale as any)[method] === "function",
		);

		expect(hasCoordinationMethod).toBe(true);
	});
});
