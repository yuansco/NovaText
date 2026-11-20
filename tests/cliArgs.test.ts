import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseFilePathsFromArgs } from '../electron/main/utils/cliArgs';

describe('parseFilePathsFromArgs', () => {
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  const readmePath = path.resolve(__dirname, '../README.md');

  it('handles empty or invalid inputs', () => {
    expect(parseFilePathsFromArgs([])).toEqual([]);
    expect(parseFilePathsFromArgs(['novatext'])).toEqual([]);
    expect(parseFilePathsFromArgs(['novatext', '--some-flag'])).toEqual([]);
  });

  it('extracts existing files in packaged mode', () => {
    const argv = ['/opt/NovaText/novatext', '--flag', packageJsonPath];
    const files = parseFilePathsFromArgs(argv, process.cwd(), true);
    expect(files).toEqual([packageJsonPath]);
  });

  it('extracts existing files in unpackaged/dev mode', () => {
    const argv = [
      '/path/to/electron',
      '.',
      '--enable-logging',
      packageJsonPath,
      readmePath,
    ];
    const files = parseFilePathsFromArgs(argv, process.cwd(), false);
    expect(files).toEqual([packageJsonPath, readmePath]);
  });

  it('resolves relative paths against cwd', () => {
    const cwd = path.resolve(__dirname, '..');
    const argv = ['/opt/NovaText/novatext', 'package.json'];
    const files = parseFilePathsFromArgs(argv, cwd, true);
    expect(files).toEqual([packageJsonPath]);
  });

  it('handles file:// URIs', () => {
    const fileUri = pathToFileURL(packageJsonPath).href;
    const argv = ['/opt/NovaText/novatext', fileUri];
    const files = parseFilePathsFromArgs(argv, process.cwd(), true);
    expect(files).toEqual([packageJsonPath]);
  });

  it('ignores non-existent files and flags', () => {
    const argv = [
      '/opt/NovaText/novatext',
      '-w',
      '--no-sandbox',
      '/tmp/definitely_not_existing_file_99999.xyz',
      packageJsonPath,
    ];
    const files = parseFilePathsFromArgs(argv, process.cwd(), true);
    expect(files).toEqual([packageJsonPath]);
  });
});
