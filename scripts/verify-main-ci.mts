import { execFileSync } from 'node:child_process';

const requiredJobs = [
  'Lint, test, and build (Node.js 24)',
  'Lint, test, and build (Node.js 26)',
  'Integration tests (success)',
  'Integration tests (failure)',
  'Test external WireGuard peer',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getResponse(endpoint: string, fields: string[]): Record<string, unknown> {
  const args = ['api', '--method', 'GET', endpoint];
  for (const field of fields) {
    args.push('-f', field);
  }
  const response: unknown = JSON.parse(execFileSync('gh', args, { encoding: 'utf8' }));
  if (!isRecord(response)) {
    throw new Error('GitHub returned an invalid response.');
  }
  return response;
}

function getItems(response: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const items = response[key];
  if (
    !Array.isArray(items) ||
    !items.every(isRecord) ||
    typeof response.total_count !== 'number' ||
    !Number.isSafeInteger(response.total_count) ||
    response.total_count !== items.length
  ) {
    throw new Error(`GitHub returned an incomplete or invalid ${key} response.`);
  }
  return items;
}

const repository = process.env.GITHUB_REPOSITORY ?? '';
const sha = process.env.GITHUB_SHA ?? '';
if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository) || !/^[0-9a-f]{40}$/.test(sha)) {
  throw new Error('A valid GitHub repository and commit SHA are required.');
}

const workflow = '.github/workflows/build-and-test.yaml';
const runs = getItems(
  getResponse(`repos/${repository}/actions/workflows/build-and-test.yaml/runs`, [
    'branch=main',
    'event=push',
    `head_sha=${sha}`,
    'per_page=100',
  ]),
  'workflow_runs',
);
if (
  runs.length === 0 ||
  runs.some(
    (run) =>
      run.head_sha !== sha ||
      run.head_branch !== 'main' ||
      run.event !== 'push' ||
      run.path !== workflow ||
      typeof run.run_number !== 'number' ||
      !Number.isSafeInteger(run.run_number) ||
      run.run_number < 1,
  )
) {
  throw new Error('No valid main CI run was found for this commit.');
}

const latest = runs.reduce((newest, run) =>
  Number(run.run_number) > Number(newest.run_number) ? run : newest,
);
if (
  latest.status !== 'completed' ||
  latest.conclusion !== 'success' ||
  typeof latest.id !== 'number' ||
  !Number.isSafeInteger(latest.id) ||
  latest.id < 1 ||
  typeof latest.run_attempt !== 'number' ||
  !Number.isSafeInteger(latest.run_attempt) ||
  latest.run_attempt < 1
) {
  throw new Error('The latest main CI run for this commit has not succeeded.');
}

const jobs = getItems(
  getResponse(`repos/${repository}/actions/runs/${latest.id}/jobs`, ['filter=all', 'per_page=100']),
  'jobs',
);
for (const name of requiredJobs) {
  const matches = jobs.filter((job) => job.name === name);
  if (
    matches.length === 0 ||
    matches.some(
      (job) =>
        job.head_sha !== sha ||
        job.run_id !== latest.id ||
        typeof job.run_attempt !== 'number' ||
        !Number.isSafeInteger(job.run_attempt) ||
        job.run_attempt < 1 ||
        job.run_attempt > Number(latest.run_attempt),
    )
  ) {
    throw new Error(`The required main CI job has invalid results: ${name}.`);
  }
  const newestAttempt = Math.max(...matches.map((job) => Number(job.run_attempt)));
  const newest = matches.filter((job) => job.run_attempt === newestAttempt);
  if (
    newest.length !== 1 ||
    newest[0].status !== 'completed' ||
    newest[0].conclusion !== 'success'
  ) {
    throw new Error(`The required main CI job did not succeed: ${name}.`);
  }
}

console.log(`Verified main CI run ${latest.id} for the release commit.`);
