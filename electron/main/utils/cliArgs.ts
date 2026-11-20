import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Extracts valid file or directory paths from command-line arguments.
 * Handles:
 * - Filtering out flags (-v, --no-sandbox, etc.)
 * - Skipping executable and app entry points in both packaged and unpackaged modes
 * - Parsing file:// URIs (e.g. file:///path/to/file)
 * - Resolving relative paths against the provided working directory
 * - Verifying whether the target path exists on disk
 */
export function parseFilePathsFromArgs(
  argv: string[],
  cwd: string = process.cwd(),
  isPackaged: boolean = true,
  appPath?: string,
): string[] {
  if (!Array.isArray(argv) || argv.length === 0) {
    return [];
  }

  // Determine starting index of user arguments
  // Packaged app: [executable, ...args]
  // Unpackaged/dev app: [electronPath, (appPath | '.'), ...args]
  const startIndex = isPackaged ? 1 : 2;
  const rawArgs = argv.slice(startIndex);
  const normalizedAppPath = appPath ? path.normalize(appPath) : undefined;

  const result: string[] = [];

  for (const rawArg of rawArgs) {
    if (!rawArg || typeof rawArg !== 'string') continue;
    const trimmed = rawArg.trim();
    if (!trimmed) continue;

    // Skip CLI flags/switches
    if (trimmed.startsWith('-')) continue;

    // In unpackaged/dev mode, skip entry script or '.' if present in args
    if (!isPackaged) {
      if (trimmed === '.' || trimmed === './') continue;
      const resolvedArg = path.resolve(cwd, trimmed);
      if (normalizedAppPath && resolvedArg === normalizedAppPath) continue;
      if (trimmed.endsWith('index.js') || trimmed.endsWith('index.ts')) continue;
    }

    let candidatePath: string;
    if (trimmed.startsWith('file://')) {
      try {
        candidatePath = fileURLToPath(trimmed);
      } catch {
        continue;
      }
    } else {
      candidatePath = path.isAbsolute(trimmed)
        ? path.normalize(trimmed)
        : path.resolve(cwd, trimmed);
    }

    try {
      if (fs.existsSync(candidatePath)) {
        result.push(candidatePath);
      }
    } catch {
      // Ignore filesystem permission or inaccessible path errors
    }
  }

  return Array.from(new Set(result));
}
