#!/usr/bin/env node

/**
 * Script để chạy các bài kiểm tra chuyên gia phần cứng
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runHardwareTests() {
	console.log("🚀 Bắt đầu kiểm tra các chuyên gia phần cứng");
	console.log("=====================================");

	// Chạy kiểm tra từ thư mục agents
	const testProcess = spawn("npx", ["jest"], {
		cwd: path.join(__dirname, "..", "tests", "e2e", "agents"),
		stdio: "inherit",
	});

	testProcess.on("close", (code) => {
		if (code === 0) {
			console.log(
				"\n🎉 Tất cả các bài kiểm tra chuyên gia phần cứng đã hoàn thành thành công!",
			);
		} else {
			console.log(`\n❌ Kiểm tra thất bại với mã thoát ${code}`);
			process.exit(code || 1);
		}
	});

	testProcess.on("error", (error) => {
		console.error("Lỗi khi chạy kiểm tra:", error);
		process.exit(1);
	});
}

// Chạy hàm
runHardwareTests();
