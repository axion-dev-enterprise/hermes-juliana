const path = require('path');
const { fork } = require('child_process');

const MAX_ACTIVE_WORKERS = Number(process.env.TOOL_WORKER_CONCURRENCY || 4);
let activeWorkers = 0;

function runCommand(command, timeout = 10000) {
  if (activeWorkers >= MAX_ACTIVE_WORKERS) return Promise.reject(new Error('Tool worker bulkhead is full. Retry later.'));
  activeWorkers += 1;
  return new Promise((resolve, reject) => {
    const worker = fork(path.join(__dirname, 'tool_worker_child.js'), [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    let settled = false;
    const finish = (error, output) => {
      if (settled) return;
      settled = true;
      activeWorkers -= 1;
      clearTimeout(timer);
      worker.kill('SIGKILL');
      error ? reject(new Error(error)) : resolve(output);
    };
    const timer = setTimeout(() => finish(`Tool worker timed out after ${timeout}ms`), timeout + 250);
    worker.once('message', message => finish(message.error, message.output));
    worker.once('exit', code => { if (!settled) finish(`Tool worker exited unexpectedly (${code}).`); });
    worker.send({ command, timeout });
  });
}

module.exports = { runCommand };
