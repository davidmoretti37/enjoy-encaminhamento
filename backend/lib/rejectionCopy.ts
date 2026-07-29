// Canonical rejection wording, supplied by ANEC (mom) as approved copy.
//
// The PDF "DOCUMENTOS PARA A PLATAFORMA" defines THREE distinct messages and is
// explicit about who each one goes to:
//
//   (a) MENSAGEM DE RECUSA
//       "SOMENTE PARA OS NOSSOS ALUNOS QUE SE CANDIDATARAM PARA AS VAGAS NA
//        PLATAFORMA"                          -> Inexxa student, applied only
//   (b) MENSAGEM DE RECUSA
//       "SOMENTE PARA OS NOSSOS ALUNOS QUE PARTICIPARAM DE ENTREVISTAS NAS
//        EMPRESAS"                            -> Inexxa student, interviewed
//   (c) MENSAGEM DE RECUSA PARA CANDIDATOS EXTERNOS
//       "SOMENTE PARA CANDIDATOS EXTERNOS QUE NÃO FAZEM A FORMAÇÃO
//        PROFISSIONALIZANTE NA INEXXA"        -> external candidate
//
// {{EMPRESA}} IS DELIBERATELY OMITTED. The original copy names the client
// company, but candidates are never shown a client's name before being hired
// (backend/routers/job.ts:748, backend/routers/application.ts:69-73). David
// chose to keep that confidentiality rule, so every message references the role
// only. Nothing else in the wording was changed.

export type RejectionVariant = "student_applied" | "student_interviewed" | "external";

export interface RejectionCopyInput {
  candidateName: string;
  jobTitle: string;
  consultantName: string;
}

const SIGNOFF_DEPT = "Departamento de Desenvolvimento Pessoal e Profissional";
const SIGNOFF_ORG = "ANEC – Agência Nacional de Emprego e Carreira";

/**
 * Pick the right message for this candidate.
 *
 * `interviewed` means the candidate actually attended a company-stage interview
 * (an `interview_participants` row joined to an `interview_sessions` row with
 * `interview_stage = 'company_interview'` for this job).
 *
 * NOTE ON A GAP IN THE SOURCE COPY: ANEC supplied copy for external candidates
 * who *interviewed* (c), but none for an external candidate who only applied
 * and was never interviewed. Rather than invent a fourth message, we use (c)
 * with its opening sentence adjusted from "por ter participado da entrevista"
 * to "por ter se candidatado" — the only edit, so the message is never factually
 * wrong about what the candidate did.
 */
export function selectRejectionVariant(opts: {
  isSchoolStudent: boolean;
  interviewed: boolean;
}): RejectionVariant {
  if (!opts.isSchoolStudent) return "external";
  return opts.interviewed ? "student_interviewed" : "student_applied";
}

/** Plain-text body — used for the in-app notification. */
export function rejectionText(
  variant: RejectionVariant,
  { candidateName, jobTitle, consultantName }: RejectionCopyInput,
  interviewed = true,
): string {
  const nome = candidateName || "candidato(a)";
  const consultor = consultantName || "equipe da ANEC";

  if (variant === "student_applied") {
    return `Olá, ${nome}! Tudo bem?

Aqui é ${consultor}, da equipe da ANEC (Agência Nacional de Emprego e Carreira). 😊

Queremos agradecer, de coração, por ter se candidatado à vaga de ${jobTitle}. A empresa já concluiu esse processo e optou por outro(a) candidato(a) — isso não diz respeito à sua capacidade ou ao seu potencial, e sim ao que a empresa precisava naquele momento específico.

Queremos que você saiba: a gente não para por aqui! 🌱 Você continua com o seu cadastro ativo em nossa Plataforma de Talentos, e vamos seguir te encaminhando para novas oportunidades, com todo o suporte da nossa equipe.

E para chegar ainda mais preparado(a) nas próximas oportunidades, é muito importante continuar participando:
▪ dos nossos treinamentos semanais de desenvolvimento pessoal e profissional;
▪ da sua formação profissionalizante na Inexxa.

Cada etapa conta muito na sua preparação para o mercado de trabalho!

Uma coisa que nos ajuda bastante a te apoiar melhor: como foi a sua experiência até aqui nesse processo seletivo? Encontrou alguma dificuldade que gostaria de compartilhar com a gente?

Pode responder por aqui mesmo, com toda a liberdade. Estamos na sua torcida! 🙌

Um abraço,
${consultor}
${SIGNOFF_DEPT}
${SIGNOFF_ORG}`;
  }

  if (variant === "student_interviewed") {
    return `Olá, ${nome}! Tudo bem?

Aqui é ${consultor}, da equipe da ANEC (Agência Nacional de Emprego e Carreira). 😊

Primeiro, parabéns por ter chegado até a entrevista para a vaga de ${jobTitle} — isso já mostra o quanto você está empenhado(a) na sua trajetória profissional! Queremos te contar, com carinho, que desta vez a empresa optou por seguir com outro(a) candidato(a). Isso não tem relação com o quanto você se saiu bem — é super comum que, entre bons candidatos, a escolha final dependa de detalhes bem específicos da vaga.

Queremos que você saiba: a gente não para por aqui! Você continua com o seu cadastro ativo em nossa Plataforma de Talentos, e vamos seguir te encaminhando para novas oportunidades, com todo o suporte da nossa equipe.

E para chegar ainda mais preparado(a) nas próximas entrevistas, é muito importante continuar participando:
▪ dos nossos treinamentos semanais de desenvolvimento pessoal e profissional;
▪ da sua formação profissionalizante na Inexxa.

Cada etapa conta muito na sua preparação para o mercado de trabalho!

Uma coisa que nos ajuda bastante a te apoiar melhor: como foi a sua experiência na entrevista? Teve alguma dificuldade durante a conversa que gostaria de compartilhar com a gente?

Pode responder por aqui mesmo, com toda a liberdade. Estamos na sua torcida! 🙌

Um abraço,
${consultor}
${SIGNOFF_DEPT}
${SIGNOFF_ORG}`;
  }

  // external
  const opening = interviewed
    ? `Agradecemos muito por ter participado da entrevista para a vaga de ${jobTitle}. Foi um prazer conhecer você ao longo do processo.`
    : `Agradecemos muito por ter se candidatado à vaga de ${jobTitle}. Foi um prazer conhecer você ao longo do processo.`;
  const followUp = interviewed
    ? `Para te ajudar a chegar ainda mais preparado(a) nas próximas entrevistas, gostaríamos de saber: como foi a sua experiência na entrevista? Encontrou alguma dificuldade? Você sente que precisaria melhorar ou atualizar alguma qualificação para as próximas oportunidades?`
    : `Para te ajudar a chegar ainda mais preparado(a) nas próximas oportunidades, gostaríamos de saber: como foi a sua experiência no processo? Encontrou alguma dificuldade? Você sente que precisaria melhorar ou atualizar alguma qualificação para as próximas oportunidades?`;

  return `Olá, ${nome}! Tudo bem?

Aqui é ${consultor}, da equipe da ANEC (Agência Nacional de Emprego e Carreira). 😊

${opening}

Desta vez, a empresa optou por seguir com outro(a) candidato(a). Essa decisão costuma envolver critérios bem específicos da vaga, e não representa uma avaliação negativa do seu perfil ou da sua entrevista.

Seu cadastro permanece ativo em nosso banco de talentos, e nossa equipe vai te avisar assim que surgir uma nova oportunidade compatível com o seu perfil.

${followUp}

Se for o caso, temos uma novidade: como parceiros da Inexxa Formação Profissional, conseguimos descontos educacionais exclusivos para candidatos do nosso banco de talentos em cursos profissionalizantes 100% online. 🎓 Pode ser um bom caminho para fortalecer seu perfil e ampliar suas chances nas próximas seleções. Se tiver interesse, é só nos avisar que te passamos mais detalhes.

Agradecemos novamente o seu interesse e desejamos muito sucesso na sua trajetória profissional!

Atenciosamente,
${consultor}
${SIGNOFF_ORG}`;
}

/** Same body as HTML, for the email channel. */
export function rejectionHtml(
  variant: RejectionVariant,
  input: RejectionCopyInput,
  interviewed = true,
): string {
  return rejectionText(variant, input, interviewed)
    .split("\n\n")
    .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

/** Subject line for the email channel. */
export function rejectionSubject(jobTitle: string): string {
  return `Retorno sobre a vaga de ${jobTitle}`;
}

/** Short title for the in-app notification bell. */
export const REJECTION_TITLE = "Retorno sobre sua candidatura";
