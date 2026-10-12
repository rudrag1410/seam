"use client";

import { Badge, cn } from "@seam/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { ErrorState } from "@/components/feedback/states";
import { API_URL } from "@/lib/env";
import { formatBytes, plural } from "@/lib/format";
import { keys } from "@/lib/queries";
import { ApiException } from "@/lib/api";
import { handleUnauthorized } from "@/lib/session";
import { ClientErrorCode, ParsePath, type ResumeOut } from "@seam/api-client";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

function clientError(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "pdf" && ext !== "docx") return `That's a .${ext ?? "unknown"} file. Upload a PDF or DOCX.`;
  if (file.size > MAX_BYTES) return `That file is ${formatBytes(file.size)}. The limit is 5 MB.`;
  if (file.size === 0) return "That file is empty.";
  return null;
}

async function uploadResume(file: File): Promise<ResumeOut> {
  const form = new FormData();
  form.append("file", file);
  // multipart: use fetch directly, the typed client serialises JSON
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/resumes`, { method: "POST", body: form, credentials: "include" });
  } catch {
    throw new ApiException(0, { code: ClientErrorCode.Network, message: "We couldn't reach the server.", retryable: true });
  }
  const body = await res.json();
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new ApiException(res.status, body.error);
  return body as ResumeOut;
}

export function summarize(resume: ResumeOut) {
  const roles = resume.document.sections.find((s) => s.type === "experience");
  const skills = resume.document.sections.find((s) => s.type === "skills");
  const bullets = roles && "items" in roles ? roles.items.reduce((n, i) => n + ("bullets" in i ? i.bullets.length : 0), 0) : 0;
  return {
    roles: roles && "items" in roles ? roles.items.length : 0,
    bullets,
    skills: skills && "groups" in skills ? skills.groups.reduce((n, g) => n + g.items.length, 0) : 0,
  };
}

interface ResumeCardProps {
  resume: ResumeOut;
}

export function ResumeCard({ resume }: ResumeCardProps) {
  const s = summarize(resume);
  return (
    <div className="flex min-h-[78px] items-center gap-4 rounded-[16px] border border-line bg-panel p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cream">
        <FileText className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{resume.filename ?? "Resume"}</p>
        <p className="text-[13px] text-ink-muted">
          {resume.size_bytes != null && formatBytes(resume.size_bytes)}
          {resume.page_count != null && ` · ${plural(resume.page_count, "page")}`}
          {` · ${plural(s.roles, "role")}, ${plural(s.bullets, "bullet")}, ${plural(s.skills, "skill")} found`}
        </p>
      </div>
      {resume.parse_path === ParsePath.Vision && <Badge tone="yellow">Read as image</Badge>}
      {resume.parse_path === ParsePath.Basic && (
        <Badge tone="yellow" title="Read without AI. Check the details look right.">
          Basic read
        </Badge>
      )}
    </div>
  );
}

interface DropzoneProps {
  onUploaded?: (r: ResumeOut) => void;
  compact?: boolean;
}

export function Dropzone({ onUploaded, compact = false }: DropzoneProps) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const problem = clientError(file);
      if (problem) throw new ApiException(0, { code: ClientErrorCode.Validation, message: problem });
      return uploadResume(file);
    },
    onSuccess: (resume) => {
      qc.setQueryData(keys.primaryResume, resume);
      qc.invalidateQueries({ queryKey: keys.me });
      onUploaded?.(resume);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: TYPES,
    multiple: false,
    noClick: false,
    // accept everything and validate ourselves, so the user gets a specific message
    validator: () => null,
    onDrop: (accepted, rejected) => {
      const file = accepted[0] ?? rejected[0]?.file;
      if (file) mutation.mutate(file);
    },
  });
  // react-dropzone's `accept` filters in the picker only; drops go through onDrop validation above.
  const busy = mutation.isPending;

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-line-strong bg-panel text-center transition-colors hover:border-ink",
          compact ? "px-6 py-8" : "px-6 py-14",
          isDragActive && "border-ink bg-cream",
        )}
      >
        <input {...getInputProps()} aria-label="Upload resume" />
        {busy ? (
          <>
            <Loader2 className="size-6 animate-spin" aria-hidden />
            <p className="font-medium">Reading your resume…</p>
            <p className="text-sm text-ink-muted">This takes a few seconds.</p>
          </>
        ) : (
          <>
            <UploadCloud className="size-6 text-ink-muted" aria-hidden />
            <p className="font-medium">{isDragActive ? "Drop it here" : "Drag your resume here, or click to browse"}</p>
            <p className="text-sm text-ink-muted">PDF or DOCX, up to 5 MB.</p>
          </>
        )}
      </div>
      {mutation.isError && <ErrorState error={mutation.error} />}
    </div>
  );
}

