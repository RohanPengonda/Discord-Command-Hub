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

  useEffect(() => {
    if (!selectedLog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedLog(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedLog]);

  const openDetail = (log: Log) => setSelectedLog(log);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Audit History Logs</h1>
        <p className="text-sm text-slate-400 mt-1">Traceable interaction logs and AI categorization analysis</p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-48">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by command..."
              value={commandFilter}
              onChange={(e) => {
                setCommandFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:flex-none bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
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
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-400">
          <span>
            Page {page} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: stacked card list */}
      <div className="md:hidden space-y-3">
        {logs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 text-center text-slate-500 text-xs">
            No logs found matching your filters.
          </div>
        ) : (
          logs.map((log) => (
            <button
              key={log.id}
              onClick={() => openDetail(log)}
              className="w-full text-left bg-slate-900 border border-slate-800 active:bg-slate-800/60 rounded-xl p-4 space-y-2.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-brand-400 text-xs">/{log.commandName}</span>
                <StatusBadge status={log.status} />
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-200 truncate">@{log.username}</span>
                <span className="text-slate-500 shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
              </div>

              {log.aiResult?.summary && (
                <p className="text-xs text-slate-300 border-l-2 border-brand-500/60 pl-2 line-clamp-3">
                  {log.aiResult.summary}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {log.aiResult && <PriorityBadge priority={log.aiResult.priority} />}
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  {log.aiResult?.category || 'No category'}
                </span>
                <span className="ml-auto text-brand-400 text-[11px] font-semibold inline-flex items-center gap-1">
                  Details <Eye className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Desktop / Tablet: table */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[900px] text-left text-sm text-slate-300">
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
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {log.interaction?.id || log.id.substring(0, 8)}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-brand-400">/{log.commandName}</td>
                    <td className="px-4 py-3.5 text-slate-200 whitespace-nowrap">@{log.username}</td>
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
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => openDetail(log)}
                        className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="View Details"
                        aria-label="View Details"
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
      </div>

      {/* Log Detail Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl scrollbar-thin">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white font-mono truncate">
                  /{selectedLog.commandName} Execution Details
                </h3>
                <p className="text-xs text-slate-400 font-mono truncate">
                  Interaction ID: {selectedLog.interaction?.id || selectedLog.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                aria-label="Close details"
                className="p-1.5 shrink-0 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 pt-4 text-sm text-slate-300">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="min-w-0">
                  <span className="text-xs text-slate-500 block uppercase font-semibold">User</span>
                  <span className="font-medium text-slate-200 break-words">
                    @{selectedLog.username} ({selectedLog.userId})
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Status</span>
                  <StatusBadge status={selectedLog.status} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Server ID</span>
                  <span className="font-mono text-xs text-slate-400 break-all">
                    {selectedLog.serverId || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Timestamp</span>
                  <span className="text-xs text-slate-400">{new Date(selectedLog.createdAt).toString()}</span>
                </div>
              </div>

              {/* Raw Command Options */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Raw Options</h4>
                <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono text-brand-300 overflow-x-auto scrollbar-thin">
                  {JSON.stringify(selectedLog.rawOptions, null, 2)}
                </pre>
              </div>

              {/* AI Analysis Result */}
              {selectedLog.aiResult && (
                <div>
                  <h4 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">
                    AI Categorization (Gemini)
                  </h4>
                  <div className="bg-brand-950/40 border border-brand-800/60 p-4 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <p className="font-semibold text-brand-200 leading-relaxed break-words min-w-0">
                        {selectedLog.aiResult.summary}
                      </p>
                      <PriorityBadge priority={selectedLog.aiResult.priority} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Category
                      </span>
                      <span className="text-xs font-medium text-brand-300 bg-brand-500/10 border border-brand-700/50 px-2 py-0.5 rounded">
                        {selectedLog.aiResult.category}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Mirror Log */}
              {selectedLog.notificationLog && (
                <div>
                  <h4 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">
                    Second Channel Notification Mirror
                  </h4>
                  <div className="bg-yellow-950/30 border border-yellow-800/50 p-4 rounded-xl text-xs space-y-1">
                    <p className="text-yellow-200 font-semibold">Status: {selectedLog.notificationLog.status}</p>
                    <p className="text-yellow-300">Channel Type: {selectedLog.notificationLog.channelType}</p>
                    <p className="text-slate-400 font-mono break-all">
                      Target Channel ID: {selectedLog.notificationLog.channelId}
                    </p>
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