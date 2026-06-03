"use client";

import { useEffect, useState } from "react";

// Gravatar derives an avatar image from an email address. Modern Gravatar
// accepts a SHA-256 hash of the lowercased, trimmed email. With `d=identicon`
// it always returns an image (a generated identicon when no Gravatar exists),
// so "image from email" works for everyone.
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function gravatarUrl(email: string, size = 200): Promise<string> {
  const hash = await sha256Hex(email.trim().toLowerCase());
  return `https://gravatar.com/avatar/${hash}?d=identicon&s=${size}`;
}

/**
 * Resolve the avatar to display: an explicit uploaded `avatarUrl` if present,
 * otherwise the Gravatar derived from `email`. Returns undefined until ready.
 */
export function useAvatarSrc(
  email: string | null | undefined,
  avatarUrl: string | null | undefined,
  size = 200
): string | undefined {
  const [gravatar, setGravatar] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (avatarUrl || !email) {
      setGravatar(undefined);
      return;
    }
    gravatarUrl(email, size).then((url) => {
      if (active) setGravatar(url);
    });
    return () => {
      active = false;
    };
  }, [email, avatarUrl, size]);

  return avatarUrl || gravatar;
}
