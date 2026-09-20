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

export async function sendWaitlistConfirmation(params: {
  name: string;
  email: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const text = `Hi ${params.name},\n\nThanks for requesting an invite to problems.live. We received your request and will let you know as soon as a spot is available.\n\nWhat happens next:\n• We review requests in small groups.\n• We’ll email you when your invite is ready.\n\n— The problems.live team`;
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f4f6fb;color:#152033;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">We received your problems.live invite request.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb">
      <tr><td style="padding:40px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e4e8f0;border-radius:16px;overflow:hidden">
          <tr><td style="padding:24px 40px;background:#152033">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.02em">problems.live</p>
          </td></tr>
          <tr><td style="padding:40px">
            <p style="margin:0 0 14px;color:#5965d8;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase">Invite-only access</p>
            <h1 style="margin:0;color:#152033;font-size:30px;line-height:1.2;letter-spacing:-0.03em">Your request is in.</h1>
            <p style="margin:20px 0 0;color:#46556d;font-size:16px;line-height:1.65">Hi ${name},</p>
            <p style="margin:12px 0 0;color:#46556d;font-size:16px;line-height:1.65">Thanks for requesting an invite to problems.live. We received your request and will let you know as soon as a spot is available.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:#f6f7ff;border-radius:10px">
              <tr><td style="padding:22px 24px">
                <p style="margin:0 0 10px;color:#152033;font-size:15px;font-weight:700">What happens next</p>
                <p style="margin:0;color:#46556d;font-size:14px;line-height:1.65">We&apos;re reviewing requests in small groups. When your invite is ready, we&apos;ll email you here.</p>
              </td></tr>
            </table>
            <p style="margin:28px 0 0;color:#46556d;font-size:16px;line-height:1.65">See you soon,<br><strong style="color:#152033">The problems.live team</strong></p>
          </td></tr>
          <tr><td style="padding:20px 40px;border-top:1px solid #e4e8f0">
            <p style="margin:0;color:#7a879b;font-size:12px;line-height:1.5">You received this email because someone requested an invite using this address.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  const subject = "We received your problems.live invite request";
  const log = await EmailLog.create({
    recipient: params.email,
    subject,
    text,
    html,
    status: "failed",
  });

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.smtpUser, pass: env.smtpPassword },
      // Nodemailer waits indefinitely by default, and an unreachable SMTP host
      // is billed as wall-clock time on a serverless instance.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    const sent = await transporter.sendMail({
      from: `problems.live <${env.smtpUser}>`,
      to: params.email,
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

/** Notifies every configured admin address when a new waitlist entry comes in. */
export async function sendWaitlistAdminNotification(params: {
  name: string;
  email: string;
}): Promise<void> {
  const recipients = env.adminEmails;
  if (recipients.length === 0) return;

  const name = escapeHtml(params.name);
  const email = escapeHtml(params.email);
  const subject = "New waitlist signup";
  const text = `A new person has joined the problems.live waitlist.\n\nName: ${params.name}\nEmail: ${params.email}\n\nReview it in the admin dashboard: ${env.appUrl}/admin/waitlist`;
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f4f6fb;color:#152033;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">New waitlist signup on problems.live.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb">
      <tr><td style="padding:40px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e4e8f0;border-radius:16px;overflow:hidden">
          <tr><td style="padding:24px 40px;background:#152033">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.02em">problems.live</p>
          </td></tr>
          <tr><td style="padding:40px">
            <p style="margin:0 0 14px;color:#5965d8;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase">Admin notification</p>
            <h1 style="margin:0;color:#152033;font-size:26px;line-height:1.2;letter-spacing:-0.03em">New waitlist signup</h1>
            <p style="margin:20px 0 0;color:#46556d;font-size:16px;line-height:1.65">Someone new just joined the waitlist.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:#f6f7ff;border-radius:10px">
              <tr><td style="padding:22px 24px">
                <p style="margin:0 0 10px;color:#152033;font-size:15px"><strong>Name:</strong> ${name}</p>
                <p style="margin:0;color:#152033;font-size:15px"><strong>Email:</strong> ${email}</p>
              </td></tr>
            </table>
            <a href="${env.appUrl}/admin/waitlist" style="display:inline-block;margin-top:28px;border-radius:8px;background:#5965d8;color:#fff;padding:13px 20px;font-size:15px;font-weight:700;text-decoration:none">Review in admin dashboard</a>
          </td></tr>
          <tr><td style="padding:20px 40px;border-top:1px solid #e4e8f0">
            <p style="margin:0;color:#7a879b;font-size:12px;line-height:1.5">You received this because you're listed as an admin for problems.live.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const results = await Promise.allSettled(
    recipients.map(async (recipient) => {
      const log = await EmailLog.create({ recipient, subject, text, html, status: "failed" });
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: env.smtpUser, pass: env.smtpPassword },
        });
        const sent = await transporter.sendMail({
          from: `problems.live <${env.smtpUser}>`,
          to: recipient,
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
    }),
  );

  // One admin's bounced inbox shouldn't hide the notification from the rest.
  if (results.every((result) => result.status === "rejected")) {
    throw (results[0] as PromiseRejectedResult).reason;
  }
}

export async function sendWaitlistApprovalEmail(params: {
  name: string;
  email: string;
  approvalUrl: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const text = `Hi ${params.name},\n\nYou're approved for problems.live. Confirm your access here: ${params.approvalUrl}\n\n— The problems.live team`;
  const subject = "You're approved for problems.live";
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f4f6fb;color:#152033;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:40px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#fff;border:1px solid #e4e8f0;border-radius:16px;overflow:hidden"><tr><td style="padding:24px 40px;background:#152033;color:#fff;font-size:18px;font-weight:700">problems.live</td></tr><tr><td style="padding:40px"><p style="margin:0;color:#5965d8;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">You're approved</p><h1 style="margin:14px 0 0;font-size:30px;line-height:1.2">Your access is ready.</h1><p style="margin:20px 0;color:#46556d;font-size:16px;line-height:1.65">Hi ${name}, your problems.live waitlist request has been approved. Confirm your access below, then sign in with Google to start posting.</p><a href="${params.approvalUrl}" style="display:inline-block;margin-top:12px;border-radius:8px;background:#5965d8;color:#fff;padding:13px 20px;font-size:15px;font-weight:700;text-decoration:none">Confirm access</a><p style="margin:28px 0 0;color:#7a879b;font-size:12px;line-height:1.5">This link is tied to ${escapeHtml(params.email)}. If you weren&apos;t expecting it, you can ignore this email.</p></td></tr></table></td></tr></table></body></html>`;
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

export async function sendInvitationEmail(params: {
  name: string;
  email: string;
  inviteUrl: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const text = `Hi ${params.name},\n\nYou’ve been invited to problems.live. Accept your invitation here: ${params.inviteUrl}\n\n— The problems.live team`;
  const subject = "You’re invited to problems.live";
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f4f6fb;color:#152033;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:40px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#fff;border:1px solid #e4e8f0;border-radius:16px;overflow:hidden"><tr><td style="padding:24px 40px;background:#152033;color:#fff;font-size:18px;font-weight:700">problems.live</td></tr><tr><td style="padding:40px"><p style="margin:0;color:#5965d8;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Your invitation</p><h1 style="margin:14px 0 0;font-size:30px;line-height:1.2">You&apos;re invited.</h1><p style="margin:20px 0;color:#46556d;font-size:16px;line-height:1.65">Hi ${name}, you&apos;ve been invited to join problems.live. Your account will include five invitations to share with people you trust.</p><a href="${params.inviteUrl}" style="display:inline-block;margin-top:12px;border-radius:8px;background:#5965d8;color:#fff;padding:13px 20px;font-size:15px;font-weight:700;text-decoration:none">Accept invitation</a><p style="margin:28px 0 0;color:#7a879b;font-size:12px;line-height:1.5">This invitation is tied to ${escapeHtml(params.email)}. If you weren&apos;t expecting it, you can ignore this email.</p></td></tr></table></td></tr></table></body></html>`;
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
