import React, { useState, useEffect, useRef } from "react";
import { useRdoStore } from "../context/RdoContext";
import { 
  generateAndDownloadZipBackup, 
  parseBackupFile, 
  getWeeklyBackupStatus, 
  ParsedBackupResult,
  LAST_BACKUP_DATE_KEY
} from "../utils/backupUtils";
import { 
  X, 
  Archive, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  RefreshCw, 
  Layers, 
  Clock, 
  Calendar, 
  FileJson, 
  FolderArchive,
  HardDrive,
  Cloud,
  ChevronRight,
  Database
} from "lucide-react";
import { saveAs } from "file-saver";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const { 
    reports, 
    obras, 
    getAuditLogs, 
    user, 
    restoreBackupData, 
    isFirebase 
  } = useRdoStore();

  const [activeTab, setActiveTab] = useState<"export" | "restore" | "automation">("export");
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Status semanal
  const [backupStatus, setBackupStatus] = useState(getWeeklyBackupStatus());

  // Restore states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedBackupResult | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setBackupStatus(getWeeklyBackupStatus());
      setExportMessage(null);
      setRestoreSuccessMessage(null);
      setRestoreError(null);
      setSelectedFile(null);
      setParsedResult(null);
      setRestoreProgress(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. AÇÃO DE EXPORTAÇÃO ZIP
  const handleExportZip = async () => {
    setIsExporting(true);
    setExportMessage(null);
    try {
      let auditLogs = [];
      try {
        auditLogs = await getAuditLogs();
      } catch {}

      const result = await generateAndDownloadZipBackup(
        reports,
        obras,
        auditLogs,
        user?.email || "engenharia@seel.com.br"
      );

      setBackupStatus(getWeeklyBackupStatus());
      setExportMessage({
        text: `Arquivo "${result.fileName}" (${result.sizeMb} MB) gerado com sucesso! Guarde este arquivo em sua nuvem segura.`,
        type: "success"
      });
    } catch (err: any) {
      setExportMessage({
        text: "Erro ao gerar arquivo ZIP: " + (err.message || String(err)),
        type: "error"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 2. EXPORTAÇÃO APENAS JSON
  const handleExportJsonOnly = async () => {
    try {
      let auditLogs = [];
      try {
        auditLogs = await getAuditLogs();
      } catch {}

      const packageData = {
        metadata: {
          version: "2.0",
          app: "SEEL RDO",
          generatedAt: new Date().toISOString(),
          generatedBy: user?.email || "engenharia@seel.com.br",
          totalRdos: reports.length,
          totalObras: obras.length
        },
        rdos: reports,
        obras,
        auditLogs
      };

      const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: "application/json" });
      const now = new Date().toISOString().split("T")[0];
      saveAs(blob, `SEEL_RDO_SNAPSHOT_${now}.json`);
      
      setExportMessage({
        text: `Arquivo JSON baixado com sucesso contendo ${reports.length} RDO(s) e ${obras.length} Obra(s).`,
        type: "success"
      });
    } catch (err: any) {
      setExportMessage({
        text: "Erro ao exportar JSON: " + (err.message || String(err)),
        type: "error"
      });
    }
  };

  // 3. SELEÇÃO E LEITURA DE ARQUIVO PARA RESTAURAÇÃO
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsParsingFile(true);
    setRestoreError(null);
    setRestoreSuccessMessage(null);
    setParsedResult(null);

    try {
      const res = await parseBackupFile(file);
      setParsedResult(res);
      if (!res.isValid) {
        setRestoreError(res.error || "Arquivo de backup inválido.");
      }
    } catch (err: any) {
      setRestoreError("Erro ao processar arquivo: " + (err.message || String(err)));
    } finally {
      setIsParsingFile(false);
    }
  };

  // 4. CONFIRMAÇÃO DA RESTAURAÇÃO
  const handleConfirmRestore = async () => {
    if (!parsedResult || !parsedResult.isValid) return;

    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccessMessage(null);

    try {
      const res = await restoreBackupData(
        parsedResult.rdos,
        parsedResult.obras,
        parsedResult.auditLogs,
        restoreMode,
        (current, total, msg) => {
          setRestoreProgress({ current, total, message: msg });
        }
      );

      setRestoreSuccessMessage(
        `🎉 Restauração concluída com sucesso! ${res.rdosRestored} RDO(s) e ${res.obrasRestored} Obra(s) sincronizados no sistema.`
      );
      setBackupStatus(getWeeklyBackupStatus());
    } catch (err: any) {
      setRestoreError("Falha na restauração dos dados: " + (err.message || String(err)));
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* MODAL HEADER */}
        <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide uppercase">
                  Central de Backup & Redundância Total
                </h3>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                  ZIP / JSON
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Exportação de diários, contratos e restauração de dados para contingência semanal
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* STATUS BANNER SEMANAL */}
        <div className="bg-slate-950 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 text-xs shrink-0">
          <div className="flex items-center gap-2">
            {backupStatus.isOverdue ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5" />
                Backup Semanal Recomendado
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-green-400 font-bold bg-green-950/60 border border-green-800/80 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Redundância em Dia
              </span>
            )}
            <span className="text-slate-400 text-[11px]">
              {backupStatus.lastBackupDate 
                ? `Último backup: ${backupStatus.lastBackupDate} (${backupStatus.daysSinceLastBackup === 0 ? "hoje" : `há ${backupStatus.daysSinceLastBackup} dia(s)`})`
                : "Nenhum backup registrado nesta máquina ainda."}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Cloud className="w-3.5 h-3.5 text-amber-500" />
            <span>Guarde na nuvem: <strong>Google Drive / OneDrive</strong></span>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0">
          <button
            onClick={() => setActiveTab("export")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "export"
                ? "border-amber-600 text-amber-700 bg-white shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            }`}
          >
            <Download className="w-4 h-4 text-amber-600" />
            Exportar Backup Completo (.ZIP)
          </button>

          <button
            onClick={() => setActiveTab("restore")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "restore"
                ? "border-amber-600 text-amber-700 bg-white shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            }`}
          >
            <Upload className="w-4 h-4 text-amber-600" />
            Restaurar Dados (ZIP / JSON)
          </button>

          <button
            onClick={() => setActiveTab("automation")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "automation"
                ? "border-amber-600 text-amber-700 bg-white shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            Rotina & Redundância Semanal
          </button>
        </div>

        {/* CORPO PRINCIPAL SCROLLÁVEL */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 space-y-6">
          
          {/* ================================================================= */}
          {/* ABA 1: EXPORTAR BACKUP */}
          {/* ================================================================= */}
          {activeTab === "export" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              {/* Mensagem de sucesso/erro */}
              {exportMessage && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-xs animate-in fade-in ${
                  exportMessage.type === "success"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}>
                  {exportMessage.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs font-semibold leading-relaxed">
                    {exportMessage.text}
                  </div>
                </div>
              )}

              {/* Card Resumo do Snapshot */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                    <Database className="w-4 h-4 text-amber-600" />
                    <span>Dados Prontos para Exportação</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Sincronizado: {isFirebase ? "Firestore Online" : "Cache Local"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Diários de Obra (RDO)</span>
                    <span className="text-2xl font-black text-slate-900">{reports.length}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">relatórios completos</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Obras Cadastradas</span>
                    <span className="text-2xl font-black text-slate-900">{obras.length}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">contratos e catálogos PQ</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Formato de Saída</span>
                    <span className="text-xl font-black text-amber-600">.ZIP</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">JSON + Pastas Estruturadas</span>
                  </div>
                </div>

                {/* Estrutura do ZIP */}
                <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3.5 text-slate-700 text-xs space-y-1.5">
                  <span className="font-extrabold text-amber-950 block text-[11px] uppercase tracking-wider">
                    📁 O que estará dentro do seu arquivo .ZIP:
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    <li className="flex items-center gap-1.5">
                      <FileJson className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <strong>backup_completo_rdo.json:</strong> Pacote completo para restauração imediata em 1 clique.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <FolderArchive className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <strong>rdos_individuais/:</strong> Todos os {reports.length} RDOs salvos individualmente em JSON para consulta.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <strong>obras_configuracoes/:</strong> Catálogos de atividades, equipes e configurações de cada obra.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <strong>LEIAME_RESTAURACAO.txt:</strong> Guia de procedimento para restauração e contingência.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportZip}
                  disabled={isExporting}
                  className="flex-1 w-full py-3.5 px-5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-none"
                >
                  <Archive className={`w-4 h-4 ${isExporting ? "animate-spin" : ""}`} />
                  {isExporting ? "Gerando e Compactando Backup..." : "Gerar e Baixar Arquivo ZIP de Redundância"}
                </button>

                <button
                  type="button"
                  onClick={handleExportJsonOnly}
                  className="w-full sm:w-auto py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  title="Baixar apenas o arquivo JSON unificado"
                >
                  <FileJson className="w-4 h-4 text-slate-500" />
                  Baixar Apenas JSON
                </button>
              </div>

              {/* Dica de Segurança */}
              <div className="p-3.5 bg-slate-200/60 border border-slate-300/80 rounded-xl text-[11px] text-slate-600 leading-relaxed flex items-start gap-2.5">
                <Cloud className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Boas Práticas de Engenharia:</strong> Salve o arquivo .ZIP baixado em uma pasta compartilhada no Google Drive ou OneDrive da empresa chamada <code className="bg-white px-1 py-0.5 rounded text-amber-900 font-mono text-[10px]">SEEL/Backups_RDO</code>. Esse procedimento garante redundância semanal completa contra qualquer eventualidade.
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ABA 2: RESTAURAR DADOS */}
          {/* ================================================================= */}
          {activeTab === "restore" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              {/* Mensagens de Sucesso / Erro */}
              {restoreSuccessMessage && (
                <div className="p-4 rounded-xl border bg-green-50 border-green-200 text-green-900 flex items-start gap-3 shadow-xs animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="text-xs font-bold leading-relaxed">
                    {restoreSuccessMessage}
                  </div>
                </div>
              )}

              {restoreError && (
                <div className="p-4 rounded-xl border bg-red-50 border-red-200 text-red-900 flex items-start gap-3 shadow-xs animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs font-bold leading-relaxed">
                    {restoreError}
                  </div>
                </div>
              )}

              {/* Dropzone de Seleção de Arquivo (.ZIP ou .JSON) */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileChange(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-amber-500 bg-amber-50/60 scale-[1.01]"
                    : "border-slate-300 hover:border-amber-500 bg-white hover:bg-slate-50/80"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                />

                <div className="w-12 h-12 rounded-2xl bg-amber-100/80 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>

                <h4 className="font-extrabold text-sm text-slate-800">
                  Arraste e solte o arquivo de backup aqui, ou clique para procurar
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Formatos aceitos: <strong>.ZIP</strong> (pacote completo gerado pelo sistema) ou <strong>.JSON</strong> (snapshot consolidado)
                </p>
              </div>

              {/* Carregando / Analisando Arquivo */}
              {isParsingFile && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-bold text-amber-900 flex items-center justify-center gap-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                  Analisando e validando estrutura do arquivo de backup...
                </div>
              )}

              {/* Preview dos Dados Validados no Arquivo */}
              {parsedResult && parsedResult.isValid && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-green-700 font-extrabold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span>Backup Validado com Sucesso</span>
                    </div>
                    {selectedFile && (
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {selectedFile.name}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">RDOs Encontrados</span>
                      <span className="text-xl font-black text-slate-900">{parsedResult.rdos.length}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Obras Encontradas</span>
                      <span className="text-xl font-black text-slate-900">{parsedResult.obras.length}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Data do Backup</span>
                      <span className="text-xs font-bold text-slate-800 block mt-1">
                        {parsedResult.metadata?.generatedAt 
                          ? new Date(parsedResult.metadata.generatedAt).toLocaleDateString("pt-BR")
                          : "Recente"}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Autor</span>
                      <span className="text-xs font-bold text-slate-800 truncate block mt-1" title={parsedResult.metadata?.generatedBy || ""}>
                        {parsedResult.metadata?.generatedBy || "Engenharia"}
                      </span>
                    </div>
                  </div>

                  {/* Opção de Modo de Restauração */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-800 block">
                      Modo de Restauração:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        restoreMode === "merge"
                          ? "bg-amber-50 border-amber-300 ring-1 ring-amber-400 text-slate-900"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === "merge"}
                          onChange={() => setRestoreMode("merge")}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="text-xs leading-tight">
                          <strong className="block font-bold text-slate-900">Mesclar com Dados Atuais (Recomendado)</strong>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            Adiciona novos RDOs/Obras e atualiza os existentes. Nada do banco atual será excluído.
                          </span>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        restoreMode === "replace"
                          ? "bg-amber-50 border-amber-300 ring-1 ring-amber-400 text-slate-900"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>
                        <input
                          type="radio"
                          name="restoreMode"
                          value="replace"
                          checked={restoreMode === "replace"}
                          onChange={() => setRestoreMode("replace")}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="text-xs leading-tight">
                          <strong className="block font-bold text-slate-900">Substituição Completa</strong>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            Sincroniza o banco exatamente com os itens contidos neste arquivo de backup.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Barra de Progresso Durante Restauração */}
                  {isRestoring && restoreProgress && (
                    <div className="space-y-1.5 pt-3 bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                        <span>{restoreProgress.message}</span>
                        <span>{restoreProgress.current} / {restoreProgress.total}</span>
                      </div>
                      <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (restoreProgress.current / (restoreProgress.total || 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Botão de Confirmação de Restauração */}
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    disabled={isRestoring}
                    className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-none"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRestoring ? "animate-spin" : ""}`} />
                    {isRestoring ? "Restaurando Registros no Banco de Dados..." : "Confirmar e Restaurar Dados no Sistema"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* ABA 3: ROTINA & REDUNDÂNCIA SEMANAL */}
          {/* ================================================================= */}
          {activeTab === "automation" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-100 pb-3">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <span>Plano de Redundância e Proteção Semanal</span>
                </div>

                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    Para garantir <strong>tolerância zero à perda de dados</strong> em grandes obras de engenharia, a SEEL adota o protocolo de snapshot semanal.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="font-extrabold text-slate-900 block text-xs">1. Exportar ZIP</span>
                      <p className="text-[11px] text-slate-500">
                        1 vez por semana (ex: às sextas-feiras ou segundas), clique em "Exportar Backup Completo (.ZIP)".
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="font-extrabold text-slate-900 block text-xs">2. Nuvem Segura</span>
                      <p className="text-[11px] text-slate-500">
                        Faça o upload do arquivo ZIP no Google Drive, OneDrive ou servidor interno de rede da SEEL.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="font-extrabold text-slate-900 block text-xs">3. Restauração Fácil</span>
                      <p className="text-[11px] text-slate-500">
                        Se qualquer dispositivo for formatado ou trocado, basta abrir o modal e carregar o arquivo ZIP para restaurar tudo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Detalhado */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Frequência Recomendada:</span>
                    <span className="font-extrabold text-slate-900">A cada 7 dias</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Último Backup Realizado:</span>
                    <span className="font-semibold text-slate-800">{backupStatus.lastBackupDate || "Pendente"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Próximo Backup Recomendado:</span>
                    <span className="font-semibold text-amber-700">{backupStatus.nextRecommendedDate}</span>
                  </div>
                </div>

                {/* Botão de Disparo Direto */}
                <button
                  type="button"
                  onClick={handleExportZip}
                  disabled={isExporting}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-none"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? "Gerando Backup..." : "Executar Snapshot Semanal de Backup Agora (.ZIP)"}
                </button>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <footer className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-[11px] text-slate-500">
            SEEL Engenharia • Sistema de Redundância e Proteção de Dados
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </footer>

      </div>
    </div>
  );
};
