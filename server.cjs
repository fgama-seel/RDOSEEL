var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "15mb" }));
var transporter = null;
function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !port || !user || !pass) {
      throw new Error("SMTP_NOT_CONFIGURED");
    }
    transporter = import_nodemailer.default.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      // True para a porta 465, false para as outras
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
        // Evita falhas de certificado auto-assinado em servidores de e-mail corporativos
      }
    });
  }
  return transporter;
}
app.post("/api/send-email", async (req, res) => {
  const { to, subject, html, text } = req.body;
  if (!to || !subject || !html && !text) {
    return res.status(400).json({
      success: false,
      message: "Os campos 'to', 'subject' e um corpo de texto ('html' ou 'text') s\xE3o obrigat\xF3rios."
    });
  }
  try {
    const mailTransporter = getTransporter();
    const mailFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
    const info = await mailTransporter.sendMail({
      from: `"SEEL RDO" <${mailFrom}>`,
      to,
      subject,
      text,
      html
    });
    console.log("E-mail enviado com sucesso:", info.messageId);
    return res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    if (error.message === "SMTP_NOT_CONFIGURED") {
      console.warn("SMTP n\xE3o configurado. Simula\xE7\xE3o de envio autom\xE1tico ativada para:", to);
      return res.status(200).json({
        success: true,
        simulated: true,
        messageId: "sim_" + Math.random().toString(36).substring(2, 15),
        message: "SMTP n\xE3o configurado. Envio autom\xE1tico em segundo plano simulado pelo sistema com sucesso!"
      });
    }
    return res.status(500).json({
      success: false,
      errorType: "SEND_FAILED",
      message: error.message || "Falha ao processar o envio pelo servidor SMTP."
    });
  }
});
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite middleware integrado para desenvolvimento.");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("Servindo arquivos est\xE1ticos de produ\xE7\xE3o a partir do diret\xF3rio /dist.");
  }
}
setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando com sucesso no endere\xE7o http://0.0.0.0:${PORT}`);
  });
});
//# sourceMappingURL=server.cjs.map
