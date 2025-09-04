import { createClient } from "@libsql/client";
import { getLibSQLConfig } from "../database/libsql";

// Interface cho thông tin CPU sản phẩm
export interface CPUProductInfo {
	sku: string;
	name: string;
	model: string;
	brand: string;
	series: string;
	socket: string;
	cores: number;
	threads: number;
	baseClock: string;
	boostClock: string;
	powerConsumption: string;
	l3Cache: string;
	architecture: string;
	integratedGraphics?: string;
	price: number;
	compatibility: string[];
	useCases: string[];
	stockStatus: string;
	description: string;
	tdp: string;
	benchmarkScore?: string;
	pricePerPerformance?: string;
	futureProofing?: string;
}

// Interface cho kết quả tương thích
export interface CompatibilityResult {
	isCompatible: boolean;
	compatibleChipsets: string[];
	compatibleMotherboards: string[];
	issues: string[];
	recommendations: string[];
}

// Interface cho tiêu chí tìm kiếm
export interface SearchCriteria {
	brand?: string;
	series?: string;
	socket?: string;
	cores?: number;
	minCores?: number;
	maxCores?: number;
	minPrice?: number;
	maxPrice?: number;
	useCase?: string;
	motherboardCompatibility?: string;
	chipset?: string;
}

// Bảng tương thích CPU ↔ Chipset
const CPU_CHIPSET_COMPATIBILITY: Record<string, string[]> = {
	// Intel 12th Gen (Alder Lake)
	LGA1700: ["Z690", "B660", "H610"],

	// Intel 13th Gen (Raptor Lake)
	LGA1700_13TH: ["Z790", "B760", "H770"],

	// Intel 14th Gen (Raptor Lake Refresh)
	LGA1700_14TH: ["Z790", "B760", "H770"],

	// AMD AM4
	AM4: ["B550", "X570", "B450", "X470", "A320"],

	// AMD AM5 (Zen 4/5)
	AM5: ["X670", "B650", "X670E", "B650E"],
};

// Bảng tương thích chipset ↔ mainboard
const CHIPSET_MOTHERBOARD_BRANDS: Record<string, string[]> = {
	Z790: ["ASUS", "MSI", "Gigabyte", "ASRock"],
	B760: ["ASUS", "MSI", "Gigabyte", "ASRock"],
	Z690: ["ASUS", "MSI", "Gigabyte", "ASRock"],
	B660: ["ASUS", "MSI", "Gigabyte", "ASRock"],
	X670: ["ASUS", "MSI", "Gigabyte", "ASRock"],
	B650: ["ASUS", "MSI", "Gigabyte", "ASRock"],
};

export class CPUProductKnowledgeBase {
	private products: CPUProductInfo[] = [];
	private isInitialized = false;

	constructor() {
		console.log(
			"🏗️ [CPU Knowledge Base] Initializing CPU product knowledge base...",
		);
	}

	// Khởi tạo knowledge base từ database
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			console.log("✅ [CPU Knowledge Base] Already initialized");
			return;
		}

		try {
			console.log(
				"📚 [CPU Knowledge Base] Loading CPU products from database...",
			);

			// Kết nối database
			const dbConfig = getLibSQLConfig();
			const db = createClient({
				url: dbConfig.url,
				authToken: dbConfig.authToken,
			});

			// Truy xuất tất cả sản phẩm CPU
			const result: any = await db.execute({
				sql: `
          SELECT * FROM products 
          WHERE category = 'CPU' OR Loại sản phẩm = 'CPU'
        `,
				args: [],
			});

			console.log("📊 [CPU Knowledge Base] Database query completed", {
				totalProducts: result.rows.length,
			});

			// Chuyển đổi dữ liệu thành objects
			this.products = result.rows.map((row: any) => {
				// Parse price (remove currency formatting)
				const priceText = row.Giá?.toString() || "0";
				const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;

				// Parse cores and threads
				const cores = parseInt(row.cores || "0");
				const threads = parseInt(row.threads || "0");

				return {
					sku: row.SKU || "",
					name: row["Tên sản phẩm"] || "",
					model: row.Model || "",
					brand: row.brand || "",
					series: row.series || "",
					socket: row.socket || "",
					cores: cores,
					threads: threads,
					baseClock: row.base_clock || "",
					boostClock: row.boost_clock || "",
					powerConsumption: row.power_consumption || "",
					l3Cache: row.l3_cache || "",
					architecture: row.architecture || "",
					integratedGraphics: row.integrated_graphics || "",
					price: price,
					compatibility: row["Tương thích CPU"]
						? row["Tương thích CPU"].split(",")
						: [],
					useCases: row["Recommended_Use"]
						? row["Recommended_Use"].split(",")
						: [],
					stockStatus: row.Availability || "unknown",
					description: row.USP || "",
					tdp: row.TDP || "",
					benchmarkScore: row["Benchmarks (PassMark)"] || "",
					pricePerPerformance: row["Price per Performance"] || "",
					futureProofing: row["Future Proofing"] || "",
				};
			});

			console.log("✅ [CPU Knowledge Base] Loaded products into memory", {
				totalProducts: this.products.length,
			});

			this.isInitialized = true;
			console.log(
				"✅ [CPU Knowledge Base] Initialization completed successfully",
			);
		} catch (error) {
			console.error("❌ [CPU Knowledge Base] Initialization failed:", error);
			throw new Error(
				`CPU Knowledge Base initialization failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// Lấy tất cả sản phẩm CPU
	getAllCPUs(): CPUProductInfo[] {
		if (!this.isInitialized) {
			console.warn(
				"⚠️ [CPU Knowledge Base] Not initialized, returning empty array",
			);
			return [];
		}
		return [...this.products]; // Trả về bản sao để tránh mutation
	}

	// Tìm kiếm sản phẩm CPU theo tiêu chí
	searchCPUs(criteria: SearchCriteria): CPUProductInfo[] {
		if (!this.isInitialized) {
			console.warn(
				"⚠️ [CPU Knowledge Base] Not initialized, returning empty array",
			);
			return [];
		}

		console.log(
			"🔍 [CPU Knowledge Base] Searching CPUs with criteria:",
			criteria,
		);

		return this.products.filter((product) => {
			// Filter brand
			if (
				criteria.brand &&
				!product.brand.toLowerCase().includes(criteria.brand.toLowerCase())
			) {
				return false;
			}

			// Filter series
			if (
				criteria.series &&
				!product.series.toLowerCase().includes(criteria.series.toLowerCase())
			) {
				return false;
			}

			// Filter socket
			if (
				criteria.socket &&
				!product.socket.toLowerCase().includes(criteria.socket.toLowerCase())
			) {
				return false;
			}

			// Filter cores exact match
			if (criteria.cores !== undefined && product.cores !== criteria.cores) {
				return false;
			}

			// Filter cores range
			if (
				criteria.minCores !== undefined &&
				product.cores < criteria.minCores
			) {
				return false;
			}
			if (
				criteria.maxCores !== undefined &&
				product.cores > criteria.maxCores
			) {
				return false;
			}

			// Filter price range
			if (
				criteria.minPrice !== undefined &&
				product.price < criteria.minPrice
			) {
				return false;
			}
			if (
				criteria.maxPrice !== undefined &&
				product.price > criteria.maxPrice
			) {
				return false;
			}

			// Filter use case
			if (criteria.useCase) {
				const hasUseCase = product.useCases.some((uc) =>
					uc.toLowerCase().includes(criteria.useCase!.toLowerCase()),
				);
				if (!hasUseCase) {
					return false;
				}
			}

			// Filter motherboard compatibility
			if (criteria.motherboardCompatibility) {
				const hasCompatibility = product.compatibility.some((comp) =>
					comp
						.toLowerCase()
						.includes(criteria.motherboardCompatibility!.toLowerCase()),
				);
				if (!hasCompatibility) {
					return false;
				}
			}

			// Filter chipset
			if (criteria.chipset) {
				const compatibleChipsets = this.getCompatibleChipsets(product.socket);
				const hasChipset = compatibleChipsets.some((chipset) =>
					chipset.toLowerCase().includes(criteria.chipset!.toLowerCase()),
				);
				if (!hasChipset) {
					return false;
				}
			}

			return true;
		});
	}

	// Lấy thông tin chi tiết của một CPU theo model/SKU
	getProductInfo(identifier: string): CPUProductInfo | null {
		if (!this.isInitialized) {
			console.warn("⚠️ [CPU Knowledge Base] Not initialized, returning null");
			return null;
		}

		console.log("🔎 [CPU Knowledge Base] Looking up CPU product:", identifier);

		// Tìm theo SKU hoặc tên sản phẩm
		const product = this.products.find(
			(p) =>
				p.sku.toLowerCase().includes(identifier.toLowerCase()) ||
				p.name.toLowerCase().includes(identifier.toLowerCase()) ||
				p.model?.toLowerCase().includes(identifier.toLowerCase()),
		);

		if (product) {
			console.log("✅ [CPU Knowledge Base] Found CPU product:", {
				sku: product.sku,
				name: product.name,
			});
			return { ...product }; // Trả về bản sao
		}

		console.log("⚠️ [CPU Knowledge Base] CPU product not found:", identifier);
		return null;
	}

	// Kiểm tra tương thích giữa CPU và mainboard/chipset
	checkCompatibility(
		cpuIdentifier: string,
		motherboardOrChipset: string,
	): CompatibilityResult {
		if (!this.isInitialized) {
			console.warn(
				"⚠️ [CPU Knowledge Base] Not initialized, returning default compatibility result",
			);
			return {
				isCompatible: false,
				compatibleChipsets: [],
				compatibleMotherboards: [],
				issues: ["Knowledge base not initialized"],
				recommendations: ["Please initialize the knowledge base"],
			};
		}

		console.log("🔄 [CPU Knowledge Base] Checking compatibility:", {
			cpu: cpuIdentifier,
			motherboardOrChipset: motherboardOrChipset,
		});

		// Tìm CPU
		const cpu = this.getProductInfo(cpuIdentifier);
		if (!cpu) {
			return {
				isCompatible: false,
				compatibleChipsets: [],
				compatibleMotherboards: [],
				issues: [`CPU "${cpuIdentifier}" not found in database`],
				recommendations: [`Please check the CPU model name or SKU`],
			};
		}

		// Kiểm tra tương thích với chipset
		const compatibleChipsets = this.getCompatibleChipsets(cpu.socket);
		const isChipsetCompatible = compatibleChipsets.some((chipset) =>
			motherboardOrChipset.toLowerCase().includes(chipset.toLowerCase()),
		);

		// Kiểm tra tương thích với mainboard brand
		const compatibleMotherboards =
			this.getCompatibleMotherboardBrands(motherboardOrChipset);
		const isMotherboardCompatible =
			compatibleMotherboards.length > 0 ||
			compatibleChipsets.some((chipset) =>
				motherboardOrChipset.toLowerCase().includes(chipset.toLowerCase()),
			);

		const issues: string[] = [];
		const recommendations: string[] = [];

		if (!isChipsetCompatible && !isMotherboardCompatible) {
			issues.push(
				`CPU socket ${cpu.socket} may not be compatible with ${motherboardOrChipset}`,
			);
			recommendations.push(
				`Consider checking if your motherboard supports ${cpu.socket} socket`,
			);
			recommendations.push(
				`Compatible chipsets for ${cpu.socket}: ${compatibleChipsets.join(", ")}`,
			);
		}

		console.log("✅ [CPU Knowledge Base] Compatibility check completed:", {
			cpu: cpu.name,
			motherboardOrChipset: motherboardOrChipset,
			isCompatible: isChipsetCompatible || isMotherboardCompatible,
		});

		return {
			isCompatible: isChipsetCompatible || isMotherboardCompatible,
			compatibleChipsets,
			compatibleMotherboards,
			issues,
			recommendations,
		};
	}

	// Lấy danh sách chipset tương thích với socket
	getCompatibleChipsets(socket: string): string[] {
		// Xử lý các socket đặc biệt
		if (socket.toLowerCase().includes("lga1700")) {
			// Kiểm tra xem có phải 13th/14th gen không
			if (
				this.products.some(
					(p) => p.series?.includes("13") || p.series?.includes("14"),
				)
			) {
				return (
					CPU_CHIPSET_COMPATIBILITY["LGA1700_13TH"] ||
					CPU_CHIPSET_COMPATIBILITY["LGA1700"] ||
					[]
				);
			}
			return CPU_CHIPSET_COMPATIBILITY["LGA1700"] || [];
		}

		// Trả về theo socket thông thường
		return CPU_CHIPSET_COMPATIBILITY[socket] || [];
	}

	// Lấy danh sách mainboard brands tương thích với chipset
	getCompatibleMotherboardBrands(chipset: string): string[] {
		return CHIPSET_MOTHERBOARD_BRANDS[chipset.toUpperCase()] || [];
	}

	// Lấy thống kê cơ bản
	getStatistics(): {
		totalProducts: number;
		brands: string[];
		sockets: string[];
		avgPrice: number;
	} {
		if (!this.isInitialized) {
			return {
				totalProducts: 0,
				brands: [],
				sockets: [],
				avgPrice: 0,
			};
		}

		const brands = [
			...new Set(this.products.map((p) => p.brand).filter(Boolean)),
		] as string[];
		const sockets = [
			...new Set(this.products.map((p) => p.socket).filter(Boolean)),
		] as string[];
		const totalPrices = this.products.reduce((sum, p) => sum + p.price, 0);
		const avgPrice =
			this.products.length > 0 ? totalPrices / this.products.length : 0;

		return {
			totalProducts: this.products.length,
			brands,
			sockets,
			avgPrice: Math.round(avgPrice),
		};
	}

	// Kiểm tra trạng thái
	isReady(): boolean {
		return this.isInitialized;
	}
}

// Export instance singleton
export const cpuKnowledgeBase = new CPUProductKnowledgeBase();
