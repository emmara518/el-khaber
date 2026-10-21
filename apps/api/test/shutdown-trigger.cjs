/**
 * Windows-only signal trigger for the graceful-shutdown subprocess test.
 *
 * Windows does not deliver POSIX signals to child processes, so the parent
 * writes the signal name to stdin and this preload emits the process event
 * that Nest's shutdown-hook listener registered. The real POSIX signal path
 * runs unchanged on Linux CI and is the authoritative check.
 */
process.stdin.once('data', (chunk) => {
  const signal = chunk.toString().trim();
  if (signal === 'SIGTERM' || signal === 'SIGINT') {
    process.emit(signal);
  }
});
