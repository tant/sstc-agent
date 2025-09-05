import { type ResponseTemplate } from '../core/models/response-template';

// Template library for Mai to use when integrating specialist data into responses
// Templates are organized by data type and variant
export const SPECIALIST_RESPONSE_TEMPLATES: Record<string, ResponseTemplate> = {
	// RAM Templates
	"ram-default": {
		type: "ram",
		template: `
Dạ quý khách, em vừa nhận được thông tin chi tiết từ chuyên gia RAM của SSTC.

## 🎯 Khuyến nghị RAM phù hợp

{{#each recommendations}}
### {{this.productName}} (SKU: {{this.productId}}) - {{this.price}}đ

**Ưu điểm**: {{this.keyFeatures.[0]}}, {{this.keyFeatures.[1]}}
**Thông số**: {{this.specifications.capacity}} {{this.specifications.type}} {{this.specifications.speed}}, latency {{this.specifications.latency}}
**Mục đích**: {{this.useCases.[0]}}, {{this.useCases.[1]}}

{{/each}}

## 📊 Phân tích kỹ thuật

{{#if technicalAnalysis.keySpecifications}}
**Thông số chính**:
 - Giao tiếp: {{technicalAnalysis.keySpecifications.memoryType}}
 - Tốc độ: {{technicalAnalysis.keySpecifications.baseSpeed}} đến {{technicalAnalysis.keySpecifications.maxSpeed}}
{{/if}}

## 💰 Thông tin giá cả

 - Giá thấp nhất: {{pricingInfo.basePrice}}đ
 - Tổng chi phí: {{pricingInfo.totalPrice}}đ
 - Tiết kiệm: {{pricingInfo.savings}}đ ({{pricingInfo.discountPercentage}}%)

Quý khách có muốn biết thêm về mẫu nào cụ thể không ạ?
		`.trim(),
		variables: [
			"recommendations",
			"technicalAnalysis",
			"pricingInfo",
		],
		examples: [],
	},

	// RAM Comparison Table Template
	"ram-comparison": {
		type: "ram",
		template: `
Dạ quý khách, đây là bảng so sánh các lựa chọn RAM mà chuyên gia của SSTC gợi ý:

| Mẫu | Dung lượng | Loại | Tốc độ | Giá | Ưu điểm |
|-----|------------|------|--------|-----|----------|
{{#each recommendations}}
| {{this.productName}} | {{this.specifications.capacity}} | {{this.specifications.type}} | {{this.specifications.speed}} | {{this.price}}đ | {{this.keyFeatures.[0]}} |
{{/each}}

{{#if technicalAnalysis.keySpecifications}}
**Thông số kỹ thuật chính**:
 - Loại RAM: {{technicalAnalysis.keySpecifications.memoryType}}
 - Tốc độ cơ bản: {{technicalAnalysis.keySpecifications.baseSpeed}}
 - Tốc độ tối đa: {{technicalAnalysis.keySpecifications.maxSpeed}}
{{/if}}

Quý khách có muốn biết thêm thông tin chi tiết về mẫu nào ạ?
		`.trim(),
		variables: [
			"recommendations",
			"technicalAnalysis",
		],
		examples: [],
	},

	// Storage Specialist Templates - Updated
	"storage-default": {
		type: "storage",
		template: `
Dạ quý khách, em vừa nhận được thông tin chi tiết từ chuyên gia SSD của SSTC.

**{{productName}}** - {{capacity}} {{interface}}
Tốc độ đọc: {{readSpeed}}, ghi: {{writeSpeed}}
Giá: {{formattedPrice}} VND

{{#if useCases.includes('gaming')}}
Ổ cứng này sẽ giúp game khởi động nhanh hơn rất nhiều.
{{/if}}

{{#if useCases.includes('content-creation')}}
Với tốc độ cao, ổ cứng này lý tưởng cho làm việc với file lớn.
{{/if}}

Quý khách có muốn em tìm thêm các lựa chọn SSD khác phù hợp với nhu cầu cụ thể hơn không ạ? Ví dụ như:
- Dung lượng bao nhiêu GB? (256GB, 512GB, 1TB, 2TB)
- Giao tiếp SATA hay NVMe?
- Mục đích sử dụng chính? (gaming, văn phòng, sáng tạo nội dung)

Hoặc nếu quý khách muốn xem các sản phẩm SSD khác, em có thể giúp tìm kiếm theo tiêu chí cụ thể hơn ạ!
`.trim(),
		variables: [
			"productName",
			"capacity",
			"interface",
			"readSpeed",
			"writeSpeed",
			"price",
			"useCases",
			"formattedPrice"
		],
		examples: [],
	},

	"storage-comparison": {
		type: "storage",
		template: `
Dạ quý khách, em xin phép giới thiệu một số lựa chọn SSD phổ biến của SSTC:

{{#each recommendations}}
**{{this.productName}}** - {{this.price}} VND
- Dung lượng: {{this.specifications.capacity}}
- Giao tiếp: {{this.specifications.interface}}
- Tốc độ: Đọc {{this.specifications.readSpeed}}, Ghi {{this.specifications.writeSpeed}}
- Phù hợp: {{this.useCases}}

{{/each}}

Quý khách quan tâm đến mẫu nào trong số này, hay muốn em tìm các lựa chọn theo tiêu chí cụ thể hơn ạ?
`.trim(),
		variables: [
			"recommendations"
		],
		examples: [],
	},
	
	// New Storage Product List Template
	"storage-product-list": {
		type: "storage",
		template: `
Dạ quý khách, em xin giới thiệu các mẫu SSD hiện có tại SSTC:

{{#each recommendations}}
**{{this.productName}}** ({{this.specifications.sku}})
- Dung lượng: {{this.specifications.capacity}} 
- Giao tiếp: {{this.specifications.interface}}
- Tốc độ đọc/ghi: {{this.specifications.readSpeed}}/{{this.specifications.writeSpeed}}
- Giá: {{this.price}} VND
- Phù hợp: {{this.useCases}}

{{/each}}

Quý khách quan tâm đến mẫu nào trong số này, hay muốn em tìm các lựa chọn theo tiêu chí cụ thể hơn ạ?
Ví dụ như:
- Dung lượng: 256GB, 512GB, 1TB, 2TB
- Giao tiếp: SATA, NVMe
- Mục đích: Gaming, Văn phòng, Sáng tạo nội dung
		`.trim(),
		variables: [
			"recommendations"
		],
		examples: [],
	},

	// CPU Templates
	"cpu-default": {
		type: "cpu",
		template: `
Dạ quý khách, em vừa nhận được thông tin chi tiết từ chuyên gia CPU của SSTC.

## 🎯 Khuyến nghị CPU phù hợp

{{#each recommendations}}
### {{this.productName}} (SKU: {{this.productId}}) - {{this.price}}đ

**Ưu điểm**: {{this.keyFeatures.[0]}}, {{this.keyFeatures.[1]}}
**Thông số**: {{this.specifications.socket}} với {{this.specifications.cores}} nhân/{{this.specifications.threads}} luồng
**Tốc độ**: {{this.specifications.baseClock}} - {{this.specifications.boostClock}}
**Mục đích**: {{this.useCases.[0]}}, {{this.useCases.[1]}}

{{/each}}

## 📊 Phân tích kỹ thuật

{{#if technicalAnalysis.keySpecifications}}
**Thông số chính**:
 - Socket: {{technicalAnalysis.keySpecifications.socket}}
 - Nhân/Luồng: {{technicalAnalysis.keySpecifications.coreCount}}/{{technicalAnalysis.keySpecifications.threadCount}}
 - Tần số: {{technicalAnalysis.keySpecifications.baseFrequency}} - {{technicalAnalysis.keySpecifications.boostFrequency}}
{{/if}}

## 💰 Thông tin giá cả

 - Giá thấp nhất: {{pricingInfo.basePrice}}đ
 - Tổng chi phí: {{pricingInfo.totalPrice}}đ
 - Tiết kiệm: {{pricingInfo.savings}}đ ({{pricingInfo.discountPercentage}}%)

Quý khách có muốn biết thêm về mẫu nào cụ thể không ạ?
		`.trim(),
		variables: [
			"recommendations",
			"technicalAnalysis",
			"pricingInfo",
		],
		examples: [],
	},

	// CPU Comparison Table Template
	"cpu-comparison": {
		type: "cpu",
		template: `
Dạ quý khách, đây là bảng so sánh các lựa chọn CPU mà chuyên gia của SSTC gợi ý:

| Mẫu | Socket | Nhân/Luồng | Tần số | Giá | Ưu điểm |
|-----|--------|------------|--------|-----|----------|
{{#each recommendations}}
| {{this.productName}} | {{this.specifications.socket}} | {{this.specifications.cores}}/{{this.specifications.threads}} | {{this.specifications.baseClock}}-{{this.specifications.boostClock}} | {{this.price}}đ | {{this.keyFeatures.[0]}} |
{{/each}}

{{#if technicalAnalysis.keySpecifications}}
**Thông số kỹ thuật chính**:
 - Socket phổ biến: {{technicalAnalysis.keySpecifications.socket}}
 - Nhân/Luồng tối đa: {{technicalAnalysis.keySpecifications.coreCount}}/{{technicalAnalysis.keySpecifications.threadCount}}
{{/if}}

Quý khách có muốn biết thêm thông tin chi tiết về mẫu nào ạ?
		`.trim(),
		variables: [
			"recommendations",
			"technicalAnalysis",
		],
		examples: [],
	},

	// Barebone Templates
	"barebone-default": {
		type: "barebone",
		template: `
Dạ quý khách, em vừa nhận được thông tin chi tiết từ chuyên gia barebone của SSTC.

## 🎯 Khuyến nghị barebone phù hợp

{{#each recommendations}}
### {{this.productName}} (SKU: {{this.productId}}) - {{this.price}}đ

**Ưu điểm**: {{this.keyFeatures.[0]}}, {{this.keyFeatures.[1]}}
**Thông số**: {{this.specifications.caseSize}} với mainboard {{this.specifications.motherboardFormFactor}}
**Khả năng tương thích**: {{this.useCases.[0]}}, {{this.useCases.[1]}}

{{/each}}

## 📊 Phân tích kỹ thuật

{{#if technicalAnalysis.keySpecifications}}
**Thông số chính**:
 - Kích thước case: {{technicalAnalysis.keySpecifications.caseSize}}
 - Form factor: {{technicalAnalysis.keySpecifications.motherboardFormFactor}}
 - Socket hỗ trợ: {{technicalAnalysis.keySpecifications.supportedSocket}}
{{/if}}

## 💰 Thông tin giá cả

 - Giá thấp nhất: {{pricingInfo.basePrice}}đ
 - Tổng chi phí: {{pricingInfo.totalPrice}}đ
 - Tiết kiệm: {{pricingInfo.savings}}đ ({{pricingInfo.discountPercentage}}%)

Quý khách có muốn biết thêm về mẫu nào cụ thể không ạ?
		`.trim(),
		variables: [
			"recommendations",
			"technicalAnalysis",
			"pricingInfo",
		],
		examples: [],
	},

	// Desktop Templates
	"desktop-default": {
		type: "desktop",
		template: `
Dạ quý khách, em vừa nhận được thông tin chi tiết từ chuyên gia desktop của SSTC.

## 🎯 Khuyến nghị cấu hình PC phù hợp

{{#each recommendations}}
### {{this.productName}} (SKU: {{this.productId}}) - {{this.price}}đ

**Ưu điểm**: {{this.keyFeatures.[0]}}, {{this.keyFeatures.[1]}}
**Cấu hình**: 
 - CPU: {{this.specifications.cpuModel}}
 - RAM: {{this.specifications.ramConfiguration.capacity}} {{this.specifications.ramConfiguration.type}} {{this.specifications.ramConfiguration.speed}}
 - Storage: {{this.specifications.storageConfiguration.capacity}} {{this.specifications.storageConfiguration.type}}
 - Case: {{this.specifications.caseModel}} ({{this.specifications.caseSize}})
**Mục đích**: {{this.useCases.[0]}}, {{this.useCases.[1]}}

{{/each}}

## 📊 Phân tích kỹ thuật

{{#if technicalAnalysis.keySpecifications}}
**Thông số chính**:
 - Socket CPU: {{technicalAnalysis.keySpecifications.cpuSocket}}
 - RAM: {{technicalAnalysis.keySpecifications.ramType}} {{technicalAnalysis.keySpecifications.ramCapacity}}
 - Storage: {{technicalAnalysis.keySpecifications.storageType}} {{technicalAnalysis.keySpecifications.storageCapacity}}
{{/if}}

## 💰 Thông tin giá cả

 - Giá thấp nhất: {{pricingInfo.basePrice}}đ
 - Tổng chi phí: {{pricingInfo.totalPrice}}đ
 - Tiết kiệm: {{pricingInfo.savings}}đ ({{pricingInfo.discountPercentage}}%)

Quý khách có muốn biết thêm về mẫu nào cụ thể không ạ?
		`.trim(),
		variables: [
			"recommendations",
			"technicalAnalysis",
			"pricingInfo",
		],
		examples: [],
	},

	// Error templates
	"error-default": {
		type: "error",
		template: `
Xin lỗi quý khách, em gặp một số vấn đề kỹ thuật khi xử lý yêu cầu. 
Em đang khắc phục, quý khách vui lòng thử lại sau ít phút ạ!
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

Quý khách có muốn biết thêm về mẫu nào cụ thể không ạ?
	`.trim(),

	// Template for CPU data integration
	cpu: `
Dạ quý khách [customerName], em vừa nhận được thông tin chi tiết từ chuyên gia CPU của SSTC. 

## 🎯 Khuyến nghị CPU phù hợp

[recommendationsTable]

## 📊 Phân tích kỹ thuật

[keySpecifications]

## 💰 Thông tin giá cả

[pricingInfo]

Quý khách có muốn biết thêm về mẫu nào cụ thể không ạ?
	`.trim(),

	// Template for Storage data integration
	storage: `
Dạ quý khách [customerName], em vừa nhận được thông tin chi tiết từ chuyên gia SSD của SSTC. 

## 🎯 Khuyến nghị SSD phù hợp

[recommendationsTable]

## 📊 Phân tích kỹ thuật

[keySpecifications]

## 💰 Thông tin giá cả

[pricingInfo]

Quý khách có muốn biết thêm về mẫu nào cụ thể không ạ?
	`.trim(),

	// Template for Barebone data integration
	barebone: `
Dạ quý khách [customerName], em vừa nhận được thông tin chi tiết từ chuyên gia barebone của SSTC. 

## 🎯 Khuyến nghị barebone phù hợp

[recommendationsTable]

## 📊 Phân tích kỹ thuật

[keySpecifications]

## 💰 Thông tin giá cả

[pricingInfo]

Quý khách có muốn biết thêm về mẫu nào cụ thể không ạ?
	`.trim(),

	// Template for Desktop data integration
	desktop: `
Dạ quý khách [customerName], em vừa nhận được thông tin chi tiết từ chuyên gia desktop của SSTC. 

## 🎯 Khuyến nghị cấu hình PC phù hợp

[recommendationsTable]

## 📊 Phân tích kỹ thuật

[keySpecifications]

## 💰 Thông tin giá cả

[pricingInfo]

Quý khách có muốn biết thêm về mẫu nào cụ thể không ạ?
	`.trim(),
};

// Component templates that can be composed into larger responses
export const TEMPLATE_COMPONENTS = {
	// Pricing information component
	pricingInfo: `
## 💰 Thông tin giá cả

 - Giá thấp nhất: [basePrice]đ
 - Tổng chi phí: [totalPrice]đ
 - Tiết kiệm: [savings]đ ([discountPercentage]%)
	`.trim(),

	// Key specifications component
	keySpecifications: `
## 📊 Thông số kỹ thuật chính

 - Thông số chính: [keySpecifications]
	`.trim(),

	// Recommendations table component
	recommendationsTable: `
## 🎯 Các lựa chọn được đề xuất

[recommendations]
	`.trim(),
};

// Utility functions for formatting data in templates
export function formatPrice(price: number): string {
	return new Intl.NumberFormat("vi-VN").format(price);
}

export function validateSpecialistData(data: any): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!data) {
		return { isValid: false, errors: ["Missing specialist data"] };
	}

	if (!data.type) {
		errors.push("Missing specialist data type");
	}

	const validation = SPECIALIST_DATA_VALIDATIONS[data.type];
	if (!validation) {
		return {
			isValid: false,
			errors: [`Unknown specialist data type: ${data.type}`],
		};
	}

	const errors: string[] = [];

	// Check required fields
	for (const field of validation.requiredFields) {
		const value = getNestedValue(data, field);
		if (value === undefined || value === null) {
			errors.push(`Missing required field: ${field}`);
		}
	}

	// Check validation rules
	for (const [field, rule] of Object.entries(validation.validationRules)) {
		const value = getNestedValue(data, field);
		if (!rule(value)) {
			errors.push(`Validation failed for field: ${field}`);
		}
	}

	return { isValid: errors.length === 0, errors };
}

// Helper function to get value from nested object
function getNestedValue(obj: any, path: string): any {
	return path.split(".").reduce((current, key) => current?.[key], obj);
}

// Helper function to select template
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