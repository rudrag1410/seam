"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Preferences, Profile } from "@seam/api-client";
import { api, unwrap } from "@/lib/api";
import { keys } from "@/lib/queries";


/** The API replaces the whole profile on PUT, so partial forms merge into the cached copy. */
export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const current = qc.getQueryData<Profile>(keys.profile) ?? (await unwrap(api.GET("/v1/me/profile")));
      return unwrap(api.PUT("/v1/me/profile", { body: { ...current, ...patch } }));
    },
    onSuccess: (data) => qc.setQueryData(keys.profile, data),
  });
}

export function useSavePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Preferences) => unwrap(api.PUT("/v1/me/preferences", { body })),
    onSuccess: (data) => qc.setQueryData(keys.preferences, data),
  });
}
