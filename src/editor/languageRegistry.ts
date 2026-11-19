import { StreamLanguage, type LanguageSupport } from '@codemirror/language';
import { cpp } from '@codemirror/lang-cpp';
import { css } from '@codemirror/lang-css';
import { go } from '@codemirror/lang-go';
import { html } from '@codemirror/lang-html';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { diff } from '@codemirror/legacy-modes/mode/diff';
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile';
import { powerShell } from '@codemirror/legacy-modes/mode/powershell';
import { properties } from '@codemirror/legacy-modes/mode/properties';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import type { Extension } from '@codemirror/state';

export interface LanguageDefinition {
  id: string;
  label: string;
  createExtension: () => Extension;
}

const LANGUAGE_DEFINITIONS: LanguageDefinition[] = [
  { id: 'plaintext', label: 'Plain Text', createExtension: () => [] },
  { id: 'cpp', label: 'C / C++', createExtension: () => cpp() },
  { id: 'python', label: 'Python', createExtension: () => python() },
  { id: 'javascript', label: 'JavaScript', createExtension: () => javascript() },
  { id: 'jsx', label: 'JSX', createExtension: () => javascript({ jsx: true }) },
  { id: 'typescript', label: 'TypeScript', createExtension: () => javascript({ typescript: true }) },
  { id: 'tsx', label: 'TSX', createExtension: () => javascript({ typescript: true, jsx: true }) },
  { id: 'rust', label: 'Rust', createExtension: () => rust() },
  { id: 'go', label: 'Go', createExtension: () => go() },
  { id: 'java', label: 'Java', createExtension: () => java() },
  { id: 'shell', label: 'Bash / Shell', createExtension: () => StreamLanguage.define(shell) },
  { id: 'powershell', label: 'PowerShell', createExtension: () => StreamLanguage.define(powerShell) },
  { id: 'html', label: 'HTML', createExtension: () => html() },
  { id: 'css', label: 'CSS', createExtension: () => css() },
  { id: 'json', label: 'JSON', createExtension: () => json() },
  { id: 'yaml', label: 'YAML', createExtension: () => yaml() },
  { id: 'toml', label: 'TOML', createExtension: () => StreamLanguage.define(toml) },
  { id: 'xml', label: 'XML', createExtension: () => xml() },
  { id: 'markdown', label: 'Markdown', createExtension: () => markdown() },
  { id: 'makefile', label: 'Makefile', createExtension: () => StreamLanguage.define(shell) },
  { id: 'dockerfile', label: 'Dockerfile', createExtension: () => StreamLanguage.define(dockerFile) },
  { id: 'ini', label: 'INI / Config', createExtension: () => StreamLanguage.define(properties) },
  { id: 'diff', label: 'Diff / Patch', createExtension: () => StreamLanguage.define(diff) },
];

const LANGUAGE_MAP = new Map<string, LanguageDefinition>(
  LANGUAGE_DEFINITIONS.map((def) => [def.id, def]),
);

export function registerLanguage(definition: LanguageDefinition): void {
  LANGUAGE_MAP.set(definition.id, definition);
}

export function getLanguageExtension(languageId: string): Extension | LanguageSupport {
  const def = LANGUAGE_MAP.get(languageId);
  return def ? def.createExtension() : [];
}

export function getLanguageLabel(languageId: string): string {
  return LANGUAGE_MAP.get(languageId)?.label ?? 'Plain Text';
}

export function listSupportedLanguages(): Array<{ id: string; label: string }> {
  return Array.from(LANGUAGE_MAP.values()).map(({ id, label }) => ({ id, label }));
}
