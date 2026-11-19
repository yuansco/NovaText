import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { searchInDirectory } from '../electron/main/search/folderSearch';

describe('folderSearch', () => {
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'novatext-search-'));
    await fs.mkdir(path.join(tempDir, 'src'));
    await fs.mkdir(path.join(tempDir, 'node_modules'));
    await fs.writeFile(
      path.join(tempDir, 'src', 'main.cpp'),
      'int main() {\n  int sensorValue = 123;\n  return 0;\n}\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(tempDir, 'src', 'notes.md'),
      '# Notes\nsensorValue documentation\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(tempDir, 'node_modules', 'ignored.js'),
      'const sensorValue = 0;\n',
      'utf8',
    );
  });

  afterAll(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('searches across files while respecting excludePatterns and includeExtensions', async () => {
    const allMatches = await searchInDirectory({
      rootDir: tempDir,
      query: 'sensorValue',
      caseSensitive: true,
      useRegex: false,
      includeExtensions: [],
      excludePatterns: ['node_modules'],
    });
    expect(allMatches).toHaveLength(2);

    const cppOnly = await searchInDirectory({
      rootDir: tempDir,
      query: 'sensorValue',
      caseSensitive: true,
      useRegex: false,
      includeExtensions: ['.cpp'],
      excludePatterns: ['node_modules'],
    });
    expect(cppOnly).toHaveLength(1);
    expect(cppOnly[0].fileName).toBe('main.cpp');
    expect(cppOnly[0].line).toBe(2);
  });
});
