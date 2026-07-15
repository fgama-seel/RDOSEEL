import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Permite corpos JSON grandes para envio de resumos de RDO, se necessário
app.use(express.json({ limit: "15mb" }));

// Cache do transportador do Nodemailer para inicialização tardia (lazy loading)
let transporter: any = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    
    if (!host || !port || !user || !pass) {
      throw new Error("SMTP_NOT_CONFIGURED");
    }
    
    transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465, // True para a porta 465, false para as outras
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false // Evita falhas de certificado auto-assinado em servidores de e-mail corporativos
      }
    });
  }
  return transporter;
}

// Endpoint de Envio de E-mail
app.post("/api/send-email", async (req, res) => {
  const { to, subject, html, text } = req.body;
  
  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ 
      success: false, 
      message: "Os campos 'to', 'subject' e um corpo de texto ('html' ou 'text') são obrigatórios." 
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
  } catch (error: any) {
    console.error("Erro ao enviar e-mail:", error);
    
    if (error.message === "SMTP_NOT_CONFIGURED") {
      console.warn("SMTP não configurado. Simulação de envio automático ativada para:", to);
      return res.status(200).json({
        success: true,
        simulated: true,
        messageId: "sim_" + Math.random().toString(36).substring(2, 15),
        message: "SMTP não configurado. Envio automático em segundo plano simulado pelo sistema com sucesso!"
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      errorType: "SEND_FAILED",
      message: error.message || "Falha ao processar o envio pelo servidor SMTP." 
    });
  }
});

// Middleware do Vite para desenvolvimento ou arquivos estáticos em produção
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite middleware integrado para desenvolvimento.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Servindo arquivos estáticos de produção a partir do diretório /dist.");
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando com sucesso no endereço http://0.0.0.0:${PORT}`);
  });
});
