import React, { useEffect, useState } from 'react';
import { api, extractApiError } from '../api/axios_client.js';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge.js';
import { Terminal, CheckCircle2, Cpu, Bell, RefreshCw } from 'lucide-react';

interface Stats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  deferredCommands: number;
  totalAiProcessed: number;
  totalNotifications: number;
}

interface Log {
  id: string;
  commandName: string;
  username: string;
  status: string;
  createdAt: string;
  aiResult?: {
    summary: string;
    category: string;
    priority: string;
  };
  notificationLog?: {
    status: string;
    channelType: string;
  };
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/logs?limit=5'),
      ]);
      setStats(statsRes.data.stats);
      setRecentLogs(logsRes.data.logs);
    } catch (err) {
      setError(extractApiError(err, 'Failed to fetch dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Live metrics and recent Discord command execution logs</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Metrics Grid */}
      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Commands</span>
            <Terminal className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{stats?.totalCommands ?? 0}</p>
          <span className="text-xs text-slate-500 mt-1 block">Executed across servers</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Successful</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400">{stats?.successfulCommands ?? 0}</p>
          <span className="text-xs text-slate-500 mt-1 block">Completed without errors</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Summaries</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold text-purple-400">{stats?.totalAiProcessed ?? 0}</p>
          <span className="text-xs text-slate-500 mt-1 block">Processed by Gemini/Groq</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Notifications Sent</span>
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-amber-400">{stats?.totalNotifications ?? 0}</p>
          <span className="text-xs text-slate-500 mt-1 block">Mirrored to 2nd channel</span>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-white">Recent Command Activity</h2>
          <span className="text-xs text-slate-400">Auto-logged from Discord Webhooks</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Command</th>
                <th className="px-4 py-3">Discord User</th>
                <th className="px-4 py-3">AI Summary</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 rounded-r-lg">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                    No command executions recorded yet. Run /report or /status in Discord!
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-semibold text-indigo-400">/{log.commandName}</td>
                    <td className="px-4 py-3.5 text-slate-200">@{log.username}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-400 max-w-xs truncate">
                      {log.aiResult?.summary || 'N/A'}
                    </td>
                    <td className="px-4 py-3.5">
                      {log.aiResult ? <PriorityBadge priority={log.aiResult.priority} /> : '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
