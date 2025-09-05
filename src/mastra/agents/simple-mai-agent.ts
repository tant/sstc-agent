import { createAgent } from "@mastra/core/agent";
import { openaiCompatible } from "@mastra/openai-compatible";
import { getProviderConfig } from "../llm/provider";

/**
 * Simple Mai agent following Mastra best practices
 * No complex database dependencies or custom parallel processing
 */
export const simpleMaiAgent = createAgent({
	name: "simpleMai",
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
		name: getProviderConfig().model,
		toolChoice: "auto",
	},

	// Remove complex tools for now - keep it simple
	tools: {},
});