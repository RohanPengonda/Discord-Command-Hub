import React, { useEffect, useState } from 'react';
import { api } from '../api/axios_client.js';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge.js';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';

interface Log {
  id: string;
  commandName: string;
  userId: string;
  username: string;
  serverId?: string;
  rawOptions?: any;
  status: string;
  errorMessage?: string;
  createdAt: string;
  aiResult?: {
    summary: string;
    category: string;
    priority: string;
    rawAiOutput?: any;
  };
  notificationLog?: {
    status: string;
    channelType: string;
    channelId: string;
  };
  interaction?: {
    id: string;
    type: number;
  };
}

export const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [commandFilter, setCommandFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(statusFilter && { status: statusFilter }),
        ...(commandFilter && { command: commandFilter }),
      });
      const res = await api.get(`/dashboard/logs?${params}`);
      setLogs(res.data.logs);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter, commandFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Audit History Logs</h1>
        <p className="text-sm text-slate-400 mt-1">Traceable interaction logs and AI categorization analysis</p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by command..."
              value={commandFilter}
              onChange={(e) => {
                setCommandFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-48"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="DEFERRED">Deferred</option>
              <option value="PROCESSING">Processing</option>
            </select>
          </div>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>
            Page {page} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Interaction ID</th>
              <th className="px-4 py-3">Command</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Mirror Status</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-500 text-xs">
                  No logs found matching your filters.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-400">
                    {log.interaction?.id || log.id.substring(0, 8)}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-semibold text-indigo-400">/{log.commandName}</td>
                  <td className="px-4 py-3.5 text-slate-200">@{log.username}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">{log.aiResult?.category || '-'}</td>
                  <td className="px-4 py-3.5">
                    {log.aiResult ? <PriorityBadge priority={log.aiResult.priority} /> : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">
                    {log.notificationLog ? (
                      <span className="text-emerald-400">Sent ({log.notificationLog.channelType})</span>
                    ) : (
                      <span className="text-slate-600">Off</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Log Detail Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white font-mono">/{selectedLog.commandName} Execution Details</h3>
                <p className="text-xs text-slate-400">Interaction ID: {selectedLog.interaction?.id || selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 pt-4 text-sm text-slate-300">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">User</span>
                  <span className="font-medium text-slate-200">@{selectedLog.username} ({selectedLog.userId})</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Status</span>
                  <StatusBadge status={selectedLog.status} />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Server ID</span>
                  <span className="font-mono text-xs text-slate-400">{selectedLog.serverId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Timestamp</span>
                  <span className="text-xs text-slate-400">{new Date(selectedLog.createdAt).toString()}</span>
                </div>
              </div>

              {/* Raw Command Options */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Raw Options</h4>
                <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono text-indigo-300 overflow-x-auto">
                  {JSON.stringify(selectedLog.rawOptions, null, 2)}
                </pre>
              </div>

              {/* AI Analysis Result */}
              {selectedLog.aiResult && (
                <div>
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                    AI Categorization (Gemini/Groq)
                  </h4>
                  <div className="bg-purple-950/30 border border-purple-800/50 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-purple-200">{selectedLog.aiResult.summary}</span>
                      <PriorityBadge priority={selectedLog.aiResult.priority} />
                    </div>
                    <p className="text-xs text-purple-300">Category: {selectedLog.aiResult.category}</p>
                  </div>
                </div>
              )}

              {/* Notification Mirror Log */}
              {selectedLog.notificationLog && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                    Second Channel Notification Mirror
                  </h4>
                  <div className="bg-amber-950/30 border border-amber-800/50 p-4 rounded-xl text-xs space-y-1">
                    <p className="text-amber-200 font-semibold">Status: {selectedLog.notificationLog.status}</p>
                    <p className="text-amber-300">Channel Type: {selectedLog.notificationLog.channelType}</p>
                    <p className="text-slate-400 font-mono">Target Channel ID: {selectedLog.notificationLog.channelId}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
