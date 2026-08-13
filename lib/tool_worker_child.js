const { execFile } = require('child_process');

process.once('message', ({ command, timeout }) => {
  execFile('/bin/sh', ['-lc', String(command)], { timeout: Number(timeout), encoding: 'utf8', maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    if (process.send) process.send(error ? { error: stderr.trim() || error.message } : { output: stdout });
  });
});
