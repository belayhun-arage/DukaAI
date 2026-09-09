import { collections, isFirebaseInitialized } from '../config/firebase';
import { AgentTrace } from '@dukaai/shared';

/**
 * Save an agent trace to Firestore
 */
export async function saveTrace(trace: AgentTrace): Promise<void> {
  if (!isFirebaseInitialized()) {
    console.log('Firebase not initialized - trace not saved:', trace.id);
    return;
  }

  const traceData = {
    ...trace,
    startedAt: trace.startedAt,
    completedAt: trace.completedAt || null,
    thoughts: trace.thoughts.map((t) => ({
      ...t,
      timestamp: t.timestamp,
    })),
    toolCalls: trace.toolCalls.map((tc) => ({
      ...tc,
      timestamp: tc.timestamp,
    })),
  };

  await collections.agentTraces(trace.shopId).doc(trace.id).set(traceData);
}

/**
 * Get a trace by ID
 */
export async function getTrace(shopId: string, traceId: string): Promise<AgentTrace | null> {
  if (!isFirebaseInitialized()) {
    return null;
  }

  const doc = await collections.agentTraces(shopId).doc(traceId).get();

  if (!doc.exists) {
    return null;
  }

  return docToTrace(doc);
}

/**
 * List traces for a shop
 */
export async function listTraces(
  shopId: string,
  options: {
    limit?: number;
    status?: AgentTrace['status'];
    triggeredBy?: AgentTrace['triggeredBy'];
    startAfter?: Date;
    endBefore?: Date;
  } = {}
): Promise<AgentTrace[]> {
  if (!isFirebaseInitialized()) {
    return [];
  }

  let query = collections.agentTraces(shopId).orderBy('startedAt', 'desc');

  if (options.status) {
    query = query.where('status', '==', options.status);
  }

  if (options.triggeredBy) {
    query = query.where('triggeredBy', '==', options.triggeredBy);
  }

  if (options.startAfter) {
    query = query.where('startedAt', '>=', options.startAfter);
  }

  if (options.endBefore) {
    query = query.where('startedAt', '<=', options.endBefore);
  }

  query = query.limit(options.limit || 50);

  const snapshot = await query.get();
  return snapshot.docs.map(docToTrace);
}

/**
 * Get trace statistics
 */
export async function getTraceStats(
  shopId: string,
  since?: Date
): Promise<{
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgExecutionTimeMs: number;
  totalToolCalls: number;
  toolUsage: Record<string, number>;
  triggerBreakdown: Record<string, number>;
}> {
  if (!isFirebaseInitialized()) {
    return {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      avgExecutionTimeMs: 0,
      totalToolCalls: 0,
      toolUsage: {},
      triggerBreakdown: {},
    };
  }

  let query = collections.agentTraces(shopId).orderBy('startedAt', 'desc');

  if (since) {
    query = query.where('startedAt', '>=', since);
  }

  const snapshot = await query.limit(500).get();
  const traces = snapshot.docs.map(docToTrace);

  const totalRuns = traces.length;
  const successfulRuns = traces.filter((t) => t.status === 'completed').length;
  const failedRuns = traces.filter((t) => t.status === 'failed').length;

  const totalExecutionTime = traces.reduce((sum, t) => sum + t.totalExecutionTimeMs, 0);
  const avgExecutionTimeMs = totalRuns > 0 ? totalExecutionTime / totalRuns : 0;

  const totalToolCalls = traces.reduce((sum, t) => sum + t.toolCallCount, 0);

  // Count tool usage
  const toolUsage: Record<string, number> = {};
  for (const trace of traces) {
    for (const tc of trace.toolCalls) {
      toolUsage[tc.toolName] = (toolUsage[tc.toolName] || 0) + 1;
    }
  }

  // Count trigger breakdown
  const triggerBreakdown: Record<string, number> = {};
  for (const trace of traces) {
    triggerBreakdown[trace.triggeredBy] = (triggerBreakdown[trace.triggeredBy] || 0) + 1;
  }

  return {
    totalRuns,
    successfulRuns,
    failedRuns,
    avgExecutionTimeMs: Math.round(avgExecutionTimeMs),
    totalToolCalls,
    toolUsage,
    triggerBreakdown,
  };
}

/**
 * Get recent tool calls across all traces
 */
export async function getRecentToolCalls(
  shopId: string,
  limit: number = 20
): Promise<
  Array<{
    traceId: string;
    toolName: string;
    success: boolean;
    executionTimeMs: number;
    timestamp: Date;
    arguments: Record<string, unknown>;
  }>
> {
  const traces = await listTraces(shopId, { limit: 20 });

  const toolCalls: Array<{
    traceId: string;
    toolName: string;
    success: boolean;
    executionTimeMs: number;
    timestamp: Date;
    arguments: Record<string, unknown>;
  }> = [];

  for (const trace of traces) {
    for (let i = 0; i < trace.toolCalls.length; i++) {
      const tc = trace.toolCalls[i];
      const result = trace.toolResults[i];

      toolCalls.push({
        traceId: trace.id,
        toolName: tc.toolName,
        success: result?.success ?? false,
        executionTimeMs: result?.executionTimeMs ?? 0,
        timestamp: tc.timestamp,
        arguments: tc.arguments,
      });
    }
  }

  // Sort by timestamp and limit
  return toolCalls
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Delete old traces (for cleanup)
 */
export async function deleteOldTraces(shopId: string, olderThan: Date): Promise<number> {
  if (!isFirebaseInitialized()) {
    return 0;
  }

  const snapshot = await collections
    .agentTraces(shopId)
    .where('startedAt', '<', olderThan)
    .limit(100)
    .get();

  const batch = collections.agentTraces(shopId).firestore.batch();

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }

  await batch.commit();
  return snapshot.docs.length;
}

/**
 * Convert Firestore document to AgentTrace
 */
function docToTrace(doc: FirebaseFirestore.DocumentSnapshot): AgentTrace {
  const data = doc.data()!;

  return {
    id: doc.id,
    shopId: data.shopId,
    sessionId: data.sessionId,
    triggeredBy: data.triggeredBy,
    triggerInput: data.triggerInput,
    thoughts: (data.thoughts || []).map((t: any) => ({
      ...t,
      timestamp: t.timestamp?.toDate?.() || new Date(t.timestamp),
    })),
    toolCalls: (data.toolCalls || []).map((tc: any) => ({
      ...tc,
      timestamp: tc.timestamp?.toDate?.() || new Date(tc.timestamp),
    })),
    toolResults: data.toolResults || [],
    status: data.status,
    finalResponse: data.finalResponse,
    error: data.error,
    totalTokensUsed: data.totalTokensUsed,
    totalExecutionTimeMs: data.totalExecutionTimeMs,
    toolCallCount: data.toolCallCount,
    startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
    completedAt: data.completedAt?.toDate?.() || (data.completedAt ? new Date(data.completedAt) : undefined),
  };
}
