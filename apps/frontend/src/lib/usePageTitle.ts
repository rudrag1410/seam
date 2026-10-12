"use client";

import { useEffect } from "react";

const SUFFIX = "Seam";

export function usePageTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (title) document.title = `${title} · ${SUFFIX}`;
  }, [title]);
}
