"use client";

import { Badge, cn } from "@seam/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import { ErrorState } from "@/components/feedback/states";
import { API_URL } from "@/lib/env";
import { formatBytes, plural } from "@/lib/format";
import { keys } from "@/lib/queries";
import { ApiException } from "@/lib/api";
import { handleUnauthorized } from "@/lib/session";
import { readingStatus, useElapsedSeconds } from "./useElapsed";
import { ClientErrorCode, ParsePath, type ResumeOut } from "@seam/api-client";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

function clientError(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "pdf" && ext !== "docx")
    return `That's a .${ext ?? "unknown"} file. Upload a PDF or DOCX.`;
  if (file.size > MAX_BYTES) return `That file is ${formatBytes(file.size)}. The limit is 5 MB.`;
  if (file.size === 0) return "That file is empty.";
  return null;
}

async function uploadResume(file: File): Promise<ResumeOut> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/resumes`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
  } catch {
    throw new ApiException(0, {
      code: ClientErrorCode.Network,
      message: "We couldn't reach the server.",
      retryable: true,
    });
  }
  const body = await res.json();
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new ApiException(res.status, body.error);
  return body as ResumeOut;
}

function summarize(resume: ResumeOut) {
  const roles = resume.document.sections.find((s) => s.type === "experience");
  const skills = resume.document.sections.find((s) => s.type === "skills");
  const bullets =
    roles && "items" in roles
      ? roles.items.reduce((n, i) => n + ("bullets" in i ? i.bullets.length : 0), 0)
      : 0;
  return {
    roles: roles && "items" in roles ? roles.items.length : 0,
    bullets,
    skills:
      skills && "groups" in skills ? skills.groups.reduce((n, g) => n + g.items.length, 0) : 0,
  };
}

interface ResumeCardProps {
  resume: ResumeOut;
  action?: ReactNode;
}

function fileLabel(filename: string | null | undefined): string {
  return (filename?.split(".").pop() ?? "file").slice(0, 4).toUpperCase();
}

interface StatProps {
  value: number;
  noun: string;
}

function Stat({ value, noun }: StatProps) {
  return (
    <span className="tabular rounded-full bg-cream px-2.5 py-1 text-[12px] text-ink-soft">
      <span className="font-medium text-ink">{value}</span> {value === 1 ? noun : `${noun}s`}
    </span>
  );
}

export function ResumeCard({ resume, action }: ResumeCardProps) {
  const s = summarize(resume);
  const meta = [
    resume.size_bytes != null && formatBytes(resume.size_bytes),
    resume.page_count != null && plural(resume.page_count, "page"),
  ].filter(Boolean);
  return (
    <div className="rounded-[16px] border border-line bg-panel p-4">
      <div className="flex items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-cream text-[11px] font-semibold tracking-wide text-ink-soft">
          {fileLabel(resume.filename)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{resume.filename ?? "Resume"}</p>
          <p className="text-[13px] text-ink-muted">{meta.join(" · ")}</p>
        </div>
        {action}
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-3.5">
        <Stat value={s.roles} noun="role" />
        <Stat value={s.bullets} noun="bullet" />
        <Stat value={s.skills} noun="skill" />
        {resume.parse_path === ParsePath.Vision && <Badge tone="yellow">Read as image</Badge>}
        {resume.parse_path === ParsePath.Basic && (
          <Badge tone="yellow" title="Read without AI. Check the details look right.">
            Basic read
          </Badge>
        )}
      </div>
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
      if (problem)
        throw new ApiException(0, { code: ClientErrorCode.Validation, message: problem });
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
    validator: () => null,
    onDrop: (accepted, rejected) => {
      const file = accepted[0] ?? rejected[0]?.file;
      if (file) mutation.mutate(file);
    },
  });
  const busy = mutation.isPending;
  const status = readingStatus(useElapsedSeconds(busy));

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
            <p className="font-medium">{status.title}</p>
            <p className="text-sm text-ink-muted">{status.detail}</p>
          </>
        ) : (
          <>
            <UploadCloud className="size-6 text-ink-muted" aria-hidden />
            <p className="font-medium">
              {isDragActive ? "Drop it here" : "Drag your resume here, or click to browse"}
            </p>
            <p className="text-sm text-ink-muted">PDF or DOCX, up to 5 MB.</p>
          </>
        )}
      </div>
      {mutation.isError && <ErrorState error={mutation.error} />}
    </div>
  );
}
