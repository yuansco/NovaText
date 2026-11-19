import { AlertCircle, RefreshCw, X } from 'lucide-react';
import type { TabDocument } from '@shared/types/file';
import { reloadTabFromDisk } from '@/file-system/fileActions';
import { useT } from '@/i18n/translations';
import { useTabStore } from '@/stores/useTabStore';

interface ExternalChangeBannerProps {
  tab: TabDocument;
}

export function ExternalChangeBanner({ tab }: ExternalChangeBannerProps) {
  const setExternalChange = useTabStore((s) => s.setExternalChange);
  const t = useT();

  if (!tab.externalChange || !tab.filePath) return null;

  const isDeleted = tab.externalChange === 'deleted';

  return (
    <div
      className="flex items-center justify-between border-b px-3 py-1.5 text-xs select-none"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--warning-color)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="flex items-center gap-2">
        <AlertCircle size={14} className="text-[var(--warning-color)]" />
        <span>
          {isDeleted
            ? t.fileDeletedOnDisk
            : tab.isDirty
              ? t.fileModifiedDirty
              : t.fileModifiedClean}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!isDeleted && (
          <button
            type="button"
            onClick={() => void reloadTabFromDisk(tab.id)}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-white"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            <RefreshCw size={12} />
            {t.reload}
          </button>
        )}
        <button
          type="button"
          onClick={() => tab.filePath && setExternalChange(tab.filePath, null)}
          title={t.dismissTitle}
          className="rounded p-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
