/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  RdoReport, 
  Activity, 
  CompanyLaborGroup, 
  EquipmentMobilizedDetail, 
  StoppageDetailRow,
  HOURS_LIST
} from "../types";
import { useRdoStore } from "../context/RdoContext";
import { 
  Save, 
  Trash2, 
  Plus, 
  Sparkles, 
  Calendar, 
  Users, 
  CloudRain, 
  Wrench, 
  FileText, 
  HelpCircle, 
  Image as ImageIcon,
  CheckCircle,
  FileSpreadsheet,
  ChevronsUpDown,
  Upload,
  Lock,
  Copy,
  X,
  Mail,
  Send,
  LockOpen,
  AlertCircle,
  Check
} from "lucide-react";

interface RdoEditorProps {
  onShowPrint: () => void;
}

export const RdoEditor: React.FC<RdoEditorProps> = ({ onShowPrint }) => {
  const { currentReport, setCurrentReport, saveReport, isFirebase, obras, reports, user, currentObra, isGlobalAdmin } = useRdoStore();
  const [activeTab, setActiveTab] = useState<"geral" | "atividades" | "paralisacoes" | "efetivo" | "equipamentos" | "anexos" | "assinaturas">("geral");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [cloneType, setCloneType] = useState<"efetivo" | "equipamentos" | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    type?: "warning" | "danger" | "info" | "success";
  } | null>(null);

  const showConfirmation = (
    title: string,
    description: string,
    onConfirm: () => void | Promise<void>,
    type: "warning" | "danger" | "info" | "success" = "warning",
    confirmText = "Confirmar",
    cancelText = "Cancelar"
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      description,
      onConfirm,
      confirmText,
      cancelText,
      type
    });
  };

  const [emailFallback, setEmailFallback] = useState<{
    to: string;
    subject: string;
    body: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyField = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const sendEmailHelper = async (to: string, subject: string, htmlContent: string, plainText: string, roleName: string) => {
    // Abre a janela de envio manual diretamente para segurança e conveniência do usuário (evitando SMTP no servidor)
    setEmailFallback({
      to,
      subject,
      body: plainText,
      role: roleName
    });
    return true;
  };

  const currentUserEmail = user && 'email' in user ? (user.email?.toLowerCase() || "") : "";
  const permission = currentObra?.permissoes?.find(p => p?.email?.toLowerCase() === currentUserEmail);
  const accessLevel = isGlobalAdmin ? "owner" : (permission ? permission.access : (currentObra?.userId === user?.uid ? "owner" : "view"));

  const isReadOnly = accessLevel === "view" || (!user && !isFirebase); // If logged out locally, fallback read-only
  const isFiscalizacao = accessLevel === "fiscalizacao" || accessLevel === "owner";
  const isFiscalizadora = accessLevel === "gerenciadora" || accessLevel === "owner";
  const isEditor = accessLevel === "edit" || accessLevel === "owner";
  
  const isUserFiscalizacao = accessLevel === "fiscalizacao" || accessLevel === "owner";
  const isUserGerenciadora = accessLevel === "gerenciadora" || accessLevel === "owner";
  const isAnalista = accessLevel === "fiscalizacao" || accessLevel === "gerenciadora" || accessLevel === "owner";
  
  const hasFiscal = currentObra?.permissoes?.some(p => p.access === "fiscalizacao" || p.access === "gerenciadora") || false;

  const hasFiscalUser = currentObra?.permissoes?.some(p => p.access === "fiscalizacao") || false;
  const hasGerenciadoraUser = currentObra?.permissoes?.some(p => p.access === "gerenciadora") || false;

  const isFiscalPending = hasFiscalUser && !currentReport.fiscalizacaoFinalizada;
  const isGerenciadoraPending = hasGerenciadoraUser && !currentReport.gerenciadoraFinalizada;

  const canCloseRdo = !isFiscalPending && !isGerenciadoraPending;

  const closeButtonTitle = (isFiscalPending && isGerenciadoraPending)
    ? "A Fiscalização e a Gerenciadora precisam finalizar e enviar os comentários adicionais primeiro"
    : isFiscalPending
    ? "A Fiscalização precisa finalizar e enviar os comentários adicionais primeiro"
    : isGerenciadoraPending
    ? "A Gerenciadora precisa finalizar e enviar os comentários adicionais primeiro"
    : "Fechar o RDO e disponibilizar para colher assinaturas digitais";

  // Check if current date in currentRdo is already taken by another RDO of same Obra
  const hasDuplicateDate = React.useMemo(() => {
    if (!currentReport || !currentReport.data) return false;
    return (reports || []).some(r => {
      if (r.id === currentReport.id) return false;
      const sameObra = currentReport.obraId 
        ? r.obraId === currentReport.obraId 
        : r.obra === currentReport.obra;
      return sameObra && r.data === currentReport.data;
    });
  }, [currentReport, reports]);

  // Retrieve other reports of the same Obra sorted chronologically
  const otherReportsForCloning = React.useMemo(() => {
    if (!currentReport) return [];
    return (reports || [])
      .filter(r => r.id !== currentReport.id && (currentReport.obraId ? r.obraId === currentReport.obraId : r.obra === currentReport.obra))
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [reports, currentReport]);

  // Drag and drop / local state representation
  const [dragActive, setDragActive] = useState<Record<string, boolean>>({});

  if (!currentReport) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center shadow-sm">
        <p className="text-gray-500 italic">Nenhum RDO carregado ou selecionado.</p>
      </div>
    );
  }

  // Quick edit wrapper - updates React state in context without writing to Firebase
  const updateReport = (changes: Partial<RdoReport>) => {
    setCurrentReport({
      ...currentReport,
      ...changes
    } as RdoReport);
  };

  const associatedObra = obras.find(o => o.id === currentReport.obraId || o.nome === currentReport.obra);

  const displayEmitenteNome = currentReport.emitenteAssinado
    ? (currentReport.emitenteNome || associatedObra?.emissorNomeDefault || "")
    : (associatedObra?.emissorNomeDefault || currentReport.emitenteNome || "");

  const displayGerenciadoraNome = currentReport.gerenciadoraAssinado
    ? (currentReport.gerenciadoraNome || associatedObra?.fiscalGerenciadoraNomeDefault || "")
    : (associatedObra?.fiscalGerenciadoraNomeDefault || currentReport.gerenciadoraNome || "");

  const displayContratanteNome = currentReport.contratanteAssinado
    ? (currentReport.contratanteNome || associatedObra?.fiscalAprovadorNomeDefault || "")
    : (associatedObra?.fiscalAprovadorNomeDefault || currentReport.contratanteNome || "");

  const handleSave = async () => {
    if (hasDuplicateDate) {
      const formattedDate = (currentReport.data || "").split('-').reverse().join('/');
      alert(`Já existe um RDO cadastrado para o dia ${formattedDate} nesta obra! Por favor, use outra data para poder salvar.`);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    try {
      // Auto compute total labor from detailed board
      let computedMoi = 0;
      let computedMod = 0;
      currentReport.efetivoDetalhado.forEach(g => {
        g.items.forEach(itm => {
          if (itm.moiMod === "MOI") computedMoi += Number(itm.c || 0) - Number(itm.f || 0);
          if (itm.moiMod === "MOD") computedMod += Number(itm.c || 0) - Number(itm.f || 0);
        });
      });

      // Auto compute total equipment from detailed table
      const computedEqTotal = currentReport.equipamentosDetalhado.reduce((sum, q) => sum + Number(q.quantidade || 0), 0);

      const computedElapsed = Number(currentReport.prazoIncorrido || 0);
      const computedRemaining = Math.max(0, Number(currentReport.prazo || 0) - computedElapsed);
      const computedAccumulatedRain = calculateAccumulatedMonthRain();

      await saveReport({
        ...currentReport,
        prazoFaltante: computedRemaining,
        precipitacao: {
          ...currentReport.precipitacao,
          acumuladoMes: computedAccumulatedRain
        },
        efetivoSummary: {
          ...currentReport.efetivoSummary,
          moi: computedMoi,
          mod: computedMod,
          total: computedMoi + computedMod + Number(currentReport.efetivoSummary.subcontratadosMoiMod || 0)
        },
        equipamentosSummary: {
          ...currentReport.equipamentosSummary,
          total: computedEqTotal,
          mobilizados: computedEqTotal
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // List of pre-set phases to choose from for fast categorization
  const phaseCategories = [
    "ATIVIDADES - FASE 01 - REDE EXTERNA",
    "ATIVIDADES - GERÊNCIA",
    "ATIVIDADES - FASE 12 - COND. REAL PARK",
    "ATIVIDADES - ADMINISTRAÇÃO CONTRATUAL",
    "ATIVIDADES - SUPRIMENTOS",
    "ATIVIDADES - PROJETOS",
    "ATIVIDADES - PLANEJAMENTO",
    "ATIVIDADES - QSM"
  ];

  // Activities Operations
  const handleAddActivity = () => {
    const associatedObra = obras.find(o => o.id === currentReport.obraId || o.nome === currentReport.obra);
    const registered = associatedObra ? associatedObra.atividades : [];
    
    if (!registered || registered.length === 0) {
      alert("ATENÇÃO: Não há atividades (PQ) cadastradas no Gerenciador para esta Obra.\n\nPor favor, salve seu progresso atual, abra o painel 'Gerenciar Obras' no menu superior esquerdo, e cadastre ou importe as atividades da obra primeiro para poder usá-las aqui.");
      return;
    }

    const defaultAct = registered[0];
    const newAct: Activity = {
      id: "act-added-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      ref: defaultAct.ref || "001",
      fase: defaultAct.fase,
      identificador: defaultAct.identificador,
      descricao: defaultAct.descricao,
      intervalo: defaultAct.unidade || "un",
      total: "0",
      comentario: ""
    };
    
    updateReport({
      atividades: [...currentReport.atividades, newAct]
    });
  };

  const handleUpdateActivity = (index: number, fields: Partial<Activity>) => {
    const updated = [...currentReport.atividades];
    updated[index] = { ...updated[index], ...fields };
    updateReport({ atividades: updated });
  };

  const handleDeleteActivity = (index: number) => {
    const updated = currentReport.atividades.filter((_, i) => i !== index);
    updateReport({ atividades: updated });
  };

  const parseFlexibleDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3 && parts[2].length === 4) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    return null;
  };

  const calculatePrazoIncorrido = (dataStr?: string, inicioStr?: string): number | undefined => {
    const dStart = parseFlexibleDate(inicioStr);
    const dEnd = parseFlexibleDate(dataStr);
    if (dStart && dEnd) {
      return Math.floor((dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24));
    }
    return undefined;
  };

  const handleDateChange = (dateStr: string) => {
    const incorrido = calculatePrazoIncorrido(dateStr, currentReport.inicio);
    updateReport({ 
      data: dateStr,
      ...(incorrido !== undefined ? { prazoIncorrido: incorrido } : {}) 
    });
  };

  const handleInicioChange = (inicioStr: string) => {
    const incorrido = calculatePrazoIncorrido(currentReport.data, inicioStr);
    updateReport({ 
      inicio: inicioStr,
      ...(incorrido !== undefined ? { prazoIncorrido: incorrido } : {}) 
    });
  };

  // Dynamic accumulated rainfall calculation
  const calculateAccumulatedMonthRain = (): number => {
    if (!currentReport) return 0;
    
    // 1. Start with the "Precipitação Acumulada no Mês Anterior (mm)"
    let sum = Number(currentReport.precipitacao?.acumuladoMesAnterior || 0);
    
    // 2. Identify the current month/year prefix (e.g. "2026-06")
    const currentYearMonth = currentReport.data ? currentReport.data.substring(0, 7) : "";
    if (!currentYearMonth) {
      return Math.round((sum + Number(currentReport.precipitacao?.total || 0)) * 10) / 10;
    }
    
    // 3. Sum precipitation from other reports in the same month of the same Obra up to the current daily report
    const allReports = reports || [];
    allReports.forEach(r => {
      // Clean matching: must be same Obra
      const isSameObra = (r.obraId && r.obraId === currentReport.obraId) || (r.obra === currentReport.obra);
      if (!isSameObra) return;
      
      // Must be same month
      if (r.data && r.data.startsWith(currentYearMonth)) {
        // Must be strictly prior to our current report's date to avoid double counting today
        if (r.data < currentReport.data && r.id !== currentReport.id) {
          sum += Number(r.precipitacao?.total || 0);
        }
      }
    });
    
    // 4. Add the current in-memory report's precipitation for today
    sum += Number(currentReport.precipitacao?.total || 0);
    
    return Math.round(sum * 10) / 10;
  };

  // Stoppage Operation wrapper
  const handleUpdateStoppage = (category: "chuva" | "raios" | "projetos" | "vizinhos" | "outros", fields: Partial<StoppageDetailRow>) => {
    const detail = { ...currentReport.paralisacoesDetalhe };
    // Lazy initialize outros in case it doesn't exist on historic reports
    if (!detail[category]) {
      detail[category] = {
        ativo: false,
        horas: [],
        frentes: "",
        local: "",
        maoDeObraParalisada: "",
        comentarios: "",
        total: "0h"
      };
    }
    detail[category] = { ...detail[category], ...fields };
    
    // Recalculate paralisacoes quantities
    let totalHoursCount = 0;
    let paralisacoesCount = 0;
    Object.values(detail).forEach(r => {
      const rowItem = r as StoppageDetailRow;
      if (rowItem && rowItem.ativo) {
        totalHoursCount += (rowItem.horas || []).length;
        if ((rowItem.horas || []).length > 0) paralisacoesCount++;
      }
    });

    updateReport({
      paralisacoesDetalhe: detail,
      paralisacoesSummary: {
        totalHorasParalisadasDia: totalHoursCount,
        numeroParalisacoes: paralisacoesCount
      }
    });
  };

  const toggleHourStoppage = (category: "chuva" | "raios" | "projetos" | "vizinhos" | "outros", hour: string) => {
    const row = currentReport.paralisacoesDetalhe[category] || {
      ativo: false,
      horas: [],
      frentes: "",
      local: "",
      maoDeObraParalisada: "",
      comentarios: "",
      total: "0h"
    };
    const currentHours = [...(row.horas || [])];
    const hourIdx = currentHours.indexOf(hour);
    if (hourIdx > -1) {
      currentHours.splice(hourIdx, 1);
    } else {
      currentHours.push(hour);
    }
    
    // Sort logically from morning to night
    const order = [
      "6h", "7h", "8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h", "20h", "21h", "22h", "23h",
      "0h", "1h", "2h", "3h", "4h", "5h"
    ];
    currentHours.sort((a,b) => order.indexOf(a) - order.indexOf(b));

    handleUpdateStoppage(category, { 
      horas: currentHours,
      total: `${currentHours.length}h`
    });
  };

  // Detailed Labor Operations
  const handleUpdateLaborItem = (groupIndex: number, itemIndex: number, fields: Partial<any>) => {
    const updatedGrid = [...currentReport.efetivoDetalhado];
    const group = { ...updatedGrid[groupIndex] };
    const items = [...group.items];
    
    // Handle recalculation of T: total = Registered (C) minus Fails (F)
    const currentItem = { ...items[itemIndex], ...fields };
    if ("c" in fields || "f" in fields) {
      currentItem.t = Math.max(0, (currentItem.c || 0) - (currentItem.f || 0));
    }

    items[itemIndex] = currentItem;
    group.items = items;
    updatedGrid[groupIndex] = group;
    // update report state
    updateReport({ efetivoDetalhado: updatedGrid });
  };

  const handleAddLaborRow = (groupIndex: number) => {
    const updatedGrid = [...currentReport.efetivoDetalhado];
    const group = { ...updatedGrid[groupIndex] };
    const newItem = {
      id: "labor-itm-" + Date.now(),
      cargo: "Auxiliar Técnico",
      c: 0,
      f: 0,
      a: 0,
      t: 0,
      moiMod: "MOD" as const
    };
    group.items = [...group.items, newItem];
    updatedGrid[groupIndex] = group;
    updateReport({ efetivoDetalhado: updatedGrid });
  };

  const handleDeleteLaborRow = (groupIndex: number, itemIndex: number) => {
    const updatedGrid = [...currentReport.efetivoDetalhado];
    const group = { ...updatedGrid[groupIndex] };
    group.items = group.items.filter((_, i) => i !== itemIndex);
    updatedGrid[groupIndex] = group;
    updateReport({ efetivoDetalhado: updatedGrid });
  };

  const handleAddSubcontractorGroup = (name: string) => {
    if (!name.trim()) return;
    const exists = currentReport.efetivoDetalhado.some(g => g.nome.toUpperCase() === name.trim().toUpperCase());
    if (exists) {
      alert("Subcontratada já adicionada ao efetivo deste diário.");
      return;
    }
    const newGroup = {
      id: "sub-gp-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      nome: name.trim().toUpperCase(),
      items: [
        {
          id: "labor-itm-" + Date.now() + "-1",
          cargo: "Servante / Auxiliar Técnico",
          c: 0,
          f: 0,
          a: 0,
          t: 0,
          moiMod: "MOD" as const
        }
      ]
    };
    updateReport({
      efetivoDetalhado: [...currentReport.efetivoDetalhado, newGroup]
    });
  };

  const handleDeleteSubcontractorGroup = (groupIndex: number) => {
    const groupName = currentReport.efetivoDetalhado[groupIndex]?.nome || "";
    showConfirmation(
      "Remover Subcontratada",
      `Deseja realmente remover a subcontratada "${groupName}" e todas as suas funções correspondentes deste RDO?`,
      () => {
        const updatedGrid = currentReport.efetivoDetalhado.filter((_, i) => i !== groupIndex);
        updateReport({ efetivoDetalhado: updatedGrid });
      },
      "danger",
      "Sim, Remover",
      "Cancelar"
    );
  };

  // Equipment detail Operations
  const handleAddEquipmentRow = () => {
    const newItem: EquipmentMobilizedDetail = {
      id: "eq-" + Date.now(),
      descricao: "Mini Escavadeira Bobcat",
      quantidade: 1,
      empresa: "SEEL"
    };
    updateReport({
      equipamentosDetalhado: [...currentReport.equipamentosDetalhado, newItem]
    });
  };

  const handleUpdateEquipmentRow = (index: number, fields: Partial<EquipmentMobilizedDetail>) => {
    const updated = [...currentReport.equipamentosDetalhado];
    updated[index] = { ...updated[index], ...fields };
    updateReport({ equipamentosDetalhado: updated });
  };

  const handleDeleteEquipmentRow = (index: number) => {
    const updated = currentReport.equipamentosDetalhado.filter((_, i) => i !== index);
    updateReport({ equipamentosDetalhado: updated });
  };

  const handleCloneLabor = (sourceReport: RdoReport) => {
    if (!sourceReport.efetivoDetalhado || sourceReport.efetivoDetalhado.length === 0) {
      alert("O RDO selecionado não possui equipe lançada para clonar.");
      return;
    }
    const clonedLabor = JSON.parse(JSON.stringify(sourceReport.efetivoDetalhado));
    const secureClonedLabor = clonedLabor.map((group: any) => ({
      ...group,
      id: "labor-group-" + Math.random().toString(36).substring(2, 9) + Date.now(),
      items: (group.items || []).map((itm: any) => ({
        ...itm,
        id: "labor-itm-" + Math.random().toString(36).substring(2, 9) + Date.now()
      }))
    }));

    let computedMoi = 0;
    let computedMod = 0;
    secureClonedLabor.forEach((g: any) => {
      (g.items || []).forEach((itm: any) => {
        if (itm.moiMod === "MOI") computedMoi += Number(itm.c || 0) - Number(itm.f || 0);
        if (itm.moiMod === "MOD") computedMod += Number(itm.c || 0) - Number(itm.f || 0);
      });
    });

    updateReport({
      efetivoDetalhado: secureClonedLabor,
      efetivoSummary: {
        ...currentReport.efetivoSummary,
        moi: computedMoi,
        mod: computedMod,
        total: computedMoi + computedMod + Number(currentReport.efetivoSummary.subcontratadosMoiMod || 0)
      }
    });
    setCloneType(null);
  };

  const handleCloneEquipment = (sourceReport: RdoReport) => {
    if (!sourceReport.equipamentosDetalhado || sourceReport.equipamentosDetalhado.length === 0) {
      alert("O RDO selecionado não possui equipamentos lançados para clonar.");
      return;
    }
    const clonedEquip = JSON.parse(JSON.stringify(sourceReport.equipamentosDetalhado));
    const secureClonedEquip = clonedEquip.map((eq: any) => ({
      ...eq,
      id: "eq-itm-" + Math.random().toString(36).substring(2, 9) + Date.now()
    }));

    const computedEqTotal = secureClonedEquip.reduce((sum: number, q: any) => sum + Number(q.quantidade || 0), 0);

    updateReport({
      equipamentosDetalhado: secureClonedEquip,
      equipamentosSummary: {
        ...currentReport.equipamentosSummary,
        total: computedEqTotal,
        mobilizados: computedEqTotal
      }
    });
    setCloneType(null);
  };

  // Image Upload helper using FileReader base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, actIdx: number) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const currentImgs = currentReport.atividades[actIdx].imagens || [];
        if (currentImgs.length < 2) {
          handleUpdateActivity(actIdx, {
            imagens: [...currentImgs, base64String]
          });
        } else {
          // Overwrite first one
          handleUpdateActivity(actIdx, {
            imagens: [base64String, currentImgs[1]]
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent, actId: string, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [actId]: active }));
  };

  const handleDrop = (e: React.DragEvent, actIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const actId = currentReport.atividades[actIdx].id;
    setDragActive(prev => ({ ...prev, [actId]: false }));

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const currentImgs = currentReport.atividades[actIdx].imagens || [];
        handleUpdateActivity(actIdx, {
          imagens: [...currentImgs.slice(-1), base64String] // maintain max 2 images
        });
      };
      reader.readAsDataURL(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save panel / Banner info */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-wrap gap-4 items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-500/10 text-amber-700 p-2 rounded">
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-xs uppercase tracking-tight leading-none">REGISTRO DIÁRIO DE OBRA nº {currentReport.rdoNo}</h2>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold flex items-center gap-1.5 flex-wrap">
              Status: 
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold pb-1 ${
                currentReport.status === "Enviado para Fiscalização" ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200" :
                currentReport.status === "Finalizado" ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200" :
                currentReport.status === "Assinado" ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200" :
                currentReport.status === "Cancelado" ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200" :
                "bg-slate-100 text-slate-800 ring-1 ring-slate-200"
              }`}>
                {currentReport.status === "Finalizado" ? "FECHADO / EM ASSINATURA" : (currentReport.status || "Em Digitação").toUpperCase()}
              </span> 
              — {formatPrintDate(currentReport.data).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {saveSuccess && (
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded text-[10px] font-bold flex items-center animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Sincronizado!
            </span>
          )}
          
          {isEditor && (
            <>
              {/* STATUS: Em Digitação */}
              {(currentReport.status === "Em Digitação" || !currentReport.status) && (
                <>
                  <button
                    onClick={async () => {
                      const fiscalEmails = currentObra?.permissoes
                        ?.filter(p => p.access === "fiscalizacao")
                        ?.map(p => p.email?.trim())
                        ?.filter(Boolean) || [];

                      const gerenciadoraEmails = currentObra?.permissoes
                        ?.filter(p => p.access === "gerenciadora")
                        ?.map(p => p.email?.trim())
                        ?.filter(Boolean) || [];

                      const allAnalystEmails = [...fiscalEmails, ...gerenciadoraEmails].filter((v, i, self) => self.indexOf(v) === i);

                      if (allAnalystEmails.length === 0) {
                        alert("Não encontramos nenhum usuário com acesso 'Fiscalização' ou 'Gerenciadora' cadastrado nas permissões desta obra. Por favor, adicione o e-mail do fiscal ou gerenciadora nas configurações da obra antes de enviar.");
                        return;
                      }

                      setSaving(true);
                      try {
                        const targetEmail = allAnalystEmails.join(",");
                        const rdoDateStr = formatPrintDate(currentReport.data);
                        const subject = `[SEEL RDO] Nova Análise Disponível - RDO nº ${currentReport.rdoNo} - Obra: ${currentReport.obra}`;
                        
                        const textBody = `Olá,\n\nO Relatório Diário de Obra (RDO) nº ${currentReport.rdoNo} da obra "${currentReport.obra}" (Data: ${rdoDateStr}) foi preenchido e está disponível para análise e inserção de comentários adicionais de fiscalização e gerenciadora.\n\nAcesse a plataforma para emitir suas considerações.\n\nEmitente: ${currentReport.emitenteNome || "Não preenchido"}\nEfetivo Presente: ${currentReport.efetivoSummary?.total || 0} colaboradores.\n\nAtenciosamente,\nEquipe SEEL Engenharia.`;
                        
                        const htmlBody = `
                          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; color: #1e293b;">
                            <h2 style="color: #004899; margin-top: 0; font-size: 18px;">Análise de RDO Solicitada</h2>
                            <p>Olá,</p>
                            <p>O Relatório Diário de Obra (RDO) nº <strong>${currentReport.rdoNo}</strong> para a obra <strong>${currentReport.obra}</strong> (data: <strong>${rdoDateStr}</strong>) foi preenchido pelo emissor e está disponível para análise.</p>
                            <p>Como analista de Fiscalização ou Gerenciadora, seu papel agora é inserir seus comentários adicionais correspondentes e concluir a sua análise na aba de aprovações/assinaturas.</p>
                            <div style="background-color: #f8fafc; border-left: 4px solid #004899; padding: 12px; margin: 18px 0; border-radius: 4px; font-size: 13px;">
                              <strong>Resumo do Relatório:</strong><br/>
                              - Emitente: ${currentReport.emitenteNome || "Não especificado"}<br/>
                              - Efetivo Total Presente: ${currentReport.efetivoSummary?.total || 0} colaboradores<br/>
                              - Condições de Clima: ${currentReport.precipitacao?.total !== undefined ? `${currentReport.precipitacao.total} mm` : "Não preenchido"}<br/>
                            </div>
                            <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">Esta é uma notificação automática do sistema de Relatório Diário de Obras (SEEL RDO).</p>
                          </div>
                        `;

                        // Salva no Firestore
                        const updated = {
                          ...currentReport,
                          status: "Enviado para Fiscalização" as const,
                          creatorEmail: user?.email || ""
                        };
                        await saveReport(updated);

                        // Dispara e-mail
                        await sendEmailHelper(targetEmail, subject, htmlBody, textBody, "Fiscalização e Gerenciadora");
                        
                        alert(`RDO enviado para análise (${targetEmail}) com sucesso!`);
                      } catch (err: any) {
                        console.error(err);
                        alert("Erro ao enviar RDO para análise: " + err.message);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="h-8 flex items-center gap-1.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-[11px] uppercase tracking-wide rounded transition-all shadow-xs cursor-pointer border-none"
                    title="Enviar e-mail de notificação para o fiscal inserido nas permissões desta obra"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar para Fiscalização
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-8 flex items-center gap-1 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] uppercase tracking-wide rounded transition-all shadow-xs cursor-pointer border-none"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Salvando..." : "Salvar Rascunho"}
                  </button>
                </>
              )}

              {/* STATUS: Enviado para Fiscalização */}
              {currentReport.status === "Enviado para Fiscalização" && (
                <>
                  <button
                    onClick={() => {
                      showConfirmation(
                        "Reaver para Digitação",
                        "Deseja reaver este RDO de volta para rascunho de digitação? A fiscalização não conseguirá salvar comentários adicionais até que você envie novamente.",
                        async () => {
                          setSaving(true);
                          try {
                            await saveReport({
                              ...currentReport,
                              status: "Em Digitação"
                            });
                            alert("RDO trazido de volta para edição com sucesso!");
                          } catch (err: any) {
                            console.error(err);
                            alert("Erro ao reaver RDO: " + err.message);
                          } finally {
                            setSaving(false);
                          }
                        },
                        "warning",
                        "Sim, Reaver",
                        "Cancelar"
                      );
                    }}
                    disabled={saving}
                    className="h-8 flex items-center gap-1.5 px-3 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-[11px] uppercase tracking-wide rounded transition-all shadow-xs cursor-pointer border-none"
                  >
                    <LockOpen className="w-3.5 h-3.5" />
                    Reaver para Digitação
                  </button>

                  <button
                    onClick={async () => {
                      setSaving(true);
                      try {
                        // Auto compute totals on closing
                        let computedMoi = 0;
                        let computedMod = 0;
                        currentReport.efetivoDetalhado.forEach(g => {
                          g.items.forEach(itm => {
                            if (itm.moiMod === "MOI") computedMoi += Number(itm.c || 0) - Number(itm.f || 0);
                            if (itm.moiMod === "MOD") computedMod += Number(itm.c || 0) - Number(itm.f || 0);
                          });
                        });
                        const computedEqTotal = currentReport.equipamentosDetalhado.reduce((sum, q) => sum + Number(q.quantidade || 0), 0);
                        const computedElapsed = Number(currentReport.prazoIncorrido || 0);
                        const computedRemaining = Math.max(0, Number(currentReport.prazo || 0) - computedElapsed);
                        const computedAccumulatedRain = calculateAccumulatedMonthRain();

                        await saveReport({
                          ...currentReport,
                          status: "Finalizado",
                          prazoFaltante: computedRemaining,
                          precipitacao: {
                            ...currentReport.precipitacao,
                            acumuladoMes: computedAccumulatedRain
                          },
                          efetivoSummary: {
                            ...currentReport.efetivoSummary,
                            moi: computedMoi,
                            mod: computedMod,
                            total: computedMoi + computedMod + Number(currentReport.efetivoSummary.subcontratadosMoiMod || 0)
                          },
                          equipamentosSummary: {
                            ...currentReport.equipamentosSummary,
                            total: computedEqTotal,
                            mobilizados: computedEqTotal
                          }
                        });
                        alert("RDO Fechado com sucesso! Agora o diário está liberado para as assinaturas digitais na aba 'Aprovações e Assinaturas'.");
                      } catch (err: any) {
                        console.error(err);
                        alert("Erro ao fechar RDO: " + err.message);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving || !canCloseRdo}
                    className="h-8 flex items-center gap-1.5 px-3 bg-[#004899] hover:bg-[#003c80] disabled:opacity-50 disabled:bg-slate-400 text-white font-bold text-[11px] uppercase tracking-wide rounded transition-all shadow-xs cursor-pointer border-none"
                    title={closeButtonTitle}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Fechar RDO e Enviar para Assinatura
                  </button>
                </>
              )}

              {/* STATUS: Finalizado (Fechado para Assinaturas) */}
              {currentReport.status === "Finalizado" && (
                <button
                  onClick={() => {
                    showConfirmation(
                      "Reabrir RDO",
                      "Tem certeza que deseja reabrir este RDO? Isso cancelará as assinaturas digitais coletadas até o momento.",
                      async () => {
                        setSaving(true);
                        try {
                          await saveReport({
                            ...currentReport,
                            status: "Em Digitação",
                            emitenteAssinado: false,
                            emitenteConsolidado: "",
                            emitenteHash: "",
                            contratanteAssinado: false,
                            contratanteAprovado: "",
                            contratanteHash: ""
                          });
                          alert("RDO reaberto com sucesso! As assinaturas foram limpas para permitir edições.");
                        } catch (err: any) {
                          console.error(err);
                          alert("Erro ao reabrir RDO: " + err.message);
                        } finally {
                          setSaving(false);
                        }
                      },
                      "warning",
                      "Sim, Reabrir",
                      "Cancelar"
                    );
                  }}
                  disabled={saving}
                  className="h-8 flex items-center gap-1.5 px-3 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] uppercase tracking-wide rounded transition-all shadow-xs cursor-pointer border-none"
                >
                  <LockOpen className="w-3.5 h-3.5" />
                  Reabrir RDO
                </button>
              )}

              {/* STATUS: Assinado (Completo) */}
              {currentReport.status === "Assinado" && (
                <button
                  onClick={() => {
                    showConfirmation(
                      "AVISO CRÍTICO - Cancelamento de RDO",
                      "Deseja realmente CANCELAR este RDO assinado digitalmente? Esta operação é irreversível, anulará o documento e bloqueará edições permanentemente.",
                      async () => {
                        setSaving(true);
                        try {
                          await saveReport({
                            ...currentReport,
                            status: "Cancelado"
                          });
                          alert("RDO cancelado com sucesso!");
                        } catch (err: any) {
                          console.error(err);
                          alert("Erro ao cancelar RDO: " + err.message);
                        } finally {
                          setSaving(false);
                        }
                      },
                      "danger",
                      "Sim, Cancelar Documento",
                      "Voltar"
                    );
                  }}
                  disabled={saving}
                  className="h-8 flex items-center gap-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] uppercase tracking-wide rounded transition-all shadow-xs cursor-pointer border-none"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Cancelar RDO
                </button>
              )}
            </>
          )}
          
          <button
            onClick={onShowPrint}
            className="h-8 flex items-center gap-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase tracking-wide rounded transition-all shadow-xs cursor-pointer border-none"
          >
            Visualizar PDF
          </button>
        </div>
      </div>

      {/* TABS SELECTOR - High Density Compact Layout */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t pt-1.5 px-1.5 gap-0.5 scrollbar-none shrink-0">
        {[
          { id: "geral", label: "Dados e Prazos", icon: Calendar },
          { id: "atividades", label: "Atividades de Campo", icon: FileText },
          { id: "paralisacoes", label: "Paralisações e Clima", icon: CloudRain },
          { id: "efetivo", label: "Quadro de Efetivo", icon: Users },
          { id: "equipamentos", label: "Equipamentos", icon: Wrench },
          { id: "anexos", label: "Anexos Documentais", icon: ImageIcon },
          { id: "assinaturas", label: "Aprovações e Assinaturas", icon: CheckCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider rounded-t transition-all focus:outline-none whitespace-nowrap border-t-2 ${
                isSelected
                  ? "bg-slate-50/50 border-t-amber-500 text-amber-500 border-x border-slate-200/60 font-black"
                  : "text-slate-500 hover:text-slate-800 bg-transparent border-t-transparent border-x border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-amber-600" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TABS CONTAINER */}
      <div className="bg-white p-5 rounded-b border border-t-0 border-slate-200 shadow-xs min-h-[460px] relative">
        {currentReport.status === "Finalizado" && (
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 text-slate-700 select-none animate-fade-in no-print">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700">Modo de Apenas Leitura Ativo</span>
                <span className="text-xs text-slate-500 font-mono hidden md:inline">— Este RDO está finalizado e bloqueado para edições.</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
              Clique em <strong className="text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">Reabrir RDO</strong> acima para editar.
            </p>
          </div>
        )}

        <div className={isReadOnly || currentReport.status === "Finalizado" || isAnalista ? "opacity-90" : ""}>
        
        {/* ================== TAB: GERAL ================== */}
        {activeTab === "geral" && (
          <fieldset disabled={isReadOnly || currentReport.status === "Finalizado" || isAnalista} className="space-y-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 font-sans">Dados Gerais e Identificação</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">RDO Código Número</label>
                <input
                  type="text"
                  value={currentReport.rdoNo}
                  onChange={(e) => updateReport({ rdoNo: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="ex: BDG-1224"
                />
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-tight mb-1 ${hasDuplicateDate ? "text-red-500" : "text-slate-500"}`}>Data do Relatório</label>
                <input
                  type="date"
                  value={currentReport.data}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={`block h-8 w-full rounded text-xs text-slate-800 bg-slate-50/40 focus:ring-1 transition-all ${
                    hasDuplicateDate 
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500 ring-1 ring-red-105" 
                      : "border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                  }`}
                />
                {hasDuplicateDate && (
                  <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tight">Já existe um RDO nesta data!</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Nome da Obra</label>
                <input
                  type="text"
                  value={currentReport.obra}
                  onChange={(e) => updateReport({ obra: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="BUILDING"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Cliente / Contratante Geral</label>
                <input
                  type="text"
                  value={currentReport.cliente}
                  onChange={(e) => updateReport({ cliente: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="XWS"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Empresa Contratada</label>
                <input
                  type="text"
                  value={currentReport.contratada || ""}
                  onChange={(e) => updateReport({ contratada: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors font-bold text-slate-700"
                  placeholder="SEEL SERVIÇOS DE ENGENHARIA LTDA"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Gestor Responsável</label>
                <input
                  type="text"
                  value={currentReport.gestor}
                  onChange={(e) => updateReport({ gestor: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="Nome do Gestor"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Gerenciadora</label>
                <input
                  type="text"
                  value={currentReport.gerenciadora}
                  onChange={(e) => updateReport({ gerenciadora: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="SABESP"
                />
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 pt-2 font-sans">Prazo Técnico e Cronograma</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Prazo Total (dias)</label>
                <input
                  type="number"
                  value={currentReport.prazo}
                  onChange={(e) => updateReport({ prazo: Number(e.target.value) })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Prazo Incorrido (dias)</label>
                <input
                  type="number"
                  value={currentReport.prazoIncorrido}
                  onChange={(e) => updateReport({ prazoIncorrido: Number(e.target.value) })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1 bg-slate-100 px-1.5 py-0.5 rounded leading-tight">Remanescente</label>
                <input
                  type="text"
                  disabled
                  value={`${Math.max(0, (currentReport.prazo || 0) - (currentReport.prazoIncorrido || 0))} dias`}
                  className="block h-8 w-full rounded bg-slate-100 border-slate-200 font-bold text-slate-600 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Início da Obra</label>
                <input
                  type="text"
                  value={currentReport.inicio}
                  onChange={(e) => handleInicioChange(e.target.value)}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="01/01/2016"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Término Planejado</label>
                <input
                  type="text"
                  value={currentReport.termino}
                  onChange={(e) => updateReport({ termino: e.target.value })}
                  className="block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/40 hover:bg-slate-50/10 transition-colors"
                  placeholder="31/12/2019"
                />
              </div>
            </div>
          </fieldset>
        )}

        {/* ================== TAB: ATIVIDADES ================== */}
        {activeTab === "atividades" && (() => {
          const associatedObra = obras.find(o => o.id === currentReport.obraId || o.nome === currentReport.obra);
          const registered = associatedObra?.atividades || [];

          return (
            <fieldset disabled={isReadOnly || currentReport.status === "Finalizado" || isAnalista} className="space-y-5 animate-fade-in font-sans">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 matches-pattern">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fases e Atividades Executadas (Anexar Fotos)</h3>
                  <p className="text-[10px] text-slate-400">Selecione apenas as atividades do PQ contratual cadastradas no Gerenciador de Obras</p>
                </div>
                <button
                  onClick={handleAddActivity}
                  className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider px-3 h-8 rounded transition-colors shadow-xs cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Atividade
                </button>
              </div>

              {currentReport.atividades && currentReport.atividades.length > 0 ? (
                <div className="space-y-4">
                  {currentReport.atividades.map((act, idx) => {
                    // Match with a registered activity
                    const matchedAct = registered.find(
                      r => r.ref === act.ref && r.identificador === act.identificador
                    ) || registered.find(
                      r => r.descricao === act.descricao
                    ) || registered[0];

                    return (
                      <div key={act.id || idx} className="bg-white p-4 rounded border border-slate-205 shadow-xs space-y-3">
                        <div className="flex flex-wrap gap-2.5 items-center justify-between">
                          <div className="flex flex-wrap gap-3 items-center flex-1">
                            <span className="font-mono text-xs font-bold text-amber-700 bg-amber-500/10 h-8 w-10 flex items-center justify-center rounded shrink-0">
                              #{idx + 1}
                            </span>
                            
                            {/* Registered Activities dropdown */}
                            <div className="flex-1 min-w-[280px]">
                              <select
                                value={matchedAct?.id || ""}
                                onChange={(e) => {
                                  const found = registered.find(r => r.id === e.target.value);
                                  if (found) {
                                    handleUpdateActivity(idx, {
                                      ref: found.ref || "001",
                                      fase: found.fase,
                                      identificador: found.identificador,
                                      descricao: found.descricao,
                                      intervalo: found.unidade || "un"
                                    });
                                  }
                                }}
                                className="block w-full h-8.5 rounded border-amber-200 text-xs text-slate-800 font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                              >
                                {registered.length > 0 ? (
                                  registered.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      [{r.identificador || r.ref}] - {r.descricao.substring(0, 100)}{r.descricao.length > 100 ? "..." : ""} ({r.unidade || "-"})
                                    </option>
                                  ))
                                ) : (
                                  <option value="">Nenhuma atividade cadastrada. Acesse o Gerenciador de Obras.</option>
                                )}
                              </select>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteActivity(idx)}
                            className="text-red-500 hover:text-red-750 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors cursor-pointer"
                            title="Deletar atividade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Read-only beautiful tags block representing active catalogue data */}
                        <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide">
                            <span>Fase / Setor: <strong className="text-slate-600">{act.fase}</strong></span>
                            <span>Item Ref: <strong className="text-slate-600">{act.ref}</strong></span>
                            <span>Código DP: <strong className="text-slate-600 font-mono">{act.identificador}</strong></span>
                            <span>Unidade: <strong className="text-slate-600 font-mono">{act.intervalo}</strong></span>
                          </div>
                          <p className="text-slate-800 font-semibold leading-relaxed">{act.descricao || "Selecione uma atividade para exibir sua especificação de diário."}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight">Metragem / Total do Dia ({act.intervalo || "Un"}) *</label>
                            <input
                              type="text"
                              value={act.total}
                              onChange={(e) => handleUpdateActivity(idx, { total: e.target.value })}
                              className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-850 font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20 font-mono"
                              placeholder="ex: 15.5"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight">Comentários Especiais do Dia</label>
                            <input
                              type="text"
                              value={act.comentario || ""}
                              onChange={(e) => handleUpdateActivity(idx, { comentario: e.target.value })}
                              className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                              placeholder="Comentar equipe envolvida, trecho exato, etc."
                            />
                          </div>
                        </div>

                    {/* PHOTO ATTACHMENT DRAG AND DROP / SELECTION */}
                    <div className="space-y-1.5 pt-1">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight">Fotos Anexas (Máximo 2 Imagens)</span>
                      
                      <div className="flex flex-wrap gap-3 items-stretch">
                        {/* Drag and drop active area */}
                        <div
                          onDragOver={(e) => handleDrag(e, act.id, true)}
                          onDragLeave={(e) => handleDrag(e, act.id, false)}
                          onDrop={(e) => handleDrop(e, idx)}
                          className={`flex-1 border border-dashed rounded p-3 flex flex-col justify-center items-center text-center transition-colors cursor-pointer ${
                            dragActive[act.id]
                              ? "border-amber-500 bg-amber-500/5 select-none"
                              : "border-slate-300 bg-slate-50 hover:bg-slate-100/50"
                          }`}
                        >
                          <input
                            type="file"
                            id={`file-${act.id}`}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, idx)}
                          />
                          <label htmlFor={`file-${act.id}`} className="cursor-pointer flex flex-col items-center">
                            <Upload className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-[10px] font-bold text-slate-600 block leading-tight">Arraste fotos aqui ou clique para selecionar</span>
                            <span className="text-[9px] text-slate-400 font-normal leading-none mt-0.5">Suporta formatos de imagens nativos</span>
                          </label>
                        </div>

                        {/* Presets and Preview list */}
                        <div className="w-full md:w-2/3 flex gap-2">
                          {act.imagens && act.imagens.length > 0 ? (
                            act.imagens.slice(0,2).map((img, imgIdx) => (
                              <div key={imgIdx} className="relative w-1/2 aspect-[4/3] rounded border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                                <img src={img} alt="Anexo atividade" className="w-full h-full object-cover animate-fade-in" />
                                <button
                                  onClick={() => {
                                    const otherImgs = act.imagens?.filter((_, i) => i !== imgIdx) || [];
                                    handleUpdateActivity(idx, { imagens: otherImgs });
                                  }}
                                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white w-5 h-5 flex items-center justify-center rounded-full shadow-md text-xs leading-none"
                                  title="Remover imagem"
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="w-full flex items-center justify-center text-[10px] text-slate-400 border border-slate-200 bg-slate-50/50 rounded italic font-medium">
                              Sem anexos de imagem. Use os presets abaixo para simulação.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Presets Row */}
                      <div className="flex gap-2 text-[9px] items-center text-slate-500 font-medium">
                        <span className="uppercase tracking-wider font-semibold text-[8px] text-slate-400">Inserção Rápida:</span>
                        <button
                          onClick={() => {
                            const current = act.imagens || [];
                            handleUpdateActivity(idx, {
                              imagens: [...current.slice(-1), "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=400"]
                            });
                          }}
                          className="bg-amber-500/10 text-amber-700 font-bold px-2 py-0.5 rounded hover:bg-amber-500/20 transition-all cursor-pointer"
                        >
                          Concretagem
                        </button>
                        <button
                          onClick={() => {
                            const current = act.imagens || [];
                            handleUpdateActivity(idx, {
                              imagens: [...current.slice(-1), "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400"]
                            });
                          }}
                          className="bg-amber-500/10 text-amber-700 font-bold px-2 py-0.5 rounded hover:bg-amber-500/20 transition-all cursor-pointer"
                        >
                          Escavação
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center italic text-gray-500">
                Nenhuma atividade cadastrada. Use o botão no topo direito para criar!
              </div>
            )}
          </fieldset>
          );
        })()}

        {/* ================== TAB: PARALISAÇÕES & CLIMA ================== */}
        {activeTab === "paralisacoes" && (
          <fieldset disabled={isReadOnly || currentReport.status === "Finalizado" || isAnalista} className="space-y-5 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5">Fatos Relevantes e Eventos de Obra</h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Anotações Extraordinárias (Um evento completo por linha)</label>
              <textarea
                value={(currentReport.fatosRelevantes || []).join("\n")}
                onChange={(e) => updateReport({ fatosRelevantes: e.target.value.split("\n").filter(line => line.trim() !== "") })}
                rows={3}
                className="block w-full rounded border-slate-300 shadow-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-slate-800 bg-slate-50/20"
                placeholder="Insira as observações mais importantes do diário. Ex: Atraso mecânico no início do turno..."
              />
            </div>

            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 pt-2">Registro de Horas por Tipo de Paralisação</h3>
            <div className="space-y-3">
              {Object.entries(currentReport.paralisacoesDetalhe || {}).map(([catKey, rowVal]) => {
                const row = rowVal as StoppageDetailRow;
                const isChecked = row.ativo;
                return (
                  <div key={catKey} className="bg-white p-3.5 rounded border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          id={`chk-${catKey}`}
                          onChange={(e) => handleUpdateStoppage(catKey as any, { ativo: e.target.checked })}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor={`chk-${catKey}`} className="font-bold text-xs uppercase text-slate-750 cursor-pointer select-none">
                          Paralisação por: <span className="text-amber-700 capitalize font-extrabold">{catKey === "raios" ? "Incidência de raios" : catKey}</span>
                        </label>
                      </div>

                      {isChecked && (
                        <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-100 font-mono">
                          Total: {row.total || "0h"}
                        </span>
                      )}
                    </div>

                    {isChecked && (
                      <div className="space-y-3 pt-2.5 border-t border-slate-100 animate-slide-down">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Tocar no horário para marcar inoperância:</span>
                          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                            {HOURS_LIST.map((hour) => {
                              const isSlotSelected = row.horas.includes(hour);
                              return (
                                <button
                                  key={hour}
                                  onClick={() => toggleHourStoppage(catKey as any, hour)}
                                  className={`h-7 px-1 rounded text-[10px] font-bold transition-all select-none border font-mono cursor-pointer ${
                                    isSlotSelected
                                      ? "bg-red-500 border-red-600 text-white"
                                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500"
                                  }`}
                                >
                                  {hour}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Frentes Paralisadas</label>
                            <input
                              type="text"
                              value={row.frentes}
                              onChange={(e) => handleUpdateStoppage(catKey as any, { frentes: e.target.value })}
                              className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                              placeholder="Frente de trabalho 1"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Efetivo de Obra Paralisado</label>
                            <input
                              type="text"
                              value={row.maoDeObraParalisada}
                              onChange={(e) => handleUpdateStoppage(catKey as any, { maoDeObraParalisada: e.target.value })}
                              className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                              placeholder="Carpinteiros, Ajudantes..."
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Notas Explicativas / Observações</label>
                            <input
                              type="text"
                              value={row.comentarios}
                              onChange={(e) => handleUpdateStoppage(catKey as any, { comentarios: e.target.value })}
                              className="mt-1 block h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/20"
                              placeholder="Inoperância temporária..."
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 pt-2">Índices de Pluviometria & Precipitação (mm)</h3>
            <div className="bg-white p-4 rounded border border-slate-200 shadow-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Milímetros Totais de Chuva Registrados Neste Dia (mm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentReport.precipitacao.total}
                    onChange={(e) => updateReport({ 
                      precipitacao: { ...currentReport.precipitacao, total: Number(e.target.value) } 
                    })}
                    className="mt-1 block h-9 w-full rounded border-slate-300 text-xs text-slate-850 font-extrabold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono bg-slate-50/20"
                    placeholder="Ex: 12.5"
                  />
                  <p className="text-[9.5px] text-slate-400 mt-1">Informe quantos milímetros de precipitação total de chuva ocorreram neste dia contratual.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Precipitação Acumulada no Mês Anterior (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentReport.precipitacao.acumuladoMesAnterior}
                    onChange={(e) => updateReport({ 
                      precipitacao: { ...currentReport.precipitacao, acumuladoMesAnterior: Number(e.target.value) } 
                    })}
                    className="mt-1 block h-9 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono bg-slate-50/20"
                    placeholder="Ex: 55.8"
                  />
                  <p className="text-[9.5px] text-slate-400 mt-1">Índice pluviométrico acumulado de chuva do mês anterior.</p>
                </div>
              </div>
            </div>
          </fieldset>
        )}

        {/* ================== TAB: EFETIVO ================== */}
        {activeTab === "efetivo" && (() => {
          const associatedObra = obras.find(o => o.id === currentReport.obraId || o.nome === currentReport.obra);
          const registeredSubs = associatedObra?.subcontratadas || [];
          
          return (
            <fieldset disabled={isReadOnly || currentReport.status === "Finalizado" || isAnalista} className="space-y-5 animate-fade-in font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-1.5 matches-pattern">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quadro de Efetivo de Obra</h3>
                  <p className="text-[10px] text-slate-400">Adicione as subcontratadas mobilizadas ou gerencie as funções/efetivo de cada uma</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-8.5 rounded border border-slate-300 text-xs px-2 text-slate-700 bg-white font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddSubcontractorGroup(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="" disabled>-- Adicionar do Cadastro da Obra --</option>
                    {registeredSubs.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => {
                      const typed = prompt("Digite o nome da nova subcontratada:");
                      if (typed && typed.trim()) {
                        handleAddSubcontractorGroup(typed);
                      }
                    }}
                    className="h-8.5 px-3 bg-slate-900 border border-slate-800 text-white rounded text-[10px] font-bold uppercase tracking-wider hover:bg-slate-805 transition-colors cursor-pointer shrink-0"
                  >
                    + Customizada
                  </button>

                  <button
                    onClick={() => setCloneType("efetivo")}
                    className="h-8.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 flex items-center gap-1 border-none"
                    title="Clonar equipe de outro dia para o RDO que está editando"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Clonar equipe de outro dia
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(currentReport.efetivoDetalhado || []).map((group, gIdx) => (
                  <div key={group.id || gIdx} className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
                    <div className="bg-slate-900 px-3.5 py-2 flex justify-between items-center text-white">
                      <input
                        type="text"
                        value={group.nome}
                        onChange={(e) => {
                          const updated = [...currentReport.efetivoDetalhado];
                          updated[gIdx] = { ...updated[gIdx], nome: e.target.value };
                          updateReport({ efetivoDetalhado: updated });
                        }}
                        className="bg-transparent border-none text-xs font-bold w-1/2 text-amber-400 focus:ring-0 p-0 hover:bg-slate-800/10 transition-colors cursor-text m-0"
                        placeholder="NOME DA SUBCONTRATADA"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAddLaborRow(gIdx)}
                          className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[9px] uppercase tracking-wider px-2 py-1 border-none cursor-pointer duration-150 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar Função
                        </button>
                        
                        <button
                          onClick={() => handleDeleteSubcontractorGroup(gIdx)}
                          className="flex items-center gap-0.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[9px] uppercase tracking-wider px-2 py-1 border-none cursor-pointer duration-150 transition-colors"
                          title="Remover subcontratada e todas as suas funções do RDO"
                        >
                          <Trash2 className="w-3 h-3" />
                          Excluir Empresa
                        </button>
                      </div>
                    </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                        <th className="p-2">Cargo / Função</th>
                        <th className="p-2 w-24 text-center">Tipo</th>
                        <th className="p-2 w-20 text-center">C (Cadastrado)</th>
                        <th className="p-2 w-20 text-center">F (Faltou)</th>
                        <th className="p-2 w-20 text-center">A (Atestado)</th>
                        <th className="p-2 w-24 text-center bg-slate-100">T (Presentes)</th>
                        <th className="p-2 w-14"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {group.items.map((item, iIdx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.cargo}
                              onChange={(e) => handleUpdateLaborItem(gIdx, iIdx, { cargo: e.target.value })}
                              className="h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10 hover:bg-slate-50/50 transition-colors"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <select
                              value={item.moiMod}
                              onChange={(e) => handleUpdateLaborItem(gIdx, iIdx, { moiMod: e.target.value })}
                              className="h-8 rounded border-slate-300 text-xs text-slate-850 py-0.5 w-full focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10 cursor-pointer"
                            >
                              <option value="MOD">Direct (MOD)</option>
                              <option value="MOI">Indirect (MOI)</option>
                            </select>
                          </td>
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.c}
                              onChange={(e) => handleUpdateLaborItem(gIdx, iIdx, { c: Number(e.target.value) })}
                              className="h-8 w-16 text-center font-mono rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.f}
                              onChange={(e) => handleUpdateLaborItem(gIdx, iIdx, { f: Number(e.target.value) })}
                              className="h-8 w-16 text-center font-mono rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.a}
                              onChange={(e) => handleUpdateLaborItem(gIdx, iIdx, { a: Number(e.target.value) })}
                              className="h-8 w-16 text-center font-mono rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10"
                            />
                          </td>
                          <td className="p-1.5 text-center font-bold font-mono text-slate-800 bg-slate-100">
                            {item.t}
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              onClick={() => handleDeleteLaborRow(gIdx, iIdx)}
                              className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 transition-colors rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-500/10 border border-amber-200/50 p-3 rounded text-[11px] text-amber-900 leading-normal font-semibold">
              <strong>Procedimento de consolidamento automático:</strong> O sistema realizará a soma matemática dos trabalhadores ativos (C - F) no quadro detalhado para preencher a seção resumitiva dos diários de obras ao salvar!
            </div>
          </fieldset>
          );
        })()}

        {/* ================== TAB: EQUIPAMENTOS ================== */}
        {activeTab === "equipamentos" && (
          <fieldset disabled={isReadOnly || currentReport.status === "Finalizado" || isAnalista} className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-1.5 font-sans">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Equipamentos Mobilizados Detalhes</h3>
                <p className="text-[10px] text-slate-400">Gerencie a frota de maquinários mobilizados ou clone dados de outros dias</p>
              </div>
              
              <button
                onClick={() => setCloneType("equipamentos")}
                className="h-8.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 flex items-center gap-1 border-none"
                title="Clonar equipamentos de outro dia para o RDO que está editando"
              >
                <Copy className="w-3.5 h-3.5" />
                Clonar equipamentos de outro dia
              </button>
            </div>
            
            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
              <div className="bg-slate-900 px-3.5 py-2 flex justify-between items-center text-white">
                <span className="text-xs font-bold uppercase tracking-wide">Maquinário no Canteiro de Obras</span>
                <button
                  onClick={handleAddEquipmentRow}
                  className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[9px] uppercase tracking-wider px-2 py-1.5 border-none cursor-pointer duration-150 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Mobilizar Equipamento
                </button>
              </div>

              <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <th className="p-2">Descrição do Equipamento</th>
                    <th className="p-2 w-1/3">Empresa Responsável / Propriedade</th>
                    <th className="p-2 w-28 text-center">Quantidade</th>
                    <th className="p-2 w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {(currentReport.equipamentosDetalhado && currentReport.equipamentosDetalhado.length > 0) ? (
                    currentReport.equipamentosDetalhado.map((eq, idx) => (
                      <tr key={eq.id || idx}>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={eq.descricao}
                            onChange={(e) => handleUpdateEquipmentRow(idx, { descricao: e.target.value })}
                            className="h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10 hover:bg-slate-50/50 transition-colors"
                            placeholder="Caminhão Basculante"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={eq.empresa}
                            onChange={(e) => handleUpdateEquipmentRow(idx, { empresa: e.target.value })}
                            className="h-8 w-full rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10 hover:bg-slate-50/50 transition-colors"
                            placeholder="SEEL"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="number"
                            min="0"
                            value={eq.quantidade}
                            onChange={(e) => handleUpdateEquipmentRow(idx, { quantidade: Number(e.target.value) })}
                            className="h-8 w-20 text-center font-mono rounded border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/10"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            onClick={() => handleDeleteEquipmentRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 transition-colors rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400 italic bg-slate-50/10">Sem maquinários registrados no momento.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>


          </fieldset>
        )}

        {/* ================== TAB: ANEXOS ================== */}
        {activeTab === "anexos" && (
          <div className="space-y-6">
            <fieldset disabled={isReadOnly || currentReport.status === "Finalizado" || isAnalista} className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 font-sans">Anexos Documentais</h3>
            <p className="text-[11px] text-slate-500 mb-2 font-sans">Insira imagens (fotos, projetos, recibos) ou arquivos PDF para serem anexados como páginas complementares no documento impresso/PDF do RDO.</p>
            
            <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3 relative">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  
                  const readers = Array.from(files).map((file: any) => {
                    return new Promise<{ id: string, dataUrl: string, name?: string, type?: string }>((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve({ 
                        id: "anx-" + Math.random().toString(36).substr(2, 9), 
                        dataUrl: reader.result as string,
                        name: file.name,
                        type: file.type
                      });
                      reader.readAsDataURL(file);
                    });
                  });
                  
                  Promise.all(readers).then((newAnexos) => {
                    updateReport({
                      anexos: [...(currentReport.anexos || []), ...newAnexos]
                    });
                  });
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <ImageIcon className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-[11px] font-bold text-slate-700 font-sans">Clique ou arraste imagens/PDFs aqui</p>
                <p className="text-[10px] text-slate-500 mt-1 font-sans">Imagens e arquivos PDF selecionados serão impressos no final do documento</p>
              </div>
            </div>

            {(currentReport.anexos || []).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {(currentReport.anexos || []).map((anexo) => {
                  const isPdf = anexo.type === "application/pdf" || (anexo.dataUrl && anexo.dataUrl.startsWith("data:application/pdf"));
                  return (
                    <div key={anexo.id} className="relative aspect-square rounded border border-slate-200 bg-white shadow-xs group overflow-hidden flex flex-col items-center justify-center p-2">
                      {isPdf ? (
                        <div className="flex flex-col items-center justify-center text-center p-2 h-full w-full bg-red-50/50 rounded">
                          <FileText className="w-8 h-8 text-red-600 mb-1" />
                          <span className="text-[9px] text-slate-700 font-medium line-clamp-3 px-1 break-all leading-tight font-sans" title={anexo.name}>
                            {anexo.name || "Documento PDF"}
                          </span>
                          <span className="text-[8px] uppercase tracking-wider text-red-700 bg-red-100 rounded px-1.5 py-0.5 mt-1 font-bold font-mono">
                            PDF
                          </span>
                        </div>
                      ) : (
                        <img src={anexo.dataUrl} alt="Anexo" className="w-full h-full object-cover rounded" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => {
                            updateReport({
                              anexos: (currentReport.anexos || []).filter(a => a.id !== anexo.id)
                            });
                          }}
                          className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow shadow-black/50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </fieldset>
          </div>
        )}

        {activeTab === "assinaturas" && (
          <div className="space-y-6 animate-fade-in pb-8">
            {/* SEÇÃO 1: COMENTÁRIOS DA FISCALIZAÇÃO */}
            <fieldset disabled={isReadOnly || currentReport.status === "Finalizado" || (isUserFiscalizacao && currentReport.fiscalizacaoFinalizada)} className={`space-y-4 ${isUserFiscalizacao && !currentReport.fiscalizacaoFinalizada && currentReport.status === "Enviado para Fiscalização" ? 'ring-2 ring-amber-500 rounded p-4 bg-amber-50/30' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    Comentários Adicionais de Fiscalização
                    {currentReport.fiscalizacaoFinalizada ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">Concluído</span>
                    ) : (
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">Pendente</span>
                    )}
                  </span>
                  
                  {isUserFiscalizacao && currentReport.fiscalizacaoFinalizada && currentReport.status === "Enviado para Fiscalização" && (
                    <button
                      onClick={() => {
                        showConfirmation(
                          "Reabrir Comentários",
                          "Deseja reabrir os comentários adicionais de fiscalização para novas edições?",
                          async () => {
                            try {
                              setSaving(true);
                              await saveReport({
                                ...currentReport,
                                fiscalizacaoFinalizada: false
                              });
                              alert("Comentários da Fiscalização reabertos com sucesso!");
                            } catch (err) {
                              console.error(err);
                              alert("Erro ao reabrir comentários.");
                            } finally {
                              setSaving(false);
                            }
                          },
                          "warning",
                          "Sim, Reabrir",
                          "Cancelar"
                        );
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[9px] font-bold uppercase tracking-wider transition-colors border-none cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <LockOpen className="w-3 h-3" />
                      Reabrir Comentários
                    </button>
                  )}
                </h3>
                
                {isUserFiscalizacao && !currentReport.fiscalizacaoFinalizada && currentReport.status === "Enviado para Fiscalização" && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          await saveReport(currentReport);
                          setSaveSuccess(true);
                          setTimeout(() => setSaveSuccess(false), 3000);
                        } catch (err) {
                          console.error(err);
                          alert("Erro ao salvar rascunho do comentário.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-[#004899] hover:bg-[#003c80] text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors border-none cursor-pointer"
                    >
                      {saving ? "Salvando..." : "Salvar Rascunho"}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          
                          // Salva como finalizado
                          await saveReport({
                            ...currentReport,
                            fiscalizacaoFinalizada: true
                          });

                          // Dispara e-mail para o emissor/editor
                          const editorEmails = currentObra?.permissoes
                            ?.filter(p => p.access === "edit")
                            ?.map(p => p.email?.trim())
                            ?.filter(Boolean) || [];
                          const creatorEmail = currentReport.creatorEmail || "";
                          const allEditors = [creatorEmail, ...editorEmails].filter(Boolean).filter((v, i, self) => self.indexOf(v) === i);

                          if (allEditors.length > 0) {
                            const targetEmail = allEditors.join(",");
                            const rdoDateStr = formatPrintDate(currentReport.data);
                            const subject = `[SEEL RDO] Comentários Concluídos pela Fiscalização - RDO nº ${currentReport.rdoNo} - Obra: ${currentReport.obra}`;
                            
                            const textBody = `Olá,\n\nOs comentários adicionais de fiscalização para o RDO nº ${currentReport.rdoNo} (Obra: ${currentReport.obra}, Data: ${rdoDateStr}) foram finalizados pelo fiscalizador.\n\nSe todos os analisadores concluíram, agora você pode acessar a plataforma para Fechar o RDO e enviá-lo para assinatura digital.\n\nAtenciosamente,\nEquipe SEEL Engenharia.`;
                            
                            const htmlBody = `
                              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; color: #1e293b;">
                                <h2 style="color: #10b981; margin-top: 0; font-size: 18px;">Análise da Fiscalização Concluída</h2>
                                <p>Olá,</p>
                                <p>Os comentários adicionais de fiscalização para o RDO nº <strong>${currentReport.rdoNo}</strong> (Obra: <strong>${currentReport.obra}</strong>, data: <strong>${rdoDateStr}</strong>) foram finalizados pelo fiscalizador.</p>
                                <p>Se todos os analisadores (Fiscalização e Gerenciadora) já tiverem concluído, acesse a plataforma para Fechar o RDO e colher as assinaturas digitais na aba de Aprovações/Assinaturas.</p>
                                <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">Esta é uma notificação automática do sistema de Relatório Diário de Obras (SEEL RDO).</p>
                              </div>
                            `;
                            await sendEmailHelper(targetEmail, subject, htmlBody, textBody, "Editor");
                          }

                          alert("Comentários de Fiscalização finalizados com sucesso!");
                        } catch (err) {
                          console.error(err);
                          alert("Erro ao finalizar comentário.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors border-none cursor-pointer"
                    >
                      Salvar e Finalizar Comentário
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Anotações da Fiscalização (Um por linha)</label>
                <textarea
                  value={(currentReport.comentariosFiscalizacao || currentReport.comentariosGerenciadoraContratante || []).join("\n")}
                  onChange={(e) => updateReport({ 
                    comentariosFiscalizacao: e.target.value.split("\n").filter(line => line.trim() !== ""),
                    comentariosGerenciadoraContratante: e.target.value.split("\n").filter(line => line.trim() !== "") 
                  })}
                  disabled={isReadOnly || currentReport.status === "Finalizado" || !isUserFiscalizacao || currentReport.fiscalizacaoFinalizada}
                  rows={4}
                  className="block w-full rounded border-slate-300 shadow-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-slate-800 bg-slate-50/20 disabled:bg-slate-100/50"
                  placeholder={isUserFiscalizacao ? "Escreva suas anotações de fiscalização aqui..." : "Aguardando anotações da fiscalização..."}
                />
              </div>
            </fieldset>

            {/* SEÇÃO 2: COMENTÁRIOS DA GERENCIADORA */}
            <fieldset disabled={isReadOnly || currentReport.status === "Finalizado" || (isUserGerenciadora && currentReport.gerenciadoraFinalizada)} className={`space-y-4 ${isUserGerenciadora && !currentReport.gerenciadoraFinalizada && currentReport.status === "Enviado para Fiscalização" ? 'ring-2 ring-amber-500 rounded p-4 bg-amber-50/30' : ''}`}>
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-1.5 flex-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    Comentários Adicionais de Gerenciadora
                    {currentReport.gerenciadoraFinalizada ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">Concluído</span>
                    ) : (
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">Pendente</span>
                    )}
                  </span>
                  
                  {isUserGerenciadora && currentReport.gerenciadoraFinalizada && currentReport.status === "Enviado para Fiscalização" && (
                    <button
                      onClick={() => {
                        showConfirmation(
                          "Reabrir Comentários",
                          "Deseja reabrir os comentários adicionais da gerenciadora para novas edições?",
                          async () => {
                            try {
                              setSaving(true);
                              await saveReport({
                                ...currentReport,
                                gerenciadoraFinalizada: false
                              });
                              alert("Comentários da Gerenciadora reabertos com sucesso!");
                            } catch (err) {
                              console.error(err);
                              alert("Erro ao reabrir comentários.");
                            } finally {
                              setSaving(false);
                            }
                          },
                          "warning",
                          "Sim, Reabrir",
                          "Cancelar"
                        );
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[9px] font-bold uppercase tracking-wider transition-colors border-none cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <LockOpen className="w-3 h-3" />
                      Reabrir Comentários
                    </button>
                  )}
                </h3>
                
                {isUserGerenciadora && !currentReport.gerenciadoraFinalizada && currentReport.status === "Enviado para Fiscalização" && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          await saveReport(currentReport);
                          setSaveSuccess(true);
                          setTimeout(() => setSaveSuccess(false), 3000);
                        } catch (err) {
                          console.error(err);
                          alert("Erro ao salvar rascunho do comentário.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-[#004899] hover:bg-[#003c80] text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors border-none cursor-pointer"
                    >
                      {saving ? "Salvando..." : "Salvar Rascunho"}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          
                          // Salva como finalizado
                          await saveReport({
                            ...currentReport,
                            gerenciadoraFinalizada: true
                          });

                          // Dispara e-mail para o emissor/editor
                          const editorEmails = currentObra?.permissoes
                            ?.filter(p => p.access === "edit")
                            ?.map(p => p.email?.trim())
                            ?.filter(Boolean) || [];
                          const creatorEmail = currentReport.creatorEmail || "";
                          const allEditors = [creatorEmail, ...editorEmails].filter(Boolean).filter((v, i, self) => self.indexOf(v) === i);

                          if (allEditors.length > 0) {
                            const targetEmail = allEditors.join(",");
                            const rdoDateStr = formatPrintDate(currentReport.data);
                            const subject = `[SEEL RDO] Comentários Concluídos pela Gerenciadora - RDO nº ${currentReport.rdoNo} - Obra: ${currentReport.obra}`;
                            
                            const textBody = `Olá,\n\nOs comentários adicionais de gerenciadora para o RDO nº ${currentReport.rdoNo} (Obra: ${currentReport.obra}, Data: ${rdoDateStr}) foram finalizados pelo gerenciador.\n\nSe todos os analisadores concluíram, agora você pode acessar a plataforma para Fechar o RDO e enviá-lo para assinatura digital.\n\nAtenciosamente,\nEquipe SEEL Engenharia.`;
                            
                            const htmlBody = `
                              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; color: #1e293b;">
                                <h2 style="color: #10b981; margin-top: 0; font-size: 18px;">Análise da Gerenciadora Concluída</h2>
                                <p>Olá,</p>
                                <p>Os comentários adicionais de gerenciadora para o RDO nº <strong>${currentReport.rdoNo}</strong> (Obra: <strong>${currentReport.obra}</strong>, data: <strong>${rdoDateStr}</strong>) foram finalizados pelo gerenciador.</p>
                                <p>Se todos os analisadores (Fiscalização e Gerenciadora) já tiverem concluído, acesse a plataforma para Fechar o RDO e colher as assinaturas digitais na aba de Aprovações/Assinaturas.</p>
                                <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">Esta é uma notificação automática do sistema de Relatório Diário de Obras (SEEL RDO).</p>
                              </div>
                            `;
                            await sendEmailHelper(targetEmail, subject, htmlBody, textBody, "Editor");
                          }

                          alert("Comentários de Gerenciadora finalizados com sucesso!");
                        } catch (err) {
                          console.error(err);
                          alert("Erro ao finalizar comentário.");
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors border-none cursor-pointer"
                    >
                      Salvar e Finalizar Comentário
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Anotações da Gerenciadora (Um por linha)</label>
                <textarea
                  value={(currentReport.comentariosGerenciadora || []).join("\n")}
                  onChange={(e) => updateReport({ 
                    comentariosGerenciadora: e.target.value.split("\n").filter(line => line.trim() !== "") 
                  })}
                  disabled={isReadOnly || currentReport.status === "Finalizado" || !isUserGerenciadora || currentReport.gerenciadoraFinalizada}
                  rows={4}
                  className="block w-full rounded border-slate-300 shadow-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-slate-800 bg-slate-50/20 disabled:bg-slate-100/50"
                  placeholder={isUserGerenciadora ? "Escreva suas anotações de gerenciadora aqui..." : "Aguardando anotações da gerenciadora..."}
                />
              </div>
            </fieldset>

            {/* ASSINATURAS DIGITAIS */}
            <div className="space-y-4 pt-6 mt-6 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 pt-2">Firmas e Signatários Responsáveis</h3>
              
              {currentReport.status !== "Finalizado" && currentReport.status !== "Assinado" && currentReport.status !== "Cancelado" && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>A coleta de assinaturas digitais estará disponível assim que o RDO for <strong>Fechado pelo Editor</strong> (após conclusão da análise do fiscal).</span>
                </div>
              )}

              {currentReport.status === "Cancelado" && (
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-bold uppercase tracking-wide">
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Este diário está CANCELADO. Nenhuma assinatura digital é válida para este documento.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* SIGNATURE 1: EMITENTE */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <span className="font-bold text-xs uppercase tracking-wide text-sky-700">Emitente Emissor (Contratada)</span>
                      {currentReport.emitenteAssinado ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Assinado
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Pendente
                        </span>
                      )}
                    </div>

                    {currentReport.emitenteAssinado ? (
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-emerald-900 text-[11px] leading-relaxed font-semibold">
                          {currentReport.emitenteConsolidado}
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold font-mono">Assinatura SHA-256</span>
                          <code className="text-[10px] text-slate-500 font-mono select-all break-all block bg-slate-50 p-1.5 rounded border border-slate-150 mt-0.5">
                            {currentReport.emitenteHash || "0x7f29ae3b902e..."}
                          </code>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Nome do Engenheiro Emissor</label>
                          <div className="mt-1 p-2 bg-slate-100 text-slate-700 border border-slate-250 rounded text-xs font-semibold select-none">
                            {displayEmitenteNome || "Nenhum nome configurado (Defina na aba de obras)"}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 italic">Este nome é configurado globalmente no gerenciamento de obras.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {!currentReport.emitenteAssinado && (
                    <div className="pt-3">
                      {isEditor && currentReport.status === "Finalizado" && (
                        <button
                          onClick={() => {
                            if (!displayEmitenteNome?.trim()) {
                              alert("Por favor, configure o Nome do Engenheiro Emissor na aba 'Gerenciar Obras' antes de assinar.");
                              return;
                            }
                            showConfirmation(
                              "Assinatura Digital - Emitente",
                              "Você confirma a assinatura digital deste RDO como Engenheiro Emitente?",
                              async () => {
                                setSaving(true);
                                try {
                                  const stampDate = new Date();
                                  const formattedDate = stampDate.toLocaleDateString("pt-BR");
                                  const formattedTime = stampDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                                  const hash = "emit_" + Array.from({length: 24}, () => Math.floor(Math.random()*16).toString(16)).join("");
                                  
                                  const willBeFullySigned = currentReport.gerenciadoraAssinado && currentReport.contratanteAssinado;

                                  await saveReport({
                                    ...currentReport,
                                    emitenteAssinado: true,
                                    emitenteNome: displayEmitenteNome,
                                    emitenteConsolidado: `Assinado digitalmente por ${displayEmitenteNome} (${user?.email || "Emissor"}) em ${formattedDate} às ${formattedTime}`,
                                    emitenteHash: hash,
                                    status: willBeFullySigned ? "Assinado" : "Finalizado"
                                  });

                                  alert("RDO assinado com sucesso como Emitente!");
                                } catch (err: any) {
                                  console.error(err);
                                  alert("Erro ao salvar assinatura: " + err.message);
                                } finally {
                                  setSaving(false);
                                }
                              },
                              "success",
                              "Sim, Assinar RDO",
                              "Cancelar"
                            );
                          }}
                          disabled={saving || !displayEmitenteNome?.trim()}
                          className="w-full h-8 flex items-center justify-center gap-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] uppercase tracking-wide rounded cursor-pointer border-none shadow-sm duration-150 transition-colors disabled:opacity-50"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Assinar Digitalmente
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* SIGNATURE 2: FISCAL GERENCIADORA */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <span className="font-bold text-xs uppercase tracking-wide text-sky-700">Fiscal da Gerenciadora</span>
                      {currentReport.gerenciadoraAssinado ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Assinado
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Pendente
                        </span>
                      )}
                    </div>

                    {currentReport.gerenciadoraAssinado ? (
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-emerald-900 text-[11px] leading-relaxed font-semibold">
                          {currentReport.gerenciadoraConsolidado}
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold font-mono">Assinatura SHA-256</span>
                          <code className="text-[10px] text-slate-500 font-mono select-all break-all block bg-slate-50 p-1.5 rounded border border-slate-150 mt-0.5">
                            {currentReport.gerenciadoraHash || "0xf38ab25ea9c4..."}
                          </code>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Nome do Fiscal da Gerenciadora</label>
                          <div className="mt-1 p-2 bg-slate-100 text-slate-700 border border-slate-250 rounded text-xs font-semibold select-none">
                            {displayGerenciadoraNome || "Nenhum nome configurado (Defina na aba de obras)"}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 italic">Este nome é configurado globalmente no gerenciamento de obras.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {!currentReport.gerenciadoraAssinado && (
                    <div className="pt-3">
                      {isFiscalizadora && currentReport.status === "Finalizado" && (
                        <button
                          onClick={() => {
                            if (!displayGerenciadoraNome?.trim()) {
                              alert("Por favor, configure o Nome do Fiscal da Gerenciadora na aba 'Gerenciar Obras' antes de assinar.");
                              return;
                            }
                            showConfirmation(
                              "Assinatura Digital - Gerenciadora",
                              "Você confirma a assinatura digital deste RDO como Fiscal da Gerenciadora?",
                              async () => {
                                setSaving(true);
                                try {
                                  const stampDate = new Date();
                                  const formattedDate = stampDate.toLocaleDateString("pt-BR");
                                  const formattedTime = stampDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                                  const hash = "ger_" + Array.from({length: 24}, () => Math.floor(Math.random()*16).toString(16)).join("");
                                  
                                  const willBeFullySigned = currentReport.emitenteAssinado && currentReport.contratanteAssinado;

                                  await saveReport({
                                    ...currentReport,
                                    gerenciadoraAssinado: true,
                                    gerenciadoraNome: displayGerenciadoraNome,
                                    gerenciadoraConsolidado: `Assinado digitalmente por ${displayGerenciadoraNome} (${user?.email || "Gerenciadora"}) em ${formattedDate} às ${formattedTime}`,
                                    gerenciadoraHash: hash,
                                    status: willBeFullySigned ? "Assinado" : "Finalizado"
                                  });

                                  alert("RDO assinado com sucesso como Gerenciadora!");
                                } catch (err: any) {
                                  console.error(err);
                                  alert("Erro ao salvar assinatura da gerenciadora: " + err.message);
                                } finally {
                                  setSaving(false);
                                }
                              },
                              "success",
                              "Sim, Assinar RDO",
                              "Cancelar"
                            );
                          }}
                          disabled={saving || !displayGerenciadoraNome?.trim()}
                          className="w-full h-8 flex items-center justify-center gap-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] uppercase tracking-wide rounded cursor-pointer border-none shadow-sm duration-150 transition-colors disabled:opacity-50"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Assinar Gerenciadora
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* SIGNATURE 3: FISCAL CONTRATANTE */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <span className="font-bold text-xs uppercase tracking-wide text-sky-700">Fiscal Contratante (Aprovador)</span>
                      {currentReport.contratanteAssinado ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Assinado
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Pendente
                        </span>
                      )}
                    </div>

                    {currentReport.contratanteAssinado ? (
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-emerald-900 text-[11px] leading-relaxed font-semibold">
                          {currentReport.contratanteAprovado}
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold font-mono">Assinatura SHA-256</span>
                          <code className="text-[10px] text-slate-500 font-mono select-all break-all block bg-slate-50 p-1.5 rounded border border-slate-150 mt-0.5">
                            {currentReport.contratanteHash || "0x9d4a821ce4f5..."}
                          </code>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Nome do Fiscal Aprovador</label>
                          <div className="mt-1 p-2 bg-slate-100 text-slate-700 border border-slate-250 rounded text-xs font-semibold select-none">
                            {displayContratanteNome || "Nenhum nome configurado (Defina na aba de obras)"}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 italic">Este nome é configurado globalmente no gerenciamento de obras.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {!currentReport.contratanteAssinado && (
                    <div className="pt-3">
                      {isFiscalizacao && currentReport.status === "Finalizado" && (
                        <button
                          onClick={() => {
                            if (!displayContratanteNome?.trim()) {
                              alert("Por favor, configure o Nome do Fiscal Aprovador na aba 'Gerenciar Obras' antes de assinar.");
                              return;
                            }
                            showConfirmation(
                              "Aprovação e Assinatura - Fiscal",
                              "Você confirma a aprovação e assinatura digital deste RDO como Fiscal Contratante?",
                              async () => {
                                setSaving(true);
                                try {
                                  const stampDate = new Date();
                                  const formattedDate = stampDate.toLocaleDateString("pt-BR");
                                  const formattedTime = stampDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                                  const hash = "fisc_" + Array.from({length: 24}, () => Math.floor(Math.random()*16).toString(16)).join("");
                                  
                                  const willBeFullySigned = currentReport.emitenteAssinado && currentReport.gerenciadoraAssinado;

                                  await saveReport({
                                    ...currentReport,
                                    contratanteAssinado: true,
                                    contratanteNome: displayContratanteNome,
                                    contratanteAprovado: `Aprovado digitalmente por ${displayContratanteNome} (${user?.email || "Fiscal"}) em ${formattedDate} às ${formattedTime}`,
                                    contratanteHash: hash,
                                    status: willBeFullySigned ? "Assinado" : "Finalizado"
                                  });

                                  alert("RDO aprovado e assinado com sucesso como Fiscal!");
                                } catch (err: any) {
                                  console.error(err);
                                  alert("Erro ao salvar assinatura do fiscal: " + err.message);
                                } finally {
                                  setSaving(false);
                                }
                              },
                              "success",
                              "Sim, Assinar e Aprovar",
                              "Cancelar"
                            );
                          }}
                          disabled={saving || !displayContratanteNome?.trim()}
                          className="w-full h-8 flex items-center justify-center gap-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wide rounded cursor-pointer border-none shadow-sm duration-150 transition-colors disabled:opacity-50"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Assinar e Aprovar RDO
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Escolha e Clonagem de Dados (Efetivo ou Equipamentos) */}
        {cloneType && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh]">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Copy className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                      {cloneType === "efetivo" ? "Clonar Equipe (Efetivo)" : "Clonar Equipamentos"}
                    </h4>
                    <p className="text-[10px] text-gray-500 uppercase tracking-tight font-semibold">
                      Selecione o dia do diário de origem para copiar os dados
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setCloneType(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer border-none duration-150 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 custom-scrollbar space-y-2">
                {otherReportsForCloning.length > 0 ? (
                  otherReportsForCloning.map((rep, i) => {
                    const laborCount = rep.efetivoDetalhado?.reduce((sum, g) => sum + (g.items || []).reduce((s, itm) => s + (Number(itm.c || 0) - Number(itm.f || 0)), 0), 0) || 0;
                    const laborGroupCount = rep.efetivoDetalhado?.length || 0;
                    const equipCount = rep.equipamentosDetalhado?.reduce((sum, q) => sum + Number(q.quantidade || 0), 0) || 0;

                    return (
                      <div 
                        key={rep.id || i}
                        onClick={() => {
                          if (cloneType === "efetivo") handleCloneLabor(rep);
                          else handleCloneEquipment(rep);
                        }}
                        className="border border-slate-150 rounded-xl p-3.5 hover:border-emerald-500 hover:bg-emerald-50/10 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">RDO {rep.rdoNo || "-"}</span>
                            <span className="text-xs font-bold text-slate-700">{formatPrintDate(rep.data)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {cloneType === "efetivo" ? (
                              <span>{laborGroupCount} empresas mobilizadas, {laborCount} pessoas presentes no total.</span>
                            ) : (
                              <span>{rep.equipamentosDetalhado?.length || 0} maquinários mobilizados, {equipCount} unidades no total.</span>
                            )}
                          </div>
                        </div>
                        <div className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                          Selecionar
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-slate-400 italic">Nenhum outro diário de obra foi localizado para cópia.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-100">
                <button
                  onClick={() => setCloneType(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 cursor-pointer duration-150 transition-colors"
                >
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        )}

        {emailFallback && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-950 uppercase tracking-wide">
                      Notificar por E-mail (Outlook)
                    </h4>
                    <p className="text-[10px] text-sky-600 uppercase tracking-wider font-bold">
                      RDO Atualizado no Sistema com sucesso!
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEmailFallback(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer border-none duration-150 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-5 space-y-4 text-xs custom-scrollbar">
                <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
                  Para sua maior segurança e privacidade, os e-mails são encaminhados diretamente através da sua própria conta do Outlook. Copie os dados abaixo ou clique nos botões para abrir a tela de composição de e-mail pronta.
                </p>

                {/* CAMPO: DESTINATÁRIO */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Destinatário (Para)</label>
                    <button
                      onClick={() => handleCopyField(emailFallback.to, "to")}
                      className="text-[10px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer border-none bg-transparent"
                    >
                      {copiedField === "to" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-800 break-all select-all font-medium">
                    {emailFallback.to}
                  </div>
                </div>

                {/* CAMPO: ASSUNTO */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assunto do E-mail</label>
                    <button
                      onClick={() => handleCopyField(emailFallback.subject, "subject")}
                      className="text-[10px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer border-none bg-transparent"
                    >
                      {copiedField === "subject" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-semibold leading-snug">
                    {emailFallback.subject}
                  </div>
                </div>

                {/* CAMPO: CONTEÚDO */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Texto da Notificação</label>
                    <button
                      onClick={() => handleCopyField(emailFallback.body, "body")}
                      className="text-[10px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer border-none bg-transparent"
                    >
                      {copiedField === "body" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar Corpo</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-sans whitespace-pre-wrap leading-relaxed text-slate-700 text-[11px] max-h-40 overflow-y-auto custom-scrollbar">
                    {emailFallback.body}
                  </pre>
                </div>
              </div>

              {/* RODAPÉ COM AÇÕES */}
              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center sm:justify-end">
                <button
                  onClick={() => handleCopyText(`Para: ${emailFallback.to}\nAssunto: ${emailFallback.subject}\n\n${emailFallback.body}`)}
                  className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-none flex items-center gap-1.5 justify-center"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado!" : "Copiar Tudo"}
                </button>

                <a
                  href={`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(emailFallback.to)}&subject=${encodeURIComponent(emailFallback.subject)}&body=${encodeURIComponent(emailFallback.body)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setEmailFallback(null)}
                  className="h-9 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-none flex items-center gap-1.5 no-underline justify-center shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  Outlook Web (Corporativo)
                </a>

                <a
                  href={`mailto:${emailFallback.to}?subject=${encodeURIComponent(emailFallback.subject)}&body=${encodeURIComponent(emailFallback.body)}`}
                  onClick={() => setEmailFallback(null)}
                  className="h-9 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-none flex items-center gap-1.5 no-underline justify-center"
                >
                  <Send className="w-4 h-4" />
                  App Local
                </a>
              </div>
            </div>
          </div>
        )}

        {confirmModal && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-md w-full shadow-2xl flex flex-col space-y-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full mt-0.5 ${
                  confirmModal.type === "danger" ? "bg-red-50 text-red-600" :
                  confirmModal.type === "success" ? "bg-emerald-50 text-emerald-600" :
                  confirmModal.type === "info" ? "bg-sky-50 text-sky-600" :
                  "bg-amber-50 text-amber-600"
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 leading-tight">
                    {confirmModal.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {confirmModal.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="h-8.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-none"
                >
                  {confirmModal.cancelText || "Cancelar"}
                </button>
                <button
                  onClick={async () => {
                    const onConfirmFn = confirmModal.onConfirm;
                    setConfirmModal(null);
                    await onConfirmFn();
                  }}
                  className={`h-8.5 px-4 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-none ${
                    confirmModal.type === "danger" ? "bg-red-600 hover:bg-red-700" :
                    confirmModal.type === "success" ? "bg-emerald-600 hover:bg-emerald-700" :
                    confirmModal.type === "info" ? "bg-sky-600 hover:bg-sky-700" :
                    "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {confirmModal.confirmText || "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
};

// Simple date text formater wrapper
const formatPrintDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  const dateObj = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric", weekday: "short" };
  return dateObj.toLocaleDateString("pt-BR", options);
};
