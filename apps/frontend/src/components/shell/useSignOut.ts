"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function useSignOut() {
  const qc = useQueryClient();
  const router = useRouter();
  return async () => {
    await api.POST("/v1/auth/logout");
    qc.clear();
    router.replace("/sign-in");
  };
}
