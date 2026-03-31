// Email helper functions for routers
import nodemailer from "nodemailer";
import { ENV } from "../_core/env";

// Create email transporter
export function createEmailTransporter() {
  return nodemailer.createTransport({
    host: ENV.smtp.host,
    port: ENV.smtp.port,
    secure: false, // true for 465, false for other ports
    auth: {
      user: ENV.smtp.user,
      pass: ENV.smtp.pass,
    },
  });
}

// Helper function to send emails
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!ENV.smtp.isConfigured()) {
    console.error("[Email] SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env");
    throw new Error("Envio de e-mail não está configurado. Contate o administrador.");
  }

  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: ENV.smtp.emailFrom,
      to,
      subject,
      html,
    });
    console.log("[Email] Sent successfully to:", to);
    return true;
  } catch (err: any) {
    console.error("[Email] Failed to send:", err.message);
    throw new Error(`Falha ao enviar e-mail: ${err.message}`);
  }
}
