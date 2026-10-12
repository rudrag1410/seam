"use client";

import { ExportFormat, ExportTemplate } from "@seam/api-client";
import { Button, Segmented } from "@seam/ui";
import { Download } from "lucide-react";
import { useState } from "react";
import { API_URL } from "@/lib/env";

const FORMATS = [
  { id: ExportFormat.Pdf, label: "PDF" },
  { id: ExportFormat.Docx, label: "DOCX" },
  { id: ExportFormat.Txt, label: "Plain text" },
];

const TEMPLATES = [
  { value: ExportTemplate.Classic, label: "Classic (serif)" },
  { value: ExportTemplate.Modern, label: "Modern (sans)" },
];

interface ExportPanelProps {
  versionId: string;
}

export function ExportPanel({ versionId }: ExportPanelProps) {
  const [template, setTemplate] = useState<ExportTemplate>(ExportTemplate.Classic);
  return (
    <div className="space-y-4">
      <Segmented
        size="sm"
        aria-label="Template"
        value={template}
        onChange={setTemplate}
        options={TEMPLATES}
      />
      <div className="flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <a
            key={f.id}
            href={`${API_URL}/v1/versions/${versionId}/export?format=${f.id}&template=${template}`}
            download
            className="inline-flex"
          >
            <Button type="button" variant="secondary" size="sm">
              <Download className="size-3.5" /> {f.label}
            </Button>
          </a>
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        Single column, real headings and selectable text, so applicant tracking systems read it
        cleanly.
      </p>
    </div>
  );
}
