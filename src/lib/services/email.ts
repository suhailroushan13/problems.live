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

/**
 * Sends a transactional email for an in-app activity notification. Delivery
 * failures are handled by the notification service so they never undo the
 * comment, vote, or solution that caused the activity.
 */
export async function sendActivityNotificationEmail(params: {
  recipientName: string;
  recipientEmail: string;
  actorName?: string | null;
  action: string;
  problemTitle?: string | null;
  problemUrl?: string | null;
  message?: string | null;
}): Promise<void> {
  const recipientName = escapeHtml(params.recipientName);
  const actorName = params.actorName ? escapeHtml(params.actorName) : null;
  const action = escapeHtml(params.action);
  const problemTitle = params.problemTitle ? escapeHtml(params.problemTitle) : null;
  const message = params.message ? escapeHtml(params.message) : null;
  const problemUrl = params.problemUrl ?? `${env.appUrl}/notifications`;
  const termsUrl = `${env.appUrl}/terms`;
  const privacyUrl = `${env.appUrl}/privacy`;
  const mailingAddress = escapeHtml(env.legalMailingAddress).replaceAll("\n", "<br>");
  const activity = actorName
    ? `<strong style="color:#0f172a">${actorName}</strong> ${action}`
    : action;
  const context = problemTitle
    ? ` on <strong style="color:#0f172a">${problemTitle}</strong>`
    : "";
  const subject = `${params.actorName ? `${params.actorName} ` : ""}${params.action} · problems.live`.slice(0, 200);
  const text = `Hi ${params.recipientName},\n\n${params.actorName ? `${params.actorName} ` : ""}${params.action}${params.problemTitle ? ` on ${params.problemTitle}` : ""}.${params.message ? `\n\n${params.message}` : ""}\n\nView the update: ${problemUrl}\n\nproblems.live\n${env.legalMailingAddress}`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f8fafc">
      <tr>
        <td align="center" style="padding:48px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;margin:0 auto">
            <tr><td style="padding:0 4px 20px;color:#0f172a;font-size:15px;font-weight:700">problems<span style="color:#2563eb">.live</span></td></tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr><td style="padding:36px 36px 0"><p style="margin:0;color:#0f172a;font-size:15px;line-height:24px">Hi ${recipientName},</p><p style="margin:16px 0 0;color:#334155;font-size:15px;line-height:24px">${activity}${context}.</p>${message ? `<p style="margin:16px 0 0;color:#334155;font-size:15px;line-height:24px">${message}</p>` : ""}</td></tr>
                  <tr><td style="padding:24px 36px 32px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#0f172a" style="border-radius:6px"><a href="${problemUrl}" style="display:inline-block;padding:11px 20px;border-radius:6px;color:#ffffff;font-size:14px;font-weight:600;line-height:20px;text-decoration:none">View update</a></td></tr></table></td></tr>
                </table>
              </td>
            </tr>
            <tr><td align="center" style="padding:24px 24px 0;color:#94a3b8;font-size:12px;line-height:19px"><p style="margin:0"><a href="${termsUrl}" style="color:#64748b;text-decoration:underline">Terms &amp; conditions</a><span style="padding:0 7px;color:#cbd5e1">·</span><a href="${privacyUrl}" style="color:#64748b;text-decoration:underline">Privacy policy</a></p><p style="margin:12px 0 0">problems.live<br>${mailingAddress}</p></td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const log = await EmailLog.create({
    recipient: params.recipientEmail,
    subject,
    text,
    html,
    status: "failed",
  });
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.smtpUser, pass: env.smtpPassword },
    });
    const sent = await transporter.sendMail({
      from: `problems.live <${env.smtpUser}>`,
      to: params.recipientEmail,
      replyTo: env.smtpUser,
      subject,
      text,
      html,
    });
    await EmailLog.updateOne(
      { _id: log._id },
      { $set: { status: "sent", providerMessageId: sent.messageId } },
    ).exec();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown email delivery error";
    await EmailLog.updateOne(
      { _id: log._id },
      { $set: { errorMessage: errorMessage.slice(0, 2_000) } },
    ).exec();
    throw error;
  }
}

export async function sendInvitationEmail(params: {
  name: string;
  email: string;
  inviteToken: string;
  /** The direct sign-in link (Google OAuth `next`-chained to the invite) — clicking it goes straight to the consent screen, no landing page first. */
  inviteUrl: string;
  /** Waitlist approvals receive an explicit approval message before the invitation. */
  source?: "invite" | "waitlist";
}): Promise<void> {
  const name = escapeHtml(params.name);
  const recipient = escapeHtml(params.email);
  const termsUrl = `${env.appUrl}/terms`;
  const privacyUrl = `${env.appUrl}/privacy`;
  const mailingAddress = escapeHtml(env.legalMailingAddress).replaceAll("\n", "<br>");
  const isWaitlistApproval = params.source === "waitlist";
  const subject = isWaitlistApproval
    ? "Your waitlist request is approved · problems.live"
    : "Your invitation to problems.live";
  const text = isWaitlistApproval
    ? `Hi ${params.name},\n\nGood news — your waitlist request has been approved.\n\nSign in with the Google account for ${params.email} to join problems.live:\n${params.inviteUrl}\n\nThis is a personal access email. If you did not request access, you can safely ignore it.\n\nTerms: ${termsUrl}\nPrivacy: ${privacyUrl}\n\nproblems.live\n${env.legalMailingAddress}`
    : `Hi ${params.name},\n\nYour personal access to problems.live is ready.\n\nSign in with the Google account for ${params.email} to set up your account:\n${params.inviteUrl}\n\nThis is a personal access email. If you did not request it, you can safely ignore it.\n\nTerms: ${termsUrl}\nPrivacy: ${privacyUrl}\n\nproblems.live\n${env.legalMailingAddress}`;
  const preheader = isWaitlistApproval ? "Your waitlist request has been approved." : "You've been invited to join problems.live.";
  const opening = isWaitlistApproval
    ? "Good news — your waitlist request has been approved."
    : "You&apos;ve been invited to join <strong style=\"color:#0f172a\">problems.live</strong>, a directory of real problems worth solving.";
  const buttonLabel = "Join problems.live";
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f8fafc">
      <tr>
        <td align="center" style="padding:48px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;margin:0 auto">
            <tr>
              <td style="padding:0 4px 20px;color:#0f172a;font-size:15px;font-weight:700;letter-spacing:-0.3px">problems<span style="color:#2563eb">.live</span></td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:36px 36px 0">
                      <p style="margin:0;color:#0f172a;font-size:15px;line-height:24px">Hi ${name},</p>
                      <p style="margin:16px 0 0;color:#334155;font-size:15px;line-height:24px">${opening}</p>
                      <p style="margin:16px 0 0;color:#334155;font-size:15px;line-height:24px">Sign in with the Google account for <strong style="color:#0f172a">${recipient}</strong> to accept and set up your account.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 36px 0">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" bgcolor="#0f172a" style="border-radius:6px">
                            <a href="${params.inviteUrl}" style="display:inline-block;padding:11px 20px;border-radius:6px;color:#ffffff;font-size:14px;font-weight:600;line-height:20px;text-decoration:none">${buttonLabel}</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 36px 32px">
                      <p style="margin:0;color:#64748b;font-size:13px;line-height:21px">This is a personal access email. If you did not request it, you can safely ignore it.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 36px 32px">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0">
                        <tr>
                          <td style="padding-top:20px;color:#94a3b8;font-size:12px;line-height:19px">This access link is personal and should not be forwarded.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 24px 0;color:#94a3b8;font-size:12px;line-height:19px">
                <p style="margin:0"><a href="${termsUrl}" style="color:#64748b;text-decoration:underline">Terms &amp; conditions</a><span style="padding:0 7px;color:#cbd5e1">·</span><a href="${privacyUrl}" style="color:#64748b;text-decoration:underline">Privacy policy</a></p>
                <p style="margin:12px 0 0">problems.live<br>${mailingAddress}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const log = await EmailLog.create({ recipient: params.email, subject, text, html, status: "failed" });
  try {
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: env.smtpUser, pass: env.smtpPassword } });
    const sent = await transporter.sendMail({
      from: `problems.live <${env.smtpUser}>`,
      to: params.email,
      replyTo: env.smtpUser,
      subject,
      text,
      html,
    });
    await EmailLog.updateOne({ _id: log._id }, { $set: { status: "sent", providerMessageId: sent.messageId } }).exec();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown email delivery error";
    await EmailLog.updateOne({ _id: log._id }, { $set: { errorMessage: errorMessage.slice(0, 2_000) } }).exec();
    throw error;
  }
}

/**
 * Notifies the waitlist owner and every configured admin when someone joins,
 * so they don't have to keep the admin panel open to know when to review it.
 * Sent one email per admin so `EmailLog.recipient` stays a single address.
 */
export async function sendWaitlistSignupNotification(params: {
  name: string;
  email: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const signupEmail = escapeHtml(params.email);
  const reviewUrl = `${env.appUrl}/admin/waiting-list`;
  const subject = `New waitlist request — ${params.name}`;
  const text = `New waitlist request\n\nName: ${params.name}\nEmail: ${params.email}\n\nReview and approve: ${reviewUrl}`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">A new waitlist request is ready for your review.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f8fafc">
      <tr>
        <td align="center" style="padding:48px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;margin:0 auto">
            <tr>
              <td style="padding:0 4px 20px;color:#0f172a;font-size:15px;font-weight:700;letter-spacing:-0.3px">problems<span style="color:#2563eb">.live</span></td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:32px 36px 0">
                      <p style="margin:0;color:#0f172a;font-size:15px;line-height:24px">Hello,</p>
                      <p style="margin:16px 0 0;color:#334155;font-size:15px;line-height:24px"><strong style="color:#0f172a">${name}</strong> has requested access to problems.live. Review their request and send an invitation when you&apos;re ready.</p>
                      <p style="margin:16px 0 0;color:#334155;font-size:15px;line-height:24px">Their Google-verified email is <strong style="color:#0f172a">${signupEmail}</strong>.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 36px 0">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" bgcolor="#0f172a" style="border-radius:6px">
                            <a href="${reviewUrl}" style="display:inline-block;padding:11px 20px;border-radius:6px;color:#ffffff;font-size:14px;font-weight:600;line-height:20px;text-decoration:none">Review waitlist request</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 36px 32px">
                      <p style="margin:0;color:#64748b;font-size:13px;line-height:21px">You received this because you administer problems.live.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 36px 32px">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0">
                        <tr>
                          <td style="padding-top:20px;color:#94a3b8;font-size:12px;line-height:19px">This request was submitted through the problems.live waitlist.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 24px 0;color:#94a3b8;font-size:12px;line-height:19px">problems.live</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await Promise.all(
    env.adminNotificationEmails.map((adminEmail) =>
      deliverEmail({
        recipient: adminEmail,
        subject,
        text,
        html,
        logTag: "waitlist",
      }).catch(() => {
        // Already logged and recorded in EmailLog by deliverEmail; one
        // admin's bad inbox must not stop the others from being notified.
      }),
    ),
  );
}

/**
 * Shared transactional-email shell. Table-based and inline-styled throughout
 * (Outlook desktop renders email with Word, not a browser engine — no
 * flexbox/grid, no external stylesheets it will honor), but laid out with the
 * same visual language as the product: one blue accent, slate neutrals, a
 * flat border-driven card (no heavy shadows), generous vertical rhythm.
 */
function brandedEmail(params: {
  subject: string;
  preheader: string;
  /** Small uppercase pill above the heading, e.g. "ACCOUNT CREATED". */
  eyebrow: string;
  heading: string;
  /** Already-escaped paragraph HTML, rendered in order with consistent spacing. */
  paragraphs: string[];
  /** Optional label/value rows, rendered as a bordered definition list below the paragraphs. */
  infoRows?: { label: string; value: string }[];
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const termsUrl = `${env.appUrl}/terms`;
  const privacyUrl = `${env.appUrl}/privacy`;
  const mailingAddress = escapeHtml(env.legalMailingAddress).replaceAll("\n", "<br>");

  const paragraphsHtml = params.paragraphs
    .map(
      (p, index) =>
        `<p style="margin:${index === 0 ? "0" : "16px 0 0"};color:#334155;font-size:15px;line-height:26px">${p}</p>`,
    )
    .join("");

  const infoRowsHtml = params.infoRows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border:1px solid #e2e8f0;border-radius:10px">
        ${params.infoRows
          .map(
            (row, index) =>
              `<tr>
                <td style="padding:13px 18px;${index > 0 ? "border-top:1px solid #e2e8f0;" : ""}font-size:13px;color:#64748b;white-space:nowrap;width:1%">${row.label}</td>
                <td style="padding:13px 18px;${index > 0 ? "border-top:1px solid #e2e8f0;" : ""}font-size:14px;color:#0f172a;font-weight:600;text-align:right">${row.value}</td>
              </tr>`,
          )
          .join("")}
      </table>`
    : "";

  const cta = params.ctaUrl && params.ctaLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px">
        <tr><td align="center" bgcolor="#2563eb" style="border-radius:8px">
          <a href="${params.ctaUrl}" style="display:inline-block;padding:13px 28px;border-radius:8px;color:#ffffff;font-size:15px;font-weight:600;line-height:20px;text-decoration:none">${params.ctaLabel}</a>
        </td></tr>
      </table>`
    : "";

  const footer = params.footerNote
    ? `<tr><td style="padding:20px 44px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0">
          <tr><td style="padding-top:20px;color:#94a3b8;font-size:12.5px;line-height:19px">${params.footerNote}</td></tr>
        </table>
      </td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <title>${params.subject}</title>
    <style>
      @media (max-width: 600px) {
        .pl-outer { padding: 32px 16px !important; }
        .pl-card-pad { padding: 32px 24px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;color:#0f172a;font-family:Figtree,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${params.preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f1f5f9">
      <tr>
        <td align="center" class="pl-outer" style="padding:56px 20px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px;margin:0 auto">
            <tr>
              <td align="center" style="padding-bottom:28px;font-size:17px;font-weight:700;letter-spacing:-0.03em;color:#0f172a">
                problems<span style="color:#2563eb">.live</span>
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="pl-card-pad" style="padding:44px 44px 40px">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr><td bgcolor="#eff6ff" style="border-radius:999px;padding:6px 12px;font-size:11px;font-weight:700;letter-spacing:0.06em;color:#2563eb">${params.eyebrow}</td></tr>
                      </table>
                      <p style="margin:18px 0 0;font-size:22px;line-height:1.35;font-weight:700;letter-spacing:-0.015em;color:#0f172a">${params.heading}</p>
                      <div style="margin-top:14px">${paragraphsHtml}</div>
                      ${infoRowsHtml}
                      ${cta}
                    </td>
                  </tr>
                  ${footer}
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 24px 0;color:#94a3b8;font-size:12px;line-height:19px">
                <p style="margin:0"><a href="${termsUrl}" style="color:#64748b;text-decoration:underline">Terms &amp; conditions</a><span style="padding:0 7px;color:#cbd5e1">·</span><a href="${privacyUrl}" style="color:#64748b;text-decoration:underline">Privacy policy</a></p>
                <p style="margin:12px 0 0">problems.live<br>${mailingAddress}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Reused across every send in this module instead of opening a fresh Gmail
// SMTP/TLS connection per email — matters most when fanning a single
// notification out to several admin recipients at once.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.smtpUser, pass: env.smtpPassword },
  });
  return transporter;
}

async function deliverEmail(params: {
  recipient: string;
  subject: string;
  text: string;
  html: string;
  logTag: string;
}): Promise<void> {
  const log = await EmailLog.create({
    recipient: params.recipient,
    subject: params.subject,
    text: params.text,
    html: params.html,
    status: "failed",
  });
  try {
    const transporter = getTransporter();
    const sent = await transporter.sendMail({
      from: `problems.live <${env.smtpUser}>`,
      to: params.recipient,
      replyTo: env.smtpUser,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    await EmailLog.updateOne(
      { _id: log._id },
      { $set: { status: "sent", providerMessageId: sent.messageId } },
    ).exec();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown email delivery error";
    await EmailLog.updateOne(
      { _id: log._id },
      { $set: { errorMessage: errorMessage.slice(0, 2_000) } },
    ).exec();
    console.error(`[${params.logTag}] email failed`, { recipient: params.recipient, error });
    throw error;
  }
}

/**
 * Welcomes a freshly created account. Sent once, right after
 * `provisionUserFromGoogle` creates a brand-new user during Google sign-in.
 */
export async function sendNewUserWelcomeEmail(params: {
  name: string;
  email: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const subject = "Welcome to problems.live";
  const postUrl = `${env.appUrl}/problems/new`;
  const text = `Hi ${params.name},\n\nYour problems.live account is ready.\n\nproblems.live is where people share real problems they're facing, and where builders find out what's actually worth solving. Post a problem you're dealing with, or browse the directory and help someone else by validating, commenting, or shipping a solution.\n\nPost your first problem: ${postUrl}\n\nproblems.live\n${env.legalMailingAddress}`;
  const html = brandedEmail({
    subject,
    preheader: "Start posting problems and start helping others.",
    eyebrow: "ACCOUNT CREATED",
    heading: "Welcome to problems.live",
    paragraphs: [
      `Hi ${name},`,
      `Your account is ready. problems.live is where people share real problems they're facing, and where builders find out what's actually worth solving.`,
      `Post a problem you're dealing with, or browse the directory and help someone else by validating, commenting, or shipping a solution.`,
    ],
    ctaLabel: "Post your first problem",
    ctaUrl: postUrl,
  });

  await deliverEmail({ recipient: params.email, subject, text, html, logTag: "new-user-welcome" });
}

/**
 * Tells every configured admin (see env.adminNotificationEmails) that a new
 * account was just created via Google sign-in. Sent once per admin so
 * `EmailLog.recipient` stays a single address, matching
 * sendWaitlistSignupNotification.
 */
export async function sendNewUserAdminNotification(params: {
  name: string;
  email: string;
  username: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const email = escapeHtml(params.email);
  const username = escapeHtml(params.username);
  const usersUrl = `${env.appUrl}/admin/users`;
  const subject = `New user got created account — ${params.name}`;
  const text = `New user got created account\n\nName: ${params.name}\nUsername: u/${params.username}\nEmail: ${params.email}\n\nView users: ${usersUrl}`;
  const html = brandedEmail({
    subject,
    preheader: "A new user got created account on problems.live.",
    eyebrow: "NEW SIGNUP",
    heading: "A new user got created account",
    paragraphs: [
      "Hello,",
      "A new account was just created on problems.live via Google sign-in.",
    ],
    infoRows: [
      { label: "Name", value: name },
      { label: "Username", value: `u/${username}` },
      { label: "Email", value: email },
    ],
    ctaLabel: "View all users",
    ctaUrl: usersUrl,
    footerNote: "You're receiving this because you administer problems.live.",
  });

  await Promise.all(
    env.adminNotificationEmails.map((adminEmail) =>
      deliverEmail({
        recipient: adminEmail,
        subject,
        text,
        html,
        logTag: "new-user-admin-notification",
      }).catch(() => {
        // Already logged and recorded in EmailLog by deliverEmail; one
        // admin's bad inbox must not stop the others from being notified.
      }),
    ),
  );
}
