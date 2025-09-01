import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { userProfileSchema } from '../core/models/user-profile-schema';

// Schema for intent classification
const intentClassificationSchema = z.object({
  primaryIntent: z.enum(['purchase', 'warranty', 'mixed', 'unknown']),
  purchaseConfidence: z.number().min(0).max(1),
  warrantyConfidence: z.number().min(0).max(1),
});

// Schema for the tool input
const intentAnalyzerInputSchema = z.object({
  message: z.string(),
  chatHistory: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).optional(),
  currentProfile: userProfileSchema.optional(),
  language: z.string().optional(),
});

// Schema for the tool output
const intentAnalyzerOutputSchema = z.object({
  intentClassification: intentClassificationSchema,
  profileUpdates: userProfileSchema,
  confidence: z.number().min(0).max(1),
  analysisNotes: z.string().optional(),
});

export const intentAnalyzerTool = createTool({
  id: 'intent-analyzer',
  description: 'Analyze user intent and update user profile with pain points, interests, and goals',
  inputSchema: intentAnalyzerInputSchema,
  outputSchema: intentAnalyzerOutputSchema,
  execute: async (context) => {
    // Access the input data from context
    const inputData = context as any;
    const { message, chatHistory, currentProfile, language } = inputData;

    console.log('🔍 [Intent Analyzer] Starting analysis', {
      messageLength: message.length,
      hasChatHistory: !!chatHistory?.length,
      language
    });

    try {
      // Simple rule-based intent analysis (can be enhanced later)
      let primaryIntent: 'purchase' | 'warranty' | 'mixed' | 'unknown' = 'unknown';
      let purchaseConfidence = 0;
      let warrantyConfidence = 0;

      // Basic keyword-based analysis
      const lowerMessage = message.toLowerCase();

      // Check for purchase-related keywords
      const purchaseKeywords = ['mua', 'buy', 'purchase', 'price', 'cost', 'order', 'dat hang', 'gia'];
      purchaseConfidence = purchaseKeywords.reduce((score, keyword) => {
        return score + (lowerMessage.includes(keyword) ? 0.3 : 0);
      }, 0);

      // Check for warranty-related keywords
      const warrantyKeywords = ['Bao hanh', 'warranty', 'guarantee', 'hong', 'broken', 'broken', 'sua chua'];
      warrantyConfidence = warrantyKeywords.reduce((score, keyword) => {
        return score + (lowerMessage.includes(keyword) ? 0.3 : 0);
      }, 0);

      // Determine primary intent
      if (purchaseConfidence > warrantyConfidence && purchaseConfidence > 0.4) {
        primaryIntent = 'purchase';
      } else if (warrantyConfidence > purchaseConfidence && warrantyConfidence > 0.4) {
        primaryIntent = 'warranty';
      } else if (purchaseConfidence > 0.2 && warrantyConfidence > 0.2) {
        primaryIntent = 'mixed';
      }

      // Cap confidences at 1.0
      purchaseConfidence = Math.min(purchaseConfidence, 1);
      warrantyConfidence = Math.min(warrantyConfidence, 1);

      // Create analysis result
      const analysisResult = {
        intentClassification: {
          primaryIntent,
          purchaseConfidence,
          warrantyConfidence
        },
        profileUpdates: currentProfile || {},
        confidence: Math.max(purchaseConfidence, warrantyConfidence, 0.1),
        analysisNotes: `Rule-based analysis found ${primaryIntent} intent with confidence scores: purchase=${purchaseConfidence.toFixed(2)}, warranty=${warrantyConfidence.toFixed(2)}`
      };

      // Validate the result against the schema
      const validatedResult = intentAnalyzerOutputSchema.parse(analysisResult);

      console.log('✅ [Intent Analyzer] Analysis completed', {
        primaryIntent: validatedResult.intentClassification.primaryIntent,
        purchaseConfidence: validatedResult.intentClassification.purchaseConfidence,
        warrantyConfidence: validatedResult.intentClassification.warrantyConfidence,
        profileUpdatesCount: Object.keys(validatedResult.profileUpdates).length,
        confidence: validatedResult.confidence
      });

      // Log detailed analysis notes if available
      if (validatedResult.analysisNotes) {
        console.log('📝 [Intent Analyzer] Analysis notes:', validatedResult.analysisNotes);
      }

      // Log profile updates if any
      if (Object.keys(validatedResult.profileUpdates).length > 0) {
        console.log('📊 [Intent Analyzer] Profile updates:', JSON.stringify(validatedResult.profileUpdates, null, 2));
      }

      return validatedResult;
    } catch (error) {
      console.error('❌ [Intent Analyzer] Analysis failed:', error);
      throw new Error(`Intent analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});
