const { appendFileSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const args = process.argv.slice(2);
appendFileSync(process.env.GH_ARGUMENTS_FILE, `${JSON.stringify(args)}\n`);
const fixture = JSON.parse(readFileSync(join(__dirname, 'responses.json'), 'utf8'));
const scenario = process.env.GH_SCENARIO;

if (scenario === 'api-error') {
  console.error('GitHub API unavailable');
  process.exit(1);
}
if (scenario === 'invalid-response') {
  console.log('{}');
  process.exit(0);
}

if (args[3].endsWith('/runs')) {
  const runs = [fixture.run];
  if (scenario === 'missing-run') runs.pop();
  if (scenario === 'wrong-commit')
    fixture.run.head_sha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  if (scenario === 'pending-run') fixture.run.status = 'in_progress';
  if (scenario === 'failed-run') fixture.run.conclusion = 'failure';
  if (scenario === 'rerun-passed' || scenario === 'rerun-skipped') fixture.run.run_attempt = 2;
  if (scenario === 'latest-failed') {
    runs.push({ ...fixture.run, id: 2, run_number: 2, conclusion: 'failure' });
  }
  const total = scenario === 'truncated-runs' ? 101 : runs.length;
  console.log(JSON.stringify({ total_count: total, workflow_runs: runs }));
} else if (args[3].endsWith('/jobs')) {
  const jobs = fixture.jobs.map((job) => ({
    ...job,
    run_id: 1,
    run_attempt: 1,
    head_sha: fixture.run.head_sha,
  }));
  if (scenario === 'missing-job') jobs.pop();
  if (scenario === 'missing-node-24') jobs.shift();
  if (scenario === 'failed-job') jobs[0].conclusion = 'failure';
  if (scenario === 'skipped-job') jobs[3].conclusion = 'skipped';
  if (scenario === 'duplicate-job') jobs.push(jobs[0]);
  if (scenario === 'rerun-passed') jobs.push({ ...jobs[3], run_attempt: 2 });
  if (scenario === 'rerun-skipped') {
    jobs.push({ ...jobs[3], run_attempt: 2, conclusion: 'skipped' });
  }
  console.log(JSON.stringify({ total_count: jobs.length, jobs }));
} else {
  console.error('Unexpected GitHub API endpoint');
  process.exit(1);
}
