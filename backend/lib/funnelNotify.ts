// Shared funnel notifications — in-app (createNotification) + email (sendEmail),
// so candidate/company stage changes are delivered on EVERY path, including the
// negative ones (rejections) that used to ghost the candidate. Each channel is
// wrapped in try/catch so a failure is logged (surfaced) but never blocks the
// mutation, and one channel failing doesn't drop the other.
import * as db from "../db";
import { sendEmail, senderIdentityForAgencyId } from "../routers/email";

const FOOTER = `<p style="color:#9ca3af;font-size:12px;margin-top:24px;">ANEC — Agência Nacional de Emprego e Carreira</p>`;

function wrap(title: string, bodyHtml: string, color = "#0A2342"): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
    <div style="background:${color};color:#fff;padding:18px 20px;border-radius:8px 8px 0 0;"><h2 style="margin:0;font-size:20px;">${title}</h2></div>
    <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">${bodyHtml}${FOOTER}</div>
  </div>`;
}

type Person = {
  user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  agency_id?: string | null;
} | null | undefined;

async function inApp(userId: string | null | undefined, title: string, message: string, type: string, relatedType?: string, relatedId?: string) {
  if (!userId) return;
  try {
    await (db as any).createNotification({ user_id: userId, title, message, type, related_to_type: relatedType, related_to_id: relatedId });
  } catch (e: any) {
    console.error("[funnelNotify] in-app notification failed:", e?.message);
  }
}

/**
 * `agencyId` decides how the message is signed and, more importantly, where a
 * reply goes. Without it every candidate answer landed in whichever inbox owned
 * the global SMTP account: a candidate confirmed an interview and the operator
 * running that interview never saw the reply.
 */
async function email(
  to: string | null | undefined,
  subject: string,
  title: string,
  bodyHtml: string,
  color?: string,
  agencyId?: string | null,
) {
  if (!to) return;
  try {
    const identity = await senderIdentityForAgencyId(agencyId);
    await sendEmail(to, subject, wrap(title, bodyHtml, color), identity.unit, identity);
  } catch (e: any) {
    console.error("[funnelNotify] email failed to", to, "-", e?.message);
  }
}

/**
 * Candidate was NOT selected. Never ghost — in-app + email.
 *
 * Uses ANEC's own approved wording (lib/rejectionCopy.ts), which has three
 * variants: an Inexxa student who only applied, one who sat a company interview,
 * and an external candidate. That copy was already written and reviewed, but it
 * was only wired into job.closeAsFilled. Rejecting one candidate mid-process —
 * far and away the more common case — fell through to generic text instead, so
 * the carefully-worded version almost never went out.
 */
export async function notifyCandidateRejected(candidate: Person, jobTitle: string, reason?: string | null, jobId?: string) {
  if (!candidate) return;
  const name = candidate.full_name || "Candidato";

  if (jobId && (candidate as any).id) {
    try {
      const [{ loadRejectionContext }, copy] = await Promise.all([
        import("./rejectionContext"),
        import("./rejectionCopy"),
      ]);
      const ctx = await loadRejectionContext(jobId, [(candidate as any).id]);
      const interviewed = ctx.interviewedByCandidateId.has((candidate as any).id);
      const isSchoolStudent = ctx.studentByCandidateId.has((candidate as any).id);
      const variant = copy.selectRejectionVariant({ isSchoolStudent, interviewed });
      // consultantName is required; the copy falls back to "equipe da ANEC"
      // when it is blank, which is the right voice for an automated send.
      const input = { candidateName: name, jobTitle, consultantName: "" };
      await inApp(candidate.user_id, copy.REJECTION_TITLE,
        copy.rejectionText(variant, input, interviewed), "info", "application", jobId);
      await email(candidate.email, copy.rejectionSubject(jobTitle), copy.REJECTION_TITLE,
        copy.rejectionHtml(variant, input, interviewed), undefined, candidate.agency_id);
      return;
    } catch (e: any) {
      // Fall through to the generic wording rather than ghosting the candidate.
      console.error("[funnelNotify] approved rejection copy failed, using generic:", e?.message);
    }
  }

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
      undefined,
      candidate.agency_id,
    );
}

/** Generic candidate stage notification (in-app always; email when subject/html given). */
export async function notifyCandidate(
  candidate: Person,
  opts: {
    title: string; message: string; type?: string; relatedType?: string; relatedId?: string;
    emailSubject?: string; emailHtml?: string;
    /**
     * Agency running this process. Prefer it over the candidate's own agency:
     * the operator handling the vacancy is who should receive the reply, and a
     * candidate may have no agency at all (10 of 299 in production) or belong to
     * a different region than the vacancy — José's interview was in São Mateus
     * while he had no agency, so his confirmation had nowhere to go.
     */
    agencyId?: string | null;
  },
) {
  if (!candidate) return;
  await inApp(candidate.user_id, opts.title, opts.message, opts.type || "info", opts.relatedType, opts.relatedId);
  if (opts.emailSubject && opts.emailHtml) {
    await email(candidate.email, opts.emailSubject, opts.title, opts.emailHtml, undefined, opts.agencyId ?? candidate.agency_id);
  }
}

/** Notify a company user — in-app always; email when subject/html given (companies won't sit in the portal). */
export async function notifyCompany(company: Person, opts: { title: string; message: string; type?: string; relatedType?: string; relatedId?: string; emailSubject?: string; emailHtml?: string; agencyId?: string | null }) {
  if (!company) return;
  await inApp(company.user_id, opts.title, opts.message, opts.type || "info", opts.relatedType, opts.relatedId);
  if (opts.emailSubject && opts.emailHtml) {
    await email(company.email, opts.emailSubject, opts.title, opts.emailHtml, undefined, opts.agencyId ?? company.agency_id);
  }
}
