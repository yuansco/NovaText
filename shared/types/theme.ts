export interface UITheme {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgElevated: string;
    bgSidebar: string;
    bgTabActive: string;
    bgTabInactive: string;
    bgHover: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    danger: string;
    warning: string;
    success: string;
  };
}

export interface EditorTheme {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  colors: {
    background: string;
    foreground: string;
    cursor: string;
    selection: string;
    activeLine: string;
    gutterBg: string;
    gutterText: string;
    gutterActiveText: string;
    matchingBracket: string;
  };
  syntax: {
    keyword: string;
    string: string;
    comment: string;
    number: string;
    function: string;
    type: string;
    variable: string;
    operator: string;
    property: string;
    tag: string;
    meta: string;
  };
}
