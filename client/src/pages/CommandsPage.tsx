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

interface ToggleRowProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
  accent?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, hint, checked, onChange, accent }) => (
  <label className="flex items-center justify-between gap-3 p-3 sm:p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
    <span className="min-w-0">
      <span className={`font-semibold block text-sm ${accent ? 'text-brand-300' : 'text-slate-100'}`}>{label}</span>
      <span className={`text-xs ${accent ? 'text-brand-400/80' : 'text-slate-400'}`}>{hint}</span>
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={`w-5 h-5 shrink-0 accent-brand-500 rounded cursor-pointer`}
    />
  </label>
);

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
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: !c[field] } : c)));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Command Behavior Configurations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure dynamic slash command features. Toggling options updates real application behavior in
            real-time.
          </p>
        </div>
        <button
          onClick={fetchConfigs}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {configs.map((config) => (
          <div key={config.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-brand-500/15 text-brand-400 border border-brand-500/30 rounded-xl shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-mono font-bold text-base sm:text-lg text-white truncate">
                    /{config.commandName}
                  </h3>
                  <span className="text-xs text-slate-400 block truncate">
                    Server: {config.server?.name || config.serverId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleSave(config)}
                disabled={savingId === config.id}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg shadow-brand-600/20 transition-all shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                {savingId === config.id ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            {/* Config Toggles */}
            <div className="space-y-3 text-sm text-slate-200">
              <ToggleRow
                label="Command Enabled"
                hint="Allow users to execute this command in Discord"
                checked={config.enabled}
                onChange={() => handleToggle(config.id, 'enabled')}
              />
              <ToggleRow
                label="Save Execution Logs"
                hint="Persist audit trail history in database"
                checked={config.saveLogs}
                onChange={() => handleToggle(config.id, 'saveLogs')}
              />
              <ToggleRow
                label="Reply in Discord"
                hint="Send Rich Embed reply back to Discord channel"
                checked={config.replyInDiscord}
                onChange={() => handleToggle(config.id, 'replyInDiscord')}
              />
              <ToggleRow
                label="Mirror Notification"
                hint="Post summary alert to 2nd Discord channel"
                checked={config.mirrorNotification}
                onChange={() => handleToggle(config.id, 'mirrorNotification')}
              />
              {config.commandName === 'report' && (
                <ToggleRow
                  accent
                  label="AI Processing (Gemini)"
                  hint="Analyze summary, category, and priority"
                  checked={config.aiProcessing}
                  onChange={() => handleToggle(config.id, 'aiProcessing')}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};