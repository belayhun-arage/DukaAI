import { Router, Request, Response } from 'express';
import { AgentRunRequest, TOOL_SCHEMAS } from '@dukaai/shared';
import * as agentService from '../services/agent.service';
import * as traceService from '../services/trace.service';

const router = Router();

/**
 * POST /api/agents/run
 * Run the agent with a user input
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const { input, context, maxToolCalls } = req.body;

    if (!input) {
      return res.status(400).json({ success: false, error: 'Input required' });
    }

    const request: AgentRunRequest = {
      shopId,
      input,
      context,
      maxToolCalls,
      triggeredBy: 'api',
    };

    const response = await agentService.runAgent(request);

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Agent run error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Agent run failed',
    });
  }
});

/**
 * GET /api/agents/traces
 * List agent traces for the shop
 */
router.get('/traces', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const { limit, status, triggeredBy } = req.query;

    const traces = await traceService.listTraces(shopId, {
      limit: limit ? parseInt(limit as string) : 50,
      status: status as any,
      triggeredBy: triggeredBy as any,
    });

    res.json({
      success: true,
      data: traces,
    });
  } catch (error) {
    console.error('List traces error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list traces',
    });
  }
});

/**
 * GET /api/agents/traces/:traceId
 * Get a specific trace by ID
 */
router.get('/traces/:traceId', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const { traceId } = req.params;
    const trace = await traceService.getTrace(shopId, traceId);

    if (!trace) {
      return res.status(404).json({ success: false, error: 'Trace not found' });
    }

    res.json({
      success: true,
      data: trace,
    });
  } catch (error) {
    console.error('Get trace error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get trace',
    });
  }
});

/**
 * GET /api/agents/stats
 * Get agent statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const { since } = req.query;
    const sinceDate = since ? new Date(since as string) : undefined;

    const stats = await traceService.getTraceStats(shopId, sinceDate);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats',
    });
  }
});

/**
 * GET /api/agents/tool-calls
 * Get recent tool calls
 */
router.get('/tool-calls', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const { limit } = req.query;
    const toolCalls = await traceService.getRecentToolCalls(
      shopId,
      limit ? parseInt(limit as string) : 20
    );

    res.json({
      success: true,
      data: toolCalls,
    });
  } catch (error) {
    console.error('Get tool calls error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tool calls',
    });
  }
});

/**
 * GET /api/agents/tools
 * Get available tools and their schemas
 */
router.get('/tools', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      tools: TOOL_SCHEMAS,
      count: TOOL_SCHEMAS.length,
    },
  });
});

/**
 * DELETE /api/agents/traces/cleanup
 * Delete old traces (admin operation)
 */
router.delete('/traces/cleanup', async (req: Request, res: Response) => {
  try {
    const shopId = req.headers['x-shop-id'] as string;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required' });
    }

    const { olderThanDays } = req.query;
    const days = olderThanDays ? parseInt(olderThanDays as string) : 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const deletedCount = await traceService.deleteOldTraces(shopId, cutoffDate);

    res.json({
      success: true,
      data: {
        deletedCount,
        cutoffDate: cutoffDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Cleanup traces error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cleanup traces',
    });
  }
});

export default router;
