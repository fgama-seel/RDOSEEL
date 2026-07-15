/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { RdoProvider, useRdoStore } from "./context/RdoContext";
import { AuthScreen } from "./components/AuthScreen";
import { RdoEditor } from "./components/RdoEditor";
import { RdoPrintView } from "./components/RdoPrintView";
import { ObraManagerModal } from "./components/ObraManagerModal";
import { ConsolidatedReports } from "./components/ConsolidatedReports";
import { AuditoriaTab } from "./components/AuditoriaTab";
import { RdoReport } from "./types";
import { 
  HardHat, 
  Trash2, 
  Plus, 
  Search, 
  LogOut, 
  CloudRain, 
  FileText, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  Info,
  Activity,
  Calendar,
  Printer,
  BarChart3
} from "lucide-react";

// Formatting helper
const formatDateString = (dateStr: string): string => {
  if (!dateStr) return "-";
  const dateObj = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
  return dateObj.toLocaleDateString("pt-BR", options);
};

const getWeekDay = (dateStr: string): string => {
  if (!dateStr) return "";
  const dateObj = new Date(dateStr + "T12:00:00");
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return weekDays[dateObj.getDay()];
};

function AppContent() {
  const { 
    user, 
    isLoading, 
    isFirebase, 
    reports, 
    currentReport, 
    setCurrentReport, 
    logout, 
    saveReport, 
    deleteReport, 
    createNewReport,
    obras,
    currentObra,
    setCurrentObra,
    isGlobalAdmin,
    getAuditLogs
  } = useRdoStore();

  const currentUserEmail = user && 'email' in user ? (user.email?.toLowerCase() || "") : "";
  const permission = currentObra?.permissoes?.find(p => p?.email?.toLowerCase() === currentUserEmail);
  const accessLevel = permission ? permission.access : (currentObra?.userId === user?.uid ? "owner" : "view");
  const canManageObras = isGlobalAdmin || (accessLevel !== "view" && accessLevel !== "fiscalizacao" && accessLevel !== "gerenciadora");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "Em Digitação" | "Finalizado" | "Assinado">("todos");
  const [activeView, setActiveView] = useState<"rdo" | "relatorios" | "auditoria">("rdo");
  const [showPrintView, setShowPrintView] = useState(false);
  const [showBatchPrint, setShowBatchPrint] = useState(false);
  const [showBatchPrintConfig, setShowBatchPrintConfig] = useState(false);
  const [batchStartDate, setBatchStartDate] = useState("");
  const [batchEndDate, setBatchEndDate] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showObraManager, setShowObraManager] = useState(false);
  const [batchPrintMode, setBatchPrintMode] = useState<"single" | "individual">("single");

  // Collect all finalized reports for the active worksite to print in batch
  const finalizedReportsToPrint = (reports || []).filter(r => {
    const isFinalized = (r.status || "Em Digitação") === "Finalizado";
    if (currentObra) {
      return isFinalized && r.obraId === currentObra.id;
    }
    return isFinalized;
  });

  // Computa a lista de RDOs filtrados chronologicamente para o lote
  const batchReportsSelected = React.useMemo(() => {
    return [...finalizedReportsToPrint]
      .filter(r => {
        if (batchStartDate && r.data < batchStartDate) return false;
        if (batchEndDate && r.data > batchEndDate) return false;
        return true;
      })
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [finalizedReportsToPrint, batchStartDate, batchEndDate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col items-center shadow-lg max-w-sm w-full text-center">
          <HardHat className="w-12 h-12 text-[#004899] animate-spin" />
          <h3 className="text-sm font-bold text-gray-800 uppercase mt-4 tracking-wider">Diário de Obras RDO</h3>
          <p className="text-xs text-gray-500 mt-2">Carregando informações e conectando ao banco de dados...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Filter RDO reports based on search, status AND worksite selection
  const filteredReports = reports.filter(r => {
    const matchesSearch = (r.rdoNo || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
                          (r.obra || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
                          (r.data || "").includes(searchTerm || "");
    const matchesStatus = statusFilter === "todos" || (r.status || "Em Digitação") === statusFilter;
    if (currentObra) {
      return matchesSearch && matchesStatus && r.obraId === currentObra.id;
    }
    return matchesSearch && matchesStatus;
  }).sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  // Collect all finalized reports for the active worksite to print in batch
  const handleCreateNewRdo = async () => {
    try {
      const freshTemplate = createNewReport();
      await saveReport(freshTemplate);
    } catch (e) {
      console.warn("RDO creation prevented:", e);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setShowDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      await deleteReport(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased text-xs overflow-hidden">
      
      {/* 1. TOP HEADER NAVIGATION - High Density Compact Format */}
      <header className="bg-white border-b border-slate-200 h-14 shrink-0 px-5 md:px-6 flex items-center justify-between no-print shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-500 text-slate-900 p-1.5 rounded flex items-center justify-center">
              <HardHat className="w-4 h-4 text-slate-900" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-slate-950 leading-none">RDO WEB SEEL</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">SEEL ENGENHARIA</p>
            </div>
          </div>

          <div className="h-6 border-l border-slate-200 hidden md:block"></div>

          {/* View Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 shadow-inner">
            <button
              onClick={() => { setActiveView("rdo"); setShowPrintView(false); }}
              className={`px-3 h-8 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                activeView === "rdo"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              Diários (RDO)
            </button>
            <button
              onClick={() => { setActiveView("relatorios"); setShowPrintView(false); }}
              className={`px-3 h-8 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                activeView === "relatorios"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Relatórios Gerenciais
            </button>
            {isGlobalAdmin && (
              <button
                onClick={() => { setActiveView("auditoria"); setShowPrintView(false); }}
                className={`px-3 h-8 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                  activeView === "auditoria"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Auditoria
              </button>
            )}
          </div>
        </div>

        {/* Database status and user info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Acesso Engenharia</span>
            <span className="text-xs font-semibold text-slate-700">{user.email}</span>
          </div>

          <div className="h-6 border-l border-slate-200 hidden sm:block"></div>

          {isFirebase ? (
            <div className="bg-green-50 border border-green-150 px-2.5 py-0.5 rounded text-[10px] font-bold text-green-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              BANCO DE DADOS SINCRONIZADO
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded text-[10px] font-bold text-amber-800 flex items-center gap-1" title="Seu diário é salvo com segurança no LocalStorage do seu navegador">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              LOCAL RASCUNHO
            </div>
          )}

          <button
            onClick={() => logout()}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
            title="Sair da conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. BODY GENERAL CONTAINER */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
        
        {/* SIDEBAR: HISTORY LOG LIST (Left column) - Slate-900 High Density */}
        <aside className="w-full sm:w-72 bg-slate-900 flex flex-col shrink-0 sm:border-r border-b sm:border-b-0 border-slate-950 no-print text-slate-300 sm:h-full max-h-[40vh] sm:max-h-none overflow-hidden">
          
          {/* Worksite Active Select and Settings Trigger */}
          <div className="p-4 pb-2 border-b border-slate-800/80 space-y-1.5 shrink-0 bg-slate-950/60">
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Obra Ativa</label>
              {canManageObras && (
                <button
                  onClick={() => setShowObraManager(true)}
                  className="text-[9px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider hover:underline"
                >
                  Gerenciar Obras
                </button>
              )}
            </div>
            <select
              value={currentObra?.id || ""}
              onChange={(e) => {
                const found = obras.find(o => o.id === e.target.value);
                if (found) {
                  setCurrentObra(found);
                }
              }}
              className="w-full bg-slate-800 border-none rounded text-xs py-1.5 px-2 text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none font-semibold cursor-pointer"
            >
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Create Button & Search bar */}
          <div className="p-4 pt-3 border-b border-slate-850 space-y-3 shrink-0 bg-slate-950/20">
            <button
              onClick={handleCreateNewRdo}
              className="w-full h-9 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-sm outline-none cursor-pointer"
            >
              <Plus className="w-4 h-4 text-yellow-105" />
              NOVO DIÁRIO DE OBRA (RDO)
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar histórico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border-none rounded text-xs py-1.5 pl-9 pr-3 text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Filtro de Status RDO */}
            <div className="grid grid-cols-4 gap-1 bg-slate-950/50 p-1 rounded border border-slate-800">
              <button
                onClick={() => setStatusFilter("todos")}
                className={`py-1 rounded text-[8.5px] uppercase font-bold transition-all border-none cursor-pointer leading-tight ${
                  statusFilter === "todos"
                    ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter("Em Digitação")}
                className={`py-1 rounded text-[8.5px] uppercase font-bold transition-all border-none cursor-pointer leading-tight ${
                  statusFilter === "Em Digitação"
                    ? "bg-amber-400 text-slate-950 font-black shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Digitação
              </button>
              <button
                onClick={() => setStatusFilter("Finalizado")}
                className={`py-1 rounded text-[8.5px] uppercase font-bold transition-all border-none cursor-pointer leading-tight ${
                  statusFilter === "Finalizado"
                    ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Fechados
              </button>
              <button
                onClick={() => setStatusFilter("Assinado")}
                className={`py-1 rounded text-[8.5px] uppercase font-bold transition-all border-none cursor-pointer leading-tight ${
                  statusFilter === "Assinado"
                    ? "bg-sky-500 text-slate-950 font-black shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Assinados
              </button>
            </div>
          </div>

          {/* History listing log */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-4 py-2 bg-slate-950/70 text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-850">
              <span>Registros Recentes</span>
              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[9px]">{filteredReports.length}</span>
            </div>

            {finalizedReportsToPrint.length > 0 && (
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800/80 flex justify-between items-center shrink-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Lote de Finalizados ({finalizedReportsToPrint.length})</span>
                <button
                  onClick={() => setShowBatchPrintConfig(true)}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold uppercase tracking-wider px-2 py-1 border-none cursor-pointer transition-all shadow-sm leading-none"
                >
                  <Printer className="w-3 h-3" />
                  Imprimir Lote
                </button>
              </div>
            )}

            <div className="divide-y divide-slate-800/50">
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => {
                  const isSelected = currentReport?.id === report.id;
                  const totalRain = report.precipitacao?.total || 0;
                  
                  return (
                    <div
                      key={report.id}
                      onClick={() => {
                        setCurrentReport(report);
                        setShowPrintView(false);
                      }}
                      className={`px-4 py-3.5 cursor-pointer transition-all border-l-4 relative ${
                        isSelected 
                          ? "bg-amber-500/10 border-amber-500" 
                          : "border-transparent hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-xs font-bold font-mono tracking-wider ${isSelected ? "text-white" : "text-slate-300"}`}>
                            {report.rdoNo}
                          </span>
                          <span className={`text-[8px] font-bold uppercase tracking-wider ${
                            (report.status || "Em Digitação") === "Assinado"
                              ? "text-sky-400 bg-sky-500/10 border border-sky-500/20"
                              : (report.status || "Em Digitação") === "Finalizado" 
                                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" 
                                : "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                          } px-1 rounded w-fit`}>
                            {report.status || "Em Digitação"}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 leading-none ${
                          isSelected ? "text-amber-300 bg-amber-500/10" : "text-slate-400 bg-slate-850"
                        }`}>
                          <Calendar className={`w-3 h-3 ${isSelected ? "text-amber-400" : "text-slate-500"}`} />
                          {getWeekDay(report.data).toUpperCase()}
                        </span>
                      </div>

                      <p className={`text-[11px] font-semibold truncate mt-1 ${isSelected ? "text-amber-100" : "text-slate-400"}`}>
                        {report.obra || "Sem especificação"}
                      </p>

                      <div className="flex items-center justify-between mt-2.5 text-[9px] text-slate-500 font-mono">
                        <span>{formatDateString(report.data)}</span>
                        
                        <div className="flex items-center gap-1.5">
                          {totalRain > 0 && (
                            <span className={`flex items-center gap-0.5 font-semibold px-1 rounded ${
                              isSelected ? "text-blue-300 bg-blue-500/10" : "text-blue-400 bg-slate-850"
                            }`}>
                              <CloudRain className="w-3 h-3" />
                              {totalRain}mm
                            </span>
                          )}
                          <button
                            onClick={(e) => handleDeleteClick(e, report.id!)}
                            className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                            title="Excluir do histórico"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs italic space-y-1">
                  <FileText className="w-7 h-7 text-slate-700 mx-auto" />
                  <p>Nenhum diário encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ACTIVE WORKSPACE AREA: Form editor on select */}
        <main className="flex-1 bg-slate-50/50 overflow-y-auto p-5 no-print">
          {activeView === "auditoria" && isGlobalAdmin ? (
            <AuditoriaTab />
          ) : activeView === "relatorios" ? (
            <ConsolidatedReports />
          ) : currentReport ? (
            <RdoEditor onShowPrint={() => setShowPrintView(true)} />
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-4 max-w-md mx-auto">
              <div className="bg-blue-50 text-blue-700 p-4 rounded-full">
                <Calendar className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800">Seja Bem-vindo ao RDO Web</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Este sistema foi modelado para preenchimento rápido e emissão do diário no formato padrão das gerenciadoras para SEEL / SABESP. Selecione um registro no histórico ou clique no botão para criar.
              </p>
              <button
                onClick={handleCreateNewRdo}
                className="bg-[#004899] hover:bg-blue-800 text-white font-semibold text-xs px-4 py-2 rounded-lg"
              >
                Criar Primeiro Relatório
              </button>
            </div>
          )}
        </main>
      </div>

      {/* 3. SHOW THE PRISTINE PRINT OVERLAY */}
      {showPrintView && currentReport && (
        <RdoPrintView 
          report={currentReport} 
          onClose={() => setShowPrintView(false)} 
        />
      )}

      {/* 4. SHOW THE BATCH PRINT OVERLAY */}
      {showBatchPrint && batchReportsSelected.length > 0 && (
        <RdoPrintView
          reportsToPrint={batchReportsSelected}
          onClose={() => setShowBatchPrint(false)}
          batchPrintedMode={batchPrintMode}
        />
      )}

      {/* MODAL CONFIGURAÇÃO IMPRESSÃO EM LOTE */}
      {showBatchPrintConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border p-6 max-w-md w-full shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Printer className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="font-bold text-sm text-gray-950 uppercase tracking-wide">Impressão em Lote (PDF)</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-tight font-semibold">Defina o período dos diários finalizados</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Data de Início</label>
                <input
                  type="date"
                  value={batchStartDate}
                  onChange={(e) => setBatchStartDate(e.target.value)}
                  className="w-full h-9 rounded-lg border-gray-200 border text-xs px-2.5 text-gray-700 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Data de Fim</label>
                <input
                  type="date"
                  value={batchEndDate}
                  onChange={(e) => setBatchEndDate(e.target.value)}
                  className="w-full h-9 rounded-lg border-gray-200 border text-xs px-2.5 text-gray-700 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Modo de Exportação */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-gray-500">Formato do PDF resultante</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBatchPrintMode("single")}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs uppercase tracking-wide flex flex-col items-center justify-center gap-0.5 min-h-12 ${
                    batchPrintMode === "single"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                      : "border-gray-200 text-gray-500 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-bold text-[10px]">Arquivo Único</span>
                  <span className="text-[8px] font-medium text-gray-400 normal-case">Todos os dias juntos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBatchPrintMode("individual")}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs uppercase tracking-wide flex flex-col items-center justify-center gap-0.5 min-h-12 ${
                    batchPrintMode === "individual"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                      : "border-gray-200 text-gray-500 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-bold text-[10px]">Arquivos Separados</span>
                  <span className="text-[8px] font-medium text-gray-400 normal-case">Separado por dia</span>
                </button>
              </div>
            </div>

            {/* List of reports matching the dates */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar">
              <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-2">
                Diários Selecionados ({batchReportsSelected.length})
              </span>
              {batchReportsSelected.length > 0 ? (
                <div className="space-y-1">
                  {batchReportsSelected.map((r, i) => (
                    <div key={r.id || r.rdoNo || i} className="flex justify-between items-center text-[10px] text-gray-700 font-mono py-1 border-b border-gray-100 last:border-b-0">
                      <span className="font-bold text-slate-800">{r.rdoNo}</span>
                      <span className="text-gray-500">{formatDateString(r.data)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 italic text-center py-4">Nenhum RDO finalizado encontrado para este período.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowBatchPrintConfig(false);
                  setBatchStartDate("");
                  setBatchEndDate("");
                }}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={batchReportsSelected.length === 0}
                onClick={() => {
                  setShowBatchPrintConfig(false);
                  setShowBatchPrint(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Visualizar Lote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DELETE CONFIRMATION */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border p-5 max-w-sm w-full shadow-xl space-y-4">
            <h4 className="font-bold text-gray-900">Excluir Relatório Diário de Obras?</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Tem certeza que deseja remover este registro do seu diário de obras? Esta operação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-3.5 py-1.5 border border-gray-200 text-gray-600 rounded font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-semibold"
              >
                Sim, Excluir Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. WORKSITE CONFIGURATION CONTROLS PANEL */}
      <ObraManagerModal 
        isOpen={showObraManager} 
        onClose={() => setShowObraManager(false)} 
      />

    </div>
  );
}

export default function App() {
  return (
    <RdoProvider>
      <AppContent />
    </RdoProvider>
  );
}
