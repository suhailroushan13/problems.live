import "server-only";

import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { EmailLog } from "@/models";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendInvitationEmail(params: {
  name: string;
  email: string;
  /** The direct sign-in link (Google OAuth `next`-chained to the invite) — clicking it goes straight to the consent screen, no landing page first. */
  inviteUrl: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const text = `Hi ${params.name},\n\nYou’ve been invited to problems.live. Sign in with Google to post your first problem: ${params.inviteUrl}\n\n— The problems.live team`;
  const subject = "You’re invited to problems.live";
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f4f6fb;color:#152033;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:40px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#fff;border:1px solid #e4e8f0;border-radius:16px;overflow:hidden"><tr><td style="padding:24px 40px;background:#152033;color:#fff;font-size:18px;font-weight:700">problems.live</td></tr><tr><td style="padding:40px"><p style="margin:0;color:#5965d8;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Your invitation</p><h1 style="margin:14px 0 0;font-size:30px;line-height:1.2">You&apos;re invited.</h1><p style="margin:20px 0;color:#46556d;font-size:16px;line-height:1.65">Hi ${name}, you&apos;ve been invited to join problems.live. Your account will include five invitations to share with people you trust.</p><a href="${params.inviteUrl}" style="display:inline-block;margin-top:12px;border-radius:8px;background:#5965d8;color:#fff;padding:13px 20px;font-size:15px;font-weight:700;text-decoration:none">Post a problem</a><p style="margin:28px 0 0;color:#7a879b;font-size:12px;line-height:1.5">This invitation is tied to ${escapeHtml(params.email)}. If you weren&apos;t expecting it, you can ignore this email.</p></td></tr></table></td></tr></table></body></html>`;
  const log = await EmailLog.create({ recipient: params.email, subject, text, html, status: "failed" });
  try {
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: env.smtpUser, pass: env.smtpPassword } });
    const sent = await transporter.sendMail({ from: `problems.live <${env.smtpUser}>`, to: params.email, subject, text, html });
    await EmailLog.updateOne({ _id: log._id }, { $set: { status: "sent", providerMessageId: sent.messageId } }).exec();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown email delivery error";
    await EmailLog.updateOne({ _id: log._id }, { $set: { errorMessage: errorMessage.slice(0, 2_000) } }).exec();
    throw error;
  }
}
