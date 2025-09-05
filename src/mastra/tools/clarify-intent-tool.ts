import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Possible intent categories and their keywords
const INTENT_PATTERNS = {
	purchase: {
		keywords: [
			"mua",
			"buy",
			"purchase",
			"get",
			"order",
			"dat hang",
			"gia",
			"price",
			"tim",
			"looking for",
			"can i buy",
			"how much",
		],
		confidenceBoost: 0.8,
	},
	warranty: {
		keywords: [
			"bao hanh",
			"warranty",
			"repair",
			"sua chua",
			"fix",
			"broken",
			"hong",
			"khong hoat dong",
			"not working",
			"error",
		],
		confidenceBoost: 0.9,
	},
	technical: {
		keywords: [
			"technical",
			"specification",
			"specs",
			"compatibility",
			"tương thich",
			"setup",
			"install",
			"setup",
		],
		confidenceBoost: 0.6,
	},
	general: {
		keywords: [
			"what",
			"how",
			"where",
			"when",
			"giup",
			"help",
			"support",
			"consult",
			"tu van",
			"can ban tell me",
		],
		confidenceBoost: 0.3,
	},
};

const SPECIALIST_PATTERNS = {
	ram: {
		keywords: [
			"ram",
			"memory",
			"ddr4",
			"ddr5",
			"bộ nhớ",
			"ram desktop",
			"ram laptop",
			"dual channel",
			"single channel",
		],
		confidence: 0.4,
	},
	gpu: {
		keywords: ["gpu", "graphics card", "card đồ họa", "rtx", "gtx", "rx"],
		confidence: 0.4,
	},
	cpu: {
		keywords: ["cpu", "processor", "vi xử lý", "intel", "amd", "ryzen"],
		confidence: 0.4,
	},
	storage: {
		keywords: ["ssd", "hdd", "ổ cứng", "storage", "drive"],
		confidence: 0.4,
	},
	motherboard: {
		keywords: ["mainboard", "motherboard", "bo mạch chủ"],
		confidence: 0.4,
	},
	barebone: {
		keywords: ["barebone", "mini pc"],
		confidence: 0.4,
	},
};

// Clarification question templates
const CLARIFICATION_QUESTIONS = {
	purchase: [
		"Bạn đang muốn mua linh kiện máy tính nào cụ thể? (SSD, VGA, Mainboard, Ram, ...)",
		"Bạn có ngân sách khoảng bao nhiêu cho việc mua sắm này?",
		"Bạn dùng những linh kiện này để làm gì? (Gaming, Đồ họa, Văn phòng, ...)",
		"Bạn đã có sẵn linh kiện nào khác chưa?",
	],
	warranty: [
		"Bạn có gặp vấn đề gì với sản phẩm không? Hãy mô tả chi tiết nhé.",
		"Sản phẩm nào bạn đang gặp vấn đề? (SSD, VGA, Mainboard, ...)",
		"Bạn có biết số serial của sản phẩm không?",
		"Khi nào bạn mua sản phẩm? Và từ cửa hàng nào?",
	],
	technical: [
		"Bạn cần hỗ trợ về vấn đề kỹ thuật gì cụ thể?",
		"Bạn đang gặp vấn đề gì khi sử dụng sản phẩm? Hãy mô tả nhé.",
		"Bạn đã thử giải pháp gì để khắc phục vấn đề chưa?",
	],
	general: [
		"Bạn cần SSTC hỗ trợ về lĩnh vực nào?",
		"Hãy mô tả chi tiết hơn về vấn đề bạn cần trợ giúp nhé.",
		"Bạn đang quan tâm đến sản phẩm hay dịch vụ của SSTC?",
	],
};

// Schema for clarify intent input
const clarifyIntentInputSchema = z.object({
	message: z.string().min(1, "Message is required"),
	currentIntent: z.string().optional(),
	chatHistory: z
		.array(
			z.object({
				role: z.string(),
				content: z.string(),
				timestamp: z.string().optional(),
			}),
		)
		.optional(),
	previousAttempts: z.number().optional(),
});

// Schema for clarify intent output
const clarifyIntentOutputSchema = z.object({
	needsClarification: z.boolean(),
	suggestedIntent: z.enum([
		"purchase",
		"warranty",
		"technical",
		"general",
		"unclear",
	]),
	confidence: z.number().min(0).max(1),
	clarificationQuestion: z.string().optional(),
	intentBreakdown: z.object({
		purchaseScore: z.number(),
		warrantyScore: z.number(),
		technicalScore: z.number(),
		generalScore: z.number(),
	}),
	response: z.string(),
	shouldEscalate: z.boolean(),
	nextAction: z.enum(["ask_question", "route_to_agent", "escalate_to_human"]),
	specialistNeeded: z
		.enum(["ram", "gpu", "cpu", "storage", "motherboard", "barebone", "none"])
		.optional(),
	specialistConfidence: z.number().min(0).max(1).optional(),
});

export const clarifyIntentTool = createTool({
	id: "clarify-intent",
	description:
		"Analyze user message to determine intent, identify specialist needed, and provide clarification when needed",
	inputSchema: clarifyIntentInputSchema,
	outputSchema: clarifyIntentOutputSchema,
	execute: async (context) => {
		const {
			message,
			currentIntent,
			chatHistory,
			previousAttempts = 0,
		} = context as any;

		console.log("🤔 [Clarify Intent] Analyzing:", {
			message,
			currentIntent,
			chatHistoryCount: chatHistory?.length || 0,
			previousAttempts,
		});

		// Simulate processing delay
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Calculate intent scores
		const score = {
			purchaseScore: 0,
			warrantyScore: 0,
			technicalScore: 0,
			generalScore: 0,
		};
		const lowerMessage = message.toLowerCase();

		for (const [intentKey, intentData] of Object.entries(INTENT_PATTERNS)) {
			let scoreValue = 0;
			for (const keyword of intentData.keywords) {
				if (lowerMessage.includes(keyword.toLowerCase())) {
					scoreValue += intentData.confidenceBoost;
				}
			}
			(score as any)[`${intentKey}Score`] = Math.min(scoreValue, 1.0);
		}

		// Calculate specialist scores
		const specialistScores: { [key: string]: number } = {};
		for (const [specialistKey, specialistData] of Object.entries(
			SPECIALIST_PATTERNS,
		)) {
			let specialistScore = 0;
			for (const keyword of specialistData.keywords) {
				if (lowerMessage.includes(keyword.toLowerCase())) {
					specialistScore += specialistData.confidence;
				}
			}
			specialistScores[specialistKey] = Math.min(specialistScore, 1.0);
		}

		// Find highest scoring specialist
		const maxSpecialistScore = Math.max(...Object.values(specialistScores));
		const specialistNeeded = (
			maxSpecialistScore > 0.3
				? Object.keys(specialistScores).find(
						(key) => specialistScores[key] === maxSpecialistScore,
					)
				: "none"
		) as
			| "ram"
			| "gpu"
			| "cpu"
			| "storage"
			| "motherboard"
			| "barebone"
			| "none";
		const specialistConfidence = maxSpecialistScore;

		// Consider chat history for context (if available)
		if (chatHistory && chatHistory.length > 0) {
			const recentMessages = chatHistory.slice(-3);
			for (const chatMsg of recentMessages) {
				if (chatMsg.role === "assistant" && chatMsg.content.includes("mua")) {
					score.purchaseScore = Math.min(score.purchaseScore + 0.3, 1.0);
				}
				if (
					chatMsg.role === "assistant" &&
					chatMsg.content.includes("bảo hành")
				) {
					score.warrantyScore = Math.min(score.warrantyScore + 0.3, 1.0);
				}
			}
		}

		// Find highest scoring intent
		const intentScores = {
			purchase: score.purchaseScore,
			warranty: score.warrantyScore,
			technical: score.technicalScore,
			general: score.generalScore,
		};

		const maxScore = Math.max(...Object.values(intentScores));
		const suggestedIntent = Object.keys(intentScores)[
			Object.values(intentScores).indexOf(maxScore)
		] as keyof typeof intentScores;
		const confidence = maxScore;

		console.log("📊 [Clarify Intent] Scores:", {
			...score,
			maxScore,
			suggestedIntent,
			confidence: confidence.toFixed(2),
			specialistNeeded,
			specialistConfidence: specialistConfidence.toFixed(2),
		});

		// Determine if clarification is needed
		const needsClarification =
			confidence < 0.6 ||
			maxScore - Object.values(intentScores).sort((a, b) => b - a)[1] < 0.2;
		const maxAttemptsReached = previousAttempts >= 2;

		// Generate clarification question if needed
		let clarificationQuestion: string | undefined;
		let response: string;
		let nextAction: "ask_question" | "route_to_agent" | "escalate_to_human";
		let shouldEscalate = false;

		if (needsClarification && !maxAttemptsReached) {
			// Provide clarification question
			const questions =
				CLARIFICATION_QUESTIONS[suggestedIntent] ||
				CLARIFICATION_QUESTIONS.general;
			clarificationQuestion =
				questions[Math.floor(Math.random() * questions.length)];

			response = `Để phục vụ bạn tốt hơn, ${clarificationQuestion}`;
			nextAction = "ask_question";
		} else if (maxAttemptsReached) {
			// Escalate to human if we've asked too many times
			response =
				"Bài xin lỗi vì tôi chưa thể hiểu rõ nhu cầu của bạn. Hãy để tôi chuyển bạn đến đội ngũ chăm sóc khách hàng chuyên nghiệp của SSTC để được hỗ trợ trực tiếp nhé!";
			shouldEscalate = true;
			nextAction = "escalate_to_human";
		} else {
			// Confident enough to route to appropriate agent
			switch (suggestedIntent) {
				case "purchase":
					response = `Tôi hiểu bạn đang quan tâm đến việc mua sắm sản phẩm. Để được tư vấn chi tiết nhất, tôi sẽ chuyển bạn đến chuyên gia về ${specialistNeeded} nhé!`;
					break;
				case "warranty":
					response =
						"Tôi thấy bạn có vấn đề cụ thể với sản phẩm cần được khắc phục. Để được hỗ trợ về bảo hành, tôi sẽ chuyển bạn sang đội ngũ kỹ thuật nhé!";
					break;
				case "technical":
					response =
						"Bạn có vấn đề kỹ thuật cần được giải quyết. Tôi sẽ chuyển bạn đến đội ngũ hỗ trợ kỹ thuật để được tư vấn cụ thể!";
					break;
				default:
					response =
						"Tôi sẽ chuyển bạn đến đội ngũ chăm sóc khách hàng SSTC để được hỗ trợ tốt nhất!";
			}
			nextAction = "route_to_agent";
		}

		console.log("✅ [Clarify Intent] Result:", {
			needsClarification,
			suggestedIntent,
			confidence: confidence.toFixed(2),
			nextAction,
			shouldEscalate,
			clarificationQuestion: clarificationQuestion ? "Provided" : "None",
			specialistNeeded,
			specialistConfidence: specialistConfidence.toFixed(2),
		});

		return {
			needsClarification,
			suggestedIntent,
			confidence,
			clarificationQuestion,
			intentBreakdown: score,
			response,
			shouldEscalate,
			nextAction,
			specialistNeeded,
			specialistConfidence,
		};
	},
});
