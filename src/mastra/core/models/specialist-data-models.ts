// Specialist Data Models for Structured Communication Between Agents
// Enhanced with validation and normalization logic

// Base interfaces
interface SpecialistData {
	type: string;
	recommendations: ProductRecommendation[];
	technicalAnalysis: TechnicalAnalysis;
	compatibilityCheck: CompatibilityResult;
	pricingInfo: PricingInformation;
	availability: AvailabilityStatus;
	confidenceScore: number; // 0.0 - 1.0
	processingMetadata: ProcessingMetadata;
}

interface ProductRecommendation {
	productId: string;
	productName: string;
	specifications: Record<string, any>;
	price: number;
	availability: "in_stock" | "low_stock" | "out_of_stock";
	recommendationScore: number; // 0.0 - 100.0
	keyFeatures: string[];
	useCases: string[];
	imageUrl?: string;
	description?: string;
}

interface TechnicalAnalysis {
	keySpecifications: Record<string, string>;
	performanceMetrics: Record<string, any>;
	technicalRequirements: string[];
}

interface CompatibilityResult {
	isCompatible: boolean;
	compatibilityIssues: string[];
	recommendations: string[];
}

interface PricingInformation {
	basePrice: number;
	totalPrice: number;
	savings?: number;
	discountPercentage?: number;
	currency?: string;
}

interface AvailabilityStatus {
	inStock: boolean;
	estimatedDelivery?: string;
	quantityAvailable?: number;
	warehouseLocation?: string;
}

interface ProcessingMetadata {
	processingTime: number; // milliseconds
	dataSources: string[];
	completeness: number; // 0-100%
	error?: string;
	warnings?: string[];
}

// Storage Specialist Data Interfaces
export interface StorageSpecialistData extends SpecialistData {
	type: "storage";
	recommendations: StorageProductRecommendation[];
	technicalAnalysis: StorageTechnicalAnalysis;
}

export interface StorageProductRecommendation extends ProductRecommendation {
	specifications: {
		interface: "SATA" | "NVMe" | "M.2" | "U.2";
		capacity: string;
		readSpeed: string;
		writeSpeed: string;
		formFactor: string;
		endurance: string;
		controller?: string;
		nandType?: string;
	};
	useCases: ("gaming" | "content-creation" | "office" | "professional")[];
}

export interface StorageTechnicalAnalysis extends TechnicalAnalysis {
	keySpecifications: {
		interface: "SATA" | "NVMe" | "M.2" | "U.2";
		baseCapacity: string;
		maxCapacity: string;
		baseReadSpeed: string;
		maxReadSpeed: string;
		baseWriteSpeed: string;
		maxWriteSpeed: string;
	};
	performanceMetrics: {
		readPerformance: number; // 0-100
		writePerformance: number; // 0-100
		durabilityScore: number; // 0-100
		pricePerformance: number; // 0-100
	};
	technicalRequirements: string[];
}

// RAM Specialist Data Interfaces
export interface RAMSpecialistData extends SpecialistData {
	type: "ram";
	recommendations: RAMProductRecommendation[];
	technicalAnalysis: RAMTechnicalAnalysis;
}

export interface RAMProductRecommendation extends ProductRecommendation {
	specifications: {
		type: "DDR4" | "DDR5";
		capacity: string;
		speed: string;
		latency: string;
		voltage: string;
		formFactor: string;
		ecc: boolean;
		brand: string;
		quantity: number;
		channel: "single" | "dual" | "quad";
	};
	useCases: ("gaming" | "content-creation" | "office" | "professional")[];
}

export interface RAMTechnicalAnalysis extends TechnicalAnalysis {
	keySpecifications: {
		memoryType: "DDR4" | "DDR5";
		baseSpeed: string;
		maxSpeed: string;
		baseLatency: string;
		maxLatency: string;
		voltage: string;
		bandwidth: string;
	};
	performanceMetrics: {
		readSpeed: string;
		writeSpeed: string;
		latencyScore: number; // 0-100
		bandwidthScore: number; // 0-100
	};
	technicalRequirements: string[];
}

// CPU Specialist Data Interfaces
export interface CPUSpecialistData extends SpecialistData {
	type: "cpu";
	recommendations: CPUProductRecommendation[];
	technicalAnalysis: CPUTechnicalAnalysis;
}

export interface CPUProductRecommendation extends ProductRecommendation {
	specifications: {
		socket: string;
		cores: number;
		threads: number;
		baseClock: string;
		boostClock: string;
		powerConsumption: string;
		l3Cache: string;
		architecture: string;
		integratedGraphics?: string;
	};
	useCases: ("gaming" | "content-creation" | "office" | "professional")[];
}

export interface CPUTechnicalAnalysis extends TechnicalAnalysis {
	keySpecifications: {
		socket: string;
		coreCount: number;
		threadCount: number;
		baseFrequency: string;
		boostFrequency: string;
		powerConsumption: string;
		l3Cache: string;
		architecture: string;
	};
	performanceMetrics: {
		singleCorePerformance: number; // 0-100
		multiCorePerformance: number; // 0-100
		powerEfficiency: number; // 0-100
		thermalPerformance: number; // 0-100
	};
	technicalRequirements: string[];
}

// Desktop Specialist Data Interfaces
export interface DesktopSpecialistData extends SpecialistData {
	type: "desktop";
	recommendations: DesktopProductRecommendation[];
	technicalAnalysis: DesktopTechnicalAnalysis;
}

export interface DesktopProductRecommendation extends ProductRecommendation {
	specifications: {
		cpuModel: string;
		ramConfiguration: {
			type: "DDR4" | "DDR5";
			capacity: string;
			speed: string;
			latency: string;
		};
		storageConfiguration: {
			type: "SSD" | "HDD" | "NVMe";
			capacity: string;
			interface: "SATA" | "NVMe" | "M.2";
			speed: string;
		};
		caseModel: string;
		caseSize: string;
		powerSupply: string;
		coolingSolution: string;
	};
	useCases: ("gaming" | "content-creation" | "office" | "professional")[];
}

export interface DesktopTechnicalAnalysis extends TechnicalAnalysis {
	keySpecifications: {
		cpuSocket: string;
		ramType: "DDR4" | "DDR5";
		ramCapacity: string;
		storageType: "SSD" | "HDD" | "NVMe";
		storageCapacity: string;
		caseSize: string;
		powerRequirement: string;
	};
	performanceMetrics: {
		overallPerformance: number; // 0-100
		upgradePotential: number; // 0-100
		coolingEfficiency: number; // 0-100
		pricePerformance: number; // 0-100
	};
	technicalRequirements: string[];
}

// Barebone Specialist Data Interfaces
export interface BareboneSpecialistData extends SpecialistData {
	type: "barebone";
	recommendations: BareboneProductRecommendation[];
	technicalAnalysis: BareboneTechnicalAnalysis;
}

export interface BareboneProductRecommendation extends ProductRecommendation {
	specifications: {
		caseSize: string;
		motherboardFormFactor: string;
		supportedCpus: string[];
		ramSlots: number;
		maxRam: number;
		coolingSystem: string;
		aesthetics: string;
	};
	useCases: ("gaming" | "content-creation" | "office" | "professional")[];
}

export interface BareboneTechnicalAnalysis extends TechnicalAnalysis {
	keySpecifications: {
		caseSize: string;
		motherboardFormFactor: string;
		supportedSocket: string;
		ramSupport: "DDR4" | "DDR5";
		maxRamCapacity: number;
		ramSlots: number;
		coolingType: string;
		aestheticsStyle: string;
	};
	performanceMetrics: {
		expandability: number; // 0-100
		coolingEfficiency: number; // 0-100
		aestheticAppeal: number; // 0-100
		pricePerformance: number; // 0-100
	};
	technicalRequirements: string[];
}

// Validation and utility functions
export function validateSpecialistData(data: any): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!data) {
		return { isValid: false, errors: ["Missing specialist data"] };
	}

	if (!data.type) {
		errors.push("Missing specialist data type");
	}

	if (!data.recommendations) {
		errors.push("Missing recommendations");
	} else if (!Array.isArray(data.recommendations)) {
		errors.push("Recommendations must be an array");
	}

	if (!data.technicalAnalysis) {
		errors.push("Missing technical analysis");
	}

	if (typeof data.confidenceScore !== "number") {
		errors.push("confidenceScore must be a number");
	} else if (data.confidenceScore < 0 || data.confidenceScore > 1) {
		errors.push("confidenceScore must be between 0.0 and 1.0");
	}

	if (!data.processingMetadata) {
		errors.push("Missing processing metadata");
	}

	return { isValid: errors.length === 0, errors };
}
