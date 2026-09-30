import React, { useEffect, useState } from 'react';
import { api } from '../api/axios_client.js';
import { Bot, Save, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface CommandConfig {
  id: string;
  commandName: string;
  enabled: boolean;
  saveLogs: boolean;
  replyInDiscord: boolean;
  mirrorNotification: boolean;
  aiProcessing: boolean;
  serverId: string;
  server?: {
    name: string;
  };
}

export const CommandsPage: React.FC = () => {
  const [configs, setConfigs] = useState<CommandConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchConfigs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/commands');
      setConfigs(res.data.configs);
    } catch (err: any) {
      console.error('Failed to fetch command configurations', err);
      setErrorMsg(
        err?.response?.status === 401
          ? 'Your session expired. Please sign in again.'
          : `Could not load command configurations: ${err?.message || 'unknown error'}`
      );
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleToggle = (id: string, field: keyof CommandConfig) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: !c[field] } : c))
    );
  };

  const handleSave = async (config: CommandConfig) => {
    setSavingId(config.id);
    setSuccessMsg('');
    try {
      await api.patch(`/commands/${config.id}`, {
        enabled: config.enabled,
        saveLogs: config.saveLogs,
        replyInDiscord: config.replyInDiscord,
        mirrorNotification: config.mirrorNotification,
        aiProcessing: config.aiProcessing,
      });
      setSuccessMsg(`Successfully updated settings for /${config.commandName}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Failed to save config', err);
      setErrorMsg(`Could not save settings: ${err?.message || 'unknown error'}`);
      await fetchConfigs();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Command Behavior Configurations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure dynamic slash command features. Toggling options updates real application behavior in real-time.
          </p>
        </div>
        <button
          onClick={fetchConfigs}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          {errorMsg}
        </div>
      )}

      {loading && (
        <div className="text-sm text-slate-400 py-12 text-center">Loading command configurations...</div>
      )}

      {!loading && configs.length === 0 && !errorMsg && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
          <p className="text-slate-200 font-semibold">No command configurations yet</p>
          <p className="text-xs text-slate-400">
            Rows are created once a Discord server is known. Set <code className="text-slate-300">DISCORD_GUILD_ID</code>{' '}
            and restart the backend, or save the server in Settings.
          </p>
        </div>
      )}

      {/* Config Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configs.map((config) => (
          <div key={config.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-lg text-white">/{config.commandName}</h3>
                  <span className="text-xs text-slate-400">Server: {config.server?.name || config.serverId}</span>
                </div>
              </div>
              <button
                onClick={() => handleSave(config)}
                disabled={savingId === config.id}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg shadow-indigo-600/20 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                {savingId === config.id ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            {/* Config Toggles */}
            <div className="space-y-4 text-sm text-slate-200">
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <span className="font-semibold block text-slate-100">Command Enabled</span>
                  <span className="text-xs text-slate-400">Allow users to execute this command in Discord</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={() => handleToggle(config.id, 'enabled')}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <span className="font-semibold block text-slate-100">Save Execution Logs</span>
                  <span className="text-xs text-slate-400">Persist audit trail history in database</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.saveLogs}
                  onChange={() => handleToggle(config.id, 'saveLogs')}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <span className="font-semibold block text-slate-100">Reply in Discord</span>
                  <span className="text-xs text-slate-400">Send Rich Embed reply back to Discord channel</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.replyInDiscord}
                  onChange={() => handleToggle(config.id, 'replyInDiscord')}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <span className="font-semibold block text-slate-100">Mirror Notification</span>
                  <span className="text-xs text-slate-400">Post summary alert to 2nd Discord channel</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.mirrorNotification}
                  onChange={() => handleToggle(config.id, 'mirrorNotification')}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {config.commandName === 'report' && (
                <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div>
                    <span className="font-semibold block text-purple-300">AI Processing (Gemini/Groq)</span>
                    <span className="text-xs text-purple-400/70">Analyze summary, category, and priority</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.aiProcessing}
                    onChange={() => handleToggle(config.id, 'aiProcessing')}
                    className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
