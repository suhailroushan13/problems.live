import "server-only";

import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { EmailLog } from "@/models";
import { invitationUnsubscribeApiUrl, invitationUnsubscribeUrl } from "@/lib/utils/invite-token";

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
  inviteToken: string;
  /** The direct sign-in link (Google OAuth `next`-chained to the invite) — clicking it goes straight to the consent screen, no landing page first. */
  inviteUrl: string;
}): Promise<void> {
  const name = escapeHtml(params.name);
  const recipient = escapeHtml(params.email);
  const unsubscribeUrl = invitationUnsubscribeUrl(params.inviteToken);
  const unsubscribeApiUrl = invitationUnsubscribeApiUrl(params.inviteToken);
  const termsUrl = `${env.appUrl}/terms`;
  const privacyUrl = `${env.appUrl}/privacy`;
  const mailingAddress = escapeHtml(env.legalMailingAddress).replaceAll("\n", "<br>");
  const text = `Hi ${params.name},\n\nYou've been invited to problems.live, a directory of real problems worth solving.\n\nSign in with the Google account for ${params.email} to accept the invitation and set up your account:\n${params.inviteUrl}\n\nThis invitation is personal and shouldn't be forwarded. If you weren't expecting it, you can ignore this email, or cancel it here: ${unsubscribeUrl}\n\nTerms: ${termsUrl}\nPrivacy: ${privacyUrl}\n\nproblems.live\n${env.legalMailingAddress}`;
  const subject = "Your invitation to problems.live";
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">You've been invited to join problems.live.</div>
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
                      <p style="margin:16px 0 0;color:#334155;font-size:15px;line-height:24px">You&apos;ve been invited to join <strong style="color:#0f172a">problems.live</strong>, a directory of real problems worth solving.</p>
                      <p style="margin:16px 0 0;color:#334155;font-size:15px;line-height:24px">Sign in with the Google account for <strong style="color:#0f172a">${recipient}</strong> to accept and set up your account.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 36px 0">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" bgcolor="#0f172a" style="border-radius:6px">
                            <a href="${params.inviteUrl}" style="display:inline-block;padding:11px 20px;border-radius:6px;color:#ffffff;font-size:14px;font-weight:600;line-height:20px;text-decoration:none">Accept invitation</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 36px 32px">
                      <p style="margin:0;color:#64748b;font-size:13px;line-height:21px">Once you&apos;re in, you&apos;ll have five invitations of your own to pass on.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 36px 32px">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0">
                        <tr>
                          <td style="padding-top:20px;color:#94a3b8;font-size:12px;line-height:19px">This invitation is personal and shouldn&apos;t be forwarded. If you weren&apos;t expecting it, you can safely ignore this email.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 24px 0;color:#94a3b8;font-size:12px;line-height:19px">
                <p style="margin:0"><a href="${termsUrl}" style="color:#64748b;text-decoration:underline">Terms &amp; conditions</a><span style="padding:0 7px;color:#cbd5e1">·</span><a href="${privacyUrl}" style="color:#64748b;text-decoration:underline">Privacy policy</a><span style="padding:0 7px;color:#cbd5e1">·</span><a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline">Unsubscribe</a></p>
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
      subject,
      text,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeApiUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
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
  const subject = `New waitlist signup: ${params.name}`;
  const text = `${params.name} (${params.email}) just joined the problems.live waitlist.\n\nReview and approve: ${reviewUrl}`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#eff6ff;color:#0f172a;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#eff6ff">
      <tr>
        <td align="center" style="padding:40px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:480px;margin:0 auto;border:1px solid #bfdbfe;border-radius:16px;background:#ffffff;overflow:hidden">
            <tr>
              <td style="padding:28px 32px 8px;color:#1d4ed8;font-size:17px;font-weight:700;letter-spacing:-0.4px">problems<span style="color:#0f172a">.live</span></td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px">
                <p style="margin:0;color:#0f172a;font-size:16px;line-height:26px"><strong>${name}</strong> (${signupEmail}) just joined the waitlist.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0">
                  <tr>
                    <td align="center" bgcolor="#2563eb" style="border-radius:8px">
                      <a href="${reviewUrl}" style="display:inline-block;padding:12px 20px;border:1px solid #2563eb;border-radius:8px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Review waiting list &rarr;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await Promise.all(
    env.waitlistNotificationEmails.map(async (adminEmail) => {
      const log = await EmailLog.create({ recipient: adminEmail, subject, text, html, status: "failed" });
      try {
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: env.smtpUser, pass: env.smtpPassword } });
        const sent = await transporter.sendMail({
          from: `problems.live <${env.smtpUser}>`,
          to: adminEmail,
          subject,
          text,
          html,
        });
        await EmailLog.updateOne({ _id: log._id }, { $set: { status: "sent", providerMessageId: sent.messageId } }).exec();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown email delivery error";
        await EmailLog.updateOne({ _id: log._id }, { $set: { errorMessage: errorMessage.slice(0, 2_000) } }).exec();
        console.error("[waitlist] admin notification email failed", { adminEmail, error });
      }
    }),
  );
}
