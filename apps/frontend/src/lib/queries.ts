"use client";

import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "./api";

export const keys = {
  me: ["me"] as const,
  profile: ["profile"] as const,
  preferences: ["preferences"] as const,
  primaryResume: ["resume", "primary"] as const,
  sessions: ["sessions"] as const,
  session: (id: string) => ["session", id] as const,
  versions: ["versions"] as const,
  version: (id: string) => ["version", id] as const,
  activity: (type?: string) => ["activity", type ?? "all"] as const,
  recent: ["sessions", "recent"] as const,
};

export const useMe = () =>
  useQuery({ queryKey: keys.me, queryFn: () => unwrap(api.GET("/v1/me")),
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

export const useProfile = () =>
  useQuery({ queryKey: keys.profile, queryFn: () => unwrap(api.GET("/v1/me/profile")) });

export const usePreferences = () =>
  useQuery({ queryKey: keys.preferences, queryFn: () => unwrap(api.GET("/v1/me/preferences")) });

export const usePrimaryResume = (enabled = true) =>
  useQuery({
    queryKey: keys.primaryResume,
    queryFn: () => unwrap(api.GET("/v1/resumes/primary")),
    enabled,
    retry: false,
  });

export const useVersions = () =>
  useQuery({ queryKey: keys.versions, queryFn: () => unwrap(api.GET("/v1/versions")) });
