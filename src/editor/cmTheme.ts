import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import type { EditorTheme } from '@shared/types/theme';

export function buildCodeMirrorTheme(theme: EditorTheme): Extension {
  const c = theme.colors;
  const s = theme.syntax;

  const baseTheme = EditorView.theme(
    {
      '&': {
        backgroundColor: c.background,
        color: c.foreground,
        height: '100%',
      },
      '.cm-scroller': {
        zIndex: 0,
        isolation: 'isolate',
      },
      '.cm-content': {
        caretColor: c.cursor,
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: c.cursor,
        borderLeftWidth: '2px',
      },
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        {
          backgroundColor: c.selection,
        },
      '.cm-activeLine': {
        backgroundColor: `color-mix(in srgb, ${c.activeLine} 55%, transparent)`,
      },
      '.cm-gutters': {
        backgroundColor: c.gutterBg,
        color: c.gutterText,
        borderRight: '1px solid var(--border-color)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: c.activeLine,
        color: c.gutterActiveText,
      },
      '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
        backgroundColor: c.matchingBracket,
        outline: '1px solid var(--accent-color)',
      },
      '.cm-searchMatch': {
        backgroundColor: 'rgba(245, 158, 11, 0.25)',
        outline: '1px solid rgba(245, 158, 11, 0.5)',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'rgba(79, 143, 247, 0.35)',
        outline: '1px solid var(--accent-color)',
      },
    },
    { dark: theme.mode === 'dark' },
  );

  const highlightStyle = HighlightStyle.define([
    { tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword], color: s.keyword },
    { tag: [tags.string, tags.special(tags.string)], color: s.string },
    { tag: [tags.comment, tags.lineComment, tags.blockComment], color: s.comment, fontStyle: 'italic' },
    { tag: [tags.number, tags.integer, tags.float, tags.bool, tags.null], color: s.number },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: s.function },
    { tag: [tags.typeName, tags.className, tags.namespace], color: s.type },
    { tag: [tags.variableName, tags.definition(tags.variableName)], color: s.variable },
    { tag: [tags.operator, tags.punctuation], color: s.operator },
    { tag: [tags.propertyName, tags.attributeName], color: s.property },
    { tag: [tags.tagName], color: s.tag },
    { tag: [tags.meta, tags.processingInstruction], color: s.meta },
    { tag: tags.heading, color: s.function, fontWeight: 'bold' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strong, fontWeight: 'bold' },
    { tag: tags.link, color: s.function, textDecoration: 'underline' },
  ]);

  return [baseTheme, syntaxHighlighting(highlightStyle)];
}
