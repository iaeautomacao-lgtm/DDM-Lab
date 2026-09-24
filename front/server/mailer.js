import nodemailer from "nodemailer";

// Duas formas de mandar e-mail, sem precisar de senha de caixa:
//
// 1) MAIL_TRANSPORT=sendmail — usa o sendmail local do proprio cPanel (o
//    mesmo mecanismo que o mail() do PHP usa). Como o app roda no mesmo
//    servidor da caixa wanoreply@grupoddm.ia.br, o Exim aceita o envio sem
//    autenticacao SMTP nenhuma. E o caminho recomendado aqui.
// 2) SMTP_HOST configurado — SMTP tradicional com usuario/senha da caixa.
// Sem nenhum dos dois: cai no log do console (dev).
const useSendmail = process.env.MAIL_TRANSPORT === "sendmail";
const hasSmtp = Boolean(process.env.SMTP_HOST);

const transport = useSendmail
  ? nodemailer.createTransport({
      sendmail: true,
      path: process.env.SENDMAIL_PATH || "/usr/sbin/sendmail",
      newline: "unix",
    })
  : hasSmtp
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
    console.log(`[mailer] (e-mail nao configurado) codigo de reset para ${email}: ${code}`);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "wanoreply@grupoddm.ia.br",
    to: email,
    subject,
    text,
  });
};
