import { atom } from 'nanostores';
import { executeCommandInSandbox } from '~/lib/sandbox-service';
import type { ITerminal } from '~/types/terminal';

const DEFAULT_PROJECT_ID = 'bruxus-dev-project';

export type ExecutionResult = { output: string; exitCode: number } | undefined;

export class BoltShell {
  #projectId = DEFAULT_PROJECT_ID;
  #initialized = false;
  #terminal: ITerminal | undefined = undefined;
  executionState = atom<
    { sessionId: string; active: boolean; executionPrms?: Promise<any>; abort?: () => void } | undefined
  >();

  async ready() {
    // noop — sandbox is ready via HTTP
  }

  async init(terminal?: ITerminal) {
    if (terminal) {
      this.#terminal = terminal;
    }
    this.#initialized = true;
  }

  get terminal() {
    return this.#terminal || null;
  }

  get process() {
    return null;
  }

  async executeCommand(sessionId: string, command: string, _abort?: () => void): Promise<ExecutionResult> {
    const result = await executeCommandInSandbox(this.#projectId, command);
    const output = cleanTerminalOutput(result.output ?? '');
    this.#terminal?.write(output);
    this.#terminal?.write('\r\n');
    return {
      output: result.output ?? '',
      exitCode: result.exitCode ?? 0,
    };
  }

  async getCurrentExecutionResult(): Promise<ExecutionResult> {
    return { output: '', exitCode: 0 };
  }

  async waitTillOscCode(_waitCode: string) {
    return { output: '', exitCode: 0 };
  }
}

export function cleanTerminalOutput(input: string): string {
  const removeOsc = input
    .replace(/\x1b\](\d+;[^\x07\x1b]*|\d+[^\x07\x1b]*)\x07/g, '')
    .replace(/\](\d+;[^\n]*|\d+[^\n]*)/g, '');

  const removeAnsi = removeOsc
    .replace(/\u001b\[[\?]?[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\[[\?]?[0-9;]*[a-zA-Z]/g, '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\u001b/g, '')
    .replace(/\x1b/g, '');

  const cleanNewlines = removeAnsi
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const formatOutput = cleanNewlines
    .replace(/^([~\/][^\n❯]+)❯/m, '$1\n❯')
    .replace(/(?<!^|\n)>/g, '\n>')
    .replace(/(?<!^|\n|\w)(error|failed|warning|Error|Failed|Warning):/g, '\n$1:')
    .replace(/(?<!^|\n|\/)(at\s+(?!async|sync))/g, '\nat ')
    .replace(/\bat\s+async/g, 'at async')
    .replace(/(?<!^|\n)(npm ERR!)/g, '\n$1');

  const cleanSpaces = formatOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return cleanSpaces
    .replace(/\n{3,}/g, '\n\n')
    .replace(/:\s+/g, ': ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\u0000/g, '');
}

export function newBoltShellProcess() {
  return new BoltShell();
}
