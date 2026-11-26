import { useState } from 'react';
import { Columns2, Play, Plus, Terminal as TerminalIcon, Trash2, X } from 'lucide-react';
import { getNovaAPI, hasNovaAPI } from '@/ipc/novaApi';
import { useT } from '@/i18n/translations';
import { useBottomPanelStore } from '@/stores/useBottomPanelStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { XTermView } from './XTermView';

const isWindows = typeof window !== 'undefined' && hasNovaAPI() && getNovaAPI().app.getPlatform() === 'win32';

const SHELL_PROFILES = isWindows
  ? [
      { label: 'Default Shell', value: '' },
      { label: 'PowerShell (powershell.exe)', value: 'powershell.exe' },
      { label: 'Command Prompt (cmd.exe)', value: 'cmd.exe' },
      { label: 'Git Bash (bash.exe)', value: 'bash.exe' },
    ]
  : [
      { label: 'Default Shell', value: '' },
      { label: 'Bash (/bin/bash)', value: '/bin/bash' },
      { label: 'Zsh (/bin/zsh)', value: '/bin/zsh' },
      { label: 'Sh (/bin/sh)', value: '/bin/sh' },
    ];

export function TerminalPanel() {
  const {
    sessions,
    activeSessionId,
    splitSessionId,
    shellProfile,
    setShellProfile,
    createTerminal,
    createSplitTerminal,
    closeTerminal,
    setActiveTerminal,
  } = useBottomPanelStore();

  const { settings, addQuickCommand, removeQuickCommand } = useSettingsStore();
  const [addingCmd, setAddingCmd] = useState(false);
  const [newCmdText, setNewCmdText] = useState('');
  const t = useT();

  const runQuickCommand = (cmd: string) => {
    if (!activeSessionId || !hasNovaAPI()) return;
    getNovaAPI().terminal.write(activeSessionId, `${cmd}\r`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Terminal Toolbar & Session Tabs */}
      <div
        className="flex items-center justify-between border-b px-2 py-1 text-xs select-none"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-1 overflow-x-auto">
          {sessions.map((s) => {
            const isActive = s.sessionId === activeSessionId;
            const isSplit = s.sessionId === splitSessionId;
            return (
              <div
                key={s.sessionId}
                onClick={() => setActiveTerminal(s.sessionId)}
                className={`flex cursor-pointer items-center gap-1.5 rounded px-2 py-0.5 ${
                  isActive || isSplit
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <TerminalIcon size={12} />
                <span>{s.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(s.sessionId);
                  }}
                  className="rounded p-0.5 hover:bg-[var(--bg-hover)]"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => void createTerminal()}
            title={t.newTerminalTitle}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <Plus size={13} />
          </button>

          <button
            type="button"
            onClick={() => void createSplitTerminal()}
            title={t.splitTerminalTitle}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <Columns2 size={13} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={shellProfile}
            onChange={(e) => setShellProfile(e.target.value)}
            title={t.shellProfileTitle}
            className="rounded border bg-transparent px-1.5 py-0.5 text-[11px] outline-none"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            {SHELL_PROFILES.map((p) => (
              <option
                key={p.label}
                value={p.value}
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Commands Bar */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto border-b px-2 py-1 text-[11px] select-none"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <span className="shrink-0 text-[var(--text-muted)]">{t.quickLabel}</span>
        {(settings.quickCommands ?? []).map((qc) => (
          <div
            key={qc.id}
            className="group flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <button
              type="button"
              onClick={() => runQuickCommand(qc.command)}
              title={`${t.runCommandPrefix} ${qc.command}`}
              className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Play size={10} className="text-[var(--accent-color)]" />
              <span>{qc.label}</span>
            </button>
            <button
              type="button"
              onClick={() => removeQuickCommand(qc.id)}
              title={t.removeQuickCommandTitle}
              className="hidden text-[var(--text-muted)] hover:text-[var(--danger-color)] group-hover:block"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}

        {addingCmd ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newCmdText.trim()) {
                addQuickCommand(newCmdText, newCmdText);
                setNewCmdText('');
              }
              setAddingCmd(false);
            }}
            className="flex items-center gap-1"
          >
            <input
              autoFocus
              type="text"
              value={newCmdText}
              onChange={(e) => setNewCmdText(e.target.value)}
              onBlur={() => setAddingCmd(false)}
              placeholder="e.g. npm test"
              className="w-28 rounded border px-1.5 py-0.5 text-[11px] outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--accent-color)',
              }}
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAddingCmd(true)}
            className="rounded px-1.5 py-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            {t.addBtn}
          </button>
        )}
      </div>

      {/* Terminal Viewports (Single or Split) */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sessions.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => void createTerminal()}
              className="rounded border px-3 py-1.5 hover:bg-[var(--bg-hover)]"
              style={{ borderColor: 'var(--border-color)' }}
            >
              Start Terminal Session
            </button>
          </div>
        ) : (
          <>
            {activeSessionId && (
              <div className="h-full min-w-0 flex-1">
                <XTermView sessionId={activeSessionId} />
              </div>
            )}
            {splitSessionId && splitSessionId !== activeSessionId && (
              <div
                className="h-full min-w-0 flex-1 border-l"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <XTermView sessionId={splitSessionId} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
