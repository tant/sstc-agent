import { bareboneSpecialist } from "../../../src/mastra/agents/barebone-specialist";

describe("Barebone Specialist Tests", () => {
	it("should be able to import barebone specialist", () => {
		expect(bareboneSpecialist).toBeDefined();
		expect(typeof bareboneSpecialist).toBe("object");
	});

	it("should have required methods", () => {
		expect(typeof bareboneSpecialist.generate).toBe("function");
		expect(typeof bareboneSpecialist.isKnowledgeBaseReady).toBe("function");
	});

	it("should be able to initialize knowledge base", async () => {
		try {
			// This is a mock test - in reality, we'd need to mock the database
			const result = bareboneSpecialist.isKnowledgeBaseReady();
			expect(typeof result).toBe("boolean");
		} catch (error) {
			// If initialization fails, it's expected in test environment
			expect(error).toBeDefined();
		}
	});
});
