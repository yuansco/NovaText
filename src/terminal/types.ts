/**
 * Reserved module interfaces for Phase 3 xterm.js Terminal integration.
 */
export interface TerminalSession {
  id: string;
  title: string;
  shellProfile: string;
  cwd: string;
}

export interface ITerminalService {
  createSession: (profile?: string, cwd?: string) => Promise<TerminalSession>;
  write: (sessionId: string, data: string) => void;
  resize: (sessionId: string, cols: number, rows: number) => void;
  dispose: (sessionId: string) => void;
}
