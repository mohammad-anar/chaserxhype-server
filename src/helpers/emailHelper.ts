import config from "../config/index.js";
import nodemailer from "nodemailer";

export type ISendEmail = {
  to: string;
  subject: string;
  html: string;
};

const emailPort = Number(config.email.port) || 587;
const isSecure = emailPort === 465;
const isGmail = (config.email.host || "").includes("gmail") || (config.email.user || "").includes("@gmail.com");

const transporter = isGmail
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
  : nodemailer.createTransport({
      host: config.email.host || "smtp.gmail.com",
      port: emailPort,
      secure: isSecure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

const sendEmail = async (values: ISendEmail) => {
  const senderName = "Bean & Fien";
  const senderEmail = config.email.from || config.email.user || "onboarding@resend.dev";

  // ── Strategy 1: Resend HTTP API (Recommended for Cloud / Render) ──────────
  if (config.email.resend_api_key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.email.resend_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: [values.to],
          subject: values.subject,
          html: values.html,
        }),
      });

      const data = (await res.json()) as any;
      if (res.ok) {
        console.log(`✉️ Email successfully sent via Resend API to ${values.to} (ID: ${data.id})`);
        return data;
      } else {
        console.error(`❌ Resend API error:`, data);
      }
    } catch (resendErr: any) {
      console.error(`❌ Resend API request failed:`, resendErr.message);
    }
  }

  // ── Strategy 2: Brevo HTTP API ──────────────────────────────────────────
  if (config.email.brevo_api_key) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": config.email.brevo_api_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: values.to }],
          subject: values.subject,
          htmlContent: values.html,
        }),
      });

      const data = (await res.json()) as any;
      if (res.ok) {
        console.log(`✉️ Email successfully sent via Brevo API to ${values.to} (MessageId: ${data.messageId})`);
        return data;
      } else {
        console.error(`❌ Brevo API error:`, data);
      }
    } catch (brevoErr: any) {
      console.error(`❌ Brevo API request failed:`, brevoErr.message);
    }
  }

  // ── Strategy 3: Nodemailer SMTP (Localhost / unblocked networks) ──────────
  try {
    if (!config.email.user || !config.email.pass) {
      console.warn("⚠️ Email credentials not configured in environment. Skipping SMTP send.");
      return;
    }
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: values.to,
      subject: values.subject,
      html: values.html,
    });
    console.log(`✉️ Email successfully sent via SMTP to ${values.to} (Message ID: ${info.messageId})`);
    return info;
  } catch (error: any) {
    console.error(`❌ SMTP email sending failed for ${values.to}:`, error?.message || error);
    console.info(`💡 Tip: Render blocks outbound SMTP ports. Use a free RESEND_API_KEY or BREVO_API_KEY (over HTTPS) for 100% reliable cloud delivery.`);
  }
};

export const emailHelper = {
  sendEmail,
};
