import { Agent } from "@mastra/core/agent";

export interface ProcessingResult {
  status: 'success' | 'failed' | 'timeout';
  data?: any;
  error?: string;
  processingTime?: number;
}

export interface ParallelProcessingFramework {
  initiateParallelProcessing(params: {
    specialistAgent: Agent;
    customerMessage: string;
    context: any;
  }): Promise<string>; // Returns processing ID
  
  waitForSpecialistData(
    processingId: string,
    timeoutMs: number
  ): Promise<ProcessingResult>;
  
  handleTimeoutScenario(
    processingId: string,
    customerMessage: string
  ): Promise<ProcessingResult>;
  
  cancelProcessing(processingId: string): Promise<void>;
}

export class ParallelProcessingFrameworkImpl implements ParallelProcessingFramework {
  private processingSessions: Map<string, {
    specialistAgent: Agent;
    customerMessage: string;
    context: any;
    startTime: number;
    promise: Promise<any>;
    resolve: Function;
    reject: Function;
  }> = new Map();
  
  async initiateParallelProcessing(params: {
    specialistAgent: Agent;
    customerMessage: string;
    context: any;
  }): Promise<string> {
    const { specialistAgent, customerMessage, context } = params;
    
    // Generate unique processing ID
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🔄 [ParallelProcessing] Initiating parallel processing', {
      processingId,
      agentName: specialistAgent.name,
      messageLength: customerMessage.length
    });
    
    // Create promise for processing
    let resolveFunc: Function;
    let rejectFunc: Function;
    
    const promise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });
    
    // Store processing session
    this.processingSessions.set(processingId, {
      specialistAgent,
      customerMessage,
      context,
      startTime: Date.now(),
      promise,
      resolve: resolveFunc!,
      reject: rejectFunc!
    });
    
    // Start processing asynchronously
    this.processSpecialistRequest(processingId);
    
    return processingId;
  }
  
  private async processSpecialistRequest(processingId: string) {
    const session = this.processingSessions.get(processingId);
    if (!session) {
      console.warn('⚠️ [ParallelProcessing] Processing session not found', { processingId });
      return;
    }
    
    const { specialistAgent, customerMessage, context } = session;
    
    try {
      console.log('🧠 [ParallelProcessing] Processing specialist request', {
        processingId,
        agentName: specialistAgent.name
      });
      
      // Prepare messages for specialist
      const messages = [{ role: 'user', content: customerMessage }];
      
      // Add context if available
      if (context && context.chatHistory) {
        const recentHistory = context.chatHistory.slice(-3);
        const historyMessages = recentHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }));
        messages.unshift(...historyMessages);
      }
      
      // Execute specialist agent
      const result = await specialistAgent.generate(messages as any, {});
      
      console.log('✅ [ParallelProcessing] Specialist processing completed', {
        processingId,
        agentName: specialistAgent.name,
        resultLength: result.text.length
      });
      
      // Resolve the promise with result
      session.resolve({
        status: 'success',
        data: result,
        processingTime: Date.now() - session.startTime
      });
      
      // Clean up session
      this.processingSessions.delete(processingId);
      
    } catch (error: any) {
      console.error('❌ [ParallelProcessing] Specialist processing failed', {
        processingId,
        agentName: specialistAgent.name,
        errorMessage: error.message
      });
      
      // Reject the promise with error
      session.reject({
        status: 'failed',
        error: error.message,
        processingTime: Date.now() - session.startTime
      });
      
      // Clean up session
      this.processingSessions.delete(processingId);
    }
  }
  
  async waitForSpecialistData(
    processingId: string,
    timeoutMs: number
  ): Promise<ProcessingResult> {
    const session = this.processingSessions.get(processingId);
    if (!session) {
      return {
        status: 'failed',
        error: 'Processing session not found'
      };
    }
    
    console.log('⏳ [ParallelProcessing] Waiting for specialist data', {
      processingId,
      timeoutMs
    });
    
    // Create timeout promise
    const timeoutPromise = new Promise<ProcessingResult>((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'timeout',
          error: `Processing timed out after ${timeoutMs}ms`
        });
      }, timeoutMs);
    });
    
    // Race between processing promise and timeout
    try {
      const result = await Promise.race([session.promise, timeoutPromise]);
      return result as ProcessingResult;
    } catch (error: any) {
      return {
        status: 'failed',
        error: error.message,
        processingTime: Date.now() - session.startTime
      };
    }
  }
  
  async handleTimeoutScenario(
    processingId: string,
    customerMessage: string
  ): Promise<ProcessingResult> {
    const session = this.processingSessions.get(processingId);
    if (!session) {
      return {
        status: 'failed',
        error: 'Processing session not found'
      };
    }
    
    console.log('⏰ [ParallelProcessing] Handling timeout scenario', {
      processingId,
      messageLength: customerMessage.length
    });
    
    // For now, we'll just return a timeout response
    // In a more sophisticated implementation, we might retry or provide partial data
    return {
      status: 'timeout',
      error: 'Processing taking longer than expected',
      processingTime: Date.now() - session.startTime
    };
  }
  
  async cancelProcessing(processingId: string): Promise<void> {
    const session = this.processingSessions.get(processingId);
    if (session) {
      console.log('⏹️ [ParallelProcessing] Cancelling processing', { processingId });
      
      // Reject the promise
      session.reject({
        status: 'failed',
        error: 'Processing cancelled'
      });
      
      // Clean up session
      this.processingSessions.delete(processingId);
    }
  }
}

// Export singleton instance
export const parallelProcessingFramework = new ParallelProcessingFrameworkImpl();