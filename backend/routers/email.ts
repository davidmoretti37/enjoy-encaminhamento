// Email helper functions for routers
import nodemailer from "nodemailer";
import { ENV } from "../_core/env";
import * as db from "../db";

// Report #14: which institutional unit mailbox a message should be sent from.
export type SenderUnit = "uberlandia" | "ipatinga" | "default";

interface Mailbox {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

// Map an agency (unit) to its sender slug by name/city — the two served units
// are the "Uberlândia" and "Ipatinga" agencies.
function resolveUnitFromAgency(agency: any): SenderUnit {
  const text = `${agency?.city || ""} ${agency?.agency_name || agency?.name || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (text.includes("uberlandia")) return "uberlandia";
  if (text.includes("ipatinga")) return "ipatinga";
  return "default";
}

/**
 * How an agency presents itself on outgoing candidate mail.
 *
 * The address is always the verified ANEC mailbox — sending as an address we do
 * not control fails SPF/DKIM and lands in spam. What the agency controls is the
 * display name candidates see and, crucially, where their replies go. Before
 * this, every reply went to whoever owned the global SMTP account.
 */
export type SenderIdentity = {
  unit: SenderUnit;
  fromName?: string | null;
  replyTo?: string | null;
};

export async function senderIdentityForAgencyId(agencyId?: string | null): Promise<SenderIdentity> {
  if (!agencyId) return { unit: "default" };
  try {
    const agency: any = await (db as any).getAgencyById(agencyId);
    return {
      unit: resolveUnitFromAgency(agency),
      fromName: agency?.sender_display_name || agency?.agency_name || null,
      replyTo: agency?.reply_to_email || agency?.email || null,
    };
  } catch {
    return { unit: "default" };
  }
}

/** Resolve the sender unit for a given agency id (best-effort; 'default' on any miss). */
export async function senderUnitForAgencyId(agencyId?: string | null): Promise<SenderUnit> {
  if (!agencyId) return "default";
  try {
    return resolveUnitFromAgency(await (db as any).getAgencyById(agencyId));
  } catch {
    return "default";
  }
}

// Pick the mailbox (auth + FROM) for a unit, falling back to the global SMTP_*.
function resolveMailbox(unit: SenderUnit): Mailbox {
  if (unit !== "default") {
    const u = (ENV.smtp.units as any)[unit];
    if (u && u.user && u.pass) {
      return {
        host: u.host || ENV.smtp.host,
        port: u.port || ENV.smtp.port,
        user: u.user,
        pass: u.pass,
        from: u.from || u.user,
      };
    }
  }
  return {
    host: ENV.smtp.host,
    port: ENV.smtp.port,
    user: ENV.smtp.user || "",
    pass: ENV.smtp.pass || "",
    from: ENV.smtp.emailFrom,
  };
}

// Create email transporter for a specific mailbox.
export function createEmailTransporter(mailbox?: Mailbox) {
  const mb = mailbox || resolveMailbox("default");
  return nodemailer.createTransport({
    host: mb.host,
    port: mb.port,
    secure: mb.port === 465, // implicit TLS on 465; STARTTLS on 587
    auth: {
      user: mb.user,
      pass: mb.pass,
    },
  });
}

// Helper function to send emails. `unit` selects the institutional sender
// mailbox (report #14); defaults to the global mailbox so existing callers are
// unchanged.
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  unit: SenderUnit = "default",
  identity?: { fromName?: string | null; replyTo?: string | null },
): Promise<boolean> {
  const mailbox = resolveMailbox(unit);
  if (!mailbox.user || !mailbox.pass) {
    console.error("[Email] SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env");
    throw new Error("Envio de e-mail não está configurado. Contate o administrador.");
  }

  try {
    const transporter = createEmailTransporter(mailbox);

    // Display name only. The address stays the authenticated mailbox, otherwise
    // the message fails SPF/DKIM and is filed as spam.
    const fromName = identity?.fromName?.trim();
    const from = fromName ? `"${fromName.replace(/"/g, "")}" <${mailbox.from}>` : mailbox.from;

    // Reply-To is what actually routes a candidate's answer to the right person.
    const replyTo = identity?.replyTo?.trim() || undefined;

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    console.log(
      `[Email] Sent successfully to: ${to} (from ${from}${replyTo ? `, reply-to ${replyTo}` : ""})`,
    );
    return true;
  } catch (err: any) {
    console.error("[Email] Failed to send:", err.message);
    throw new Error(`Falha ao enviar e-mail: ${err.message}`);
  }
}
