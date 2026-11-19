import fs from 'node:fs/promises';
import path from 'node:path';
import type { FolderSearchMatch, FolderSearchParams } from '@shared/types/ipc';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB per file in folder search
const DEFAULT_MAX_RESULTS = 500;

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isProbablyBinary(buffer: Buffer): boolean {
  const sampleLen = Math.min(buffer.length, 512);
  for (let i = 0; i < sampleLen; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export async function searchInDirectory(params: FolderSearchParams): Promise<FolderSearchMatch[]> {
  const {
    rootDir,
    query,
    caseSensitive,
    useRegex,
    includeExtensions,
    excludePatterns,
    maxResults = DEFAULT_MAX_RESULTS,
  } = params;

  if (!query.trim() || !rootDir.trim()) return [];

  const pattern = useRegex ? query : escapeRegExp(query);
  const flags = caseSensitive ? 'g' : 'gi';
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    return [];
  }

  const normalizedExts = includeExtensions
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .map((e) => (e.startsWith('.') ? e : `.${e}`));

  const normalizedExcludes = excludePatterns.map((p) => p.trim().toLowerCase()).filter(Boolean);
  const results: FolderSearchMatch[] = [];

  async function walk(dir: string): Promise<void> {
    if (results.length >= maxResults) return;

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      const nameLower = entry.name.toLowerCase();
      if (normalizedExcludes.some((ex) => nameLower === ex || nameLower.includes(ex))) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      if (normalizedExts.length > 0) {
        const ext = path.extname(nameLower);
        if (!normalizedExts.includes(ext)) continue;
      }

      try {
        const stat = await fs.stat(fullPath);
        if (stat.size > MAX_FILE_SIZE_BYTES) continue;

        const buffer = await fs.readFile(fullPath);
        if (isProbablyBinary(buffer)) continue;

        const text = buffer.toString('utf8').replace(/\r\n/g, '\n');
        const lines = text.split('\n');
        let runningOffset = 0;

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
          if (results.length >= maxResults) break;
          const lineText = lines[lineIdx];
          regex.lastIndex = 0;
          const match = regex.exec(lineText);
          if (match) {
            results.push({
              filePath: fullPath,
              fileName: entry.name,
              line: lineIdx + 1,
              column: match.index + 1,
              preview: lineText.slice(0, 180),
              fromOffset: runningOffset + match.index,
              toOffset: runningOffset + match.index + match[0].length,
            });
          }
          runningOffset += lineText.length + 1;
        }
      } catch {
        // Ignore unreadable files
      }
    }
  }

  await walk(path.resolve(rootDir));
  return results;
}
