/**
 * Mastra Workflow for processing messages from all channels
 * Leverages Mastra agents and tools for intelligent message handling
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { chromaVector } from "../vector/chroma";
import { embedder } from "../embedding/provider";
import { userProfileSchema } from "../core/models/user-profile-schema";
import { getLibSQLConfig } from "../database/libsql";

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
      }),
      chatHistory: z.array(z.object({
        role: z.string(),
        content: z.string(),
        timestamp: z.string().optional()
      })).optional()
    }),
    execute: async ({ inputData, mastra }) => {
        console.log('🔍 [Workflow] Starting intent analysis', {
          channelId: (inputData as any)?.channelId,
          messageLength: (inputData as any)?.message?.content?.length,
          senderId: (inputData as any)?.message?.senderId,
          hasAttachments: !!((inputData as any)?.message?.attachments?.length)
        });

      // Get chat history from memory
      let chatHistory: any[] = [];
      let currentUserProfile: any = {};
      try {
        // Create a memory instance with the same configuration as the agents
        const memory = (() => {
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
                scope: "resource"
              },
            },
          });
        })();

        // Create user-specific resource for memory access using real sender data
        const resource = `user_${(inputData as any).message.senderId}`;
        const thread = `${(inputData as any).channelId}_thread`;

        // Get recent messages from memory
        const memoryResult = await memory.query({
          threadId: thread,
          selectBy: { last: 5 },
          threadConfig: {} as any // Type fix - provide empty config to satisfy API
        });

        chatHistory = memoryResult.uiMessages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp?.toISOString()
        }));

        // Get current user profile if available
        try {
          const profileResult = await memory.query({
            threadId: thread,
            selectBy: { last: 1 },
            threadConfig: {} as any // Type fix - provide empty config to satisfy API
          });
          currentUserProfile = profileResult || {};
        } catch (profileError) {
          console.warn('⚠️ [Workflow] Could not retrieve user profile:', profileError?.message);
        }
      } catch (error) {
        console.warn('⚠️ [Workflow] Could not retrieve chat history:', error instanceof Error ? error.message : String(error));
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
          analyzerAgentName: analyzerAgent?.name,
          hasTools: Object.keys(analyzerAgent?.tools || {}).length,
          hasModel: !!analyzerAgent?.model
        });

        const toolContext = {
          message: (inputData as any)?.message?.content,
          chatHistory,
          currentProfile: currentUserProfile,
          language: (inputData as any)?.channelId as string
        };

        // Try to use An Data Analyst's intent analyzer tool - simplified approach
        let analysisResult: any;
        try {
          if (analyzerAgent.tools && analyzerAgent.tools.intentAnalyzer?.execute) {
            // Suppress TypeScript warning for deprecated tools property
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            analysisResult = await analyzerAgent.tools.intentAnalyzer.execute({ context: toolContext });
          } else {
            throw new Error('Intent analyzer tool not available via direct access');
          }
        } catch (toolError: any) {
          console.warn('⚠️ [Workflow] Tool execution failed:', toolError?.message || 'Unknown error');
          throw new Error(`Intent analyzer tool execution failed: ${toolError?.message || 'Unknown error'}`);
        }

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
            // Update working memory if we have profile changes and can find the proper API
            if (Object.keys(analysisResult.profileUpdates).length > 0) {
          try {
            // TODO: Implement proper working memory update when Memory API is clarified
            // For now, just log that we would update the profile
            console.log('📝 [Workflow] Would update user profile with:', analysisResult.profileUpdates);
            console.log('✅ [Workflow] User profile update noted (implementation pending Memory API clarification)');
          } catch (updateError) {
            console.warn('⚠️ [Workflow] Could not update user profile:', updateError?.message);
          }
        }
      } catch (analysisError ) {
        console.error('❌ [Workflow] Intent analysis failed:', analysisError?.message);
        // Keep default intent analysis if analysis fails
      }

      console.log('✅ [Workflow] Intent analysis completed', {
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        chatHistoryLength: chatHistory.length
      });

      return { ...inputData, intent: intentAnalysis, chatHistory };
    }
  })
)
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
      }),
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
        channelId: (inputData as any).channelId,
        messageLength: (inputData as any).message.content.length,
        senderId: (inputData as any).message.senderId,
        intent: (inputData as any).intent.intent,
        confidence: (inputData as any).intent.confidence,
        chatHistoryLength: (inputData as any).chatHistory?.length || 0
      });

      // Check if repeat mode is enabled
      const isRepeatMode = process.env.AGENT_REPEAT_MODE === 'true';

      if (isRepeatMode) {
        console.log('🔄 [Workflow] Repeat mode enabled, returning user message');
        return {
          response: `Bạn vừa nói: "${(inputData as any)?.message?.content}"`,
          channelId: (inputData as any)?.channelId,
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
        agentName: agent?.name,
        hasModel: !!agent?.model,
        hasTools: Object.keys(agent?.tools || {}).length
      });

      try {
        console.log('🤖 [Workflow] Calling agent.generate with message:', {
          contentLength: message.content.length,
          contentPreview: `${message.content.substring(0, 50)}...`
        });

        // Prepare messages with chat history if available (with safety limits)
        let messages = [{ role: 'user', content: message.content }];
        if (chatHistory && chatHistory.length > 0) {
          // Limit chat history to prevent context overflow
          const maxHistoryMessages = 5;
          const recentHistory = chatHistory.slice(-maxHistoryMessages);

          // Calculate approximate token usage to avoid overflow (GPT-OSS-20B optimized)
          const systemPromptTokens = 800;  // Mai personality 3117 chars ~779 tokens
          const messageOverheadTokens = 10; // Per message overhead
          const tokensPerChar = 0.25; // Rough estimate

          let totalEstimatedTokens = systemPromptTokens;
          totalEstimatedTokens += recentHistory.reduce((acc, msg) => {
            return acc + (msg.content?.length || 0) * tokensPerChar + messageOverheadTokens;
          }, 0);
          totalEstimatedTokens += message.content.length * tokensPerChar + messageOverheadTokens;

          // Reserved tokens for response (leave some buffer)
          const reservedTokens = 300;  // Response tokens
          const maxSafeTokens = 1900;  // GPT-OSS-20B context limit (conservative)
          const availableTokens = Math.max(200, maxSafeTokens - reservedTokens - systemPromptTokens);

          if (totalEstimatedTokens > availableTokens) {
            console.warn('⚠️ [Workflow] Likely context overflow detected, trimming chat history', {
              totalEstimatedTokens: Math.round(totalEstimatedTokens),
              availableTokens: Math.round(availableTokens),
              recentHistoryLength: recentHistory.length
            });

            // Further reduce history if still too long
            const reducedHistory = [];
            let currentTokens = systemPromptTokens;
            currentTokens += message.content.length * tokensPerChar + messageOverheadTokens;

            for (let i = recentHistory.length - 1; i >= 0 && currentTokens < availableTokens; i--) {
              const msgTokens = (recentHistory[i].content?.length || 0) * tokensPerChar + messageOverheadTokens;
              if (currentTokens + msgTokens <= availableTokens) {
                reducedHistory.unshift(recentHistory[i]);
                currentTokens += msgTokens;
              } else {
                break;
              }
            }

            console.log('📏 [Workflow] Trimmed chat history for safe context', {
              originalLength: recentHistory.length,
              reducedLength: reducedHistory.length,
              estimatedTokens: Math.round(currentTokens)
            });

            messages = [
              ...reducedHistory.map((msg: any) => ({
                role: msg.role,
                content: msg.content
              })),
              { role: 'user', content: message.content }
            ];
          } else {
            messages = [
              ...recentHistory.map((msg: any) => ({
                role: msg.role,
                content: msg.content
              })),
              { role: 'user', content: message.content }
            ];
          }
        }

        // Add logging before generate to help debug
        console.log('📊 [Workflow] Before agent.generate', {
          totalMessages: messages.length,
          chatHistoryUsed: messages.length > 1,
          estimatedTotalLength: messages.reduce((acc, msg) => {
            return acc + (typeof msg.content === 'string' ? msg.content.length : 100);
          }, 0)
        });

        let result;
        try {
          result = await agent.generate(messages as any);
          console.log('✅ [Workflow] Generate succeeded');
        } catch (generateError: any) {
          // Log detailed error info
          console.error('❌ [Workflow] Generate failed with detailed info', {
            errorMessage: generateError.message,
            messagesCount: messages.length,
            lastMessageLength: messages[messages.length - 1]?.content?.length || 0,
            model: agent?.model?.toString(),
            hasTools: !!agent?.tools
          });

          // Fallback: try without chat history if tokens error
          if (generateError.message?.includes('tokens') || generateError.message?.includes('context')) {
            console.log('🔄 [Workflow] Retrying without chat history due to token limits');
            try {
              result = await agent.generate([messages[messages.length - 1]] as any);
              console.log('✅ [Workflow] Fallback generate succeeded');
            } catch (fallbackError: any) {
              console.error('❌ [Workflow] Fallback generate also failed', fallbackError.message);
              // Return error response instead of throwing
              return {
                response: 'Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
                channelId,
                metadata: {
                  error: generateError.message,
                  processedBy: 'workflow-agent-error',
                  timestamp: new Date().toISOString()
                }
              };
            }
          } else {
            // Return error response instead of throwing
            return {
              response: 'Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
              channelId,
              metadata: {
                error: generateError.message,
                processedBy: 'workflow-agent-error',
                timestamp: new Date().toISOString()
              }
            };
          }
        }

        console.log('✅ [Workflow] Agent response generated successfully', {
          responseLength: result.text.length,
          responsePreview: `${result.text?.substring(0, 50)}...`
        });

        return {
          response: result.text || 'Sorry, I could not generate a response.',
          channelId,
          metadata: {
            processedBy: 'workflow-agent',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error: any) {
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
