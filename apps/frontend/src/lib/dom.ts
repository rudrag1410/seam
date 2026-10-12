export function listen<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
): () => void;
export function listen(type: string, handler: (event: Event) => void): () => void;
export function listen(type: string, handler: (event: never) => void): () => void {
  window.addEventListener(type, handler as EventListener);
  return () => window.removeEventListener(type, handler as EventListener);
}

export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

export function downloadText(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}
