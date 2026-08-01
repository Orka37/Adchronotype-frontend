const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

const ts = () => new Date().toISOString();

function write(level, ...args) {
  if (!isDev) return;
  console.log(`[${level} ${ts()}]`, ...args);
}

export const log = {
  debug(...args) {
    if (isDev) write('DEBUG', ...args);
  },
  info(...args) {
    if (isDev) write('INFO ', ...args);
  },
  warn(...args) {
    write('WARN ', ...args);
  },
  error(ctx, err) {
    write('ERROR', ctx, {
      message: err?.message || String(err),
      status: err?.response?.status,
      detail: err?.response?.data?.detail,
      stack: err?.stack,
    });
  },
};
