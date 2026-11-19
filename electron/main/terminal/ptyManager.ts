import { spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import type { Writable } from 'node:stream';
import type { BrowserWindow } from 'electron';
import type { TerminalCreateResult } from '@shared/types/ipc';

interface ActiveTerminal {
  id: string;
  process: ChildProcess;
  resizePipe?: Writable;
  shell: string;
  cwd: string;
}

const sessions = new Map<string, ActiveTerminal>();

function resolveDefaultShell(profile?: string): string {
  if (profile && profile.trim()) {
    return profile.trim();
  }
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'powershell.exe';
  }
  return process.env.SHELL || '/bin/bash';
}

const PYTHON_PTY_BRIDGE = `
import fcntl, os, pty, select, struct, sys, termios
shell = sys.argv[1]
pid, fd = pty.fork()
if pid == 0:
    os.execvp(shell, [shell, "-i"])
else:
    ctrl_fd = 3
    watch_fds = [fd, sys.stdin.fileno(), ctrl_fd]
    while True:
        r, _, _ = select.select(watch_fds, [], [])
        if fd in r:
            try:
                data = os.read(fd, 4096)
                if not data:
                    break
                os.write(sys.stdout.fileno(), data)
            except OSError:
                break
        if sys.stdin.fileno() in r:
            data = os.read(sys.stdin.fileno(), 4096)
            if not data:
                break
            os.write(fd, data)
        if ctrl_fd in r:
            ctrl_data = os.read(ctrl_fd, 256)
            if not ctrl_data:
                watch_fds = [fd, sys.stdin.fileno()]
            else:
                for line in ctrl_data.decode("utf-8", "ignore").splitlines():
                    parts = line.split(",")
                    if len(parts) == 2:
                        try:
                            cols, rows = int(parts[0]), int(parts[1])
                            fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
                        except Exception:
                            pass
`;

export function createTerminalSession(
  getMainWindow: () => BrowserWindow | null,
  profile?: string,
  cwd?: string,
): TerminalCreateResult {
  const sessionId = crypto.randomUUID();
  const shell = resolveDefaultShell(profile);
  const workingDir = cwd && cwd.trim() ? cwd : os.homedir();

  const env = {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
  };

  let child: ChildProcess;
  let resizePipe: Writable | undefined;
  if (process.platform !== 'win32') {
    // Use python3 PTY bridge with fd 3 control pipe for TIOCSWINSZ resize
    child = spawn('python3', ['-c', PYTHON_PTY_BRIDGE, shell], {
      cwd: workingDir,
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
    });
    resizePipe = child.stdio[3] as Writable | undefined;
  } else {
    child = spawn(shell, [], {
      cwd: workingDir,
      env,
      stdio: 'pipe',
    });
  }

  sessions.set(sessionId, {
    id: sessionId,
    process: child,
    resizePipe,
    shell,
    cwd: workingDir,
  });

  const emitData = (chunk: Buffer) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('terminal:data', {
        sessionId,
        data: chunk.toString('utf8'),
      });
    }
  };

  child.stdout?.on('data', emitData);
  child.stderr?.on('data', emitData);

  child.on('exit', (code) => {
    sessions.delete(sessionId);
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('terminal:exit', {
        sessionId,
        exitCode: code,
      });
    }
  });

  child.on('error', (err) => {
    emitData(Buffer.from(`\r\n[Terminal error: ${err.message}]\r\n`));
  });

  return {
    sessionId,
    title: path.basename(shell),
    shell,
    cwd: workingDir,
  };
}

export function writeToTerminalSession(sessionId: string, data: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  if (session.process.stdin && !session.process.stdin.destroyed) {
    session.process.stdin.write(data);
  }
}

export function resizeTerminalSession(sessionId: string, cols: number, rows: number): void {
  const session = sessions.get(sessionId);
  if (!session || !session.resizePipe || session.resizePipe.destroyed) return;
  if (cols > 0 && rows > 0) {
    session.resizePipe.write(`${Math.floor(cols)},${Math.floor(rows)}\n`);
  }
}

export function killTerminalSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.delete(sessionId);
  session.process.kill();
}

export function disposeAllTerminals(): void {
  for (const session of sessions.values()) {
    session.process.kill();
  }
  sessions.clear();
}
