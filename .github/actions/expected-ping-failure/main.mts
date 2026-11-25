import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';

const outputFile = process.env.GITHUB_OUTPUT;
if (!outputFile) throw new Error('GITHUB_OUTPUT is required.');

const child = spawn(process.execPath, [join(import.meta.dirname, '../../../dist/main/index.js')], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let expectedErrors = 0;
let unexpectedError = false;
const expectedMessage = /^::error::The process '\/(?:usr\/)?bin\/ping' failed with exit code 1$/;

function forward(input: Readable, output: Writable): void {
  createInterface({ input, crlfDelay: Infinity }).on('line', (line) => {
    if (expectedMessage.test(line)) {
      expectedErrors += 1;
      output.write('The expected test host verification failed.\n');
    } else {
      if (/^::error(?:\s|::)/i.test(line)) unexpectedError = true;
      output.write(`${line}\n`);
    }
  });
}

forward(child.stdout, process.stdout);
forward(child.stderr, process.stderr);

const result = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
  (resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal }));
  },
);
const expected = result.code === 1 && expectedErrors === 1 && !unexpectedError;
appendFileSync(outputFile, `expected-ping-failure=${expected}\n`);
if (result.signal) console.error(`The action bundle was terminated by ${result.signal}.`);
process.exitCode = result.code ?? 1;
