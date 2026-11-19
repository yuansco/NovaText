import iconv from 'iconv-lite';
import type { FileEncoding, LineEnding } from '@shared/types/file';

/**
 * Checks whether a buffer is valid UTF-8 by decoding with fatal TextDecoder.
 */
function isValidUtf8(buffer: Buffer): boolean {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects file encoding from BOM markers and UTF-8 validity.
 */
export function detectEncoding(buffer: Buffer): FileEncoding {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf-8-bom';
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return 'utf-16le';
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return 'utf-16be';
  }
  if (isValidUtf8(buffer)) {
    return 'utf-8';
  }
  return 'latin1';
}

/**
 * Decodes a raw Buffer into a JS string using the specified encoding, stripping BOM if present.
 */
export function decodeBuffer(buffer: Buffer, encoding: FileEncoding): string {
  switch (encoding) {
    case 'utf-8-bom': {
      const slice =
        buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf
          ? buffer.subarray(3)
          : buffer;
      return slice.toString('utf8');
    }
    case 'utf-8':
      return buffer.toString('utf8');
    case 'utf-16le': {
      const slice =
        buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe ? buffer.subarray(2) : buffer;
      return iconv.decode(slice, 'utf-16le');
    }
    case 'utf-16be': {
      const slice =
        buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff ? buffer.subarray(2) : buffer;
      return iconv.decode(slice, 'utf-16be');
    }
    case 'latin1':
      return iconv.decode(buffer, 'latin1');
  }
}

/**
 * Encodes a JS string into a Buffer with the specified encoding (including BOM where applicable).
 */
export function encodeString(content: string, encoding: FileEncoding): Buffer {
  switch (encoding) {
    case 'utf-8-bom':
      return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(content, 'utf8')]);
    case 'utf-8':
      return Buffer.from(content, 'utf8');
    case 'utf-16le':
      return Buffer.concat([Buffer.from([0xff, 0xfe]), iconv.encode(content, 'utf-16le')]);
    case 'utf-16be':
      return Buffer.concat([Buffer.from([0xfe, 0xff]), iconv.encode(content, 'utf-16be')]);
    case 'latin1':
      return iconv.encode(content, 'latin1');
  }
}

/**
 * Detects the predominant line ending in a text string.
 */
export function detectLineEnding(text: string): LineEnding {
  const crlfCount = (text.match(/\r\n/g) ?? []).length;
  const lfCount = (text.match(/(?<!\r)\n/g) ?? []).length;
  return crlfCount > lfCount ? 'CRLF' : 'LF';
}

/**
 * Normalizes all line endings in a string to either LF or CRLF.
 */
export function normalizeLineEnding(text: string, lineEnding: LineEnding): string {
  const lfOnly = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (lineEnding === 'CRLF') {
    return lfOnly.replace(/\n/g, '\r\n');
  }
  return lfOnly;
}
