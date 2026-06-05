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
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

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
              <td style="width:30px;height:30px;background:${BLUE};border-radius:8px;text-align:center;vertical-align:middle;color:#ffffff;font-weight:700;font-size:15px;">P</td>
              <td style="padding-left:10px;font-size:17px;font-weight:700;color:${INK};letter-spacing:-0.3px;">Prismora</td>
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
