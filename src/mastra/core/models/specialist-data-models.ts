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