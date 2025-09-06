/**
 * Standard patterns for fixing TypeScript errors consistently across all specialists
 * This file defines the unified approach for CPU, RAM, SSD, and Barebone specialists
 */

// 1. Standard Tool Execution Pattern
// BEFORE (Broken):
// const toolResult = await tool.execute({
//   context: { query: "...", ...params } as any,
//   mastra: null
// });

// AFTER (Fixed - Consistent Pattern):
// const toolResult = await tool.execute({
//   query: "...",
//   ...params
// } as any);

// 2. Standard Null Safety Pattern  
// BEFORE (Unsafe):
// criteria.budget?.min!
// rec.specifications.property

// AFTER (Safe - Consistent Pattern):
// criteria.budget?.min ?? 0
// rec.specifications?.property ?? defaultValue

// 3. Standard Property Access Pattern
// BEFORE (Unknown type):
// toolResult.specialistData // toolResult is unknown

// AFTER (Type-safe - Consistent Pattern):
// const typedResult = toolResult as { specialistData?: SpecialistData };
// typedResult.specialistData

// 4. Standard Structured Output Pattern
// BEFORE (Missing model):
// { structuredOutput: { schema: SomeSchema } }

// AFTER (Complete - Consistent Pattern):  
// { structuredOutput: { schema: SomeSchema, model: this.model } }

export const SPECIALIST_PATTERNS = {
  // Tool execution - consistent across all specialists
  TOOL_EXECUTION: `
    const toolResult = await {TOOL_NAME}.execute({
      query: "{QUERY_TYPE}",
      ...params
    } as any);
  `,
  
  // Null safety - consistent patterns
  NULL_SAFETY: {
    budget: 'criteria.budget?.min ?? 0',
    optional_prop: 'obj?.prop ?? defaultValue',
    array_access: 'arr?.[index] ?? fallback'
  },
  
  // Type assertions - consistent patterns  
  TYPE_ASSERTIONS: {
    tool_result: 'const typedResult = toolResult as { specialistData?: {TYPE}SpecialistData };'
  },
  
  // Structured output - consistent patterns
  STRUCTURED_OUTPUT: `
    {
      structuredOutput: { 
        schema: {SPECIALIST_TYPE}SummarySchema,
        model: this.model 
      }
    }
  `
};