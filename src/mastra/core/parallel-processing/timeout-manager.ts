export class TimeoutManager {
  static TIMEOUT_STRATEGY = {
    initial: 1000,    // 1 giây cho truy vấn đơn giản
    extended: 3000,   // 3 giây cho truy vấn phức tạp
    maximum: 5000     // Tối đa 5 giây
  };
  
  static async waitForData<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T | null> {
    // Create timeout promise
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        resolve(null);
      }, timeoutMs);
    });
    
    // Race between the actual promise and timeout
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  }
  
  static async progressiveRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 100
  ): Promise<T | null> {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [TimeoutManager] Retry attempt ${attempt}/${maxRetries}`);
        const result = await operation();
        console.log(`✅ [TimeoutManager] Retry successful on attempt ${attempt}`);
        return result;
      } catch (error: any) {
        console.warn(`⚠️ [TimeoutManager] Retry attempt ${attempt} failed:`, error?.message);
        lastError = error;
        
        // Don't delay on the last attempt
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.log(`⏱️ [TimeoutManager] Waiting ${delay}ms before next retry`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error('❌ [TimeoutManager] All retry attempts failed');
    return null;
  }
  
  static getTimeoutForQuery(query: string): number {
    // Simple heuristic based on query complexity
    const length = query.length;
    const complexityKeywords = ['ram', 'memory', 'ddr4', 'ddr5', 'bộ nhớ', 'laptop', 'desktop', 'nâng cấp'];
    const foundKeywords = complexityKeywords.filter(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Base timeout
    let timeout = this.TIMEOUT_STRATEGY.initial;
    
    // Increase timeout based on query length
    if (length > 100) {
      timeout = this.TIMEOUT_STRATEGY.extended;
    }
    
    // Increase timeout based on complexity keywords
    if (foundKeywords.length > 2) {
      timeout = this.TIMEOUT_STRATEGY.maximum;
    }
    
    console.log('⏱️ [TimeoutManager] Determined timeout for query:', {
      queryLength: length,
      complexityKeywords: foundKeywords.length,
      timeoutMs: timeout
    });
    
    return timeout;
  }
}