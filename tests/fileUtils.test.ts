import { describe, expect, it } from 'vitest';
import { detectLanguageId, formatRelativeTime, getFileName } from '../src/utils/fileUtils';

describe('fileUtils', () => {
  it('extracts file names from POSIX and Windows paths', () => {
    expect(getFileName('/home/user/src/main.cpp')).toBe('main.cpp');
    expect(getFileName('C:\\Users\\dev\\Makefile')).toBe('Makefile');
  });

  it('detects all required developer languages and formats', () => {
    expect(detectLanguageId('main.c')).toBe('cpp');
    expect(detectLanguageId('driver.hpp')).toBe('cpp');
    expect(detectLanguageId('script.py')).toBe('python');
    expect(detectLanguageId('app.ts')).toBe('typescript');
    expect(detectLanguageId('view.tsx')).toBe('tsx');
    expect(detectLanguageId('index.js')).toBe('javascript');
    expect(detectLanguageId('lib.rs')).toBe('rust');
    expect(detectLanguageId('server.go')).toBe('go');
    expect(detectLanguageId('Main.java')).toBe('java');
    expect(detectLanguageId('build.sh')).toBe('shell');
    expect(detectLanguageId('deploy.ps1')).toBe('powershell');
    expect(detectLanguageId('index.html')).toBe('html');
    expect(detectLanguageId('styles.css')).toBe('css');
    expect(detectLanguageId('package.json')).toBe('json');
    expect(detectLanguageId('config.yaml')).toBe('yaml');
    expect(detectLanguageId('Cargo.toml')).toBe('toml');
    expect(detectLanguageId('pom.xml')).toBe('xml');
    expect(detectLanguageId('README.md')).toBe('markdown');
    expect(detectLanguageId('Makefile')).toBe('makefile');
    expect(detectLanguageId('Dockerfile')).toBe('dockerfile');
    expect(detectLanguageId('settings.ini')).toBe('ini');
    expect(detectLanguageId('app.log')).toBe('plaintext');
    expect(detectLanguageId('fix.patch')).toBe('diff');
  });

  it('formats relative time concisely', () => {
    const now = 1_000_000;
    expect(formatRelativeTime(now - 10_000, now)).toBe('just now');
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5m');
    expect(formatRelativeTime(now - 3 * 3600_000, now)).toBe('3h');
    expect(formatRelativeTime(now - 2 * 86400_000, now)).toBe('2d');
  });
});
