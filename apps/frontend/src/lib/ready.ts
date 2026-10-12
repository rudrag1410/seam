/** Tiny "the app has its first data" signal. The shell marks it; the splash waits on it. */
let ready = false;
const waiting = new Set<() => void>();

export function markAppReady() {
  ready = true;
  for (const resolve of waiting) resolve();
  waiting.clear();
}

export function whenAppReady(): Promise<void> {
  return ready ? Promise.resolve() : new Promise((resolve) => waiting.add(resolve));
}
