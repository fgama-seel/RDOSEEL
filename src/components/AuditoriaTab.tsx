import React, { useEffect, useState } from "react";
import { 
  Activity, 
  Clock, 
  User, 
  ShieldAlert, 
  Download, 
  Database, 
  HardDrive, 
  Server, 
  FileText, 
  CheckCircle2, 
  BarChart3, 
  Zap, 
  RefreshCw,
  Layers,
  Cpu,
  Archive
} from "lucide-react";
import { useRdoStore } from "../context/RdoContext";
import { AuditLog } from "../types";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import firebaseConfig from "../../firebase-applet-config.json";
import { BackupSubTab } from "./BackupSubTab";
import { getWeeklyBackupStatus } from "../utils/backupUtils";

export const AuditoriaTab: React.FC = () => {
  const { getAuditLogs, isGlobalAdmin, reports, obras, isFirebase, isLocalFallback } = useRdoStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"logs" | "backup" | "firebase">("logs");
  const weeklyStatus = getWeeklyBackupStatus();

  useEffect(() => {
    if (isGlobalAdmin) {
      loadLogs();
    }
  }, [isGlobalAdmin]);

  const loadLogs = async () => {
    setIsLoading(true);
    const result = await getAuditLogs();
    setLogs(result);
    setIsLoading(false);
  };

  const handleExportExcel = () => {
    if (logs.length === 0) return;

    const dataToExport = logs.map(log => ({
      Data: new Date(log.timestamp).toLocaleString("pt-BR"),
      Ação: log.action,
      Usuário: log.userEmail,
      Detalhes: log.details
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoria");

    // Formatar colunas
    const wscols = [
      { wch: 20 }, // Data
      { wch: 15 }, // Ação
      { wch: 25 }, // Usuário
      { wch: 60 }  // Detalhes
    ];
    worksheet["!cols"] = wscols;

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    saveAs(data, `RDO_Auditoria_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Cálculo de consumo do Firebase
  const reportsSize = JSON.stringify(reports || []).length;
  const obrasSize = JSON.stringify(obras || []).length;
  const logsSize = JSON.stringify(logs || []).length;
  const totalSizeBytes = reportsSize + obrasSize + logsSize;
  const totalSizeKB = (totalSizeBytes / 1024).toFixed(2);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(3);

  const totalDocsCount = (reports?.length || 0) + (obras?.length || 0) + (logs?.length || 0);

  // Estimativas de consumo de operações (plano Spark)
  const estimatedReads = totalDocsCount * 2 + 10;
  const estimatedWrites = (logs?.length || 0) + (reports?.length || 0);

  // Cotas diárias do Firebase Spark
  const SPARK_READ_QUOTA = 50000;
  const SPARK_WRITE_QUOTA = 20000;
  const SPARK_STORAGE_MB_QUOTA = 1024; // 1 GB

  const readUsagePercent = Math.min(100, (estimatedReads / SPARK_READ_QUOTA) * 100);
  const writeUsagePercent = Math.min(100, (estimatedWrites / SPARK_WRITE_QUOTA) * 100);
  const storageUsagePercent = Math.min(100, (parseFloat(totalSizeMB) / SPARK_STORAGE_MB_QUOTA) * 100);

  if (!isGlobalAdmin) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-slate-800">Acesso Negado</h2>
        <p className="text-sm text-slate-500">Você não tem permissão para acessar a área de auditoria e consumo do sistema.</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden flex flex-col font-sans animate-fade-in">
      {/* HEADER DAS SUB-ABAS */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-indigo-700">
            <Activity className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider text-sm">Auditoria & Monitoramento</h2>
          </div>

          <div className="flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/60 ml-2">
            <button
              onClick={() => setActiveSubTab("logs")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeSubTab === "logs"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Logs de Auditoria ({logs.length})
            </button>
            <button
              onClick={() => setActiveSubTab("backup")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer relative ${
                activeSubTab === "backup"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-amber-600" />
              <span>Backup & Redundância</span>
              {weeklyStatus.isOverdue && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab("firebase")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeSubTab === "firebase"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Database className="w-3.5 h-3.5 text-amber-600" />
              Consumo Firebase
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === "logs" && (
            <button
              onClick={handleExportExcel}
              disabled={logs.length === 0}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-emerald-600 border border-emerald-700 rounded shadow-xs hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Exportar para Excel"
            >
              <Download className="w-3.5 h-3.5" />
              Excel
            </button>
          )}
          {activeSubTab === "logs" && (
            <button
              onClick={loadLogs}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-white border border-slate-300 rounded shadow-xs hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          )}
        </div>
      </div>
      
      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSubTab === "backup" ? (
          /* ABA DE BACKUP & REDUNDÂNCIA */
          <BackupSubTab />
        ) : activeSubTab === "firebase" ? (
          /* ABA DE CONSUMO FIREBASE */
          <div className="space-y-5 max-w-5xl mx-auto">
            {/* CARD DE STATUS DA INSTÂNCIA */}
            <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-lg">
                    <Database className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base tracking-wide">Firebase Firestore Database</h3>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        isFirebase && !isLocalFallback 
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {isFirebase && !isLocalFallback ? "Firestore Ativo / Conectado" : "Modo Fallback Local"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 font-mono">
                      Database ID: <span className="text-amber-300 font-bold">{firebaseConfig.firestoreDatabaseId || "default"}</span> | Project: <span className="text-slate-200">{firebaseConfig.projectId}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-300 border-l border-slate-700/60 pl-4 hidden sm:block">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Auth Domain</p>
                  <p className="font-mono text-slate-200 font-semibold">{firebaseConfig.authDomain}</p>
                </div>
              </div>
            </div>

            {/* MÉTRICAS RÁPIDAS DE CONSUMO */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Armazenamento</span>
                  <HardDrive className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-lg font-black text-slate-800">{totalSizeKB} <span className="text-xs font-normal text-slate-500">KB</span></div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">~{totalSizeMB} MB ocupados</p>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total de Documentos</span>
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-lg font-black text-slate-800">{totalDocsCount} <span className="text-xs font-normal text-slate-500">docs</span></div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">RDOs, Obras e Logs</p>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Leituras (Est.)</span>
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-lg font-black text-slate-800">{estimatedReads} <span className="text-xs font-normal text-slate-500">reads</span></div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Cota diária: 50k</p>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Escritas (Est.)</span>
                  <Zap className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-lg font-black text-slate-800">{estimatedWrites} <span className="text-xs font-normal text-slate-500">writes</span></div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Cota diária: 20k</p>
              </div>
            </div>

            {/* BARRAS DE USO DA COTA DO FIREBASE (SPARK PLAN) */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  Monitoramento de Cotas Diárias (Plano Gratuito / Spark)
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">Limites do Firestore</span>
              </div>

              <div className="space-y-3">
                {/* Leituras */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-700">Leituras de Documentos (Reads)</span>
                    <span className="font-mono text-slate-600">{estimatedReads} / {SPARK_READ_QUOTA.toLocaleString("pt-BR")} ({readUsagePercent.toFixed(2)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(1, readUsagePercent)}%` }}></div>
                  </div>
                </div>

                {/* Escritas */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-700">Gravações de Documentos (Writes)</span>
                    <span className="font-mono text-slate-600">{estimatedWrites} / {SPARK_WRITE_QUOTA.toLocaleString("pt-BR")} ({writeUsagePercent.toFixed(2)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(1, writeUsagePercent)}%` }}></div>
                  </div>
                </div>

                {/* Armazenamento */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-700">Espaço de Armazenamento (Storage)</span>
                    <span className="font-mono text-slate-600">{totalSizeMB} MB / 1.024 MB (1 GB) ({storageUsagePercent.toFixed(3)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${Math.max(1, storageUsagePercent)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* DETALHAMENTO DAS COLEÇÕES */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Detalhamento por Coleção
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Coleção Reports */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono font-bold text-xs text-indigo-700">/reports</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">RDOs</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Documentos:</span>
                      <span className="font-mono font-bold text-slate-800">{reports?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tamanho Estimado:</span>
                      <span className="font-mono font-bold text-slate-800">{(reportsSize / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>

                {/* Coleção Obras */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono font-bold text-xs text-blue-700">/obras</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">Projetos</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Documentos:</span>
                      <span className="font-mono font-bold text-slate-800">{obras?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tamanho Estimado:</span>
                      <span className="font-mono font-bold text-slate-800">{(obrasSize / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>

                {/* Coleção Audit Logs */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono font-bold text-xs text-emerald-700">/audit_logs</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">Auditoria</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Documentos:</span>
                      <span className="font-mono font-bold text-slate-800">{logs?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tamanho Estimado:</span>
                      <span className="font-mono font-bold text-slate-800">{(logsSize / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ABA DE LOGS DE AUDITORIA */
          isLoading ? (
            <div className="flex justify-center items-center h-full">
              <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Activity className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Nenhum log de auditoria encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, i) => (
                <div key={log.id || i} className="flex gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="shrink-0 mt-1 text-slate-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800">
                        {log.action}
                      </p>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 break-words">
                      {log.details}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-400">
                      <User className="w-3 h-3" />
                      {log.userEmail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

