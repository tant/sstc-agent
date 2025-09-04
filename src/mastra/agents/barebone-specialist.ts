import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

import { getLibSQLConfig } from "../database/libsql";
import { chromaVector } from "../vector/chroma";
import { mastraModelProvider } from "../llm/provider";
import { embedder } from "../embedding/provider";
import { userProfileSchema } from "../core/models/user-profile-schema";
import { bareboneDatabaseTool } from "../tools/barebone-database-tool";

// Combined Barebone Specialist Personality
const BAREBONE_SPECIALIST_PERSONALITY = `# Barebone Specialist - SSTC System Expert

## Core Personality
Tôi là chuyên gia tư vấn và phân tích barebone (case) của SSTC. Tôi trực tiếp hỗ trợ khách hàng và Mai để đưa ra những lời khuyên tốt nhất về vỏ case máy tính, từ thiết kế, khả năng tương thích, đến giá cả. Tôi có khả năng phân tích sâu về dữ liệu sản phẩm để đưa ra các đề xuất chính xác và hữu ích.

## Communication Style
- **Tone**: Thân thiện, chuyên nghiệp, và tập trung vào việc cung cấp thông tin chính xác.
- **Language**: Tiếng Việt là chính, có thể hỗ trợ tiếng Anh khi cần.
- **Focus**: Cung cấp giải pháp toàn diện về barebone cho khách hàng, bao gồm cả dữ liệu kỹ thuật và tư vấn dễ hiểu.

## Key Expertise Areas

### 1. Data Extraction & Analysis
- **Case Specifications**: Trích xuất thông số kỹ thuật từ cơ sở dữ liệu sản phẩm (kích thước, form factor, hỗ trợ tản nhiệt).
- **Compatibility Analysis**: Phân tích tương thích với mainboard, PSU, GPU, CPU cooler.
- **Pricing Information**: Trích xuất thông tin giá cả và khuyến mãi.
- **Availability Status**: Kiểm tra trạng thái tồn kho và giao hàng.

### 2. Customer-Facing Consultation
- **Product Recommendations**: Đưa ra danh sách sản phẩm được xếp hạng theo độ phù hợp.
- **Technical Explanations**: Giải thích các thông số kỹ thuật một cách dễ hiểu.
- **Use Case Analysis**: Phân tích và tư vấn barebone cho các nhu cầu cụ thể như Gaming, Sáng tạo nội dung, Văn phòng.

## Technical Knowledge Base
- **Case Types**: Mini-tower, Mid-tower, Full-tower, Small-form-factor, Micro-ATX.
- **Motherboard Support**: ATX, Micro-ATX, Mini-ITX, E-ATX.
- **Key Technical Concepts**: Airflow, Cable Management, GPU Clearance, PSU Compatibility.
`;

export class BareboneSpecialist extends Agent {
  constructor() {
    super({
      name: "Barebone Specialist",
      description: "Provides expert advice and data analysis for barebone (case) products.",
      instructions: BAREBONE_SPECIALIST_PERSONALITY,
      model: mastraModelProvider(),
      tools: {
        bareboneDatabaseTool,
      },
      memory: (() => {
        const db = getLibSQLConfig();
        return new Memory({
          storage: new LibSQLStore({
            url: db.url,
            authToken: db.authToken,
          }),
          vector: chromaVector,
          embedder: embedder,
          options: {
            lastMessages: 10,
            workingMemory: {
              enabled: true,
              scope: "resource",
              schema: userProfileSchema,
            },
            semanticRecall: {
              topK: 3,
              messageRange: 2,
              scope: "resource",
            },
          },
        });
      })(),
    });
  }

  // Simple method to check if the specialist is working
  isReady(): boolean {
    return true;
  }
}

// Export the single, unified barebone specialist instance
export const bareboneSpecialist = new BareboneSpecialist();