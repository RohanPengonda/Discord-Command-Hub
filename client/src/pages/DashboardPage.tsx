import React, { useEffect, useState } from 'react';
import { api, extractApiError } from '../api/axios_client.js';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge.js';
import { Terminal, CheckCircle2, Cpu, Bell, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Stats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  deferredCommands: number;
  totalAiProcessed: number;
  totalNotifications: number;
}

interface AiLog {
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

const MetricCard: React.FC<{
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  iconClass: string;
  valueClass: string;
}> = ({ label, value, hint, icon, iconClass, valueClass }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
    <div className="flex items-center justify-between text-slate-400 mb-3 gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      <span className={iconClass}>{icon}</span>
    </div>
    <p className={`text-3xl font-extrabold ${valueClass}`}>{value}</p>
    <span className="text-xs text-slate-500 mt-1 block">{hint}</span>
  </div>
);

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, logsRes, aiRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/logs?limit=5'),
        api.get('/dashboard/logs?limit=6&aiOnly=true'),
      ]);
      setStats(statsRes.data.stats);
      setRecentLogs(logsRes.data.logs);
      setAiLogs(aiRes.data.logs);
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
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Live metrics and recent Discord command execution logs</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total Commands"
          value={stats?.totalCommands ?? 0}
          hint="Executed across servers"
          icon={<Terminal className="w-4 h-4" />}
          iconClass="text-brand-400"
          valueClass="text-white"
        />
        <MetricCard
          label="Successful"
          value={stats?.successfulCommands ?? 0}
          hint="Completed without errors"
          icon={<CheckCircle2 className="w-4 h-4" />}
          iconClass="text-emerald-400"
          valueClass="text-emerald-400"
        />
        <MetricCard
          label="AI Summaries"
          value={stats?.totalAiProcessed ?? 0}
          hint="Processed by Gemini/Groq"
          icon={<Cpu className="w-4 h-4" />}
          iconClass="text-brand-400"
          valueClass="text-brand-400"
        />
        <MetricCard
          label="Notifications Sent"
          value={stats?.totalNotifications ?? 0}
          hint="Mirrored to 2nd channel"
          icon={<Bell className="w-4 h-4" />}
          iconClass="text-yellow-400"
          valueClass="text-yellow-400"
        />
      </div>

      {/* AI Insights Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 bg-brand-500/15 text-brand-400 border border-brand-500/30 rounded-lg shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">AI Insights</h2>
              <p className="text-xs text-slate-400 truncate">Full untruncated summaries from Gemini/Groq</p>
            </div>
          </div>
          <Link
            to="/dashboard/logs"
            className="flex items-center justify-center gap-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-brand-400 text-xs font-semibold px-3 py-2 rounded-lg transition-colors self-start sm:self-auto"
          >
            View all in Audit Logs
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {aiLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No AI summaries generated yet. Enable AI Processing for /report in Command Config, then run the
            command in Discord.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {aiLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-950 border border-brand-800/50 rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-brand-400 text-xs">
                      /{log.commandName}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      @{log.username} · {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={log.status} />
                    <PriorityBadge priority={log.aiResult!.priority} />
                  </div>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed break-words">
                  {log.aiResult!.summary}
                </p>

                <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Category
                  </span>
                  <span className="text-xs font-medium text-brand-300 bg-brand-500/10 border border-brand-700/50 px-2 py-0.5 rounded">
                    {log.aiResult!.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-5">
          <h2 className="text-base font-bold text-white">Recent Command Activity</h2>
          <span className="text-xs text-slate-400">Auto-logged from Discord Webhooks</span>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden space-y-3">
          {recentLogs.length === 0 ? (
            <p className="text-center py-8 text-slate-500 text-xs">
              No command executions recorded yet. Run /report or /status in Discord!
            </p>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-brand-400 text-xs">/{log.commandName}</span>
                  <StatusBadge status={log.status} />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 truncate">@{log.username}</span>
                  <span className="text-slate-500 shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                {log.aiResult && (
                  <p className="text-xs text-slate-300 border-l-2 border-brand-500/60 pl-2 line-clamp-3">
                    {log.aiResult.summary}
                  </p>
                )}
                {log.aiResult && (
                  <PriorityBadge priority={log.aiResult.priority} />
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto scrollbar-thin -mx-4 px-4 sm:-mx-6 sm:px-6">
          <table className="w-full min-w-[640px] text-left text-sm text-slate-300">
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
                    <td className="px-4 py-3.5 font-mono font-semibold text-brand-400">/{log.commandName}</td>
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
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
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