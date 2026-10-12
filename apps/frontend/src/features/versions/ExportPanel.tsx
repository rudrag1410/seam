"use client";

import { Button, Segmented } from "@seam/ui";
import { Download } from "lucide-react";
import { useState } from "react";
import { API_URL } from "@/lib/env";

const FORMATS = [
  { id: "pdf", label: "PDF" },
  { id: "docx", label: "DOCX" },
  { id: "txt", label: "Plain text" },
] as const;

export function ExportPanel({ versionId }: { versionId: string }) {
  const [template, setTemplate] = useState<"classic" | "modern">("classic");
  return (
    <div className="space-y-4">
      <Segmented
        size="sm" aria-label="Template" value={template} onChange={setTemplate}
        options={[{ value: "classic", label: "Classic (serif)" }, { value: "modern", label: "Modern (sans)" }]}
      />
      <div className="flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <a
            key={f.id}
            href={`${API_URL}/v1/versions/${versionId}/export?format=${f.id}&template=${template}`}
            download
            className="inline-flex"
          >
            <Button type="button" variant="secondary" size="sm"><Download className="size-3.5" /> {f.label}</Button>
          </a>
        ))}
      </div>
      <p className="text-xs text-ink-muted">Single column, real headings and selectable text, so applicant tracking systems read it cleanly.</p>
    </div>
  );
}
