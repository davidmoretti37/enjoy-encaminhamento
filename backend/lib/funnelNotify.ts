// Shared funnel notifications — in-app (createNotification) + email (sendEmail),
// so candidate/company stage changes are delivered on EVERY path, including the
// negative ones (rejections) that used to ghost the candidate. Each channel is
// wrapped in try/catch so a failure is logged (surfaced) but never blocks the
// mutation, and one channel failing doesn't drop the other.
import * as db from "../db";
import { sendEmail } from "../routers/email";

const FOOTER = `<p style="color:#9ca3af;font-size:12px;margin-top:24px;">ANEC — Agência Nacional de Emprego e Carreira</p>`;

function wrap(title: string, bodyHtml: string, color = "#0A2342"): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
    <div style="background:${color};color:#fff;padding:18px 20px;border-radius:8px 8px 0 0;"><h2 style="margin:0;font-size:20px;">${title}</h2></div>
    <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">${bodyHtml}${FOOTER}</div>
  </div>`;
}

type Person = { user_id?: string | null; email?: string | null; full_name?: string | null } | null | undefined;

async function inApp(userId: string | null | undefined, title: string, message: string, type: string, relatedType?: string, relatedId?: string) {
  if (!userId) return;
  try {
    await (db as any).createNotification({ user_id: userId, title, message, type, related_to_type: relatedType, related_to_id: relatedId });
  } catch (e: any) {
    console.error("[funnelNotify] in-app notification failed:", e?.message);
  }
}

async function email(to: string | null | undefined, subject: string, title: string, bodyHtml: string, color?: string) {
  if (!to) return;
  try {
    await sendEmail(to, subject, wrap(title, bodyHtml, color));
  } catch (e: any) {
    console.error("[funnelNotify] email failed to", to, "-", e?.message);
  }
}

/** Candidate was NOT selected. Never ghost — in-app + email, with the reason if given. */
export async function notifyCandidateRejected(candidate: Person, jobTitle: string, reason?: string | null, jobId?: string) {
  if (!candidate) return;
  const name = candidate.full_name || "Candidato";
  const reasonMsg = reason ? ` Retorno da empresa: ${reason}.` : "";
  await inApp(
    candidate.user_id,
    "Atualização da sua candidatura",
    `Desta vez você não foi selecionado(a) para "${jobTitle}".${reasonMsg} Continue acompanhando novas oportunidades no seu portal.`,
    "info",
    "application",
    jobId,
  );
  await email(
    candidate.email,
    `Atualização da sua candidatura — ${jobTitle}`,
    "Atualização da sua candidatura",
    `<p>Olá ${name},</p>
     <p>Agradecemos muito o seu interesse na vaga <strong>"${jobTitle}"</strong>. Após a avaliação, desta vez você não foi selecionado(a).</p>
     ${reason ? `<p><strong>Retorno da empresa:</strong> ${reason}</p>` : ""}
     <p>Isso não diminui o seu potencial — novas oportunidades aparecem no seu portal com frequência. Continue de olho!</p>`,
  );
}

/** Generic candidate stage notification (in-app always; email when subject/html given). */
export async function notifyCandidate(candidate: Person, opts: { title: string; message: string; type?: string; relatedType?: string; relatedId?: string; emailSubject?: string; emailHtml?: string }) {
  if (!candidate) return;
  await inApp(candidate.user_id, opts.title, opts.message, opts.type || "info", opts.relatedType, opts.relatedId);
  if (opts.emailSubject && opts.emailHtml) {
    await email(candidate.email, opts.emailSubject, opts.title, opts.emailHtml);
  }
}

/** Notify a company user — in-app always; email when subject/html given (companies won't sit in the portal). */
export async function notifyCompany(company: Person, opts: { title: string; message: string; type?: string; relatedType?: string; relatedId?: string; emailSubject?: string; emailHtml?: string }) {
  if (!company) return;
  await inApp(company.user_id, opts.title, opts.message, opts.type || "info", opts.relatedType, opts.relatedId);
  if (opts.emailSubject && opts.emailHtml) {
    await email(company.email, opts.emailSubject, opts.title, opts.emailHtml);
  }
}
