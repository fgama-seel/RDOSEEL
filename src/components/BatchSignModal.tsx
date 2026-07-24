import React, { useState, useMemo } from "react";
import { 
  FileSignature, 
  LockOpen, 
  Search, 
  CheckSquare, 
  Square, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  Loader2,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { RdoReport, ObraConfig } from "../types";

type SignatureRole = "emitente" | "gerenciadora" | "contratante";

interface BatchSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: RdoReport[];
  currentObra: ObraConfig | null;
  user: any;
  accessLevel: string;
  saveReport: (report: RdoReport) => Promise<void>;
}

export const BatchSignModal: React.FC<BatchSignModalProps> = ({
  isOpen,
  onClose,
  reports,
  currentObra,
  user,
  accessLevel,
  saveReport
}) => {
  if (!isOpen) return null;

  // 1. Mode state: "nao_assinados" (to batch sign) vs "assinados" (to batch unsign)
  const [filterMode, setFilterMode] = useState<"nao_assinados" | "assinados">("nao_assinados");

  // 2. Signature role automatically determined by access level (user cannot change)
  const selectedRole = useMemo<SignatureRole>(() => {
    if (accessLevel === "fiscalizacao") return "contratante";
    if (accessLevel === "gerenciadora") return "gerenciadora";
    return "emitente";
  }, [accessLevel]);

  // 3. Signer Name Input
  const defaultSignerName = useMemo(() => {
    if (selectedRole === "emitente") {
      return currentObra?.emissorNomeDefault || user?.displayName || user?.email || "Engenheiro Responsável";
    }
    if (selectedRole === "gerenciadora") {
      return currentObra?.fiscalGerenciadoraNomeDefault || currentObra?.gerenciadora || user?.displayName || user?.email || "Fiscal / Gerenciadora";
    }
    return currentObra?.fiscalAprovadorNomeDefault || currentObra?.cliente || user?.displayName || user?.email || "Fiscal Contratante";
  }, [selectedRole, currentObra, user]);

  const [signerName, setSignerName] = useState(defaultSignerName);

  // Sync signerName whenever defaultSignerName changes
  React.useEffect(() => {
    setSignerName(defaultSignerName);
  }, [defaultSignerName]);

  // 4. Date and Search filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // 5. Selected RDO IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  // Feedback toast message state
  const [toastFeedback, setToastFeedback] = useState<{ type: "success" | "error" | "warning"; msg: string } | null>(null);

  // Filter reports belonging to active obra
  const obraReports = useMemo(() => {
    if (!currentObra) return reports || [];
    return (reports || []).filter(r => r.obraId === currentObra.id);
  }, [reports, currentObra]);

  // Helper to check if signed for selectedRole
  const isSignedByRole = (r: RdoReport, role: SignatureRole) => {
    if (role === "emitente") return Boolean(r.emitenteAssinado);
    if (role === "gerenciadora") return Boolean(r.gerenciadoraAssinado);
    return Boolean(r.contratanteAssinado);
  };

  // Filtered RDOs based on mode, role, dates, search
  const displayedReports = useMemo(() => {
    return obraReports.filter(r => {
      const signed = isSignedByRole(r, selectedRole);
      
      // Filter mode match
      if (filterMode === "nao_assinados") {
        if (signed) return false;
        // For fiscalização / gerenciadora, only show RDOs where emitente signed first
        if (selectedRole !== "emitente" && !r.emitenteAssinado) {
          return false;
        }
      }

      if (filterMode === "assinados") {
        if (!signed) return false;
      }

      // Date range filter
      if (startDate && r.data < startDate) return false;
      if (endDate && r.data > endDate) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = (r.rdoNo || "").toLowerCase().includes(q);
        const matchesDate = (r.data || "").includes(q);
        if (!matchesNo && !matchesDate) return false;
      }

      return true;
    }).sort((a, b) => (a.data || "").localeCompare(b.data || ""));
  }, [obraReports, filterMode, selectedRole, startDate, endDate, searchQuery]);

  // Reset selections when filters change
  React.useEffect(() => {
    setSelectedIds([]);
  }, [filterMode, selectedRole, startDate, endDate, searchQuery]);

  // Select all / Deselect all
  const isAllSelected = displayedReports.length > 0 && selectedIds.length === displayedReports.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedReports.map(r => r.id));
    }
  };

  const toggleSelectReport = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Helper to format PT-BR date
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
  };

  // Action: Execute Batch Sign (Assinar em Lote)
  const executeBatchSign = async () => {
    setToastFeedback(null);

    if (selectedIds.length === 0) {
      setToastFeedback({ type: "warning", msg: "Por favor, selecione ao menos um RDO na lista para assinar." });
      return;
    }

    const activeSignerName = signerName.trim() || defaultSignerName || "Signatário Responsável";

    setIsProcessing(true);
    let successCount = 0;

    try {
      const selectedReports = obraReports.filter(r => selectedIds.includes(r.id));
      const userEmail = user && 'email' in user ? (user.email || "") : "Usuário Logado";

      for (let i = 0; i < selectedReports.length; i++) {
        const report = selectedReports[i];
        setProgressMsg(`Assinando RDO ${report.rdoNo} (${i + 1}/${selectedReports.length})...`);

        const stampDate = new Date();
        const formattedDate = stampDate.toLocaleDateString("pt-BR");
        const formattedTime = stampDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        // Generate individual unique hash for each RDO
        const hashPrefix = selectedRole === "emitente" ? "emit_" : (selectedRole === "gerenciadora" ? "ger_" : "fisc_");
        const uniqueHash = hashPrefix + Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

        let updated = { ...report };

        if (selectedRole === "emitente") {
          const newSignedCount = 1 + (report.gerenciadoraAssinado ? 1 : 0) + (report.contratanteAssinado ? 1 : 0);
          const newStatus = newSignedCount === 3 ? "Assinado" : `Assinaturas Pendentes (${newSignedCount}/3)`;
          
          updated = {
            ...updated,
            emitenteAssinado: true,
            emitenteNome: activeSignerName,
            emitenteConsolidado: `Assinado digitalmente por ${activeSignerName} (${userEmail}) em ${formattedDate} às ${formattedTime}`,
            emitenteHash: uniqueHash,
            hasCommentNotification: false,
            status: newStatus
          };
        } else if (selectedRole === "gerenciadora") {
          const newSignedCount = (report.emitenteAssinado ? 1 : 0) + 1 + (report.contratanteAssinado ? 1 : 0);
          const newStatus = newSignedCount === 3 ? "Assinado" : `Assinaturas Pendentes (${newSignedCount}/3)`;

          updated = {
            ...updated,
            gerenciadoraAssinado: true,
            gerenciadoraConsolidado: `Assinado digitalmente por ${activeSignerName} (${userEmail}) em ${formattedDate} às ${formattedTime}`,
            gerenciadoraHash: uniqueHash,
            commentNotificationDate: new Date().toISOString(),
            commentNotificationSource: "Gerenciadora",
            status: newStatus
          };
        } else if (selectedRole === "contratante") {
          const newSignedCount = (report.emitenteAssinado ? 1 : 0) + (report.gerenciadoraAssinado ? 1 : 0) + 1;
          const newStatus = newSignedCount === 3 ? "Assinado" : `Assinaturas Pendentes (${newSignedCount}/3)`;

          updated = {
            ...updated,
            contratanteAssinado: true,
            contratanteAprovado: `Aprovado e assinado digitalmente por ${activeSignerName} (${userEmail}) em ${formattedDate} às ${formattedTime}`,
            contratanteHash: uniqueHash,
            commentNotificationDate: new Date().toISOString(),
            commentNotificationSource: "Fiscalização",
            status: newStatus
          };
        }

        await saveReport(updated);
        successCount++;
      }

      setToastFeedback({
        type: "success",
        msg: `Sucesso! ${successCount} RDO(s) foram assinados digitalmente em lote.`
      });
      setSelectedIds([]);
    } catch (err: any) {
      console.error("Erro na assinatura em lote:", err);
      setToastFeedback({
        type: "error",
        msg: "Ocorreu um erro durante a assinatura em lote: " + (err.message || err)
      });
    } finally {
      setIsProcessing(false);
      setProgressMsg("");
    }
  };

  // Action: Execute Batch Unsign / Remove Signature
  const executeBatchUnsign = async () => {
    setToastFeedback(null);

    if (selectedIds.length === 0) {
      setToastFeedback({ type: "warning", msg: "Por favor, selecione ao menos um RDO na lista para remover a assinatura." });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    try {
      const selectedReports = obraReports.filter(r => selectedIds.includes(r.id));

      for (let i = 0; i < selectedReports.length; i++) {
        const report = selectedReports[i];
        setProgressMsg(`Removendo assinatura RDO ${report.rdoNo} (${i + 1}/${selectedReports.length})...`);

        let updated = { ...report };

        if (selectedRole === "emitente") {
          const newSignedCount = 0 + (report.gerenciadoraAssinado ? 1 : 0) + (report.contratanteAssinado ? 1 : 0);
          const newStatus = newSignedCount === 0 ? "Enviado para Fiscalização" : `Assinaturas Pendentes (${newSignedCount}/3)`;

          updated = {
            ...updated,
            emitenteAssinado: false,
            emitenteConsolidado: "",
            emitenteHash: "",
            status: newStatus
          };
        } else if (selectedRole === "gerenciadora") {
          const newSignedCount = (report.emitenteAssinado ? 1 : 0) + 0 + (report.contratanteAssinado ? 1 : 0);
          const newStatus = newSignedCount === 0 ? "Enviado para Fiscalização" : `Assinaturas Pendentes (${newSignedCount}/3)`;

          updated = {
            ...updated,
            gerenciadoraAssinado: false,
            gerenciadoraConsolidado: "",
            gerenciadoraHash: "",
            status: newStatus
          };
        } else if (selectedRole === "contratante") {
          const newSignedCount = (report.emitenteAssinado ? 1 : 0) + (report.gerenciadoraAssinado ? 1 : 0) + 0;
          const newStatus = newSignedCount === 0 ? "Enviado para Fiscalização" : `Assinaturas Pendentes (${newSignedCount}/3)`;

          updated = {
            ...updated,
            contratanteAssinado: false,
            contratanteAprovado: "",
            contratanteHash: "",
            status: newStatus
          };
        }

        await saveReport(updated);
        successCount++;
      }

      setToastFeedback({
        type: "success",
        msg: `Sucesso! Assinaturas removidas de ${successCount} RDO(s) em lote.`
      });
      setSelectedIds([]);
    } catch (err: any) {
      console.error("Erro ao remover assinaturas em lote:", err);
      setToastFeedback({
        type: "error",
        msg: "Ocorreu um erro ao remover assinaturas: " + (err.message || err)
      });
    } finally {
      setIsProcessing(false);
      setProgressMsg("");
    }
  };

  const roleLabelMap: Record<SignatureRole, string> = {
    emitente: "Emitente (Contratada SEEL)",
    gerenciadora: "Gerenciadora / Fiscal Externa",
    contratante: "Fiscal do Contratante"
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 relative">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base tracking-tight leading-none text-white flex items-center gap-2">
                ASSINATURA E VALIDAÇÃO EM LOTE DE RDOS
              </h2>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">
                Obra: <span className="text-amber-400 font-bold">{currentObra?.nome || "Todas as Obras"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all border-none bg-transparent cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK TOAST BANNER */}
        {toastFeedback && (
          <div className={`p-3 px-6 text-xs font-bold flex items-center justify-between shrink-0 ${
            toastFeedback.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200" 
              : toastFeedback.type === "error"
                ? "bg-rose-50 text-rose-800 border-b border-rose-200"
                : "bg-amber-50 text-amber-900 border-b border-amber-200"
          }`}>
            <div className="flex items-center gap-2">
              {toastFeedback.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {toastFeedback.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
              {toastFeedback.type === "warning" && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
              <span>{toastFeedback.msg}</span>
            </div>
            <button
              onClick={() => setToastFeedback(null)}
              className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CONTROLS & FILTER BAR */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 space-y-4 shrink-0">
          
          {/* Row 1: Mode Switch Filter (Exibir Não Assinados x Exibir Assinados) & Role Switch */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Filter Mode Buttons */}
            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl gap-1">
              <button
                onClick={() => setFilterMode("nao_assinados")}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
                  filterMode === "nao_assinados"
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/50"
                }`}
              >
                <LockOpen className="w-3.5 h-3.5" />
                Exibir Não Assinados ({obraReports.filter(r => !isSignedByRole(r, selectedRole)).length})
              </button>

              <button
                onClick={() => setFilterMode("assinados")}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
                  filterMode === "assinados"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/50"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Exibir Assinados ({obraReports.filter(r => isSignedByRole(r, selectedRole)).length})
              </button>
            </div>

            {/* Role indicator (read-only based on user permissions) */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                Papel Signatário:
              </span>
              <span className="text-xs font-black text-slate-900 uppercase">
                {roleLabelMap[selectedRole]}
              </span>
            </div>
          </div>

          {/* Row 2: Signer Name input & Date Range Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            
            {/* Signer Name Input */}
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Nome do Responsável / Signatário:
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Nome do Engenheiro ou Fiscal..."
                className="w-full h-8 bg-white border border-slate-300 rounded-lg px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Date Start */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Data Início:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-8 bg-white border border-slate-300 rounded-lg px-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
              />
            </div>

            {/* Date End */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Data Fim:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-8 bg-white border border-slate-300 rounded-lg px-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
              />
            </div>

            {/* Quick Search */}
            <div className="sm:col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Buscar RDO nº:
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: 001, 002..."
                  className="w-full h-8 bg-white border border-slate-300 rounded-lg pl-8 pr-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* LIST TABLE CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white space-y-3">
          
          {/* Header Action Bar (Select All + Summary Count) */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <button
              onClick={toggleSelectAll}
              disabled={displayedReports.length === 0}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-amber-600 border-none bg-transparent cursor-pointer disabled:opacity-40"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-amber-500" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {isAllSelected ? "Desmarcar Todos" : "Selecionar Todos os RDOs"} ({displayedReports.length})
              </span>
            </button>

            <span className="text-[11px] font-extrabold text-slate-500">
              Selecionados: <strong className="text-amber-600 font-black">{selectedIds.length}</strong> de {displayedReports.length}
            </span>
          </div>

          {displayedReports.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic space-y-2">
              <Filter className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
              <p>Nenhum RDO encontrado para este filtro ({filterMode === "nao_assinados" ? "Não Assinados" : "Assinados"}).</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {displayedReports.map((report) => {
                const isChecked = selectedIds.includes(report.id);
                const isEmitSigned = Boolean(report.emitenteAssinado);
                const isGerSigned = Boolean(report.gerenciadoraAssinado);
                const isContrSigned = Boolean(report.contratanteAssinado);
                const totalSigned = (isEmitSigned ? 1 : 0) + (isGerSigned ? 1 : 0) + (isContrSigned ? 1 : 0);

                return (
                  <div
                    key={report.id}
                    onClick={() => toggleSelectReport(report.id)}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isChecked ? "bg-amber-50/70 hover:bg-amber-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 text-slate-600">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 font-mono">
                            RDO Nº {report.rdoNo}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            — {formatDateBR(report.data)}
                          </span>
                        </div>

                        {/* Status badges */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isEmitSigned ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-400"
                          }`}>
                            Emitente: {isEmitSigned ? "✓ Assinado" : "Pendente"}
                          </span>

                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isGerSigned ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-400"
                          }`}>
                            Gerenciadora: {isGerSigned ? "✓ Assinado" : "Pendente"}
                          </span>

                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isContrSigned ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-400"
                          }`}>
                            Fiscalização: {isContrSigned ? "✓ Assinado" : "Pendente"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right info */}
                    <div className="text-right shrink-0 space-y-0.5">
                      <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        totalSigned === 3 
                          ? "bg-emerald-100 text-emerald-800"
                          : totalSigned > 0 
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                      }`}>
                        {totalSigned === 3 ? "Totalmente Assinado (3/3)" : `${totalSigned}/3 Assinaturas`}
                      </span>

                      {filterMode === "assinados" && (
                        <p className="text-[9px] text-slate-400 font-mono line-clamp-1 max-w-[180px]">
                          Hash: {selectedRole === "emitente" ? report.emitenteHash : (selectedRole === "gerenciadora" ? report.gerenciadoraHash : report.contratanteHash)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER WITH BATCH ACTION BUTTONS */}
        <div className="p-4 sm:px-6 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 border-t border-slate-800">
          
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {filterMode === "nao_assinados" 
                ? "Cada RDO selecionado receberá um código hash de verificação único e individual."
                : "A remoção de assinatura cancelará os registros da função selecionada."}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial h-9 px-4 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-slate-700 bg-transparent cursor-pointer disabled:opacity-50"
            >
              Fechar
            </button>

            {/* Botão de Assinar em Lote */}
            {filterMode === "nao_assinados" && (
              <button
                onClick={executeBatchSign}
                disabled={isProcessing || selectedIds.length === 0}
                className="flex-1 sm:flex-initial h-9 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wide rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{progressMsg || "Processando..."}</span>
                  </>
                ) : (
                  <>
                    <FileSignature className="w-4 h-4 text-slate-950" />
                    <span>Assinar em Lote ({selectedIds.length})</span>
                  </>
                )}
              </button>
            )}

            {/* Botão de Remover Assinatura em Lote */}
            {filterMode === "assinados" && (
              <button
                onClick={executeBatchUnsign}
                disabled={isProcessing || selectedIds.length === 0}
                className="flex-1 sm:flex-initial h-9 px-5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wide rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{progressMsg || "Processando..."}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Remover Assinatura em Lote ({selectedIds.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
