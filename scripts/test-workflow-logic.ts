#!/usr/bin/env tsx

/**
 * Unit test for workflow logic without database dependencies
 * Tests the helper functions and branching logic
 */

// Test the helper functions from message-processor.ts logic
function analyzeIntent(message: string): string {
	const message_lower = message.toLowerCase();

	// Nâng cấp/upgrade patterns
	if (
		message_lower.includes("nâng cấp") ||
		message_lower.includes("upgrade") ||
		message_lower.includes("thay thế")
	) {
		return "upgrade_request";
	}

	// Tư vấn/consultation patterns
	if (
		message_lower.includes("tư vấn") ||
		message_lower.includes("gợi ý") ||
		message_lower.includes("recommend") ||
		message_lower.includes("suggest")
	) {
		return "consultation_request";
	}

	// So sánh/comparison patterns
	if (
		message_lower.includes("so sánh") ||
		message_lower.includes("compare") ||
		message_lower.includes("khác nhau") ||
		message_lower.includes("difference")
	) {
		return "comparison_request";
	}

	// Giá cả/pricing patterns
	if (
		message_lower.includes("giá") ||
		message_lower.includes("price") ||
		message_lower.includes("bao nhiêu") ||
		message_lower.includes("budget")
	) {
		return "pricing_inquiry";
	}

	return "general_inquiry";
}

function detectCategories(message: string): string[] {
	const categories: string[] = [];
	const message_lower = message.toLowerCase();

	// CPU keywords
	if (
		message_lower.includes("cpu") ||
		message_lower.includes("processor") ||
		message_lower.includes("intel") ||
		message_lower.includes("amd") ||
		message_lower.includes("ryzen") ||
		message_lower.includes("core i")
	) {
		categories.push("cpu");
	}

	// RAM keywords
	if (
		message_lower.includes("ram") ||
		message_lower.includes("memory") ||
		message_lower.includes("bộ nhớ") ||
		message_lower.includes("ddr4") ||
		message_lower.includes("ddr5")
	) {
		categories.push("ram");
	}

	// SSD keywords
	if (
		message_lower.includes("ssd") ||
		message_lower.includes("ổ cứng") ||
		message_lower.includes("storage") ||
		message_lower.includes("nvme") ||
		message_lower.includes("sata") ||
		message_lower.includes("hard drive")
	) {
		categories.push("ssd");
	}

	// Barebone/Case keywords
	if (
		message_lower.includes("barebone") ||
		message_lower.includes("case") ||
		message_lower.includes("vỏ máy") ||
		message_lower.includes("mainboard") ||
		message_lower.includes("motherboard")
	) {
		categories.push("barebone");
	}

	// Desktop keywords
	if (
		message_lower.includes("desktop") ||
		message_lower.includes("pc hoàn chỉnh") ||
		message_lower.includes("máy gaming") ||
		message_lower.includes("complete build") ||
		message_lower.includes("máy tính để bàn")
	) {
		categories.push("desktop");
	}

	return categories;
}

function hasMultipleCategories(categories: string[]): boolean {
	return categories.length > 1;
}

function checkParallelIntents(intent: string): boolean {
	const PARALLEL_INTENTS = [
		"upgrade_request",
		"consultation_request",
		"comparison_request",
	];
	return PARALLEL_INTENTS.includes(intent);
}

function checkParallelKeywords(message: string): boolean {
	const PARALLEL_KEYWORDS = [
		"nâng cấp",
		"upgrade",
		"tư vấn",
		"recommend",
		"so sánh",
		"compare",
		"và",
		"and",
		"cùng",
		"together",
	];

	const message_lower = message.toLowerCase();
	return PARALLEL_KEYWORDS.some((keyword) =>
		message_lower.includes(keyword.toLowerCase()),
	);
}

async function testWorkflowLogic() {
	console.log("🧪 Testing Workflow Logic");
	console.log("=".repeat(50));

	const testCases = [
		{
			name: "Multi-category RAM + SSD upgrade",
			message: "tôi muốn nâng cấp ram và ổ cứng cho PC",
			expectedParallel: true,
		},
		{
			name: "Gaming setup with CPU + RAM",
			message: "tôi cần cpu mạnh và ram cho gaming",
			expectedParallel: true,
		},
		{
			name: "Complete build consultation",
			message: "tư vấn máy gaming hoàn chỉnh với cpu amd ram 32gb ssd nvme",
			expectedParallel: true,
		},
		{
			name: "Single category query",
			message: "cho tôi xem ram ddr5",
			expectedParallel: false,
		},
		{
			name: "Comparison query",
			message: "so sánh ssd samsung và kingston",
			expectedParallel: false, // Single category, even though comparison
		},
		{
			name: "Price inquiry - multiple items",
			message: "giá cpu intel và ram ddr5 bao nhiêu",
			expectedParallel: true,
		},
	];

	let passedTests = 0;
	let totalTests = testCases.length;

	for (const testCase of testCases) {
		console.log(`\n📋 Test: ${testCase.name}`);
		console.log(`💬 Query: "${testCase.message}"`);

		// Run analysis
		const intent = analyzeIntent(testCase.message);
		const categories = detectCategories(testCase.message);
		const hasMultiple = hasMultipleCategories(categories);
		const hasParallelIntents = checkParallelIntents(intent);
		const hasParallelKeywords = checkParallelKeywords(testCase.message);

		// Determine if should use parallel processing
		const shouldUseParallel =
			hasMultiple && (hasParallelIntents || hasParallelKeywords);

		console.log(`🎯 Intent: ${intent}`);
		console.log(
			`📊 Categories: [${categories.join(", ")}] (${categories.length})`,
		);
		console.log(`🔄 Multiple categories: ${hasMultiple}`);
		console.log(`🔄 Parallel intents: ${hasParallelIntents}`);
		console.log(`🔄 Parallel keywords: ${hasParallelKeywords}`);
		console.log(`⚙️  Should use parallel: ${shouldUseParallel}`);
		console.log(`🎯 Expected parallel: ${testCase.expectedParallel}`);

		// Check if our logic matches expectations
		const testPassed = shouldUseParallel === testCase.expectedParallel;
		if (testPassed) {
			console.log("✅ Test PASSED");
			passedTests++;
		} else {
			console.log("❌ Test FAILED");
		}

		console.log("-".repeat(40));
	}

	console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);

	if (passedTests === totalTests) {
		console.log("🎉 All workflow logic tests passed!");
		return true;
	} else {
		console.log("⚠️  Some tests failed - review logic");
		return false;
	}
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	testWorkflowLogic()
		.then((success) => {
			if (success) {
				console.log("✅ Logic test suite completed successfully");
				process.exit(0);
			} else {
				console.log("❌ Logic test suite failed");
				process.exit(1);
			}
		})
		.catch((error) => {
			console.error("💥 Test suite crashed:", error);
			process.exit(1);
		});
}

export { testWorkflowLogic };
