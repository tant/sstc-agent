	// Storage Specialist Templates - Updated
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