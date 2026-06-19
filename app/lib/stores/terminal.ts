import { atom, type WritableAtom } from 'nanostores';
import type { ITerminal } from '~/types/terminal';
import { newBoltShellProcess, cleanTerminalOutput } from '~/utils/shell';
import { coloredText } from '~/utils/terminal';

const DEFAULT_PROJECT_ID = 'bruxus-dev-project';

function getWebSocketUrl() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  if (!backendUrl) {
    console.error('[terminal] VITE_BACKEND_URL is not set. Terminal WebSocket will fail.');
    return `ws://localhost:3000/terminal`;
  }
  const protocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
  const host = backendUrl.replace(/^https?:\/\//, '');
  return `${protocol}://${host}/terminal`;
}

interface SandboxProxy {
  workdir: string;
  sandboxId: string;
  projectId: string;
}

interface TerminalSocket {
  terminal: ITerminal;
  socket: WebSocket;
}

export class TerminalStore {
  #sandboxProxy: Promise<SandboxProxy>;
  #terminals: TerminalSocket[] = [];
  #boltTerminal = newBoltShellProcess();

  showTerminal: WritableAtom<boolean> = import.meta.hot?.data.showTerminal ?? atom(true);

  constructor(sandboxProxyPromise: Promise<SandboxProxy>) {
    this.#sandboxProxy = sandboxProxyPromise;

    if (import.meta.hot) {
      import.meta.hot.data.showTerminal = this.showTerminal;
    }
  }

  get boltTerminal() {
    return this.#boltTerminal;
  }

  toggleTerminal(value?: boolean) {
    this.showTerminal.set(value !== undefined ? value : !this.showTerminal.get());
  }

  async attachBoltTerminal(terminal: ITerminal) {
    try {
      const sandbox = await this.#sandboxProxy;
      await this.#boltTerminal.init();

      const wsUrl = `${getWebSocketUrl()}?projectId=${encodeURIComponent(sandbox.projectId)}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        terminal.write(coloredText.green('Connected to sandbox terminal\n\n'));
      };

      socket.onmessage = (event) => {
        terminal.write(event.data);
      };

      socket.onerror = () => {
        terminal.write(coloredText.red('WebSocket connection error\n\n'));
      };

      socket.onclose = () => {
        terminal.write(coloredText.red('Disconnected from sandbox terminal\n\n'));
      };

      terminal.onData((data) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      });

      this.#terminals.push({ terminal, socket });
    } catch (error: any) {
      terminal.write(coloredText.red('Failed to connect to terminal\n\n') + error.message);
    }
  }

  async attachTerminal(terminal: ITerminal) {
    try {
      const sandbox = await this.#sandboxProxy;

      const wsUrl = `${getWebSocketUrl()}?projectId=${encodeURIComponent(sandbox.projectId)}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        terminal.write(coloredText.green('Connected to sandbox shell\n\n'));
      };

      socket.onmessage = (event) => {
        terminal.write(event.data);
      };

      socket.onerror = () => {
        terminal.write(coloredText.red('WebSocket connection error\n\n'));
      };

      socket.onclose = () => {
        terminal.write(coloredText.red('Disconnected from sandbox shell\n\n'));
      };

      terminal.onData((data) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      });

      this.#terminals.push({ terminal, socket });
    } catch (error: any) {
      terminal.write(coloredText.red('Failed to connect to shell\n\n') + error.message);
    }
  }

  onTerminalResize(cols: number, rows: number) {
    for (const { socket } of this.#terminals) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    }
  }

  async detachTerminal(terminal: ITerminal) {
    const terminalIndex = this.#terminals.findIndex((t) => t.terminal === terminal);

    if (terminalIndex !== -1) {
      const { socket } = this.#terminals[terminalIndex];
      socket.close();
      this.#terminals.splice(terminalIndex, 1);
    }
  }
}
