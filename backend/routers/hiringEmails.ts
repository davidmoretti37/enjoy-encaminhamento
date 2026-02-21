/**
 * Hiring Email Templates
 *
 * Email templates and sending functions for the hiring flow.
 * Extracted from hiring.ts for cleaner separation of concerns.
 */

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendEmail } from "./email";
import { ENV } from "../_core/env";

/**
 * Send email to candidate when they're selected for a job
 */
export async function sendCandidateSelectedEmail(
  email: string,
  candidateName: string,
  companyName: string,
  jobTitle: string,
  startDate: Date,
  hiringType: string
): Promise<void> {
  const formattedDate = format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const portalUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/candidate/contratos`;
  const isEstagio = hiringType === "estagio";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
        .info-box { background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #e5e7eb; }
        .celebration { font-size: 48px; text-align: center; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">Parabéns!</h1>
          <p style="margin:8px 0 0 0;">Você foi selecionado!</p>
        </div>
        <div class="content">
          <div class="celebration">🎉</div>
          <p>Olá ${candidateName},</p>
          <p>Temos uma ótima notícia! Você foi <strong>selecionado(a)</strong> para a vaga de <strong>${jobTitle}</strong>!</p>

          <div class="info-box">
            <p><strong>Empresa:</strong> ${companyName}</p>
            <p><strong>Vaga:</strong> ${jobTitle}</p>
            <p><strong>Tipo:</strong> ${isEstagio ? "Estágio" : "CLT"}</p>
            <p><strong>Início previsto:</strong> ${formattedDate}</p>
          </div>

          ${isEstagio ? `
          <p><strong>Próximos passos:</strong></p>
          <p>Você precisa assinar o contrato de estágio para finalizar sua contratação. Acesse o portal para visualizar e assinar seu contrato.</p>
          <a href="${portalUrl}" class="button">Acessar Meus Contratos</a>
          ` : `
          <p><strong>Próximos passos:</strong></p>
          <p>A empresa entrará em contato com você para os próximos passos da contratação.</p>
          `}

          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            Desejamos muito sucesso nessa nova jornada!
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail(
      email,
      `🎉 Parabéns! Você foi selecionado para ${jobTitle}`,
      emailHtml
    );
  } catch (err) {
    console.error("[Hiring] Failed to send candidate selected email:", err);
  }
}

/**
 * Send signing invitation email to a signer (candidate, parent, school)
 */
export async function sendSigningInvitationEmail(
  invitation: any,
  signerName: string,
  companyName: string,
  jobTitle: string,
  startDate: Date,
  candidateName?: string
): Promise<void> {
  const baseUrl = ENV.appUrl;
  const signingUrl = invitation.autentique_sign_url || `${baseUrl}/assinar/${invitation.token}`;
  const formattedDate = format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const roleLabel = invitation.signer_role === "candidate"
    ? "candidato"
    : invitation.signer_role === "parent_guardian"
    ? "responsável legal"
    : "instituição de ensino";

  const forCandidateText = candidateName
    ? `para o(a) candidato(a) <strong>${candidateName}</strong>`
    : "";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
        .info-box { background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">Assinatura de Contrato de Estágio</h1>
        </div>
        <div class="content">
          <p>Olá ${signerName},</p>
          <p>Você foi convidado como <strong>${roleLabel}</strong> para assinar o contrato de estágio ${forCandidateText}.</p>

          <div class="info-box">
            <p><strong>Empresa:</strong> ${companyName}</p>
            <p><strong>Vaga:</strong> ${jobTitle}</p>
            <p><strong>Início:</strong> ${formattedDate}</p>
          </div>

          <p>Clique no botão abaixo para acessar o documento e assinar digitalmente${invitation.autentique_sign_url ? " pela plataforma Autentique" : ""}.</p>

          <a href="${signingUrl}" class="button">Assinar Documento</a>

          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            ${invitation.autentique_sign_url ? "Você também receberá um email da Autentique com o link para assinatura." : "Este link expira em 7 dias."} Se tiver dúvidas, entre em contato com a empresa.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail(
      invitation.signer_email,
      `Assinatura de Contrato de Estágio - ${jobTitle}`,
      emailHtml
    );
  } catch (err) {
    console.error("[Hiring] Failed to send signing invitation email:", err);
  }
}

/**
 * Send email to candidate when all contract signatures are complete
 */
export async function sendContractCompleteEmail(
  candidateEmail: string,
  candidateName: string,
  companyName: string,
  jobTitle: string,
  startDate: Date
): Promise<void> {
  const formattedDate = format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #e5e7eb; }
        .check { font-size: 48px; text-align: center; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">Contrato Finalizado!</h1>
        </div>
        <div class="content">
          <div class="check">✅</div>
          <p>Olá ${candidateName},</p>
          <p>Ótima notícia! Todas as assinaturas do seu contrato de estágio foram coletadas com sucesso.</p>

          <div class="info-box">
            <p><strong>Empresa:</strong> ${companyName}</p>
            <p><strong>Vaga:</strong> ${jobTitle}</p>
            <p><strong>Início:</strong> ${formattedDate}</p>
          </div>

          <p><strong>Próximos passos:</strong></p>
          <ul>
            <li>Apresente-se na empresa na data de início</li>
            <li>Leve seus documentos pessoais</li>
            <li>Em caso de dúvidas, entre em contato com a empresa</li>
          </ul>

          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            Desejamos muito sucesso no seu estágio!
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail(
      candidateEmail,
      `✅ Contrato de estágio finalizado - ${jobTitle}`,
      emailHtml
    );
  } catch (err) {
    console.error("[Hiring] Failed to send contract complete email:", err);
  }
}
