import React, { useState, useEffect, useRef } from "react";
import { useRdoStore } from "../context/RdoContext";
import { 
  generateAndDownloadZipBackup, 
  parseBackupFile, 
  getWeeklyBackupStatus, 
  ParsedBackupResult 
} from "../utils/backupUtils";
import { 
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
  Database,
  Info
} from "lucide-react";
import { saveAs } from "file-saver";

export const BackupSubTab: React.FC = () => {
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
    setBackupStatus(getWeeklyBackupStatus());
  }, []);

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
        text: `Arquivo "${result.fileName}" (${result.sizeMb} MB) gerado com sucesso! Salve uma cópia na nuvem da SEEL (Google Drive / OneDrive).`,
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
        text: `Arquivo JSON consolidado baixado com sucesso contendo ${reports.length} RDO(s) e ${obras.length} Obra(s).`,
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
    <div className="space-y-5 max-w-5xl mx-auto font-sans animate-fade-in">
      
      {/* BANNER DE CABEÇALHO DO BACKUP */}
      <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 shrink-0 shadow-inner">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-wide uppercase">
                  Central de Backup & Redundância de Dados
                </h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  ZIP / JSON
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Exportação de pacotes completos em arquivo .ZIP, restauração de emergência e rotina semanal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {backupStatus.isOverdue ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/70 border border-amber-700/80 px-3 py-1.5 rounded-lg shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Backup Semanal Recomendado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/80 px-3 py-1.5 rounded-lg shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Redundância em Dia</span>
              </div>
            )}
          </div>
        </div>

        {/* STATUS DA DATA DO ÚLTIMO BACKUP */}
        <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <span className="text-[11px]">
            <strong>Último Backup:</strong>{" "}
            {backupStatus.lastBackupDate 
              ? `${backupStatus.lastBackupDate} (${backupStatus.daysSinceLastBackup === 0 ? "hoje" : `há ${backupStatus.daysSinceLastBackup} dia(s)`})`
              : "Nenhum backup registrado neste navegador ainda."}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            Destino Corporativo: <strong>Google Drive / OneDrive SEEL</strong>
          </span>
        </div>
      </div>

      {/* SUB-SELETOR DE AÇÕES (EXPORTAR / RESTAURAR / ROTINA) */}
      <div className="flex border-b border-slate-200 bg-slate-100/70 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab("export")}
          className={`flex-1 py-2 px-3 font-bold text-xs flex items-center justify-center gap-2 rounded-lg transition-all cursor-pointer ${
            activeTab === "export"
              ? "bg-white text-amber-800 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <Download className="w-4 h-4 text-amber-600" />
          <span>Exportar Pacote .ZIP</span>
        </button>

        <button
          onClick={() => setActiveTab("restore")}
          className={`flex-1 py-2 px-3 font-bold text-xs flex items-center justify-center gap-2 rounded-lg transition-all cursor-pointer ${
            activeTab === "restore"
              ? "bg-white text-amber-800 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <Upload className="w-4 h-4 text-amber-600" />
          <span>Restaurar Dados (ZIP/JSON)</span>
        </button>

        <button
          onClick={() => setActiveTab("automation")}
          className={`flex-1 py-2 px-3 font-bold text-xs flex items-center justify-center gap-2 rounded-lg transition-all cursor-pointer ${
            activeTab === "automation"
              ? "bg-white text-amber-800 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Rotina Semanal & Manual</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      
      {/* ================================================================= */}
      {/* ABA 1: EXPORTAR BACKUP */}
      {/* ================================================================= */}
      {activeTab === "export" && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Mensagem de sucesso/erro */}
          {exportMessage && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-xs ${
              exportMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}>
              {exportMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs font-semibold leading-relaxed">
                {exportMessage.text}
              </div>
            </div>
          )}

          {/* Cards de Métricas de Registros */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <Database className="w-4 h-4 text-amber-600" />
                <span>Resumo dos Registros Prontos para Backup</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Conexão: <strong>{isFirebase ? "Firestore Online" : "Armazenamento Local"}</strong>
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

            {/* Estrutura Interna do Arquivo .ZIP */}
            <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3.5 text-slate-700 text-xs space-y-2">
              <span className="font-extrabold text-amber-950 block text-[11px] uppercase tracking-wider">
                📁 Estrutura Interna do Pacote .ZIP Gerado:
              </span>
              <ul className="space-y-1.5 text-[11px] text-slate-700">
                <li className="flex items-center gap-1.5">
                  <FileJson className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <strong>backup_completo_rdo.json:</strong> Snapshot unificado para restauração instantânea em 1 clique.
                </li>
                <li className="flex items-center gap-1.5">
                  <FolderArchive className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <strong>rdos_individuais/:</strong> Todos os {reports.length} diários salvos individualmente em JSON legível.
                </li>
                <li className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <strong>obras_configuracoes/:</strong> Catálogos de atividades (PQ), equipes e configurações de cada contrato.
                </li>
                <li className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <strong>LEIAME_RESTAURACAO.txt:</strong> Guia de procedimento técnico para contingência.
                </li>
              </ul>
            </div>
          </div>

          {/* Botões de Ação de Download */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleExportZip}
              disabled={isExporting}
              className="flex-1 w-full py-3 px-5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-none"
            >
              <Archive className={`w-4 h-4 ${isExporting ? "animate-spin" : ""}`} />
              {isExporting ? "Gerando e Compactando Backup..." : "Gerar e Baixar Pacote Completo (.ZIP)"}
            </button>

            <button
              type="button"
              onClick={handleExportJsonOnly}
              className="w-full sm:w-auto py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              title="Baixar apenas o arquivo JSON unificado"
            >
              <FileJson className="w-4 h-4 text-slate-500" />
              Baixar Apenas JSON
            </button>
          </div>

          {/* Dica de Segurança */}
          <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed flex items-start gap-2.5">
            <Cloud className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">Diretriz Corporativa SEEL:</strong> Salve o arquivo .ZIP gerado em uma pasta segura no Google Drive ou OneDrive da empresa chamada <code className="bg-white px-1.5 py-0.5 rounded text-amber-900 font-mono text-[10px] border border-slate-200">SEEL/Backups_RDO</code>. Isso garante redundância física e lógica total.
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ABA 2: RESTAURAR DADOS */}
      {/* ================================================================= */}
      {activeTab === "restore" && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Mensagens de Sucesso / Erro */}
          {restoreSuccessMessage && (
            <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed">
                {restoreSuccessMessage}
              </div>
            </div>
          )}

          {restoreError && (
            <div className="p-4 rounded-xl border bg-red-50 border-red-200 text-red-900 flex items-start gap-3 shadow-xs">
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
              Arraste e solte o arquivo de backup (.ZIP ou .JSON) aqui, ou clique para selecionar
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Formatos aceitos: <strong>.ZIP</strong> (pacote completo gerado pelo sistema) ou <strong>.JSON</strong> (snapshot unificado)
            </p>
          </div>

          {/* Carregando / Analisando Arquivo */}
          {isParsingFile && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-bold text-amber-900 flex items-center justify-center gap-2 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
              Analisando e validando integridade do arquivo de backup...
            </div>
          )}

          {/* Preview dos Dados Validados no Arquivo */}
          {parsedResult && parsedResult.isValid && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Arquivo de Backup Validado</span>
                </div>
                {selectedFile && (
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
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
                  Selecione o Modo de Restauração:
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
                        Adiciona novos RDOs/Obras e atualiza existentes. Não apaga nada do banco atual.
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
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-none"
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
        <div className="space-y-4 animate-fade-in">
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>Protocolo de Redundância e Proteção Semanal</span>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Para assegurar <strong>tolerância zero à perda de dados</strong> em grandes obras e contratos, o time de engenharia da SEEL segue o fluxo de snapshot semanal:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center">1</div>
                  <span className="font-extrabold text-slate-900 block text-xs">Exportar Pacote .ZIP</span>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Uma vez por semana (às sextas ou segundas), clique em "Exportar Pacote .ZIP" para baixar o arquivo completo.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">2</div>
                  <span className="font-extrabold text-slate-900 block text-xs">Armazenamento Corporativo</span>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Faça o upload do arquivo ZIP na nuvem da empresa (Google Drive ou OneDrive) na pasta <code className="text-amber-900 bg-amber-100/60 px-1 py-0.5 rounded text-[10px]">SEEL/Backups_RDO</code>.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">3</div>
                  <span className="font-extrabold text-slate-900 block text-xs">Restauração Instantânea</span>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Em caso de troca de computador, basta acessar esta sub-aba, arrastar o ZIP e restaurar 100% dos RDOs e Obras.
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
  );
};
