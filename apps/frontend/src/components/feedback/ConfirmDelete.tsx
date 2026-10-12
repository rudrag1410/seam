interface ConfirmDeleteProps {
  title: string;
  note: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDelete({ title, note, busy, onConfirm, onCancel }: ConfirmDeleteProps) {
  return (
    <div role="alertdialog" aria-label={`Delete ${title}`} className="rounded-lg bg-cream px-3 py-2">
      <p className="truncate text-[13px] text-ink">Delete “{title}”?</p>
      <p className="text-[11px] text-ink-muted">{note}</p>
      <div className="mt-2 flex gap-1.5">
        <button type="button" disabled={busy} onClick={onConfirm} className="rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-on-ink disabled:opacity-50">
          {busy ? "Deleting…" : "Delete"}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className="rounded-full px-3 py-1 text-[12px] text-ink-soft hover:bg-bg">
          Cancel
        </button>
      </div>
    </div>
  );
}
