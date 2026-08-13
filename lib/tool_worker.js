const { execFile } = require('child_process');

function runCommand(command, timeout = 10000) {
  return new Promise((resolve, reject) => {
    execFile('/bin/sh', ['-lc', command], { timeout, encoding: 'utf8', maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr.trim() || error.message));
      resolve(stdout);
    });
  });
}

module.exports = { runCommand };
