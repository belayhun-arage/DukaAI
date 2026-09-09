import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Bot,
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  RefreshCw,
  Play,
  Package,
  AlertTriangle,
  Zap,
  Eye,
  Send,
} from 'lucide-react';
import { agentApi } from '../services/api';
import { useShop } from '../context/ShopContext';
import type { AgentTrace, AgentThought, ToolCall, ToolResult } from '@dukaai/shared';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const statusColors: Record<string, string> = {
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  timeout: 'bg-yellow-100 text-yellow-800',
};

const triggerIcons: Record<string, typeof MessageSquare> = {
  telegram: MessageSquare,
  dashboard: Activity,
  cron: Clock,
  api: Zap,
};

export default function AgentObservability() {
  const { shop, isLoading: isShopLoading } = useShop();
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<AgentTrace | null>(null);
  const [stats, setStats] = useState<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    avgExecutionTimeMs: number;
    totalToolCalls: number;
    toolUsage: Record<string, number>;
    triggerBreakdown: Record<string, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Removed unused expandedThoughts state - thoughts are always expanded in current UI

  // Test agent input
  const [testInput, setTestInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    response: string;
    toolsUsed: string[];
    traceId: string;
  } | null>(null);

  useEffect(() => {
    if (shop) {
      loadData();
    }
  }, [shop]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [tracesData, statsData] = await Promise.all([
        agentApi.listTraces({ limit: 20 }),
        agentApi.getStats(),
      ]);
      setTraces(tracesData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  async function runTestAgent() {
    if (!testInput.trim()) return;

    setIsRunning(true);
    setTestResult(null);
    try {
      const result = await agentApi.run(testInput);
      setTestResult({
        response: result.response,
        toolsUsed: result.toolsUsed,
        traceId: result.traceId,
      });
      // Reload traces to show the new one
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed');
    } finally {
      setIsRunning(false);
    }
  }

  // Removed unused toggleThought function - thoughts are always expanded in current UI

  // Show loading state
  if (isShopLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Agent Observability</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No shop selected
  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">No Shop Selected</h2>
        <p className="text-gray-500 mb-4">Create or select a shop to view agent activity.</p>
        <a href="/settings" className="btn btn-primary">Go to Settings</a>
      </div>
    );
  }

  // Error state
  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-16 h-16 text-red-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Error Loading Data</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <button onClick={loadData} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  // Tool usage chart data
  const toolUsageData = stats
    ? Object.entries(stats.toolUsage)
        .map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    : [];

  // Trigger breakdown data
  const triggerData = stats
    ? Object.entries(stats.triggerBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Agent Observability</h1>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Activity className="w-4 h-4" />
            Total Runs
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalRuns || 0}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Success Rate
          </div>
          <div className="text-2xl font-bold text-green-600">
            {stats && stats.totalRuns > 0
              ? Math.round((stats.successfulRuns / stats.totalRuns) * 100)
              : 0}%
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Wrench className="w-4 h-4" />
            Tool Calls
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalToolCalls || 0}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Clock className="w-4 h-4" />
            Avg Duration
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats ? (stats.avgExecutionTimeMs / 1000).toFixed(2) : 0}s
          </div>
        </div>
      </div>

      {/* Test Agent Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-indigo-600" />
          Test Agent
        </h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter a message to test the agent (e.g., 'I want to order 2 phone cases')"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && runTestAgent()}
          />
          <button
            onClick={runTestAgent}
            disabled={isRunning || !testInput.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Run Agent
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Bot className="w-5 h-5 text-indigo-600 mt-1" />
              <div className="flex-1">
                <p className="text-gray-900">{testResult.response}</p>
                {testResult.toolsUsed.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-xs text-gray-500">Tools used:</span>
                    {testResult.toolsUsed.map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    const trace = traces.find((t) => t.id === testResult.traceId);
                    if (trace) setSelectedTrace(trace);
                  }}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  View trace details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool Usage Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tool Usage</h2>
          {toolUsageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={toolUsageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              No tool usage data yet
            </div>
          )}
        </div>

        {/* Trigger Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Trigger Sources</h2>
          {triggerData.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={triggerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {triggerData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              No trigger data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Traces */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Agent Runs</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {traces.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No agent runs yet. Test the agent above to see traces.
            </div>
          ) : (
            traces.map((trace) => {
              const TriggerIcon = triggerIcons[trace.triggeredBy] || Activity;
              return (
                <div
                  key={trace.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedTrace(trace)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TriggerIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 truncate max-w-md">
                          {trace.triggerInput}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(trace.startedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          statusColors[trace.status]
                        }`}
                      >
                        {trace.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {trace.toolCallCount} tools
                      </span>
                      <span className="text-sm text-gray-500">
                        {(trace.totalExecutionTimeMs / 1000).toFixed(2)}s
                      </span>
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Trace Detail Modal */}
      {selectedTrace && (
        <TraceDetailModal trace={selectedTrace} onClose={() => setSelectedTrace(null)} />
      )}
    </div>
  );
}

// Trace Detail Modal Component
function TraceDetailModal({
  trace,
  onClose,
}: {
  trace: AgentTrace;
  onClose: () => void;
}) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));

  function toggleStep(index: number) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  // Build timeline from thoughts, tool calls, and results
  const timeline: Array<{
    type: 'thought' | 'tool_call' | 'tool_result';
    data: AgentThought | ToolCall | ToolResult;
    timestamp: Date;
  }> = [];

  trace.thoughts.forEach((t) => {
    timeline.push({ type: 'thought', data: t, timestamp: new Date(t.timestamp) });
  });

  trace.toolCalls.forEach((tc, i) => {
    timeline.push({ type: 'tool_call', data: tc, timestamp: new Date(tc.timestamp) });
    if (trace.toolResults[i]) {
      timeline.push({
        type: 'tool_result',
        data: trace.toolResults[i],
        timestamp: new Date(tc.timestamp),
      });
    }
  });

  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Agent Trace</h2>
            <p className="text-sm text-gray-500">{trace.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <XCircle className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Status</p>
              <span
                className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                  statusColors[trace.status]
                }`}
              >
                {trace.status}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-lg font-semibold">
                {(trace.totalExecutionTimeMs / 1000).toFixed(2)}s
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Tool Calls</p>
              <p className="text-lg font-semibold">{trace.toolCallCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Triggered By</p>
              <p className="text-lg font-semibold capitalize">{trace.triggeredBy}</p>
            </div>
          </div>

          {/* Input */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-600 font-medium mb-1">INPUT</p>
            <p className="text-gray-900">{trace.triggerInput}</p>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Execution Timeline</h3>
            <div className="space-y-2">
              {timeline.map((item, index) => {
                const isExpanded = expandedSteps.has(index);

                if (item.type === 'thought') {
                  const thought = item.data as AgentThought;
                  return (
                    <div
                      key={`thought-${thought.id}`}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3 h-3 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-purple-600 font-medium uppercase">
                          {thought.type}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">{thought.content}</p>
                      </div>
                    </div>
                  );
                }

                if (item.type === 'tool_call') {
                  const toolCall = item.data as ToolCall;
                  const result = trace.toolResults.find(
                    (r) => r.toolCallId === toolCall.id
                  );

                  return (
                    <div
                      key={`tool-${toolCall.id}`}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleStep(index)}
                        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50"
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            result?.success
                              ? 'bg-green-100'
                              : result
                              ? 'bg-red-100'
                              : 'bg-gray-100'
                          }`}
                        >
                          <Wrench
                            className={`w-3 h-3 ${
                              result?.success
                                ? 'text-green-600'
                                : result
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900">
                            {toolCall.toolName.replace(/_/g, ' ')}
                          </p>
                          {result && (
                            <p className="text-xs text-gray-500">
                              {result.executionTimeMs}ms
                            </p>
                          )}
                        </div>
                        {result?.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : result ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : null}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-200 p-3 bg-gray-50 space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Arguments</p>
                            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                              {JSON.stringify(toolCall.arguments, null, 2)}
                            </pre>
                          </div>
                          {result && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                {result.success ? 'Result' : 'Error'}
                              </p>
                              <pre
                                className={`text-xs p-2 rounded border overflow-x-auto ${
                                  result.success ? 'bg-white' : 'bg-red-50'
                                }`}
                              >
                                {result.success
                                  ? JSON.stringify(result.result, null, 2)
                                  : result.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>

          {/* Final Response */}
          {trace.finalResponse && (
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-green-600 font-medium mb-1">FINAL RESPONSE</p>
              <p className="text-gray-900">{trace.finalResponse}</p>
            </div>
          )}

          {/* Error */}
          {trace.error && (
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-xs text-red-600 font-medium mb-1">ERROR</p>
              <p className="text-red-700">{trace.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
