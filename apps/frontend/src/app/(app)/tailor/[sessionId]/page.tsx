"use client";

import { useParams } from "next/navigation";
import { TailorWorkspace } from "@/features/workspace/TailorWorkspace";

export default function TailorSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <TailorWorkspace key={sessionId} initialSessionId={sessionId} />;
}
