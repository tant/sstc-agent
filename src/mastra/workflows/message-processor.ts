/**
 * Mastra Workflow for processing messages from all channels
 * Leverages Mastra agents and tools for intelligent message handling
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { NormalizedMessage, ProcessedResponse } from "../core/models/message";

export const channelMessageWorkflow = createWorkflow({
  id: 'channel-message-processor',
  description: 'Process messages from various chat channels',
  inputSchema: z.object({
    channelId: z.enum(['telegram', 'whatsapp', 'web', 'zalo']),
    message: z.object({
      content: z.string(),
      senderId: z.string(),
      timestamp: z.date(),
      attachments: z.array(z.object({
        type: z.string(),
        url: z.string(),
        filename: z.string().optional()
      })).optional()
    })
  }),
  outputSchema: z.object({
    response: z.string(),
    channelId: z.string(),
    actions: z.array(z.string()).optional(),
    metadata: z.record(z.unknown())
  })
})
/**
 * 🧠 Step 1: Analyze Intent with Mastra Tool
 * Replaces custom processor logic with intelligent analysis
 */
.then(
  createStep({
    id: 'intent-analysis',
    description: 'Analyze user intent from message',
    inputSchema: z.object({
      channelId: z.enum(['telegram', 'whatsapp', 'web', 'zalo']),
      message: z.object({
        content: z.string(),
        senderId: z.string(),
        timestamp: z.date(),
        attachments: z.array(z.object({
          type: z.string(),
          url: z.string(),
          filename: z.string().optional()
        })).optional()
      })
    }),
    outputSchema: z.object({
      channelId: z.enum(['telegram', 'whatsapp', 'web', 'zalo']),
      message: z.object({
        content: z.string(),
        senderId: z.string(),
        timestamp: z.date(),
        attachments: z.array(z.object({
          type: z.string(),
          url: z.string(),
          filename: z.string().optional()
        })).optional()
      }),
      intent: z.object({
        intent: z.string(),
        confidence: z.number(),
        entities: z.array(z.unknown())
      })
    }),
    execute: async ({ inputData }) => {
      console.log('🔍 [Workflow] Starting intent analysis', {
        channelId: inputData.channelId,
        messageLength: inputData.message.content.length,
        senderId: inputData.message.senderId,
        hasAttachments: !!inputData.message.attachments?.length
      });
      
      // Use existing intent analyzer tool (will create in Part 2)
      // For now, pass through with basic analysis
      const intentAnalysis = {
        intent: 'user_query',
        confidence: 0.8,
        entities: []
      };

      console.log('✅ [Workflow] Intent analysis completed', {
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence
      });
      
      return { ...inputData, intent: intentAnalysis };
    }
  })
)

/**
 * 💬 Step 2: Generate Response with Mastra Agent
 * Use existing maiSale agent or create specialized agent
 */
.then(
  createStep({
    id: 'response-generation',
    description: 'Generate AI response using maiSale agent',
    inputSchema: z.object({
      channelId: z.enum(['telegram', 'whatsapp', 'web', 'zalo']),
      message: z.object({
        content: z.string(),
        senderId: z.string(),
        timestamp: z.date(),
        attachments: z.array(z.object({
          type: z.string(),
          url: z.string(),
          filename: z.string().optional()
        })).optional()
      }),
      intent: z.object({
        intent: z.string(),
        confidence: z.number(),
        entities: z.array(z.unknown())
      })
    }),
    outputSchema: z.object({
      response: z.string(),
      channelId: z.string(),
      actions: z.array(z.string()).optional(),
      metadata: z.record(z.unknown())
    }),
    execute: async ({ inputData, mastra }) => {
      console.log('🔄 [Workflow] Generating response with agent', {
        channelId: inputData.channelId,
        messageLength: inputData.message.content.length,
        senderId: inputData.message.senderId,
        intent: inputData.intent.intent,
        confidence: inputData.intent.confidence
      });
      
      // Use the actual maiSale agent
      const { message, channelId } = inputData;
      const agent = mastra.getAgent('maiSale');
      
      console.log('🔍 [Workflow] Agent details', {
        agentName: agent.name,
        hasModel: !!agent.model,
        hasTools: Object.keys(agent.tools || {}).length
      });
      
      try {
        console.log('🤖 [Workflow] Calling agent.generate with message:', {
          contentLength: message.content.length,
          contentPreview: message.content.substring(0, 50) + '...'
        });
        
        const result = await agent.generate([{ role: 'user', content: message.content }]);
        
        console.log('✅ [Workflow] Agent response generated successfully', {
          responseLength: result.text.length,
          responsePreview: result.text.substring(0, 50) + '...',
          hasMetadata: !!result.metadata,
          metadataKeys: result.metadata ? Object.keys(result.metadata) : []
        });
        
        return {
          response: result.text,
          text: result.text,
          channelId,
          metadata: {
            processedBy: 'workflow-agent',
            timestamp: new Date().toISOString(),
            ...result.metadata
          }
        };
      } catch (error) {
        console.error('❌ [Workflow] Error generating response with agent:', {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        });
        return {
          response: 'Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
          text: 'Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
          channelId,
          metadata: {
            error: error instanceof Error ? error.message : String(error),
            processedBy: 'workflow-agent-error',
            timestamp: new Date().toISOString()
          }
        };
      }
    }
  })
)

.commit();

// ✅ Mastra Workflow Ready!
console.log('✅ Channel Message Workflow initialized');
