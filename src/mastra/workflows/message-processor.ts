/**
 * Mastra Workflow for processing messages from all channels
 * Leverages Mastra agents and tools for intelligent message handling
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

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
/**\n * 🧠 Step 1: Analyze Intent with Mastra Tool\n * Replaces custom processor logic with intelligent analysis\n */\n.then(\n  createStep({\n    id: 'intent-analysis',\n    description: 'Analyze user intent from message',\n    inputSchema: z.object({\n      channelId: z.enum(['telegram', 'whatsapp', 'web', 'zalo']),\n      message: z.object({\n        content: z.string(),\n        senderId: z.string(),\n        timestamp: z.date(),\n        attachments: z.array(z.object({\n          type: z.string(),\n          url: z.string(),\n          filename: z.string().optional()\n        })).optional()\n      })\n    }),\n    outputSchema: z.object({\n      channelId: z.enum(['telegram', 'whatsapp', 'web', 'zalo']),\n      message: z.object({\n        content: z.string(),\n        senderId: z.string(),\n        timestamp: z.date(),\n        attachments: z.array(z.object({\n          type: z.string(),\n          url: z.string(),\n          filename: z.string().optional()\n        })).optional()\n      }),\n      intent: z.object({\n        intent: z.string(),\n        confidence: z.number(),\n        entities: z.array(z.unknown())\n      }),,\n      chatHistory: z.array(z.object({\n        role: z.string(),\n        content: z.string(),\n        timestamp: z.string().optional()\n      })).optional()\n    }),\n    execute: async ({ inputData, mastra }) => {
      console.log('🔍 [Workflow] Starting intent analysis', {
        channelId: inputData.channelId,
        messageLength: inputData.message.content.length,
        senderId: inputData.message.senderId,
        hasAttachments: !!inputData.message.attachments?.length
      });
      
      // Get chat history from memory
      let chatHistory = [];
      let currentUserProfile = {};
      try {
        const agent = mastra.getAgent('maiSale');
        if (agent.memory) {
          // Create a mock resource and thread for memory access
          const resource = `user_${inputData.message.senderId}`;
          const thread = `${inputData.channelId}_thread`;
          
          // Get recent messages from memory
          const memoryResult = await agent.memory.getRecentMessages({
            resource,
            thread,
            limit: 5
          });
          
          chatHistory = memoryResult.messages.map(msg => ({
            role: msg.role,
            content: msg.content.parts
              .filter(part => part.type === 'text')
              .map(part => part.text)
              .join(''),
            timestamp: msg.timestamp?.toISOString()
          }));
          
          // Get current user profile if available
          try {
            const profileResult = await agent.memory.getWorkingMemory({
              resource,
              thread
            });
            currentUserProfile = profileResult || {};
          } catch (profileError) {
            console.warn('⚠️ [Workflow] Could not retrieve user profile:', profileError.message);
          }
        }
      } catch (error) {
        console.warn('⚠️ [Workflow] Could not retrieve chat history:', error.message);
        chatHistory = [];
      }
      
      // Use default intent analysis
      const intentAnalysis = {
        intent: 'user_query',
        confidence: 0.8,
        entities: []
      };
      
      // Try to use An Data Analyst's intent analyzer tool
      try {
        const analyzerAgent = mastra.getAgent('anDataAnalyst');
        console.log("🤖 [Workflow] Using An Data Analyst for intent analysis", {
          analyzerAgentName: analyzerAgent.name,
          hasTools: Object.keys(analyzerAgent.tools || {}).length,
          hasModel: !!analyzerAgent.model
        });
        
        const analysisResult = await analyzerAgent.tools.intentAnalyzer.execute({
          context: {
            message: inputData.message.content,
            chatHistory: chatHistory,
            currentProfile: currentUserProfile,
            language: inputData.channelId // Using channelId as proxy for language context
          },
          mastra: mastra
        });
        
        console.log("📋 [Workflow] Intent analysis result", {
          primaryIntent: analysisResult.intentClassification.primaryIntent,
          purchaseConfidence: analysisResult.intentClassification.purchaseConfidence,
          warrantyConfidence: analysisResult.intentClassification.warrantyConfidence,
          hasProfileUpdates: Object.keys(analysisResult.profileUpdates).length > 0
        });
        
        // Update intent analysis with results if successful
        intentAnalysis.intent = analysisResult.intentClassification.primaryIntent;
        intentAnalysis.confidence = Math.max(analysisResult.intentClassification.purchaseConfidence, analysisResult.intentClassification.warrantyConfidence);
        
        // Update user profile with pain points and other insights
        if (Object.keys(analysisResult.profileUpdates).length > 0) {
          try {
            const agent = mastra.getAgent('maiSale');
            if (agent.memory) {
              const resource = `user_${inputData.message.senderId}`;
              const thread = `${inputData.channelId}_thread`;
              
              // Update working memory with new profile information
              await agent.memory.updateWorkingMemory({
                resource,
                thread,
                data: analysisResult.profileUpdates
              });
              
              console.log('✅ [Workflow] User profile updated with new insights');
            }
          } catch (updateError) {
            console.warn('⚠️ [Workflow] Could not update user profile:', updateError.message);
          }
        }
      } catch (analysisError) {
        console.error('❌ [Workflow] Intent analysis failed:', analysisError.message);
        // Keep default intent analysis if analysis fails
      }

      console.log('✅ [Workflow] Intent analysis completed', {
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        chatHistoryLength: chatHistory.length
      });
      
      return { ...inputData, intent: intentAnalysis, chatHistory };
    }\n  })\n)

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
      }),,
      chatHistory: z.array(z.object({
        role: z.string(),
        content: z.string(),
        timestamp: z.string().optional()
      })).optional()
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
        confidence: inputData.intent.confidence,
        chatHistoryLength: inputData.chatHistory?.length || 0
      });
      
      // Check if repeat mode is enabled
      const isRepeatMode = process.env.AGENT_REPEAT_MODE === 'true';
      
      if (isRepeatMode) {
        console.log('🔄 [Workflow] Repeat mode enabled, returning user message');
        return {
          response: `Bạn vừa nói: "${inputData.message.content}"`,
          channelId: inputData.channelId,
          metadata: {
            processedBy: 'workflow-repeat-mode',
            timestamp: new Date().toISOString(),
            repeatMode: true
          }
        };
      }
      
      // Use the actual maiSale agent
      const { message, channelId, chatHistory } = inputData;
      const agent = mastra.getAgent('maiSale');
      
      console.log('🔍 [Workflow] Agent details', {
        agentName: agent.name,
        hasModel: !!agent.model,
        hasTools: Object.keys(agent.tools || {}).length
      });
      
      try {
        console.log('🤖 [Workflow] Calling agent.generate with message:', {
          contentLength: message.content.length,
          contentPreview: `${message.content.substring(0, 50)}...`
        });
        
        // Prepare messages with chat history if available
        let messages = [{ role: 'user', content: message.content }];
        if (chatHistory && chatHistory.length > 0) {
          messages = [
            ...chatHistory.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            { role: 'user', content: message.content }
          ];
        }
        
        const result = await agent.generate(messages);
        
        console.log('✅ [Workflow] Agent response generated successfully', {
          responseLength: result.text.length,
          responsePreview: `${result.text.substring(0, 50)}...`
        });
        
        return {
          response: result.text,
          channelId,
          metadata: {
            processedBy: 'workflow-agent',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        console.error('❌ [Workflow] Error generating response with agent:', {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        });
        return {
          response: 'Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
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
