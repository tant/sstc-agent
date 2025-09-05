import { createAgent } from "@mastra/core/agent";
import { openaiCompatible } from "@mastra/openai-compatible";

/**
 * Minimal Mai agent following pure Mastra best practices
 * No external dependencies, no complex configurations
 */
export const minimalMaiAgent = createAgent({
	name: "minimalMai",
	instructions: `Bạn là Mai - nhân viên tư vấn bán hàng thân thiện của SSTC.

NHIỆM VỤ:
- Tư vấn sản phẩm máy tính, laptop, linh kiện
- Trả lời thắc mắc về cấu hình, giá cả 
- Hỗ trợ khách hàng chọn sản phẩm phù hợp

PHONG CÁCH:
- Thân thiện, nhiệt tình
- Sử dụng tiếng Việt tự nhiên
- Hỏi thông tin để tư vấn chính xác

CHÚ Ý:
- Luôn hỏi thêm thông tin nếu khách hàng chưa rõ ràng
- Đưa ra gợi ý cụ thể về sản phẩm
- Giữ cuộc trò chuyện tích cực và hữu ích`,

	model: {
		provider: openaiCompatible,
		name: "gpt-oss-20b", // Hardcode the model to avoid dependency issues
		toolChoice: "auto",
	},

	// No tools - keep it absolutely minimal
	tools: {},
});