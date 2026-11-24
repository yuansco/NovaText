import { useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Edit3, Eye } from 'lucide-react';
import type { TabDocument } from '@shared/types/file';
import { useT } from '@/i18n/translations';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTabStore } from '@/stores/useTabStore';

interface MarkdownPreviewProps {
  tab: TabDocument;
}

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Resolves local relative image paths to file:// URLs based on the document's file path.
 */
function processMarkdownHtml(markdownText: string, filePath: string | null): string {
  const rawHtml = marked.parse(markdownText) as string;

  let sanitized = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['input'],
    ADD_ATTR: ['type', 'checked', 'disabled'],
  });

  if (filePath) {
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    const dir = lastSlash >= 0 ? filePath.substring(0, lastSlash) : null;
    if (dir) {
      sanitized = sanitized.replace(
        /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
        (match, prefix, src: string, suffix) => {
          if (
            !src.startsWith('http://') &&
            !src.startsWith('https://') &&
            !src.startsWith('data:') &&
            !src.startsWith('file://')
          ) {
            const cleanSrc = src.startsWith('./') ? src.slice(2) : src;
            const fullPath = `${dir}/${cleanSrc}`;
            return `<img ${prefix}src="file://${fullPath}"${suffix}>`;
          }
          return match;
        },
      );
    }
  }

  return sanitized;
}

export function MarkdownPreview({ tab }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialRestoredTabIdRef = useRef<string | null>(null);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleTabMarkdownPreview = useTabStore((s) => s.toggleTabMarkdownPreview);
  const updateTabScrollRatio = useTabStore((s) => s.updateTabScrollRatio);
  const editorFontSize = useSettingsStore((s) => s.settings.editor.fontSize);
  const t = useT();

  // Parse and sanitize markdown content
  const htmlContent = useMemo(() => {
    return processMarkdownHtml(tab.content, tab.filePath);
  }, [tab.content, tab.filePath]);

  // Restore scroll position ONLY once when tab opens or changes
  useEffect(() => {
    if (initialRestoredTabIdRef.current === tab.id) return;
    initialRestoredTabIdRef.current = tab.id;

    const el = containerRef.current;
    if (!el) return;

    const ratio =
      tab.scrollRatio ??
      (tab.scrollTop > 0 ? tab.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight) : 0);

    const applyScroll = () => {
      if (!containerRef.current) return;
      const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
      if (maxScroll > 0) {
        containerRef.current.scrollTop = Math.round(ratio * maxScroll);
      }
    };

    applyScroll();
    const raf1 = requestAnimationFrame(applyScroll);
    const timer = setTimeout(applyScroll, 50);

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]); // Only tab.id! Never depend on tab.scrollRatio to prevent overriding user scroll

  const saveCurrentScrollRatio = () => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const ratio = maxScroll > 0 ? el.scrollTop / maxScroll : 0;
    updateTabScrollRatio(tab.id, ratio);
  };

  // Handle scroll events in Markdown preview to keep ratio synchronized
  const handleScroll = () => {
    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }
    scrollDebounceRef.current = setTimeout(() => {
      saveCurrentScrollRatio();
    }, 100);
  };

  // Flush scroll ratio on unmount
  useEffect(() => {
    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
      saveCurrentScrollRatio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  // Attach copy button to every code block (<pre>)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const copySvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    const checkSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    const preElements = container.querySelectorAll<HTMLPreElement>('.markdown-body pre');
    preElements.forEach((pre) => {
      if (pre.querySelector('.code-copy-btn')) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy-btn';
      btn.title = t.copyCode;
      btn.setAttribute('aria-label', t.copyCode);
      btn.innerHTML = `${copySvg}<span>${t.copyCode}</span>`;

      let resetTimer: ReturnType<typeof setTimeout> | null = null;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const codeEl = pre.querySelector('code');
        let codeText = '';
        if (codeEl) {
          codeText = codeEl.innerText;
        } else {
          const clone = pre.cloneNode(true) as HTMLElement;
          clone.querySelector('.code-copy-btn')?.remove();
          codeText = clone.innerText;
        }

        void navigator.clipboard.writeText(codeText);

        btn.classList.add('copied');
        btn.innerHTML = `${checkSvg}<span>${t.copied}</span>`;

        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = `${copySvg}<span>${t.copyCode}</span>`;
        }, 2000);
      });

      pre.appendChild(btn);
    });
  }, [htmlContent, t]);

  // Intercept link clicks to open external links safely
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    if (href.startsWith('http://') || href.startsWith('https://')) {
      e.preventDefault();
      if (window.novaAPI?.app?.openExternal) {
        void window.novaAPI.app.openExternal(href);
      } else {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    } else if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.slice(1);
      const targetEl = containerRef.current?.querySelector(`[id="${targetId}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onClick={handleContentClick}
      className="h-full w-full overflow-y-auto px-6 py-6 select-text"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Sticky read-only preview header banner */}
        <div
          className="sticky top-0 z-10 -mx-2 flex items-center justify-between rounded-lg border px-3.5 py-2 shadow-sm backdrop-blur-md transition-colors"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent-color)]/15 text-[var(--accent-color)]">
              <Eye size={13} />
            </span>
            <span className="font-semibold text-[var(--text-primary)]">
              {t.markdownPreviewBadge}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              ({tab.title})
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              saveCurrentScrollRatio();
              toggleTabMarkdownPreview(tab.id);
            }}
            className="inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
            }}
            title={t.switchToEditor}
          >
            <Edit3 size={12} className="text-[var(--accent-color)]" />
            <span>{t.switchToEditor}</span>
          </button>
        </div>

        {/* Rendered Markdown Body */}
        <div
          className="markdown-body pb-16"
          style={{ fontSize: `${editorFontSize}px` }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
}
