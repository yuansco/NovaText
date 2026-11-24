export type FileEncoding = 'utf-8' | 'utf-8-bom' | 'utf-16le' | 'utf-16be' | 'latin1';
export type LineEnding = 'LF' | 'CRLF';

export interface FileReadResult {
  filePath: string;
  fileName: string;
  content: string;
  encoding: FileEncoding;
  lineEnding: LineEnding;
  byteSize: number;
  lastModifiedMs: number;
}

export interface FileWriteResult {
  filePath: string;
  fileName: string;
  lastModifiedMs: number;
  byteSize: number;
}

export interface TabDocument {
  id: string;
  filePath: string | null;
  title: string;
  content: string;
  savedContent: string;
  isDirty: boolean;
  encoding: FileEncoding;
  lineEnding: LineEnding;
  languageId: string;
  cursor: {
    line: number;
    col: number;
  };
  scrollTop: number;
  byteSize: number;
  externalChange?: 'modified' | 'deleted' | null;
  isMarkdownPreview?: boolean;
  scrollRatio?: number;
}
