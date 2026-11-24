# NovaText

**NovaText** is a lightweight, fast, cross-platform developer text editor built for software engineers, firmware engineers, and embedded developers. Rather than replacing a full-featured IDE, NovaText focuses on low resource usage, high information density, and a customizable environment for reading, editing, searching, and terminal workflows.


## Quick Start (Installation)

1. Go to the [NovaText Releases](https://github.com/yuansco/NovaText/releases) page on GitHub.
2. Download the latest `.deb` release package (e.g., `novatext_<version>_amd64.deb`).
3. Install the package via terminal using `dpkg`:

```bash
sudo dpkg -i novatext_*_amd64.deb
```

Once installed, you can launch **NovaText** from your desktop application launcher or run `novatext` directly in your terminal.


## Key Features

### 1. Quick Access Sidebar
- **Pinned Files**: Pin/unpin frequently used files, drag-and-drop to reorder, set custom display aliases via context menu, and see warnings for missing files.
- **Recent Files**: Automatically tracks recently opened files with relative timestamps, deduplicates against pinned files, and supports removing individual entries or clearing history.
- **Flexible UX**: Real-time filter input, resizable width, collapsible panel (`Ctrl+B`), and persisted sidebar state.

### 2. Multi-Tab Editor (CodeMirror 6)
- **Extensible Language Support**: Built-in syntax highlighting for C/C++, Python, JavaScript/TypeScript/JSX/TSX, Rust, Go, Java, Bash/Shell, PowerShell, HTML, CSS, JSON, YAML, TOML, XML, Markdown, Makefile, Dockerfile, INI/Config, Diff/Patch, and Plain Text.
- **Encoding & Line Endings**: Automatic detection and switching for `UTF-8`, `UTF-8 BOM`, `UTF-16LE`, `UTF-16BE`, `Latin1`, and `LF / CRLF` line endings, with atomic file writes.
- **Drag & Drop**: Drag files into the window to open them in new tabs; drag a folder to set it as the workspace and open cross-file search.
- **Safety & Large File Optimization**: Unsaved changes protection when closing tabs or the window, external file change detection with reload banner, and automatic Large File Mode (disabling code folding above 5 MB and syntax highlighting above 10 MB).

### 3. Advanced Search & Replace
- **Incremental Search (`Ctrl+F`)**: Instant live matching and auto-scroll on input, supporting Match Case, Whole Word, Regular Expression, and Multiline Search.
- **Search Results Panel & Replace Preview (`Ctrl+H`)**: Displays line/column numbers, context previews, and regex capture group (`$1`, `$2`) replace previews with click-to-jump navigation.
- **Find in Folder (`Ctrl+Shift+F`)**: Asynchronous cross-file search with folder picker, file extension filters, exclude patterns, and click-to-open navigation.

### 4. Integrated Terminal (`xterm.js`)
- Multiple terminal sessions, **Split View** (side-by-side terminals), and shell profile selection (Default / Bash / Zsh / Sh).
- **Quick Commands Bar**: One-click execution for custom frequent commands, with add/remove support persisted in settings.
- Live PTY window resize synchronization (`TIOCSWINSZ`) when resizing the bottom panel.

### 5. Themes, Scaling, Localization & Shortcuts
- **Decoupled Theme System**: Separate UI Theme and Editor Theme (Dark / Light presets), custom color pickers, and **JSON Theme Import/Export**.
- **Independent Scaling**:
  - `Ctrl + Wheel` (or `Ctrl+=` / `Ctrl+-` / `Ctrl+0`): Adjust editor font size (`8px`–`36px`).
  - `Ctrl + Alt + Wheel` (or via Settings): Adjust application UI scale (`85%`–`200%`).
- **Multi-Language UI**: Switch seamlessly between **English** and **Traditional Chinese (繁體中文)**.
- **Command Palette (`Ctrl+P` / `F1`) & Custom Shortcuts**: Interactive keybinding recorder with conflict detection.


## Tech Stack

- **Desktop Shell**: Electron (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, typed `contextBridge` IPC API)
- **Frontend & State**: React 18 + TypeScript (Strict Mode) + Vite (`electron-vite`) + Zustand + Tailwind CSS + Lucide Icons
- **Editor & Terminal**: CodeMirror 6, `@xterm/xterm`, `iconv-lite`
- **Testing & Quality**: Vitest, ESLint, TypeScript (`tsc --noEmit`)


## Development & Packaging

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Type check, lint, and run unit tests
npm run typecheck
npm run lint
npm test

# Build production bundle
npm run build

# Package Linux .deb installer (output in release/)
npm run pack:deb
```

## Default Keyboard Shortcuts

| Action | Default Shortcut |
| :--- | :--- |
| New File | `Ctrl+N` |
| Open File | `Ctrl+O` |
| Save / Save As | `Ctrl+S` / `Ctrl+Shift+S` |
| Close Active Tab | `Ctrl+W` |
| Switch Previous / Next Tab | `Alt+Left` / `Alt+Right` |
| Find / Replace | `Ctrl+F` / `Ctrl+H` |
| Find in Folder | `Ctrl+Shift+F` |
| Toggle Sidebar | `Ctrl+B` |
| Toggle Terminal | `Ctrl+T` |
| Command Palette | `Ctrl+P` or `F1` |
| Zoom Editor Font In / Out / Reset | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` or `Ctrl+Wheel` |
| Scale Application UI In / Out / Reset | `Ctrl+Shift+=` / `Ctrl+Shift+-` / `Ctrl+Shift+0` or `Ctrl+Alt+Wheel` |
