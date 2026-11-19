import fs from 'node:fs/promises';
import path from 'node:path';
import type { FileEncoding, FileReadResult, FileWriteResult, LineEnding } from '@shared/types/file';
import {
  decodeBuffer,
  detectEncoding,
  detectLineEnding,
  encodeString,
  normalizeLineEnding,
} from './encoding';
import { markSelfWrite } from './fileWatcher';

/**
 * Reads a file from disk, detects encoding and line endings, and normalizes internal content to LF
 * for consistent editor handling while preserving the detected metadata.
 */
export async function readFileWithMetadata(filePath: string): Promise<FileReadResult> {
  const resolved = path.resolve(filePath);
  const [buffer, stats] = await Promise.all([fs.readFile(resolved), fs.stat(resolved)]);

  const encoding = detectEncoding(buffer);
  const rawText = decodeBuffer(buffer, encoding);
  const lineEnding = detectLineEnding(rawText);
  const content = normalizeLineEnding(rawText, 'LF');

  return {
    filePath: resolved,
    fileName: path.basename(resolved),
    content,
    encoding,
    lineEnding,
    byteSize: stats.size,
    lastModifiedMs: stats.mtimeMs,
  };
}

/**
 * Writes content to disk using the specified encoding and line ending via atomic temp-file rename.
 */
export async function writeFileAtomic(
  filePath: string,
  content: string,
  encoding: FileEncoding,
  lineEnding: LineEnding,
): Promise<FileWriteResult> {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  await fs.mkdir(dir, { recursive: true });

  const formatted = normalizeLineEnding(content, lineEnding);
  const buffer = encodeString(formatted, encoding);

  const tempPath = path.join(dir, `.${path.basename(resolved)}.novatext.tmp-${process.pid}-${Date.now()}`);
  markSelfWrite(resolved);
  try {
    await fs.writeFile(tempPath, buffer);
    await fs.rename(tempPath, resolved);
    markSelfWrite(resolved);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw error;
  }

  const stats = await fs.stat(resolved);
  return {
    filePath: resolved,
    fileName: path.basename(resolved),
    lastModifiedMs: stats.mtimeMs,
    byteSize: stats.size,
  };
}

/**
 * Checks existence of multiple file paths concurrently.
 */
export async function checkFilesExist(paths: string[]): Promise<Record<string, boolean>> {
  const entries = await Promise.all(
    paths.map(async (target) => {
      try {
        await fs.access(target);
        return [target, true] as const;
      } catch {
        return [target, false] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
