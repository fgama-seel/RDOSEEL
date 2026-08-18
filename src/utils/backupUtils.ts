import JSZip from "jszip";
import { saveAs } from "file-saver";
import { RdoReport, ObraConfig, AuditLog } from "../types";

export interface BackupMetadata {
  version: string;
  app: string;
  generatedAt: string;
  generatedBy: string;
  totalRdos: number;
  totalObras: number;
  totalAuditLogs: number;
  environment: string;
}

export interface BackupPackage {
  metadata: BackupMetadata;
  rdos: RdoReport[];
  obras: ObraConfig[];
  auditLogs?: AuditLog[];
}

export interface ParsedBackupResult {
  isValid: boolean;
  rdos: RdoReport[];
  obras: ObraConfig[];
  auditLogs?: AuditLog[];
  metadata?: Partial<BackupMetadata>;
  error?: string;
}

export const LAST_BACKUP_DATE_KEY = "seel_rdo_last_backup_date";
export const BACKUP_AUTO_PROMPT_KEY = "seel_rdo_backup_auto_prompt";
export const BACKUP_INTERVAL_DAYS = 7;

/**
 * Retorna os detalhes do status do backup semanal
 */
export function getWeeklyBackupStatus(): {
  lastBackupDate: string | null;
  daysSinceLastBackup: number;
  isOverdue: boolean;
  nextRecommendedDate: string;
} {
  const lastBackupStr = localStorage.getItem(LAST_BACKUP_DATE_KEY);
  if (!lastBackupStr) {
    const nextDate = new Date();
    return {
      lastBackupDate: null,
      daysSinceLastBackup: 999,
      isOverdue: true,
      nextRecommendedDate: nextDate.toLocaleDateString("pt-BR")
    };
  }

  const lastDate = new Date(lastBackupStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const nextRec = new Date(lastDate.getTime() + BACKUP_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

  return {
    lastBackupDate: lastDate.toLocaleString("pt-BR"),
    daysSinceLastBackup: diffDays,
    isOverdue: diffDays >= BACKUP_INTERVAL_DAYS,
    nextRecommendedDate: nextRec.toLocaleDateString("pt-BR")
  };
}

/**
 * Registra que um backup foi concluído com sucesso
 */
export function recordBackupCompletion(): void {
  localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date().toISOString());
}

/**
 * Sanitiza nomes de arquivos para evitar caracteres inválidos
 */
function sanitizeFileName(name: string): string {
  return (name || "sem_nome")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
}

/**
 * Gera e baixa o arquivo ZIP estruturado com todos os RDOs, Obras e Logs
 */
export async function generateAndDownloadZipBackup(
  rdos: RdoReport[],
  obras: ObraConfig[],
  auditLogs: AuditLog[] = [],
  userEmail: string = "engenharia@seel.com.br"
): Promise<{ success: boolean; fileName: string; sizeMb: string }> {
  const now = new Date();
  const dateStamp = now.toISOString().split("T")[0];
  const timeStamp = now.toTimeString().split(" ")[0].replace(/:/g, "");
  const formattedDateTime = now.toLocaleString("pt-BR");

  const metadata: BackupMetadata = {
    version: "2.0",
    app: "SEEL RDO - Relatório Diário de Obra",
    generatedAt: now.toISOString(),
    generatedBy: userEmail,
    totalRdos: rdos.length,
    totalObras: obras.length,
    totalAuditLogs: auditLogs.length,
    environment: "Produção / Nuvem SEEL"
  };

  const backupPackage: BackupPackage = {
    metadata,
    rdos,
    obras,
    auditLogs
  };

  const zip = new JSZip();

  // 1. Arquivo Snapshot Principal unificado JSON
  zip.file(
    "backup_completo_rdo.json",
    JSON.stringify(backupPackage, null, 2)
  );

  // 2. Pasta com RDOs individuais
  const rdosFolder = zip.folder("rdos_individuais");
  if (rdosFolder) {
    rdos.forEach((rdo) => {
      const rdoNumber = String(rdo.rdoNo || "000").padStart(3, "0");
      const rdoDate = rdo.data || "data-indefinida";
      const obraSafe = sanitizeFileName(rdo.obra || rdo.obraId || "obra");
      const rdoFileName = `RDO_${rdoNumber}_${rdoDate}_${obraSafe}.json`;
      rdosFolder.file(rdoFileName, JSON.stringify(rdo, null, 2));
    });
  }

  // 3. Pasta com Obras cadastradas individuais
  const obrasFolder = zip.folder("obras_configuracoes");
  if (obrasFolder) {
    obras.forEach((obra) => {
      const obraSafe = sanitizeFileName(obra.nome || obra.id || "obra");
      const obraFileName = `OBRA_${obraSafe}.json`;
      obrasFolder.file(obraFileName, JSON.stringify(obra, null, 2));
    });
  }

  // 4. Arquivo de instruções e integridade
  const readmeContent = `
======================================================================
SEEL SERVIÇOS DE ENGENHARIA LTDA
SISTEMA DE RELATÓRIO DIÁRIO DE OBRA (RDO)
PACOTE DE BACKUP E REDUNDÂNCIA TOTAL DE DADOS
======================================================================

Data e Hora de Geração : ${formattedDateTime}
Autor do Backup        : ${userEmail}
Total de Diários (RDO) : ${rdos.length}
Total de Obras         : ${obras.length}
Registros de Auditoria : ${auditLogs.length}

CONTEÚDO DO PACOTE:
----------------------------------------------------------------------
1. backup_completo_rdo.json
   Arquivo snapshot consolidado com todos os dados estruturados para
   restauração direta no sistema.

2. rdos_individuais/
   Pasta contendo cada diário de obra em arquivo individual formatado JSON.

3. obras_configuracoes/
   Pasta contendo os contratos, catálogos de atividades PQ, equipes
   e parametrizações de cada obra.

COMO RESTAURAR OS DADOS EM CASO DE CONTINGÊNCIA:
----------------------------------------------------------------------
1. Acesse o sistema RDO no navegador.
2. Na barra superior, clique em "Backup & Redundância".
3. Selecione a aba "Restaurar Dados".
4. Carregue este arquivo .ZIP completo ou o arquivo "backup_completo_rdo.json".
5. O sistema validará todos os registros e você poderá restaurá-los
   imediatamente no banco de dados e no cache local.

RECOMENDAÇÃO DE SEGURANÇA:
Armazene este arquivo em sua nuvem corporativa (Google Drive / OneDrive)
para garantir redundância semanal total.
======================================================================
`.trim();

  zip.file("LEIAME_RESTAURACAO.txt", readmeContent);

  // 5. Gera o blob e dispara download
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });

  const zipFileName = `SEEL_RDO_BACKUP_TOTAL_${dateStamp}_${timeStamp}.zip`;
  saveAs(blob, zipFileName);

  // Registra a conclusão
  recordBackupCompletion();

  const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
  return { success: true, fileName: zipFileName, sizeMb };
}

/**
 * Lê e analisa um arquivo de backup (.zip ou .json)
 */
export async function parseBackupFile(file: File): Promise<ParsedBackupResult> {
  const fileName = file.name.toLowerCase();

  try {
    // Caso 1: Arquivo .ZIP
    if (fileName.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(file);

      // Procura pelo arquivo principal snapshot
      const mainJsonFile = zip.file("backup_completo_rdo.json");
      if (mainJsonFile) {
        const text = await mainJsonFile.async("text");
        const parsed = JSON.parse(text);
        return validateAndExtractPackage(parsed);
      }

      // Se não achar o consolidado, reconstrói a partir dos arquivos individuais
      const rdos: RdoReport[] = [];
      const obras: ObraConfig[] = [];

      const rdoPromises: Promise<void>[] = [];
      zip.folder("rdos_individuais")?.forEach((_, zipEntry) => {
        if (!zipEntry.dir && zipEntry.name.endsWith(".json")) {
          rdoPromises.push(
            zipEntry.async("text").then(t => {
              try {
                rdos.push(JSON.parse(t));
              } catch {}
            })
          );
        }
      });

      const obraPromises: Promise<void>[] = [];
      zip.folder("obras_configuracoes")?.forEach((_, zipEntry) => {
        if (!zipEntry.dir && zipEntry.name.endsWith(".json")) {
          obraPromises.push(
            zipEntry.async("text").then(t => {
              try {
                obras.push(JSON.parse(t));
              } catch {}
            })
          );
        }
      });

      await Promise.all([...rdoPromises, ...obraPromises]);

      if (rdos.length === 0 && obras.length === 0) {
        return {
          isValid: false,
          rdos: [],
          obras: [],
          error: "O arquivo .ZIP selecionado não contém registros válidos de RDO ou Obras."
        };
      }

      return {
        isValid: true,
        rdos,
        obras,
        metadata: {
          totalRdos: rdos.length,
          totalObras: obras.length,
          generatedAt: new Date().toISOString()
        }
      };
    }

    // Caso 2: Arquivo .JSON
    if (fileName.endsWith(".json")) {
      const text = await file.text();
      const parsed = JSON.parse(text);
      return validateAndExtractPackage(parsed);
    }

    return {
      isValid: false,
      rdos: [],
      obras: [],
      error: "Formato de arquivo não suportado. Por favor selecione um arquivo .ZIP ou .JSON."
    };
  } catch (err: any) {
    return {
      isValid: false,
      rdos: [],
      obras: [],
      error: "Erro ao processar o arquivo de backup: " + (err.message || String(err))
    };
  }
}

/**
 * Valida a integridade do pacote JSON
 */
function validateAndExtractPackage(parsed: any): ParsedBackupResult {
  if (!parsed || typeof parsed !== "object") {
    return {
      isValid: false,
      rdos: [],
      obras: [],
      error: "O arquivo JSON é inválido ou está corrompido."
    };
  }

  // Se for um pacote completo com { metadata, rdos, obras }
  if (Array.isArray(parsed.rdos) || Array.isArray(parsed.obras)) {
    const rdos: RdoReport[] = Array.isArray(parsed.rdos) ? parsed.rdos : [];
    const obras: ObraConfig[] = Array.isArray(parsed.obras) ? parsed.obras : [];
    const auditLogs: AuditLog[] = Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [];

    return {
      isValid: true,
      rdos,
      obras,
      auditLogs,
      metadata: parsed.metadata || {
        totalRdos: rdos.length,
        totalObras: obras.length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  // Se for um array puro de RDOs
  if (Array.isArray(parsed)) {
    const isRdosList = parsed.some(item => item && (item.rdoNo !== undefined || item.obra !== undefined));
    if (isRdosList) {
      return {
        isValid: true,
        rdos: parsed as RdoReport[],
        obras: [],
        metadata: {
          totalRdos: parsed.length,
          totalObras: 0,
          generatedAt: new Date().toISOString()
        }
      };
    }
  }

  return {
    isValid: false,
    rdos: [],
    obras: [],
    error: "A estrutura do arquivo não corresponde a um backup de RDOs ou Obras da SEEL."
  };
}
