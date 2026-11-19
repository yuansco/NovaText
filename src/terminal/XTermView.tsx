import { useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { getNovaAPI, hasNovaAPI } from '@/ipc/novaApi';
import { useBottomPanelStore } from '@/stores/useBottomPanelStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { resolveUITheme } from '@/themes/presets';

interface XTermViewProps {
  sessionId: string;
}

export function XTermView({ sessionId }: XTermViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const settings = useSettingsStore((s) => s.settings);
  const uiTheme = resolveUITheme(settings.uiThemeId, settings.customUITheme);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: Math.max(11, settings.editor.fontSize - 1),
      fontFamily: settings.editor.fontFamily,
      theme: {
        background: uiTheme.colors.bgPrimary,
        foreground: uiTheme.colors.textPrimary,
        cursor: uiTheme.colors.accent,
        selectionBackground: 'rgba(79, 143, 247, 0.3)',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    const syncFit = () => {
      try {
        fitAddon.fit();
        if (hasNovaAPI() && term.cols > 0 && term.rows > 0) {
          getNovaAPI().terminal.resize(sessionId, term.cols, term.rows);
        }
      } catch {
        // Ignore fit errors when hidden
      }
    };
    syncFit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    const disposableInput = term.onData((data) => {
      if (hasNovaAPI()) {
        getNovaAPI().terminal.write(sessionId, data);
      }
    });

    let cleanupData: (() => void) | undefined;
    let cleanupExit: (() => void) | undefined;

    if (hasNovaAPI()) {
      const api = getNovaAPI();
      cleanupData = api.terminal.onData((ev) => {
        if (ev.sessionId === sessionId) {
          term.write(ev.data);
        }
      });
      cleanupExit = api.terminal.onExit((ev) => {
        if (ev.sessionId === sessionId) {
          term.writeln(`\r\n[Process exited with code ${ev.exitCode ?? 0}]`);
          useBottomPanelStore.getState().markTerminalExited(sessionId);
        }
      });
    }

    let rafId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncFit();
      });
    });
    observer.observe(containerRef.current);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
      disposableInput.dispose();
      cleanupData?.();
      cleanupExit?.();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;
    term.options.theme = {
      background: uiTheme.colors.bgPrimary,
      foreground: uiTheme.colors.textPrimary,
      cursor: uiTheme.colors.accent,
      selectionBackground: 'rgba(79, 143, 247, 0.3)',
    };
  }, [uiTheme]);

  return (
    <div className="h-full w-full overflow-hidden p-1.5">
      <div ref={containerRef} className="h-full w-full overflow-hidden" />
    </div>
  );
}
