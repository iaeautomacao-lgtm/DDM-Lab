import nodemailer from "nodemailer";

// Sem SMTP configurado: cai para log no console (dev). Em producao no cPanel,
// configure SMTP_HOST/PORT/USER/PASS (a maioria dos planos cPanel tem SMTP
// local em localhost:587 para o dominio do e-mail).
const hasSmtp = Boolean(process.env.SMTP_HOST);

const transport = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    })
  : null;

export const sendPasswordResetCode = async (email, code) => {
  const subject = "DDM Lab — Codigo de recuperacao de senha";
  const text = `Seu codigo de recuperacao e: ${code}\n\nExpira em 15 minutos. Se voce nao solicitou, ignore este e-mail.`;

  if (!transport) {
    console.log(`[mailer] (SMTP nao configurado) codigo de reset para ${email}: ${code}`);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    text,
  });
};
