#!/usr/bin/env tsx

/**
 * Test script to verify RAM agent personality aligns with SSTC business context
 */

import { mastra } from "../src/mastra";

async function testRAMPersonality() {
	console.log("🔍 Testing RAM Agent Personality Alignment...\n");

	try {
		// Get the RAM agent
		const ramAgent = mastra.getAgent("ram");

		if (!ramAgent) {
			console.log("❌ RAM agent not found");
			return;
		}

		console.log("✅ RAM agent loaded successfully");
		console.log("📝 Agent name:", ramAgent.name);

		// Get agent instructions to verify personality
		const instructions = await ramAgent.getInstructions();
		console.log("\n📋 Agent instructions preview:");
		console.log(`${instructions.substring(0, 500)}...`);

		// Check for key business context elements
		const checks = [
			{ term: "SSTC", description: "Mentions SSTC company" },
			{ term: "bộ nhớ máy tính", description: "Mentions computer memory" },
			{ term: "lắp ráp", description: "Mentions assembly/building" },
			{ term: "nâng cấp", description: "Mentions upgrading" },
			{ term: "thay thế", description: "Mentions replacement" },
			{ term: "desktop", description: "Mentions desktop computers" },
			{ term: "laptop", description: "Mentions laptops" },
			{ term: "minipc", description: "Mentions mini PCs" },
			{
				term: "nhân viên kinh doanh",
				description: "Mentions salesperson role",
			},
			{ term: "Mai", description: "Mentions coordination with Mai" },
		];

		console.log("\n🔍 Checking business context alignment:");
		let passedChecks = 0;

		for (const check of checks) {
			const found = instructions
				.toLowerCase()
				.includes(check.term.toLowerCase());
			console.log(
				`   ${found ? "✅" : "❌"} ${check.description}: "${check.term}" ${found ? "FOUND" : "NOT FOUND"}`,
			);
			if (found) passedChecks++;
		}

		console.log(
			`\n📊 Alignment score: ${passedChecks}/${checks.length} (${Math.round((passedChecks / checks.length) * 100)}%)`,
		);

		if (passedChecks >= checks.length * 0.8) {
			console.log(
				"✅ RAM agent personality well-aligned with SSTC business context",
			);
		} else {
			console.log(
				"⚠️  RAM agent personality needs further alignment with SSTC business context",
			);
		}

		// Test a simple RAM query
		console.log("\n🧪 Testing simple RAM query...");
		const testQuery = "Tôi cần mua RAM cho laptop";

		try {
			const response = await ramAgent.generate([
				{ role: "user", content: testQuery },
			]);
			console.log("✅ Query processed successfully");
			console.log(
				"📝 Response preview:",
				`${response.text.substring(0, 100)}...`,
			);
		} catch (error) {
			console.log("⚠️  Query processing had issues:", error.message);
		}
	} catch (error) {
		console.error("❌ Test failed:", error);
	}
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
	testRAMPersonality();
}
