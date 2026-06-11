"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { BrandMark } from "@/components/BrandMark";

type Mode = "login" | "signup";

export function AuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignup = mode === "signup";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Surface any error handed back by the OAuth callback route (?error=...).
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Claim any workspace invites addressed to this user's email. Best-effort:
  // failures here must not block sign-in.
  async function claimInvites() {
    try {
      await fetch("/api/invites/accept", { method: "POST" });
    } catch {
      /* ignore — user can still use the app */
    }
  }

  // Kick off the custom server-side OAuth flow (reads client id/secret from the
  // app's .env). The /api/oauth/:provider route redirects to the provider and
  // back to /api/oauth/:provider/callback, which establishes the session.
  function handleOAuth(provider: "google" | "github") {
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";
    window.location.href = `/api/auth/signin/${provider}?redirectTo=${encodeURIComponent(redirectTo)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        // If email confirmation is disabled we get a session immediately.
        if (data.session) {
          await claimInvites();
          router.replace("/dashboard");
          router.refresh();
        } else {
          setInfo("Check your email to confirm your account, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        await claimInvites();
        const redirectTo = searchParams.get("redirectTo") || "/dashboard";
        router.replace(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper variant="outlined" sx={{ p: 4, width: "100%", maxWidth: 400 }}>
        <Stack spacing={3}>
          <Stack spacing={1} alignItems="flex-start">
            <BrandMark />
            <Typography variant="h2">
              {isSignup ? "Create your account" : "Welcome back"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isSignup
                ? "Start managing projects in minutes."
                : "Sign in to your Prismora workspace."}
            </Typography>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {info && <Alert severity="success">{info}</Alert>}

          <Stack spacing={1}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<GoogleIcon />}
              onClick={() => handleOAuth("google")}
              sx={{ color: "text.primary", borderColor: "divider" }}
            >
              Continue with Google
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<GitHubIcon />}
              onClick={() => handleOAuth("github")}
              sx={{ color: "text.primary", borderColor: "divider" }}
            >
              Continue with GitHub
            </Button>
          </Stack>

          <Divider sx={{ "&::before, &::after": { borderColor: "divider" } }}>
            <Typography variant="caption" color="text.secondary">
              or
            </Typography>
          </Divider>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {isSignup && (
                <TextField
                  label="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  fullWidth
                />
              )}
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                autoComplete="email"
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                inputProps={{ minLength: 6 }}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
              <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
                {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
              </Button>
            </Stack>
          </form>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href="/login" style={{ color: "#2563eb", fontWeight: 600 }}>
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to Prismora?{" "}
                <Link href="/signup" style={{ color: "#2563eb", fontWeight: 600 }}>
                  Create an account
                </Link>
              </>
            )}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
