import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Input schema for the findPromotions tool
const findPromotionsInputSchema = z.object({
	price: z
		.number()
		.positive("Price must be a positive number")
		.describe("The original price of the product."),
	productId: z
		.string()
		.optional()
		.describe("The ID of the product to apply the discount to."),
});

// Output schema for the findPromotions tool
const findPromotionsOutputSchema = z.object({
	originalPrice: z.number(),
	discountPercentage: z.number(),
	discountAmount: z.number(),
	newPrice: z.number(),
	summary: z
		.string()
		.describe("A human-readable summary of the discount applied."),
});

export const findPromotionsTool = createTool({
	id: "find-promotions",
	description:
		"Applies a standard 5% discount to a given price. Use this when a customer hesitates on price, to offer a small goodwill discount.",
	inputSchema: findPromotionsInputSchema,
	outputSchema: findPromotionsOutputSchema,
	execute: async ({ context }) => {
		const { price, productId } = context as any;

		console.log("💸 [Find Promotions Tool] Applying 5% discount for:", {
			price,
			productId,
		});

		const discountPercentage = 5;
		const discountAmount = price * (discountPercentage / 100);
		const newPrice = price - discountAmount;

		const summary = `Đã áp dụng thành công mã giảm giá 5% cho quý khách! Giá mới là ${newPrice.toLocaleString()}đ (giảm ${discountAmount.toLocaleString()}đ).`;

		console.log("✅ [Find Promotions Tool] Discount calculated:", {
			originalPrice: price,
			newPrice,
			discountAmount,
		});

		return {
			originalPrice: price,
			discountPercentage,
			discountAmount,
			newPrice,
			summary,
		};
	},
});
