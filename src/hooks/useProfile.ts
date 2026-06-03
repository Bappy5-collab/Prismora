"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changePassword, fetchMyProfile, updateMyProfile } from "@/services/profile";
import type { Profile } from "@/lib/database.types";

export const profileKeys = {
  me: ["profile", "me"] as const,
};

export function useMyProfile() {
  return useQuery({ queryKey: profileKeys.me, queryFn: fetchMyProfile });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Profile, "full_name" | "avatar_url">>) =>
      updateMyProfile(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.me }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (newPassword: string) => changePassword(newPassword),
  });
}
