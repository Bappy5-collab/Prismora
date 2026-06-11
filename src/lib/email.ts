import "server-only";

import nodemailer from "nodemailer";

// ─────────────────────────────────────────────────────────────────────────────
// Prismora transactional email — SMTP via Nodemailer.
// Configure with env vars (see .env.local.example):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, EMAIL_FROM
// If SMTP is not configured the senders become a safe no-op (logged, never
// thrown) so the app keeps working in dev without an SMTP account.
// ─────────────────────────────────────────────────────────────────────────────

const HOST = process.env.SMTP_HOST;
const PORT = Number(process.env.SMTP_PORT ?? 587);
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const SECURE = process.env.SMTP_SECURE === "true" || PORT === 465;
const FROM = process.env.EMAIL_FROM || (USER ? `Prismora <${USER}>` : "Prismora <no-reply@prismora.app>");

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "http://localhost:3000";

// Hosted logo for email headers. Email clients (Gmail/Outlook) can't render the
// app's inline SVG glyph or data-URIs, so we serve a baked PNG from /public.
// Must be an absolute URL — built from the canonical SITE_URL.
export const LOGO_URL = `${SITE_URL}/prismora-logo.png`;

export const isEmailConfigured = Boolean(HOST && USER && PASS);

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!isEmailConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: SECURE,
      auth: { user: USER, pass: PASS },
    });
  }
  return transporter;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const tx = getTransporter();
  if (!tx) {
    console.warn(`[email] SMTP not configured — skipped "${opts.subject}" → ${opts.to}`);
    return { sent: false, skipped: true };
  }
  try {
    await tx.sendMail({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? htmlToText(opts.html),
    });
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "send failed";
    console.error(`[email] failed "${opts.subject}" → ${opts.to}: ${msg}`);
    return { sent: false, error: msg };
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Branded, email-client-safe layout (table-based, inline styles) ───────────
const BLUE = "#2563eb";
const INK = "#111827";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const BG = "#f9fafb";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

function layout(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
}): string {
  const { preheader, heading, bodyHtml, ctaLabel, ctaUrl, footnote } = opts;
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:${BG};">
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;"><img src="${LOGO_URL}" width="30" height="30" alt="Prismora" style="display:block;border:0;border-radius:8px;" /></td>
              <td style="padding-left:10px;font-size:17px;font-weight:700;color:${INK};letter-spacing:-0.3px;vertical-align:middle;">Prismora</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:24px 32px 8px;">
            <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:${INK};letter-spacing:-0.4px;">${escapeHtml(heading)}</h1>
            <div style="font-size:15px;line-height:1.6;color:${MUTED};">${bodyHtml}</div>
          </td></tr>
          ${
            ctaLabel && ctaUrl
              ? `<tr><td style="padding:8px 32px 4px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BLUE};">
              <a href="${ctaUrl}" style="display:inline-block;padding:11px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(ctaLabel)}</a>
            </td></tr></table>
          </td></tr>`
              : ""
          }
          <tr><td style="padding:20px 32px 28px;">
            ${footnote ? `<p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">${footnote}</p>` : ""}
          </td></tr>
        </table>
        <p style="margin:18px 0 0;font-size:12px;color:${MUTED};">© ${new Date().getFullYear()} Prismora · AI-powered project management</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

// ── Template builders ────────────────────────────────────────────────────────
export function inviteEmail(input: {
  inviterName: string;
  workspaceName: string;
  acceptUrl: string;
}): { subject: string; html: string } {
  const inviter = escapeHtml(input.inviterName);
  const ws = escapeHtml(input.workspaceName);
  return {
    subject: `${input.inviterName} invited you to ${input.workspaceName} on Prismora`,
    html: layout({
      preheader: `Join ${input.workspaceName} on Prismora.`,
      heading: `You've been invited to ${input.workspaceName}`,
      bodyHtml: `<strong style="color:${INK};">${inviter}</strong> has invited you to collaborate in the <strong style="color:${INK};">${ws}</strong> workspace on Prismora — projects, tasks and real-time teamwork in one place.`,
      ctaLabel: "Accept invitation",
      ctaUrl: input.acceptUrl,
      footnote: `Sign up or sign in with this email address and you'll join ${ws} automatically. If you didn't expect this, you can ignore this email.`,
    }),
  };
}

export function taskAssignedEmail(input: {
  assigneeName: string;
  taskTitle: string;
  projectName: string;
  workspaceName: string;
  taskUrl: string;
}): { subject: string; html: string } {
  const title = escapeHtml(input.taskTitle);
  const project = escapeHtml(input.projectName);
  const ws = escapeHtml(input.workspaceName);
  const who = escapeHtml(input.assigneeName);
  return {
    subject: `New task assigned: ${input.taskTitle}`,
    html: layout({
      preheader: `${input.taskTitle} was assigned to you in ${input.projectName}.`,
      heading: "A task was assigned to you",
      bodyHtml: `Hi ${who}, you've been assigned a new task in <strong style="color:${INK};">${project}</strong> (${ws}):<br><br><span style="display:inline-block;padding:10px 14px;background:${BG};border:1px solid ${BORDER};border-radius:8px;color:${INK};font-weight:600;">${title}</span>`,
      ctaLabel: "View task",
      ctaUrl: input.taskUrl,
      footnote: "You're receiving this because you were assigned this task in Prismora.",
    }),
  };
}

export function welcomeEmail(input: {
  name: string;
  appUrl: string;
}): { subject: string; html: string } {
  const who = escapeHtml(input.name || "there");
  return {
    subject: "Welcome to Prismora 🎉",
    html: layout({
      preheader: "Your Prismora workspace is ready.",
      heading: `Welcome to Prismora, ${who}!`,
      bodyHtml: `Your account is all set. Prismora brings projects, tasks, analytics, time tracking and real-time collaboration into one clean workspace — with AI that handles the busywork.<br><br>Jump in and create your first project, invite your team, and let AI break down the work for you.`,
      ctaLabel: "Open your dashboard",
      ctaUrl: input.appUrl,
      footnote: "Need help getting started? Just reply to this email.",
    }),
  };
}

// Sent when someone signs up with email + password, before their account is
// active. The CTA link confirms their address and signs them in.
//
// This one gets a dedicated, premium layout (gradient hero + icon badge +
// copy-paste fallback link) rather than the generic template.
export function confirmEmail(input: {
  name: string;
  confirmUrl: string;
}): { subject: string; html: string } {
  const who = escapeHtml(input.name || "there");
  const url = input.confirmUrl;
  const urlAttr = url.replace(/&/g, "&amp;"); // valid in href
  const urlText = escapeHtml(url);
  const GRAD_FROM = "#4f46e5"; // indigo
  const GRAD_TO = "#2563eb"; // blue

  return {
    subject: "Confirm your Prismora account ✨",
    html: `<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:${BG};">
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">Confirm your email to activate your Prismora account.</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(17,24,39,0.06);">

          <!-- Gradient hero -->
          <tr><td style="background:${GRAD_TO};background-image:linear-gradient(135deg,${GRAD_FROM} 0%,${GRAD_TO} 100%);padding:36px 32px 30px;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
              <td style="vertical-align:middle;"><img src="${LOGO_URL}" width="28" height="28" alt="Prismora" style="display:block;border:0;border-radius:8px;" /></td>
              <td style="padding-left:10px;font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;vertical-align:middle;">Prismora</td>
            </tr></table>
            <!-- Icon badge -->
            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin-top:22px;"><tr>
              <td style="width:72px;height:72px;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.35);border-radius:50%;text-align:center;vertical-align:middle;font-size:34px;line-height:72px;">✉️</td>
            </tr></table>
            <h1 style="margin:18px 0 4px;font-size:23px;line-height:1.3;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Confirm your email</h1>
            <p style="margin:0;font-size:14px;line-height:1.5;color:rgba(255,255,255,0.88);">One quick step to activate your account</p>
          </td></tr>

          <!-- Body -->
          <tr><td style="padding:30px 32px 8px;">
            <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${INK};">Hi ${who},</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${MUTED};">Thanks for signing up for <strong style="color:${INK};">Prismora</strong>. Confirm this email address to activate your account and jump into your workspace.</p>

            <!-- Button -->
            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 22px;"><tr>
              <td style="border-radius:10px;background:${GRAD_TO};background-image:linear-gradient(135deg,${GRAD_FROM} 0%,${GRAD_TO} 100%);box-shadow:0 4px 12px rgba(37,99,235,0.35);">
                <a href="${urlAttr}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">Confirm my account →</a>
              </td>
            </tr></table>

            <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${MUTED};text-align:center;">⏱️ This link expires in 24 hours.</p>
          </td></tr>

          <!-- Fallback link -->
          <tr><td style="padding:8px 32px 4px;">
            <div style="border-top:1px solid ${BORDER};padding-top:18px;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${MUTED};">Button not working? Copy and paste this link into your browser:</p>
              <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${urlAttr}" style="color:${GRAD_TO};text-decoration:none;">${urlText}</a></p>
            </div>
          </td></tr>

          <!-- Footer -->
          <tr><td style="padding:22px 32px 28px;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">If you didn't create a Prismora account, you can safely ignore this email — no account will be activated.</p>
          </td></tr>
        </table>
        <p style="margin:18px 0 0;font-size:12px;color:${MUTED};">© ${new Date().getFullYear()} Prismora · AI-powered project management</p>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

// Sent once the user finishes the onboarding wizard.
export function onboardingCompleteEmail(input: {
  name: string;
  appUrl: string;
}): { subject: string; html: string } {
  const who = escapeHtml(input.name || "there");
  return {
    subject: "You're all set on Prismora ✅",
    html: layout({
      preheader: "Your workspace is ready — here's what to do next.",
      heading: `You're all set, ${who}!`,
      bodyHtml: `Your workspace is ready to go. From here you can create projects, assign tasks, track time and collaborate with your team in real time — and let Prismora's AI break the busywork down for you.`,
      ctaLabel: "Go to your dashboard",
      ctaUrl: input.appUrl,
      footnote: "Have a question? Just reply to this email and we'll help.",
    }),
  };
}

// Confirmation that a new workspace was created, sent to the owner.
export function workspaceCreatedEmail(input: {
  name: string;
  workspaceName: string;
  appUrl: string;
}): { subject: string; html: string } {
  const who = escapeHtml(input.name || "there");
  const ws = escapeHtml(input.workspaceName);
  return {
    subject: `Workspace created: ${input.workspaceName}`,
    html: layout({
      preheader: `${input.workspaceName} is ready on Prismora.`,
      heading: `Your workspace is ready`,
      bodyHtml: `Hi ${who}, your new workspace <strong style="color:${INK};">${ws}</strong> has been created. Invite your team, create your first project and start shipping.`,
      ctaLabel: "Open workspace",
      ctaUrl: input.appUrl,
      footnote: "You're receiving this because you created this workspace on Prismora.",
    }),
  };
}

// Security notification sent after a successful password change.
export function passwordChangedEmail(input: {
  name: string;
  appUrl: string;
}): { subject: string; html: string } {
  const who = escapeHtml(input.name || "there");
  return {
    subject: "Your Prismora password was changed",
    html: layout({
      preheader: "Your Prismora password was just changed.",
      heading: "Your password was changed",
      bodyHtml: `Hi ${who}, this is a confirmation that the password for your Prismora account was just changed.<br><br>If this was you, no action is needed. If you did <strong style="color:${INK};">not</strong> make this change, please reset your password immediately and contact support.`,
      ctaLabel: "Review account security",
      ctaUrl: input.appUrl,
      footnote: "For your security, we notify you whenever your password changes.",
    }),
  };
}
