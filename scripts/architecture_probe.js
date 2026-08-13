const assert = require('assert');
const { runCommand } = require('../lib/tool_worker');

async function main() {
  const started = Date.now();
  const slow = runCommand('sleep 2; printf done', 3000);
  await new Promise(resolve => setTimeout(resolve, 75));
  assert(Date.now() - started < 500, 'Slow tool blocked the API event loop.');
  assert.strictEqual((await slow).trim(), 'done');
  await assert.rejects(() => runCommand('exit 17', 1000));
  assert.strictEqual((await runCommand('printf recovered', 1000)).trim(), 'recovered');
  console.log('ARCHITECTURE_PROBE_OK event_loop_responsive worker_failure_isolated');
}

main().catch(error => { console.error(error); process.exit(1); });
