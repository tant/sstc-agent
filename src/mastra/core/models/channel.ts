/**
 * Channel definitions and utilities
 */

export type ChannelType =
	| "telegram"
	| "whatsapp"
	| "web"
	| "line"
	| "facebook"
	| "email"
	| "zalo";

export interface ChannelConfig {
	type: ChannelType;
	name: string;
	supports: {
		text: boolean;
		images: boolean;
		documents: boolean;
		audio: boolean;
		video: boolean;
		quickReplies: boolean;
		carousel: boolean;
	};
	maxMessageLength: number;
	rateLimits?: {
		messagesPerSecond: number;
		messagesPerMinute: number;
	};
}

export const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
	telegram: {
		type: "telegram",
		name: "Telegram",
		supports: {
			text: true,
			images: true,
			documents: true,
			audio: true,
			video: true,
			quickReplies: true,
			carousel: false,
		},
		maxMessageLength: 4096,
	},
	whatsapp: {
		type: "whatsapp",
		name: "WhatsApp",
		supports: {
			text: true,
			images: true,
			documents: true,
			audio: true,
			video: true,
			quickReplies: true,
			carousel: false,
		},
		maxMessageLength: 4096,
	},
	web: {
		type: "web",
		name: "Web Chat",
		supports: {
			text: true,
			images: true,
			documents: true,
			audio: true,
			video: true,
			quickReplies: true,
			carousel: true,
		},
		maxMessageLength: 10000,
	},
	line: {
		type: "line",
		name: "LINE",
		supports: {
			text: true,
			images: true,
			documents: false,
			audio: true,
			video: true,
			quickReplies: true,
			carousel: true,
		},
		maxMessageLength: 2000,
	},
	facebook: {
		type: "facebook",
		name: "Facebook Messenger",
		supports: {
			text: true,
			images: true,
			documents: false,
			audio: true,
			video: true,
			quickReplies: true,
			carousel: true,
		},
		maxMessageLength: 2000,
	},
	email: {
		type: "email",
		name: "Email",
		supports: {
			text: true,
			images: true,
			documents: true,
			audio: false,
			video: false,
			quickReplies: false,
			carousel: false,
		},
		maxMessageLength: 100000,
	},
	zalo: {
		type: "zalo",
		name: "Zalo",
		supports: {
			text: true,
			images: true,
			documents: true,
			audio: true,
			video: true,
			quickReplies: true,
			carousel: false,
		},
		maxMessageLength: 4096,
	},
};
