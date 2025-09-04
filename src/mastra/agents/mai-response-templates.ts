// Response templates for Mai to use when integrating specialist data
// Hợp nhất từ cả hai phiên bản template để có một file hoàn chỉnh

// Interface cho response template
export interface ResponseTemplate {
	type: string;
	template: string;
	variables: string[];
	examples: string[];
}

// Interface cho specialist data validation
export interface SpecialistDataValidation {
	type: string;
	requiredFields: string[];
	validationRules: Record<string, (value: any) => boolean>;
}

// Response templates cho từng trạng thái xử lý
export const PROCESSING_STATE_TEMPLATES = {
	// RAM specialist templates
	ram: {
		initial:
			"Dạ quý khách, để tư vấn RAM phù hợp nhất, em đang kiểm tra thông số kỹ thuật chi tiết...",
		timeout:
			"Dạ quý khách chờ em xíu để em lấy thông tin RAM chi tiết nhất cho quý khách ạ!",
		complete: "Dạ em đã có thông tin RAM phù hợp cho quý khách đây ạ:",
		error:
			"Xin lỗi quý khách, em gặp lỗi khi lấy thông tin RAM. Vui lòng thử lại sau ạ!",
		partial:
			"Dạ em đã có một số thông tin RAM cho quý khách, em đang tiếp tục tìm kiếm thêm chi tiết ạ:",
	},

	// GPU specialist templates
	gpu: {
		initial:
			"Dạ quý khách, để tư vấn card đồ họa phù hợp, em đang kiểm tra các mẫu hiện có...",
		timeout:
			"Dạ quý khách vui lòng chờ trong giây lát, em đang so sánh các lựa chọn card đồ họa tốt nhất...",
		complete: "Dạ em đã có kết quả tư vấn card đồ họa phù hợp cho quý khách:",
		error:
			"Xin lỗi quý khách, em gặp lỗi khi lấy thông tin card đồ họa. Vui lòng thử lại sau ạ!",
		partial:
			"Dạ em đã có một số thông tin card đồ họa cho quý khách, em đang tiếp tục tìm kiếm thêm chi tiết ạ:",
	},

	// CPU specialist templates
	cpu: {
		initial:
			"Dạ quý khách, để tư vấn vi xử lý phù hợp, em đang kiểm tra các mẫu hiện có...",
		timeout:
			"Dạ quý khách vui lòng chờ trong giây lát, em đang so sánh các lựa chọn vi xử lý tốt nhất...",
		complete: "Dạ em đã có kết quả tư vấn vi xử lý phù hợp cho quý khách:",
		error:
			"Xin lỗi quý khách, em gặp lỗi khi lấy thông tin vi xử lý. Vui lòng thử lại sau ạ!",
		partial:
			"Dạ em đã có một số thông tin vi xử lý cho quý khách, em đang tiếp tục tìm kiếm thêm chi tiết ạ:",
	},

	// SSD specialist templates
	ssd: {
		initial:
			"Dạ quý khách, để tư vấn ổ cứng SSD phù hợp, em đang kiểm tra các mẫu hiện có...",
		timeout:
			"Dạ quý khách vui lòng chờ trong giây lát, em đang so sánh các lựa chọn ổ cứng SSD tốt nhất...",
		complete: "Dạ em đã có kết quả tư vấn ổ cứng SSD phù hợp cho quý khách:",
		error:
			"Xin lỗi quý khách, em gặp lỗi khi lấy thông tin ổ cứng SSD. Vui lòng thử lại sau ạ!",
		partial:
			"Dạ em đã có một số thông tin ổ cứng SSD cho quý khách, em đang tiếp tục tìm kiếm thêm chi tiết ạ:",
	},

	// Storage specialist templates
	storage: {
		initial:
			"Dạ quý khách, để tư vấn ổ cứng phù hợp, em đang kiểm tra các mẫu hiện có...",
		timeout:
			"Dạ quý khách vui lòng chờ trong giây lát, em đang so sánh các lựa chọn ổ cứng tốt nhất...",
		complete: "Dạ em đã có kết quả tư vấn ổ cứng phù hợp cho quý khách:",
		error:
			"Xin lỗi quý khách, em gặp lỗi khi lấy thông tin ổ cứng. Vui lòng thử lại sau ạ!",
		partial:
			"Dạ em đã có một số thông tin ổ cứng cho quý khách, em đang tiếp tục tìm kiếm thêm chi tiết ạ:",
	},

	// General templates
	general: {
		initial:
			"Dạ quý khách, để tư vấn chi tiết nhất, em đang kiểm tra thông tin...",
		timeout:
			"Dạ quý khách chờ em xíu để em lấy thông tin chi tiết nhất cho quý khách ạ!",
		complete: "Dạ em đã có thông tin chi tiết cho quý khách đây ạ:",
		error:
			"Xin lỗi quý khách, em gặp lỗi khi lấy thông tin. Vui lòng thử lại sau ạ!",
		partial:
			"Dạ em đã có một số thông tin cho quý khách, em đang tiếp tục tìm kiếm thêm chi tiết ạ:",
	},
};

// Templates chi tiết cho từng loại specialist data
export const SPECIALIST_RESPONSE_TEMPLATES: Record<string, ResponseTemplate> = {
	// RAM Specialist Templates
	"ram-default": {
		type: "ram",
		template: `
Dạ quý khách, em vừa nhận được thông tin chi tiết từ chuyên gia RAM của SSTC. 
Theo như phân tích thì sản phẩm phù hợp nhất cho nhu cầu của quý khách là:

**{{productName}}** - {{capacity}} với tốc độ {{speed}} và độ trễ {{latency}}
Giá: {{formattedPrice}} VND
Ưu điểm: {{keyFeatures}}

{{#if useCases.includes('gaming')}}
Với nhu cầu gaming, thanh RAM này sẽ mang lại hiệu năng tốt nhờ tốc độ cao và độ trễ thấp.
{{/if}}

{{#if useCases.includes('content-creation')}}
Với công việc sáng tạo nội dung, dung lượng {{capacity}} sẽ đủ để xử lý các tác vụ nặng.
{{/if}}

Quý khách có muốn em cung cấp thêm thông tin chi tiết về sản phẩm này không ạ?
    `.trim(),
		variables: [
			"productName",
			"capacity",
			"speed",
			"latency",
			"price",
			"keyFeatures",
			"useCases",
		],
		examples: [
			"Dạ quý khách, em vừa nhận được thông tin chi tiết từ chuyên gia RAM của SSTC. Theo như phân tích thì sản phẩm phù hợp nhất cho nhu cầu của quý khách là: **Corsair Vengeance LPX 16GB** - 16GB với tốc độ 3200MHz và độ trễ CL22. Giá: 1,200,000 VND. Ưu điểm: Hiệu năng cao, tương thích tốt. Với nhu cầu gaming, thanh RAM này sẽ mang lại hiệu năng tốt nhờ tốc độ cao và độ trễ thấp.",
		],
	},

	"ram-comparison": {
		type: "ram",
		template: `
Dạ quý khách, em có 2 lựa chọn RAM mà chuyên gia của SSTC đã phân tích:

**Lựa chọn 1 - Cân bằng (Recommended):**
{{#each recommendations.slice(0, 1)}}
- {{productName}}: {{formattedPrice}} VND
  + Dung lượng: {{capacity}}
  + Tốc độ: {{speed}}
  + Độ trễ: {{latency}}
{{/each}}

**Lựa chọn 2 - Cao cấp:**
{{#each recommendations.slice(1, 2)}}
- {{productName}}: {{formattedPrice}} VND
  + Dung lượng: {{capacity}}
  + Tốc độ: {{speed}}
  + Độ trễ: {{latency}}
{{/each}}

Theo đánh giá, lựa chọn 1 phù hợp với đa số người dùng, còn lựa chọn 2 dành cho nhu cầu cao hơn.
Quý khách muốn chọn hướng nào ạ?
    `.trim(),
		variables: ["recommendations"],
		examples: [],
	},

	// GPU Specialist Templates
	"gpu-default": {
		type: "gpu",
		template: `
Dạ quý khách, em vừa nhận được thông tin từ chuyên gia card đồ họa của SSTC.

**{{productName}}** - {{chipset}} với {{vram}} VRAM
Giá: {{formattedPrice}} VND
Hiệu năng: {{performanceScore}}/100

{{#if useCases.includes('gaming')}}
Với card đồ họa này, quý khách có thể chơi các tựa game mới nhất ở chất lượng cao.
{{/if}}

{{#if useCases.includes('content-creation')}}
Card đồ họa này rất phù hợp cho render video và làm đồ họa 3D.
{{/if}}

Quý khách có muốn em tư vấn thêm về card này không ạ?
    `.trim(),
		variables: [
			"productName",
			"chipset",
			"vram",
			"price",
			"performanceScore",
			"useCases",
		],
		examples: [],
	},

	// CPU Specialist Templates
	"cpu-default": {
		type: "cpu",
		template: `
Dạ quý khách, em vừa nhận được thông tin từ chuyên gia vi xử lý của SSTC.

**{{productName}}** - {{socket}} với {{cores}} nhân/{{threads}} luồng
Tốc độ: {{baseClock}} - {{boostClock}}
Giá: {{formattedPrice}} VND

{{#if useCases.includes('gaming')}}
Vi xử lý này sẽ mang lại hiệu năng gaming tuyệt vời.
{{/if}}

{{#if useCases.includes('content-creation')}}
Với nhiều nhân và luồng, CPU này rất phù hợp cho công việc sáng tạo nội dung.
{{/if}}

Quý khách có muốn biết thêm thông số kỹ thuật không ạ?
    `.trim(),
		variables: [
			"productName",
			"socket",
			"cores",
			"threads",
			"baseClock",
			"boostClock",
			"price",
			"useCases",
		],
		examples: [],
	},

	// Storage Specialist Templates
	"storage-default": {
		type: "storage",
		template: `
Dạ quý khách, em vừa nhận được thông tin từ chuyên gia ổ cứng của SSTC.

**{{productName}}** - {{capacity}} {{interface}}
Tốc độ đọc: {{readSpeed}}, ghi: {{writeSpeed}}
Giá: {{formattedPrice}} VND

{{#if useCases.includes('gaming')}}
Ổ cứng này sẽ giúp game khởi động nhanh hơn rất nhiều.
{{/if}}

{{#if useCases.includes('content-creation')}}
Với tốc độ cao, ổ cứng này lý tưởng cho làm việc với file lớn.
{{/if}}

Quý khách có muốn em so sánh với các lựa chọn khác không ạ?
    `.trim(),
		variables: [
			"productName",
			"capacity",
			"interface",
			"readSpeed",
			"writeSpeed",
			"price",
			"useCases",
		],
		examples: [],
	},

	// Timeout Templates
	"timeout-default": {
		type: "timeout",
		template: `
Dạ quý khách vui lòng chờ thêm một chút nữa ạ. Em đang nhận thông tin chi tiết từ chuyên gia của SSTC.
Thông tin sẽ được cập nhật ngay khi có kết quả...
    `.trim(),
		variables: [],
		examples: [],
	},

	"timeout-extended": {
		type: "timeout",
		template: `
Dạ quý khách, thông tin đang được xử lý kỹ lưỡng để đảm bảo độ chính xác.
Em sẽ cập nhật cho quý khách ngay khi có kết quả hoàn tất.
    `.trim(),
		variables: [],
		examples: [],
	},

	// Progress Templates
	"progress-start": {
		type: "progress",
		template: `
Dạ quý khách, em đang kiểm tra thông tin chi tiết từ chuyên gia của SSTC. 
Xin vui lòng chờ trong giây lát...
    `.trim(),
		variables: [],
		examples: [],
	},

	"progress-middle": {
		type: "progress",
		template: `
Dạ quý khách, em đang phân tích kỹ các thông số kỹ thuật để đưa ra lựa chọn phù hợp nhất.
Quý khách vui lòng chờ thêm một chút nữa ạ...
    `.trim(),
		variables: [],
		examples: [],
	},

	// Error Templates
	"error-default": {
		type: "error",
		template: `
Xin lỗi quý khách, em gặp lỗi khi lấy thông tin chi tiết từ chuyên gia. 
Vui lòng thử lại sau ạ!
    `.trim(),
		variables: [],
		examples: [],
	},

	"error-retry": {
		type: "error",
		template: `
Xin lỗi quý khách, có lỗi xảy ra khi xử lý yêu cầu. 
Em đang thử lại, quý khách vui lòng chờ trong giây lát...
    `.trim(),
		variables: [],
		examples: [],
	},
};

// Template for integrating specialist data into Mai's responses
export const SPECIALIST_DATA_INTEGRATION_TEMPLATES = {
	// Template for RAM data integration
	ram: `
Dạ quý khách [customerName], em vừa nhận được thông tin chi tiết từ chuyên gia RAM của SSTC. 

## 🎯 Khuyến nghị RAM phù hợp

[recommendationsTable]

## 📊 Phân tích kỹ thuật

[keySpecifications]

## 💰 Thông tin giá cả

[pricingInfo]

## 🛒 Tình trạng hàng

[availabilityStatus]

> [confidenceNote]

[callToAction]
  `,

	// Template for GPU data integration
	gpu: `
Dạ quý khách [customerName], em vừa nhận được thông tin chi tiết từ chuyên gia card đồ họa của SSTC.

## 🎯 Khuyến nghị card đồ họa phù hợp

[recommendationsTable]

## 📊 Phân tích hiệu năng

[keySpecifications]

## 💰 Thông tin giá cả

[pricingInfo]

## 🛒 Tình trạng hàng

[availabilityStatus]

> [confidenceNote]

[callToAction]
  `,

	// Template for CPU data integration
	cpu: `
Dạ quý khách [customerName], em vừa nhận được thông tin chi tiết từ chuyên gia vi xử lý của SSTC.

## 🎯 Khuyến nghị vi xử lý phù hợp

[recommendationsTable]

## 📊 Phân tích hiệu năng

[keySpecifications]

## 💰 Thông tin giá cả

[pricingInfo]

## 🛒 Tình trạng hàng

[availabilityStatus]

> [confidenceNote]

[callToAction]
  `,

	// Template for Storage data integration
	storage: `
Dạ quý khách [customerName], em vừa nhận được thông tin chi tiết từ chuyên gia ổ cứng của SSTC.

## 🎯 Khuyến nghị ổ cứng phù hợp

[recommendationsTable]

## 📊 Phân tích hiệu năng

[keySpecifications]

## 💰 Thông tin giá cả

[pricingInfo]

## 🛒 Tình trạng hàng

[availabilityStatus]

> [confidenceNote]

[callToAction]
  `,

	// Generic template for any specialist data
	generic: `
Dạ quý khách [customerName], em vừa nhận được thông tin chi tiết từ chuyên gia của SSTC.

## 🎯 Khuyến nghị phù hợp

[recommendationsTable]

## 📊 Phân tích kỹ thuật

[keySpecifications]

## 💰 Thông tin giá cả

[pricingInfo]

## 🛒 Tình trạng hàng

[availabilityStatus]

> [confidenceNote]

[callToAction]
  `,
};

// Template components for building responses
export const TEMPLATE_COMPONENTS = {
	// Table format for recommendations
	recommendationsTable: `
| Sản phẩm | Giá | Độ tin cậy | Đặc điểm nổi bật |
|----------|-----|------------|------------------|
[recommendationsRows]
  `,

	// Confidence note based on confidence score
	confidenceNotes: {
		high: "Thông tin trên được phân tích với độ chính xác cao từ chuyên gia của SSTC.",
		medium:
			"Thông tin trên được phân tích từ cơ sở dữ liệu sản phẩm của SSTC với độ tin cậy trung bình.",
		low: "Thông tin trên là kết quả phân tích sơ bộ, quý khách có thể yêu cầu thêm chi tiết nếu cần.",
	},

	// Call to action options
	callToActions: {
		purchase: "Quý khách có muốn em giúp đặt hàng sản phẩm này không ạ?",
		moreInfo:
			"Quý khách muốn em giải thích thêm về thông số kỹ thuật nào không ạ?",
		compare: "Quý khách có muốn em so sánh thêm với các sản phẩm khác không ạ?",
		general: "Quý khách có câu hỏi nào khác về sản phẩm không ạ?",
	},
};

// Validation schemas cho từng loại specialist data
export const SPECIALIST_DATA_VALIDATIONS: Record<
	string,
	SpecialistDataValidation
> = {
	ram: {
		type: "ram",
		requiredFields: [
			"type",
			"recommendations",
			"technicalAnalysis",
			"pricingInfo",
		],
		validationRules: {
			type: (value) => value === "ram",
			recommendations: (value) => Array.isArray(value) && value.length > 0,
			"pricingInfo.basePrice": (value) =>
				typeof value === "number" && value >= 0,
		},
	},

	gpu: {
		type: "gpu",
		requiredFields: [
			"type",
			"recommendations",
			"technicalAnalysis",
			"pricingInfo",
		],
		validationRules: {
			type: (value) => value === "gpu",
			recommendations: (value) => Array.isArray(value) && value.length > 0,
			"pricingInfo.basePrice": (value) =>
				typeof value === "number" && value >= 0,
		},
	},

	cpu: {
		type: "cpu",
		requiredFields: [
			"type",
			"recommendations",
			"technicalAnalysis",
			"pricingInfo",
		],
		validationRules: {
			type: (value) => value === "cpu",
			recommendations: (value) => Array.isArray(value) && value.length > 0,
			"pricingInfo.basePrice": (value) =>
				typeof value === "number" && value >= 0,
		},
	},

	storage: {
		type: "storage",
		requiredFields: [
			"type",
			"recommendations",
			"technicalAnalysis",
			"pricingInfo",
		],
		validationRules: {
			type: (value) => value === "storage",
			recommendations: (value) => Array.isArray(value) && value.length > 0,
			"pricingInfo.basePrice": (value) =>
				typeof value === "number" && value >= 0,
		},
	},
};

// Helper function để format giá tiền
export function formatPrice(price: number): string {
	return new Intl.NumberFormat("vi-VN").format(price);
}

// Helper function để validate specialist data
export function validateSpecialistData(data: any): {
	isValid: boolean;
	errors: string[];
} {
	if (!data || !data.type) {
		return { isValid: false, errors: ["Missing specialist data type"] };
	}

	const validation = SPECIALIST_DATA_VALIDATIONS[data.type];
	if (!validation) {
		return {
			isValid: false,
			errors: [`Unknown specialist data type: ${data.type}`],
		};
	}

	const errors: string[] = [];

	// Kiểm tra required fields
	for (const field of validation.requiredFields) {
		const value = getNestedValue(data, field);
		if (value === undefined || value === null) {
			errors.push(`Missing required field: ${field}`);
		}
	}

	// Kiểm tra validation rules
	for (const [field, rule] of Object.entries(validation.validationRules)) {
		const value = getNestedValue(data, field);
		if (!rule(value)) {
			errors.push(`Validation failed for field: ${field}`);
		}
	}

	return { isValid: errors.length === 0, errors };
}

// Helper function để lấy giá trị nested
function getNestedValue(obj: any, path: string): any {
	return path.split(".").reduce((current, key) => current?.[key], obj);
}

// Helper function để chọn template phù hợp
export function selectTemplate(
	dataType: string,
	variant: string = "default",
): ResponseTemplate {
	const templateKey = `${dataType}-${variant}`;
	return (
		SPECIALIST_RESPONSE_TEMPLATES[templateKey] ||
		SPECIALIST_RESPONSE_TEMPLATES[`${dataType}-default`] ||
		SPECIALIST_RESPONSE_TEMPLATES["ram-default"]
	);
}
