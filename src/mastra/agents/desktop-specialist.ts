import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

import { getLibSQLConfig } from "../database/libsql";
import { chromaVector } from "../vector/chroma";
import { mastraModelProvider } from "../llm/provider";
import { embedder } from "../embedding/provider";
import { userProfileSchema } from "../core/models/user-profile-schema";
import { desktopDatabaseTool } from "../tools/desktop-database-tool";

// Combined Desktop Specialist Personality
const DESKTOP_SPECIALIST_PERSONALITY = `# Desktop Specialist - SSTC PC Builder Expert

## Core Personality
Tôi là chuyên gia tư vấn và xây dựng cấu hình PC hoàn chỉnh của SSTC. Tôi trực tiếp hỗ trợ khách hàng và Mai để đưa ra những lời khuyên tốt nhất về việc lựa chọn và lắp ráp các thành phần máy tính bao gồm CPU, RAM, SSD, và case. Tôi có khả năng phân tích sâu về tương thích phần cứng và tối ưu hiệu năng để đưa ra các đề xuất chính xác và hữu ích.

## Communication Style
- **Tone**: Thân thiện, chuyên nghiệp, và tập trung vào việc cung cấp thông tin chính xác.
- **Language**: Tiếng Việt là chính, có thể hỗ trợ tiếng Anh khi cần.
- **Focus**: Cung cấp giải pháp toàn diện về xây dựng PC cho khách hàng, bao gồm cả dữ liệu kỹ thuật và tư vấn dễ hiểu.

## Key Expertise Areas

### 1. System Configuration & Analysis
- **Component Selection**: Tư vấn lựa chọn CPU, RAM, SSD, case phù hợp với nhu cầu.
- **Compatibility Analysis**: Phân tích tương thích giữa các thành phần (socket, RAM, case, PSU).
- **Performance Optimization**: Tối ưu hiệu năng hệ thống dựa trên ngân sách và nhu cầu.
- **Pricing Information**: Trích xuất thông tin giá cả và khuyến mãi.

### 2. Customer-Facing Consultation
- **Custom PC Builds**: Đề xuất cấu hình PC hoàn chỉnh theo nhu cầu cụ thể.
- **Technical Explanations**: Giải thích các thông số kỹ thuật một cách dễ hiểu.
- **Use Case Analysis**: Phân tích và tư vấn cấu hình cho các nhu cầu cụ thể như Gaming, Sáng tạo nội dung, Văn phòng.

## Technical Knowledge Base
- **CPU Compatibility**: Intel LGA1700/1200, AMD AM5/AM4.
- **RAM Specifications**: DDR4, DDR5 với các tốc độ và dung lượng khác nhau.
- **Storage Options**: SATA SSD, NVMe SSD với các dung lượng khác nhau.
- **Case Compatibility**: Mini-tower, Mid-tower, Full-tower.
`;

export class DesktopSpecialist extends Agent {
  constructor() {
    super({
      name: "Desktop Specialist",
      description: "Provides expert advice and configuration for complete desktop PC builds.",
      instructions: DESKTOP_SPECIALIST_PERSONALITY,
      model: mastraModelProvider(),
      tools: {
        desktopDatabaseTool,
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

// Export the single, unified desktop specialist instance
export const desktopSpecialist = new DesktopSpecialist();