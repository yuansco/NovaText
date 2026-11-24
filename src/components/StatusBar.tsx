import { listSupportedLanguages } from '@/editor/languageRegistry';
import { useT } from '@/i18n/translations';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTabStore } from '@/stores/useTabStore';
import type { FileEncoding } from '@shared/types/file';

const ENCODINGS: FileEncoding[] = ['utf-8', 'utf-8-bom', 'utf-16le', 'utf-16be', 'latin1'];

export function StatusBar() {
  const activeTab = useTabStore((s) => s.getActiveTab());
  const { setTabLineEnding, setTabEncoding, setTabLanguage } = useTabStore();
  const { settings, updateEditor } = useSettingsStore();

  const languages = listSupportedLanguages();
  const t = useT();

  return (
    <footer
      className="flex shrink-0 items-center justify-between border-t px-3 text-[11px] font-medium select-none"
      style={{
        height: 'calc(24px * var(--ui-scale))',
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-secondary)',
      }}
    >
      <div className="flex items-center gap-3">
        {activeTab ? (
          <>
            <span className="tabular-nums">
              Ln {activeTab.cursor.line}, Col {activeTab.cursor.col}
            </span>
            <button
              type="button"
              onClick={() =>
                setTabLineEnding(
                  activeTab.id,
                  activeTab.lineEnding === 'LF' ? 'CRLF' : 'LF',
                )
              }
              title={t.toggleLineEndingTitle}
              className="rounded px-1 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              {activeTab.lineEnding}
            </button>
            <select
              value={activeTab.encoding}
              onChange={(e) => setTabEncoding(activeTab.id, e.target.value as FileEncoding)}
              title={t.fileEncodingTitle}
              className="cursor-pointer rounded bg-transparent px-1 uppercase outline-none hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {ENCODINGS.map((enc) => (
                <option
                  key={enc}
                  value={enc}
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  {enc}
                </option>
              ))}
            </select>
            <select
              value={activeTab.languageId}
              onChange={(e) => setTabLanguage(activeTab.id, e.target.value)}
              title={t.languageModeTitle}
              className="cursor-pointer rounded bg-transparent px-1 outline-none hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {languages.map((lang) => (
                <option
                  key={lang.id}
                  value={lang.id}
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  {lang.label}
                </option>
              ))}
            </select>
            {activeTab.isMarkdownPreview && (
              <span className="rounded bg-[var(--accent-color)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-color)]">
                {t.markdownPreviewBadge}
              </span>
            )}
          </>
        ) : (
          <span>{t.ready}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {activeTab && activeTab.byteSize > 5 * 1024 * 1024 && (
          <span
            className="rounded px-1.5 py-0.2 text-[10px] font-medium"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--warning-color)' }}
            title={t.largeFileModeTitle}
          >
            {t.largeFileMode}
          </span>
        )}
        <button
          type="button"
          onClick={() => updateEditor({ wordWrap: !settings.editor.wordWrap })}
          title={t.toggleWordWrapTitle}
          className="rounded px-1 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          {settings.editor.wordWrap ? t.wrapOn : t.wrapOff}
        </button>
        <span>{t.spaces}: {settings.editor.tabSize}</span>
        <span className="tabular-nums">{t.font}: {settings.editor.fontSize}px</span>
        <span className="tabular-nums">{t.uiScaleShort}: {Math.round(settings.ui.scale * 100)}%</span>
      </div>
    </footer>
  );
}
