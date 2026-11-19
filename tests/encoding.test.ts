import { describe, expect, it } from 'vitest';
import {
  decodeBuffer,
  detectEncoding,
  detectLineEnding,
  encodeString,
  normalizeLineEnding,
} from '../electron/main/file-system/encoding';

describe('encoding utilities', () => {
  it('detects and round-trips UTF-8 without BOM', () => {
    const text = 'Hello NovaText 世界\nLine 2';
    const buf = encodeString(text, 'utf-8');
    expect(detectEncoding(buf)).toBe('utf-8');
    expect(decodeBuffer(buf, 'utf-8')).toBe(text);
  });

  it('detects and round-trips UTF-8 with BOM', () => {
    const text = 'BOM content';
    const buf = encodeString(text, 'utf-8-bom');
    expect(buf[0]).toBe(0xef);
    expect(buf[1]).toBe(0xbb);
    expect(buf[2]).toBe(0xbf);
    expect(detectEncoding(buf)).toBe('utf-8-bom');
    expect(decodeBuffer(buf, 'utf-8-bom')).toBe(text);
  });

  it('detects and round-trips UTF-16LE and UTF-16BE', () => {
    const text = 'Firmware Config 測試';
    const leBuf = encodeString(text, 'utf-16le');
    expect(detectEncoding(leBuf)).toBe('utf-16le');
    expect(decodeBuffer(leBuf, 'utf-16le')).toBe(text);

    const beBuf = encodeString(text, 'utf-16be');
    expect(detectEncoding(beBuf)).toBe('utf-16be');
    expect(decodeBuffer(beBuf, 'utf-16be')).toBe(text);
  });

  it('falls back to latin1 for invalid UTF-8 sequences', () => {
    const raw = Buffer.from([0xff, 0x00, 0xe9]);
    expect(detectEncoding(raw)).toBe('latin1');
  });

  it('detects and normalizes LF and CRLF line endings', () => {
    expect(detectLineEnding('a\nb\nc')).toBe('LF');
    expect(detectLineEnding('a\r\nb\r\nc')).toBe('CRLF');
    expect(normalizeLineEnding('a\r\nb\nc', 'LF')).toBe('a\nb\nc');
    expect(normalizeLineEnding('a\nb\r\nc', 'CRLF')).toBe('a\r\nb\r\nc');
  });
});
