import express from 'express';
import cors from 'cors';
import { channelMessageWorkflow } from './mastra/workflows/message-processor';
import { unifiedMemoryManager } from './mastra/core/memory/unified-memory-manager';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('🚀 SSTC Agent API Server starting up...');

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthCheck = await unifiedMemoryManager.healthCheck();

    res.json({
      status: healthCheck.status,
      message: healthCheck.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      message: `Health check failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Main chat processing endpoint
app.post('/chat', async (req, res) => {
  try {
    const { channelId, message, senderId } = req.body;

    // Validate required fields
    if (!channelId || !message || !senderId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['channelId', 'message', 'senderId'],
        example: {
          channelId: 'telegram',
          message: { content: 'Xin chào!', senderId: 'user123', timestamp: new Date() },
          senderId: 'user123'  // Redundant but keep for simplicity
        }
      });
    }

    console.log(`📨 [API] New chat message from ${senderId} on ${channelId}: ${message.content?.substring(0, 50)}...`);

    // Process message through workflow
    const result = await processMessage(channelId, message);

    console.log(`✅ [API] Chat processed successfully for ${senderId}`);

    res.json({
      success: true,
      response: result.response,
      metadata: result.metadata,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [API] Chat processing failed:`, error);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simplified message processor function
async function processMessage(channelId: string, message: any) {
  // Create workflow input
  const workflowInput = {
    channelId,
    message: {
      content: message.content,
      senderId: message.senderId || message.senderId,
      timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      attachments: message.attachments || []
    }
  };

  try {
    // Process through channel message workflow
    const workflowResult = await channelMessageWorkflow.execute(workflowInput);

    return {
      response: workflowResult.response,
      metadata: workflowResult.metadata
    };
  } catch (error) {
    console.error('❌ [API] Workflow failed:', error);
    return {
      response: 'Xin lỗi, tôi gặp sự cố khi xử lý tin nhắn của bạn. Vui lòng thử lại sau.',
      metadata: { error: error.message }
    };
  }
}

// Get user chat history
app.get('/memory/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, channelFilter } = req.query;

    console.log(`📚 [API] Getting chat history for user ${userId}, limit: ${limit}`);

    const history = await unifiedMemoryManager.getUserChatHistory(userId, {
      limit: parseInt(limit as string) || 10
    });

    // Filter by channel if specified
    let filteredHistory = history;
    if (channelFilter) {
      filteredHistory = history.filter(msg => msg.channel === channelFilter);
    }

    res.json({
      success: true,
      userId,
      messageCount: filteredHistory.length,
      messages: filteredHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
        channel: msg.channel,
        timestamp: msg.timestamp,
        id: msg.id
      })),
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [API] Failed to get history for ${req.params.userId}:`, error);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get system analytics
app.get('/analytics', async (req, res) => {
  try {
    console.log('📊 [API] Getting system analytics');

    const memoryStats = await unifiedMemoryManager.getMemoryStats();

    res.json({
      success: true,
      memory: memoryStats,
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [API] Failed to get analytics:`, error);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Reset user memory (for testing/admin purposes)
app.post('/memory/:userId/reset', async (req, res) => {
  try {
    const { userId } = req.params;
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Send { "confirm": true }'
      });
    }

    console.log(`🗑️ [API] Resetting memory for user ${userId}`);

    await unifiedMemoryManager.resetUserMemory(userId);

    res.json({
      success: true,
      message: `Memory reset for user ${userId}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [API] Failed to reset memory for ${req.params.userId}:`, error);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Greeting control status for user
app.get('/greeting/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`👋 [API] Checking greeting status for ${userId}`);

    const hasBeenGreeted = await unifiedMemoryManager.hasUserBeenGreeted(userId);

    res.json({
      success: true,
      userId,
      hasBeenGreeted,
      greetingInstruction: hasBeenGreeted
        ? '[SKIP GREETING - USER ALREADY GREETED]'
        : '[FIRST TIME USER NEEDS GREETING]',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [API] Failed to check greeting for ${req.params.userId}:`, error);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API documentation endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SSTC Agent API',
    version: '1.0.0',
    description: 'REST API for SSTC chat agents and memory system',
    endpoints: {
      'GET /health': 'System health check',
      'POST /chat': 'Process chat message through workflow',
      'GET /memory/:userId/history': 'Get user chat history',
      'GET /analytics': 'Get system analytics',
      'POST /memory/:userId/reset': 'Reset user memory (admin)',
      'GET /greeting/:userId/status': 'Check greeting status for user'
    },
    workflow: {
      agents: ['maiSale', 'purchase', 'warranty', 'clarification', 'anDataAnalyst'],
      channels: ['telegram', 'whatsapp', 'web', 'zalo'],
      features: ['greeting control', 'unified memory', 'agent routing']
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ [API] Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🎉 SSTC Agent API Server started!');
  console.log(`🔗 Available at: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📄 API docs: http://localhost:${PORT}`);
});

export { app };
