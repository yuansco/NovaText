/**
 * Extracts file name from a POSIX or Windows file path.
 */
export function getFileName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

/**
 * Extracts parent directory path for display.
 */
export function getDirName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  return idx > 0 ? normalized.slice(0, idx) : '';
}

/**
 * Formats a timestamp (ms) into a concise human-readable relative time string.
 */
export function formatRelativeTime(timestampMs: number, nowMs: number = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo`;
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  c: 'cpp',
  h: 'cpp',
  cc: 'cpp',
  cpp: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  py: 'python',
  pyw: 'python',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  rs: 'rust',
  go: 'go',
  java: 'java',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  ps1: 'powershell',
  psm1: 'powershell',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  svg: 'xml',
  md: 'markdown',
  markdown: 'markdown',
  mk: 'makefile',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  env: 'ini',
  properties: 'ini',
  diff: 'diff',
  patch: 'diff',
  log: 'plaintext',
  txt: 'plaintext',
};

/**
 * Detects language identifier from file name or extension.
 */
export function detectLanguageId(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower === 'makefile' || lower === 'gnumakefile') return 'makefile';
  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return 'dockerfile';
  if (lower === '.bashrc' || lower === '.zshrc' || lower === '.profile') return 'shell';

  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx === -1 || dotIdx === lower.length - 1) return 'plaintext';
  const ext = lower.slice(dotIdx + 1);
  return EXTENSION_LANGUAGE_MAP[ext] ?? 'plaintext';
}
