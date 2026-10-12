const KEY = "seam-jd-draft";

export interface JdDraft {
  text: string;
}

export function loadDraft(): JdDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as JdDraft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: JdDraft) {
  try {
    if (draft.text) sessionStorage.setItem(KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(KEY);
  } catch {}
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
