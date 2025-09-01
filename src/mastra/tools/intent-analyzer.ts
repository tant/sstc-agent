import { createTool } from \"@mastra/core/tools\";
import { z } from \"zod\";
import { userProfileSchema } from \"../core/models/user-profile-schema\";

// Schema for intent classification
const intentClassificationSchema = z.object({
  primaryIntent: z.enum([\"purchase\", \"warranty\", \"mixed\", \"unknown\"]),
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
  id: \"intent-analyzer\",
  description: \"Analyze user intent and update user profile with pain points, interests, and goals\",
  inputSchema: intentAnalyzerInputSchema,
  outputSchema: intentAnalyzerOutputSchema,
  execute: async ({ context, mastra }) => {
    const { message, chatHistory, currentProfile, language } = context;
    
    console.log(\"🔍 [Intent Analyzer] Starting analysis\", {
      messageLength: message.length,
      hasChatHistory: !!chatHistory?.length,
      language
    });
    
    try {
      // Get the An Data Analyst agent
      const analyzerAgent = mastra.getAgent(\"anDataAnalyst\");
      
      // Prepare the analysis prompt
      const analysisPrompt = `
You are An Data Analyst, a specialized AI for analyzing user conversations and updating user profiles.
Analyze the following user message and provide intent classification and profile updates.

Message: \"${message}\"

${chatHistory && chatHistory.length > 0 ? 
  `Recent conversation history:
${chatHistory.map((msg, idx) => `${idx + 1}. ${msg.role}: ${msg.content}`).join('\n')}` : 
  'No conversation history available.'
}

${currentProfile ? 
  `Current user profile:
${JSON.stringify(currentProfile, null, 2)}` : 
  'No current user profile available.'
}

Please analyze this interaction and provide:
1. Intent classification (purchase, warranty, mixed, or unknown) with confidence scores
2. Any updates to the user profile including pain points, interests, and goals
3. A confidence score for your analysis (0.0-1.0)
4. Detailed notes on your analysis reasoning, including:
   - Key phrases or words that influenced your decision
   - Contextual clues you identified
   - Any uncertainties or edge cases you considered
   - Why you chose the specific confidence scores

Respond in JSON format matching the required output schema.
`;
      
      console.log(\"🧠 [Intent Analyzer] Sending prompt to LLM\", {
        promptLength: analysisPrompt.length,
        model: analyzerAgent.model ? \"configured\" : \"not configured\"
      });
      
      // Call the agent to perform analysis
      const result = await analyzerAgent.generate([
        { role: \"user\", content: analysisPrompt }
      ]);
      
      console.log(\"💬 [Intent Analyzer] Received response from LLM\", {
        responseLength: result.text.length,
        hasText: !!result.text,
        hasRaw: !!result.raw
      });
      
      // Log the raw response for debugging
      console.log(\"📄 [Intent Analyzer] Raw LLM response:\", result.text.substring(0, 500) + (result.text.length > 500 ? \"...\" : \"\"));
      
      // Try to extract JSON from the response
      let analysisResult;
      try {
        // Try to find JSON in the response
        const jsonMatch = result.text.match(/\\{.*\\}/s);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(\"No JSON found in response\");
        }
      } catch (parseError) {
        console.error(\"❌ [Intent Analyzer] Failed to parse JSON from agent response:\", parseError);
        console.log(\"📝 [Intent Analyzer] Full response text:\", result.text);
        throw new Error(`Failed to parse analysis result: ${parseError.message}`);
      }
      
      // Validate the result against the schema
      const validatedResult = intentAnalyzerOutputSchema.parse(analysisResult);
      
      console.log(\"✅ [Intent Analyzer] Analysis completed\", {
        primaryIntent: validatedResult.intentClassification.primaryIntent,
        purchaseConfidence: validatedResult.intentClassification.purchaseConfidence,
        warrantyConfidence: validatedResult.intentClassification.warrantyConfidence,
        profileUpdatesCount: Object.keys(validatedResult.profileUpdates).length,
        confidence: validatedResult.confidence
      });
      
      // Log detailed analysis notes if available
      if (validatedResult.analysisNotes) {
        console.log(\"📝 [Intent Analyzer] Analysis notes:\", validatedResult.analysisNotes);
      }
      
      // Log profile updates if any
      if (Object.keys(validatedResult.profileUpdates).length > 0) {
        console.log(\"📊 [Intent Analyzer] Profile updates:\", JSON.stringify(validatedResult.profileUpdates, null, 2));
      }
      
      return validatedResult;
    } catch (error) {
      console.error(\"❌ [Intent Analyzer] Analysis failed:\", error);
      throw new Error(`Intent analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});