import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  Github,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import type { AppLocale } from '@shared/types/settings';
import type { EditorTheme, UITheme } from '@shared/types/theme';
import packageJson from '../../package.json';
import { useT } from '@/i18n/translations';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { EDITOR_THEMES, resolveEditorTheme, resolveUITheme, UI_THEMES } from '@/themes/presets';
import {
  detectShortcutConflicts,
  eventToShortcutString,
  SHORTCUT_COMMANDS,
} from '@/utils/shortcuts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'themes' | 'shortcuts' | 'about';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    settings,
    setLocale,
    updateEditor,
    updateUI,
    setUITheme,
    setEditorTheme,
    setCustomUITheme,
    setCustomEditorTheme,
    setKeybinding,
    resetKeybindings,
  } = useSettingsStore();

  const t = useT();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [recordingCmd, setRecordingCmd] = useState<string | null>(null);
  const [themeImportError, setThemeImportError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const conflicts = useMemo(
    () => detectShortcutConflicts(settings.keybindings),
    [settings.keybindings],
  );

  if (!isOpen) return null;

  const currentUI = resolveUITheme(settings.uiThemeId, settings.customUITheme);
  const currentEditor = resolveEditorTheme(settings.editorThemeId, settings.customEditorTheme);

  const updateCustomUIColor = (key: keyof UITheme['colors'], value: string) => {
    setCustomUITheme({
      ...currentUI,
      id: 'custom',
      name: 'Custom UI',
      colors: { ...currentUI.colors, [key]: value },
    });
  };

  const updateCustomEditorColor = (key: keyof EditorTheme['colors'], value: string) => {
    setCustomEditorTheme({
      ...currentEditor,
      id: 'custom',
      name: 'Custom Editor',
      colors: { ...currentEditor.colors, [key]: value },
    });
  };

  const updateCustomSyntaxColor = (key: keyof EditorTheme['syntax'], value: string) => {
    setCustomEditorTheme({
      ...currentEditor,
      id: 'custom',
      name: 'Custom Editor',
      syntax: { ...currentEditor.syntax, [key]: value },
    });
  };

  const handleExportTheme = () => {
    const payload = {
      uiTheme: currentUI,
      editorTheme: currentEditor,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'novatext-theme.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTheme = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { uiTheme?: UITheme; editorTheme?: EditorTheme };
      if (!parsed.uiTheme?.colors || !parsed.editorTheme?.colors || !parsed.editorTheme?.syntax) {
        setThemeImportError('Invalid NovaText theme JSON format.');
        return;
      }
      setThemeImportError(null);
      setCustomUITheme({ ...parsed.uiTheme, id: 'custom' });
      setCustomEditorTheme({ ...parsed.editorTheme, id: 'custom' });
    } catch {
      setThemeImportError('Failed to parse JSON file.');
    }
  };

  const handleOpenExternal = (url: string) => {
    if (window.novaAPI?.app?.openExternal) {
      void window.novaAPI.app.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyRepoUrl = async () => {
    await navigator.clipboard.writeText('https://github.com/yuansco/NovaText');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-lg border shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold">{t.settingsTitle}</h2>
            <nav className="flex items-center gap-1 text-xs">
              {(['general', 'themes', 'shortcuts', 'about'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded px-2.5 py-1 transition-colors ${
                    activeTab === tab
                      ? 'bg-[var(--accent-color)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {tab === 'general'
                    ? t.tabGeneral
                    : tab === 'themes'
                      ? t.tabThemes
                      : tab === 'shortcuts'
                        ? t.tabShortcuts
                        : t.tabAbout}
                </button>
              ))}
            </nav>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 text-xs">
          {activeTab === 'general' && (
            <div className="space-y-5">
              <section className="space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.languageSection}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--text-secondary)]">{t.uiLanguage}</span>
                    <select
                      value={settings.locale ?? 'en'}
                      onChange={(e) => setLocale(e.target.value as AppLocale)}
                      className="rounded border px-2 py-1.5 outline-none"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      <option value="en">English</option>
                      <option value="zh-TW">繁體中文 (Traditional Chinese)</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.themePresets}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--text-secondary)]">{t.uiTheme}</span>
                    <select
                      value={settings.uiThemeId}
                      onChange={(e) => setUITheme(e.target.value)}
                      className="rounded border px-2 py-1.5 outline-none"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      {UI_THEMES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                      {settings.customUITheme && <option value="custom">Custom UI</option>}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--text-secondary)]">{t.editorTheme}</span>
                    <select
                      value={settings.editorThemeId}
                      onChange={(e) => setEditorTheme(e.target.value)}
                      className="rounded border px-2 py-1.5 outline-none"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      {EDITOR_THEMES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                      {settings.customEditorTheme && <option value="custom">Custom Editor</option>}
                    </select>
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.editorTypography}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--text-secondary)]">
                      {t.fontSize} ({settings.editor.fontSize}px)
                    </span>
                    <input
                      type="range"
                      min={10}
                      max={28}
                      value={settings.editor.fontSize}
                      onChange={(e) => updateEditor({ fontSize: Number(e.target.value) })}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--text-secondary)]">
                      {t.lineHeight} ({settings.editor.lineHeight})
                    </span>
                    <input
                      type="range"
                      min={1.1}
                      max={2.2}
                      step={0.05}
                      value={settings.editor.lineHeight}
                      onChange={(e) => updateEditor({ lineHeight: Number(e.target.value) })}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--text-secondary)]">{t.tabSize}</span>
                    <select
                      value={settings.editor.tabSize}
                      onChange={(e) => updateEditor({ tabSize: Number(e.target.value) })}
                      className="rounded border px-2 py-1.5 outline-none"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      <option value={2}>2 {t.spaces}</option>
                      <option value={4}>4 {t.spaces}</option>
                      <option value={8}>8 {t.spaces}</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      checked={settings.editor.wordWrap}
                      onChange={(e) => updateEditor({ wordWrap: e.target.checked })}
                    />
                    <span>{t.enableWordWrap}</span>
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.appUiScale}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--text-secondary)]">
                      {t.uiScale} ({Math.round(settings.ui.scale * 100)}%)
                    </span>
                    <input
                      type="range"
                      min={0.85}
                      max={2.0}
                      step={0.05}
                      value={settings.ui.scale}
                      onChange={(e) => updateUI({ scale: Number(e.target.value) })}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--text-secondary)]">
                      {t.tabHeight} ({settings.ui.tabHeight}px)
                    </span>
                    <input
                      type="range"
                      min={28}
                      max={44}
                      step={2}
                      value={settings.ui.tabHeight}
                      onChange={(e) => updateUI({ tabHeight: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.aboutSection}
                </h3>
                <div
                  className="flex items-center justify-between gap-4 rounded border p-3"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <FileCode2 size={24} className="shrink-0 text-[var(--accent-color)] mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[var(--text-primary)]">NovaText</span>
                        <span className="rounded bg-[var(--accent-color)]/15 px-1.5 py-0.5 text-[10px] font-mono text-[var(--accent-color)]">
                          v{packageJson.version}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {t.appDescription}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenExternal('https://github.com/yuansco/NovaText')}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[var(--accent-color)] hover:underline"
                      >
                        <Github size={12} />
                        <span>https://github.com/yuansco/NovaText</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('about')}
                    className="shrink-0 rounded border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    {t.viewDetails}
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'themes' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  Customize UI & Editor colors or import/export JSON configuration.
                </span>
                <div className="flex items-center gap-2">
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImportTheme(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-[var(--bg-hover)]"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <Upload size={12} />
                    Import JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTheme}
                    className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-[var(--bg-hover)]"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <Download size={12} />
                    Export JSON
                  </button>
                </div>
              </div>

              {themeImportError && (
                <div className="rounded border border-[var(--danger-color)] px-2.5 py-1.5 text-[var(--danger-color)]">
                  {themeImportError}
                </div>
              )}

              <section className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  UI Colors
                </h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      ['bgPrimary', 'Primary Bg'],
                      ['bgSidebar', 'Sidebar Bg'],
                      ['bgTabActive', 'Active Tab'],
                      ['accent', 'Accent'],
                      ['textPrimary', 'Primary Text'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between rounded border px-2 py-1.5"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <span>{label}</span>
                      <input
                        type="color"
                        value={currentUI.colors[key]}
                        onChange={(e) => updateCustomUIColor(key, e.target.value)}
                        className="h-5 w-7 cursor-pointer bg-transparent"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Editor & Syntax Colors
                </h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      ['background', 'Editor Bg'],
                      ['foreground', 'Editor Text'],
                      ['cursor', 'Cursor'],
                      ['selection', 'Selection'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between rounded border px-2 py-1.5"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <span>{label}</span>
                      <input
                        type="color"
                        value={currentEditor.colors[key]}
                        onChange={(e) => updateCustomEditorColor(key, e.target.value)}
                        className="h-5 w-7 cursor-pointer bg-transparent"
                      />
                    </label>
                  ))}

                  {(
                    [
                      ['keyword', 'Keywords'],
                      ['string', 'Strings'],
                      ['comment', 'Comments'],
                      ['function', 'Functions'],
                      ['number', 'Numbers'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between rounded border px-2 py-1.5"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <span>{label}</span>
                      <input
                        type="color"
                        value={currentEditor.syntax[key]}
                        onChange={(e) => updateCustomSyntaxColor(key, e.target.value)}
                        className="h-5 w-7 cursor-pointer bg-transparent"
                      />
                    </label>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  Click any shortcut and press a new key combination to rebind.
                </span>
                <button
                  type="button"
                  onClick={resetKeybindings}
                  className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-[var(--bg-hover)]"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <RotateCcw size={12} />
                  Reset Defaults
                </button>
              </div>

              {Object.keys(conflicts).length > 0 && (
                <div className="flex items-center gap-2 rounded border border-[var(--warning-color)] px-2.5 py-1.5 text-[var(--warning-color)]">
                  <AlertTriangle size={14} />
                  <span>
                    Shortcut conflict detected:{' '}
                    {Object.entries(conflicts)
                      .map(([k, cmds]) => `${k} (${cmds.join(', ')})`)
                      .join('; ')}
                  </span>
                </div>
              )}

              <div className="divide-y rounded border" style={{ borderColor: 'var(--border-color)' }}>
                {SHORTCUT_COMMANDS.map((cmd) => {
                  const binding = settings.keybindings[cmd.id] ?? '';
                  const isRecording = recordingCmd === cmd.id;
                  const hasConflict = Object.values(conflicts).some((list) => list.includes(cmd.id));

                  return (
                    <div
                      key={cmd.id}
                      className="flex items-center justify-between px-3 py-2"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div>
                        <div className="font-medium">{cmd.label}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{cmd.category}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setRecordingCmd(cmd.id)}
                        onBlur={() => setRecordingCmd(null)}
                        onKeyDown={(e) => {
                          if (!isRecording) return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.key === 'Escape') {
                            setRecordingCmd(null);
                            return;
                          }
                          const nextShortcut = eventToShortcutString(e.nativeEvent);
                          if (nextShortcut) {
                            setKeybinding(cmd.id, nextShortcut);
                            setRecordingCmd(null);
                          }
                        }}
                        className={`min-w-[120px] rounded border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                          isRecording
                            ? 'border-[var(--accent-color)] bg-[var(--accent-color)] text-white'
                            : hasConflict
                              ? 'border-[var(--warning-color)] text-[var(--warning-color)]'
                              : 'hover:bg-[var(--bg-hover)]'
                        }`}
                        style={!isRecording && !hasConflict ? { borderColor: 'var(--border-color)' } : undefined}
                      >
                        {isRecording ? 'Press keys...' : binding || 'Unbound'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-5 py-1">
              {/* App Banner Card */}
              <div
                className="flex flex-col items-center justify-center rounded-xl border p-6 text-center shadow-sm"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] shadow-inner mb-3">
                  <FileCode2 size={36} />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">NovaText</h1>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-[var(--accent-color)]/15 px-2.5 py-0.5 text-xs font-mono font-medium text-[var(--accent-color)]">
                    v{packageJson.version}
                  </span>
                </div>
                <p className="mt-3 max-w-md text-xs leading-relaxed text-[var(--text-secondary)]">
                  {t.appDescription}
                </p>
              </div>

              {/* GitHub Repository Card */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.githubRepo}
                </h3>
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Github size={18} className="shrink-0 text-[var(--text-primary)]" />
                    <a
                      href="https://github.com/yuansco/NovaText"
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenExternal('https://github.com/yuansco/NovaText');
                      }}
                      className="truncate text-xs font-mono text-[var(--accent-color)] hover:underline"
                    >
                      https://github.com/yuansco/NovaText
                    </a>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyRepoUrl}
                      className="inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ borderColor: 'var(--border-color)' }}
                      title={t.copyRepoUrl}
                    >
                      {copiedUrl ? (
                        <>
                          <Check size={13} className="text-[var(--success-color)]" />
                          <span className="text-[var(--success-color)]">{t.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>{t.copyRepoUrl}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenExternal('https://github.com/yuansco/NovaText')}
                      className="inline-flex items-center gap-1.5 rounded bg-[var(--accent-color)] px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
                    >
                      <span>{t.visitGithub}</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Software Details Grid */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.softwareIntro}
                </h3>
                <div
                  className="grid grid-cols-2 gap-3 rounded-lg border p-3.5 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)]">{t.appVersion}</span>
                    <p className="mt-0.5 font-mono font-medium text-[var(--text-primary)]">
                      {packageJson.version}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-[var(--text-muted)]">{t.license}</span>
                    <p className="mt-0.5 font-medium text-[var(--text-primary)]">
                      MIT License
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-[var(--text-muted)]">{t.author}</span>
                    <p className="mt-0.5 font-medium text-[var(--text-primary)]">
                      yuansco
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-[var(--text-muted)]">Framework</span>
                    <p className="mt-0.5 font-mono text-[var(--text-primary)]">
                      Electron 33 • React 18
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
