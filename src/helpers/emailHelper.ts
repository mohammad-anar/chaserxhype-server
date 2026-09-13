import config from "../config/index.js";
import nodemailer from "nodemailer";

export type ISendEmail = {
  to: string;
  subject: string;
  html: string;
};

const emailPort = Number(config.email.port) || 587;
const isSecure = emailPort === 465;

const transporter = nodemailer.createTransport({
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
  connectionTimeout: 8000, // 8s max connection timeout
  greetingTimeout: 8000,
  socketTimeout: 10000,
});

const sendEmail = async (values: ISendEmail) => {
  try {
    if (!config.email.user || !config.email.pass) {
      console.warn("⚠️ Email credentials not set in environment. Skipping email dispatch.");
      return;
    }
    const info = await transporter.sendMail({
      from: `"Bean & Fien" <${config.email.from || config.email.user}>`,
      to: values.to,
      subject: values.subject,
      html: values.html,
    });
    console.log(`✉️ Email successfully sent to ${values.to} (Message ID: ${info.messageId})`);
    return info;
  } catch (error: any) {
    console.error(`❌ Email sending failed for ${values.to}:`, error?.message || error);
  }
};

export const emailHelper = {
  sendEmail,
};
