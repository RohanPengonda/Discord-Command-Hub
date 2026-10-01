import React, { useEffect, useState } from 'react';
import { api, extractApiError } from '../api/axios_client.js';
import { Check, Hash, Server, Zap } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [serverId, setServerId] = useState('');
  const [serverName, setServerName] = useState('');
  const [primaryChannelId, setPrimaryChannelId] = useState('');
  const [mirrorChannelId, setMirrorChannelId] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await api.get('/servers');
      if (res.data.servers && res.data.servers.length > 0) {
        const s = res.data.servers[0];
        setServerId(s.id);
        setServerName(s.name);
        const primary = s.channels?.find((c: any) => c.isPrimary);
        const mirror = s.channels?.find((c: any) => c.isMirror);
        if (primary) setPrimaryChannelId(primary.id);
        if (mirror) setMirrorChannelId(mirror.id);
      }
    } catch (err) {
      console.error('Failed to fetch server settings', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.post('/servers/settings', {
        serverId,
        serverName,
        primaryChannelId,
        mirrorChannelId,
      });
      setMessage('Server & Channel settings updated successfully!');
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setMessage(`Error: ${extractApiError(err, 'Failed to update settings')}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncCommands = async () => {
    setSyncing(true);
    setMessage('');
    try {
      await api.post('/discord/sync-commands');
      setMessage('Successfully registered /report and /status slash commands with Discord API!');
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setMessage(`Error syncing commands: ${extractApiError(err, 'Failed to sync')}`);
    } finally {
      setSyncing(false);
    }
  };

  const inputClass =
    'w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 sm:py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-brand-500 transition-colors';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Discord Guild &amp; Channel Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure connected Discord server ID, primary response channel, second-channel mirror, and slash
          command registration.
        </p>
      </div>

      {message && (
        <div className="p-3.5 bg-brand-950/60 border border-brand-800 rounded-xl text-brand-200 text-xs flex items-start gap-2">
          <Check className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <span className="break-words">{message}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-brand-400 shrink-0" />
            Connected Discord Server
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Server Guild ID
              </label>
              <input
                type="text"
                required
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                placeholder="e.g. 123456789012345678"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Server Name / Label
              </label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="e.g. Production Discord Community"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Hash className="w-4 h-4 text-emerald-400 shrink-0" />
            Channel Routing Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Primary Bot Response Channel ID
              </label>
              <input
                type="text"
                value={primaryChannelId}
                onChange={(e) => setPrimaryChannelId(e.target.value)}
                placeholder="Discord Channel ID"
                className={inputClass}
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default channel for bot interactions</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-300 uppercase tracking-wider mb-2">
                Second Channel (Mirror Channel ID)
              </label>
              <input
                type="text"
                value={mirrorChannelId}
                onChange={(e) => setMirrorChannelId(e.target.value)}
                placeholder="Mirror Channel ID"
                className={`${inputClass} text-brand-200`}
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Channel where mirrored notifications are posted
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={handleSyncCommands}
            disabled={syncing}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-brand-300 border border-brand-800/40 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 w-full sm:w-auto"
          >
            <Zap className={`w-4 h-4 text-brand-400 ${syncing ? 'animate-bounce' : ''}`} />
            {syncing ? 'Registering...' : 'Sync Slash Commands with Discord'}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-lg shadow-brand-600/20 transition-all disabled:opacity-50 w-full sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};