import { validateTelegramConfig } from "../config";

describe("TelegramChannelAdapter", () => {
	it("should validate Telegram config", () => {
		const config = {
			token: "test-token",
		};

		const validatedConfig = validateTelegramConfig(config);
		expect(validatedConfig.token).toBe("test-token");
		expect(validatedConfig.polling).toBe(true);
	});

	it("should throw error for missing token", () => {
		const config = {};

		expect(() => validateTelegramConfig(config)).toThrow(
			"Telegram bot token is required",
		);
	});
});
