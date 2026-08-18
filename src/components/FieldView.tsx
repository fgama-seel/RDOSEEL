/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  RdoReport, 
  Activity, 
  CompanyLaborGroup, 
  LaborDetailItem, 
  EquipmentMobilizedDetail,
  StoppageDetailRow,
  ObraEfetivoMember,
  HOURS_LIST
} from "../types";
import { useRdoStore } from "../context/RdoContext";
import { compressImage } from "../utils/imageUtils";
import { RichTextarea } from "./RichTextarea";
import { 
  HardHat, 
  Calendar, 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  Users, 
  Wrench, 
  ClipboardList, 
  AlertTriangle, 
  Camera, 
  Upload, 
  Trash2, 
  Plus, 
  Copy, 
  Save, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  LogOut, 
  ChevronDown, 
  Layers, 
  Clock, 
  Sparkles,
  X,
  FileSpreadsheet,
  Check,
  Building2,
  ArrowRight
} from "lucide-react";

interface FieldViewProps {
  onSwitchToFullView?: () => void;
  canSwitchToFull?: boolean;
}

const CLIMATE_OPTIONS = [
  { value: "Bom / Sol", label: "Sol / Bom", icon: Sun, color: "text-amber-500 bg-amber-50 border-amber-200" },
  { value: "Nublado", label: "Nublado", icon: Cloud, color: "text-slate-600 bg-slate-100 border-slate-200" },
  { value: "Chuva Leve", label: "Chuva Leve", icon: CloudRain, color: "text-sky-600 bg-sky-50 border-sky-200" },
  { value: "Chuva Forte", label: "Chuva Forte", icon: CloudRain, color: "text-blue-700 bg-blue-50 border-blue-200" },
  { value: "Impraticável", label: "Impraticável", icon: CloudLightning, color: "text-red-700 bg-red-50 border-red-200" },
];

export const FieldView: React.FC<FieldViewProps> = ({ 
  onSwitchToFullView, 
  canSwitchToFull = false 
}) => {
  const { 
    user, 
    obras, 
    currentObra, 
    setCurrentObra, 
    reports, 
    currentReport, 
    setCurrentReport, 
    saveReport, 
    logout, 
    isFirebase 
  } = useRdoStore();

  // Online / Offline state tracking
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Clone modals
  const [cloneModalType, setCloneModalType] = useState<"efetivo" | "equipamentos" | null>(null);
  const [isEfetivoModalOpen, setIsEfetivoModalOpen] = useState(false);
  const [pqPickerForIdx, setPqPickerForIdx] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<"todos" | "clima" | "efetivo" | "equipamentos" | "atividades" | "paralisacoes">("todos");

  // Track online/offline browser events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncFeedback("Conexão com a internet restabelecida!");
      setTimeout(() => setSyncFeedback(null), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncFeedback("Modo Offline ativado. As alterações estão sendo salvas no celular.");
      setTimeout(() => setSyncFeedback(null), 4000);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Filter ONLY RDOs with status "Em Digitação" (Strict requirement for Encarregado)
  const availableRdos = useMemo(() => {
    return (reports || []).filter(r => {
      const isEmDigitacao = !r.status || r.status === "Em Digitação";
      if (!isEmDigitacao) return false;
      if (currentObra) {
        return r.obraId === currentObra.id || r.obra === currentObra.nome;
      }
      return true;
    }).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [reports, currentObra]);

  // Ensure an "Em Digitação" RDO is selected
  useEffect(() => {
    if (availableRdos.length > 0) {
      if (!currentReport || !availableRdos.some(r => r.id === currentReport.id)) {
        setCurrentReport(availableRdos[0]);
      }
    }
  }, [availableRdos, currentReport, setCurrentReport]);

  // Local helper to update report state & mark pending sync
  const updateLocalReport = (fields: Partial<RdoReport>) => {
    if (!currentReport) return;
    const updated = { ...currentReport, ...fields, updatedAt: new Date().toISOString() };
    setCurrentReport(updated);
    setPendingSync(true);

    // Save immediately to localStorage for bulletproof offline cache
    try {
      localStorage.setItem(`rdo_field_draft_${updated.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn("Error saving to local draft:", e);
    }
  };

  // Synchronize data to Firebase / Central DB
  const handleSyncData = async () => {
    if (!currentReport) return;
    setIsSaving(true);
    setSyncFeedback(null);

    try {
      // Auto compute labor and equipment totals before saving
      let computedMoi = 0;
      let computedMod = 0;
      (currentReport.efetivoDetalhado || []).forEach(g => {
        (g.items || []).forEach(itm => {
          const present = Math.max(0, Number(itm.c || 0) - Number(itm.f || 0));
          if (itm.moiMod === "MOI") computedMoi += present;
          else computedMod += present;
        });
      });

      const computedEqTotal = (currentReport.equipamentosDetalhado || []).reduce(
        (sum, q) => sum + Number(q.quantidade || 0), 0
      );

      const reportToSave: RdoReport = {
        ...currentReport,
        efetivoSummary: {
          ...currentReport.efetivoSummary,
          moi: computedMoi,
          mod: computedMod,
          total: computedMoi + computedMod + Number(currentReport.efetivoSummary?.subcontratadosMoiMod || 0)
        },
        equipamentosSummary: {
          ...currentReport.equipamentosSummary,
          total: computedEqTotal,
          mobilizados: computedEqTotal
        }
      };

      await saveReport(reportToSave);
      setPendingSync(false);
      setSyncFeedback("Dados sincronizados com sucesso na nuvem!");
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch (err: any) {
      console.error(err);
      setSyncFeedback("Erro ao sincronizar na nuvem. Os dados permanecem salvos neste celular.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper date formatter
  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return `${weekdays[d.getDay()]}, ${day} de ${months[d.getMonth()]} de ${year}`;
  };

  // ----------------------------------------------------
  // LABOR & EFFECTIVE MANAGEMENT
  // ----------------------------------------------------
  const handleUpdateLaborItem = (groupIndex: number, itemId: string, fields: Partial<LaborDetailItem>) => {
    if (!currentReport) return;
    const updatedGrid = [...currentReport.efetivoDetalhado];
    const group = { ...updatedGrid[groupIndex] };
    group.items = (group.items || []).map(itm => {
      if (itm.id === itemId) {
        const item = { ...itm, ...fields };
        if ("c" in fields || "f" in fields) {
          item.t = Math.max(0, (item.c || 0) - (item.f || 0));
        }
        return item;
      }
      return itm;
    });
    updatedGrid[groupIndex] = group;
    updateLocalReport({ efetivoDetalhado: updatedGrid });
  };

  const handleAddLaborRow = (groupIndex: number) => {
    if (!currentReport) return;
    const updatedGrid = [...currentReport.efetivoDetalhado];
    const group = { ...updatedGrid[groupIndex] };
    const newItem: LaborDetailItem = {
      id: "labor-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      cargo: "",
      c: 1,
      f: 0,
      a: 0,
      t: 1,
      moiMod: "MOD"
    };
    group.items = [...(group.items || []), newItem];
    updatedGrid[groupIndex] = group;
    updateLocalReport({ efetivoDetalhado: updatedGrid });
  };

  const handleDeleteLaborRow = (groupIndex: number, itemId: string) => {
    if (!currentReport) return;
    const updatedGrid = [...currentReport.efetivoDetalhado];
    const group = { ...updatedGrid[groupIndex] };
    group.items = (group.items || []).filter(itm => itm.id !== itemId);
    updatedGrid[groupIndex] = group;
    updateLocalReport({ efetivoDetalhado: updatedGrid });
  };

  const handleAddSubcontractorGroup = (name: string) => {
    if (!currentReport || !name.trim()) return;
    const exists = currentReport.efetivoDetalhado.some(g => g.nome.toUpperCase() === name.trim().toUpperCase());
    if (exists) {
      alert("Esta empresa já está adicionada.");
      return;
    }
    const newGroup: CompanyLaborGroup = {
      id: "sub-" + Date.now(),
      nome: name.trim().toUpperCase(),
      items: [
        {
          id: "labor-" + Date.now(),
          cargo: "Servente / Operacional",
          c: 1,
          f: 0,
          a: 0,
          t: 1,
          moiMod: "MOD"
        }
      ]
    };
    updateLocalReport({ efetivoDetalhado: [...currentReport.efetivoDetalhado, newGroup] });
  };

  const handleCloneLabor = (sourceReport: RdoReport) => {
    if (!currentReport || !sourceReport.efetivoDetalhado || sourceReport.efetivoDetalhado.length === 0) {
      alert("O RDO selecionado não possui equipe lançada.");
      return;
    }
    const cloned = JSON.parse(JSON.stringify(sourceReport.efetivoDetalhado));
    const secureCloned = cloned.map((g: any) => ({
      ...g,
      id: "labor-group-" + Math.random().toString(36).substring(2, 9) + Date.now(),
      items: (g.items || []).map((itm: any) => ({
        ...itm,
        id: "labor-itm-" + Math.random().toString(36).substring(2, 9) + Date.now(),
        c: Number(itm.c || 0),
        f: Number(itm.f || 0),
        a: Number(itm.a || 0),
        t: Math.max(0, Number(itm.c || 0) - Number(itm.f || 0))
      }))
    }));
    updateLocalReport({ efetivoDetalhado: secureCloned });
    setCloneModalType(null);
    setSyncFeedback("Equipe clonada com sucesso!");
    setTimeout(() => setSyncFeedback(null), 2500);
  };

  // ----------------------------------------------------
  // EQUIPMENT MANAGEMENT
  // ----------------------------------------------------
  const handleAddEquipment = () => {
    if (!currentReport) return;
    const newItem: EquipmentMobilizedDetail = {
      id: "eq-" + Date.now(),
      descricao: "Novo Equipamento",
      quantidade: 1,
      empresa: currentReport.contratada || "SEEL"
    };
    updateLocalReport({
      equipamentosDetalhado: [...currentReport.equipamentosDetalhado, newItem]
    });
  };

  const handleUpdateEquipment = (index: number, fields: Partial<EquipmentMobilizedDetail>) => {
    if (!currentReport) return;
    const updated = [...currentReport.equipamentosDetalhado];
    updated[index] = { ...updated[index], ...fields };
    updateLocalReport({ equipamentosDetalhado: updated });
  };

  const handleDeleteEquipment = (index: number) => {
    if (!currentReport) return;
    const updated = currentReport.equipamentosDetalhado.filter((_, i) => i !== index);
    updateLocalReport({ equipamentosDetalhado: updated });
  };

  const handleCloneEquipment = (sourceReport: RdoReport) => {
    if (!currentReport || !sourceReport.equipamentosDetalhado || sourceReport.equipamentosDetalhado.length === 0) {
      alert("O RDO selecionado não possui equipamentos lançados.");
      return;
    }
    const cloned = JSON.parse(JSON.stringify(sourceReport.equipamentosDetalhado));
    const secureCloned = cloned.map((eq: any) => ({
      ...eq,
      id: "eq-" + Math.random().toString(36).substring(2, 9) + Date.now()
    }));
    updateLocalReport({ equipamentosDetalhado: secureCloned });
    setCloneModalType(null);
    setSyncFeedback("Equipamentos clonados com sucesso!");
    setTimeout(() => setSyncFeedback(null), 2500);
  };

  // ----------------------------------------------------
  // ACTIVITIES & PRODUCTION (PQ)
  // ----------------------------------------------------
  const handleAddActivity = () => {
    if (!currentReport) return;
    const associatedObra = obras.find(o => o.id === currentReport.obraId || o.nome === currentReport.obra);
    const firstRegistered = associatedObra?.atividades?.[0];

    const newAct: Activity = {
      id: "act-" + Date.now(),
      ref: firstRegistered?.ref || "001",
      fase: firstRegistered?.fase || "Frente de Obra",
      identificador: firstRegistered?.identificador || "1.0",
      descricao: firstRegistered?.descricao || "Serviço executado em campo",
      intervalo: firstRegistered?.unidade || "m³",
      total: "1",
      comentario: "",
      imagens: []
    };
    updateLocalReport({ atividades: [...(currentReport.atividades || []), newAct] });
  };

  const handleUpdateActivity = (index: number, fields: Partial<Activity>) => {
    if (!currentReport) return;
    const updated = [...(currentReport.atividades || [])];
    updated[index] = { ...updated[index], ...fields };
    updateLocalReport({ atividades: updated });
  };

  const handleDeleteActivity = (index: number) => {
    if (!currentReport) return;
    const updated = (currentReport.atividades || []).filter((_, i) => i !== index);
    updateLocalReport({ atividades: updated });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, actIdx: number) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentReport) return;
    
    const newImages: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(base64, 1024, 1024, 0.7);
      newImages.push(compressed);
    }

    if (newImages.length > 0) {
      const existing = currentReport.atividades[actIdx]?.imagens || [];
      handleUpdateActivity(actIdx, { imagens: [...existing, ...newImages] });
      setSyncFeedback(`${newImages.length} foto(s) adicionada(s)!`);
      setTimeout(() => setSyncFeedback(null), 2500);
    }
    e.target.value = "";
  };

  // ----------------------------------------------------
  // STOPPAGES (PARALISAÇÕES)
  // ----------------------------------------------------
  const handleUpdateStoppage = (category: string, fields: Partial<StoppageDetailRow>) => {
    if (!currentReport) return;
    const currentDetail = currentReport.paralisacoesDetalhe?.[category] || {
      ativo: false,
      horas: [],
      frentes: "",
      local: "",
      maoDeObraParalisada: "",
      comentarios: "",
      total: "0h"
    };
    const updatedRow = { ...currentDetail, ...fields };
    const updatedDetail = {
      ...currentReport.paralisacoesDetalhe,
      [category]: updatedRow
    };
    updateLocalReport({ paralisacoesDetalhe: updatedDetail });
  };

  const toggleStoppageHour = (category: string, hour: string) => {
    if (!currentReport) return;
    const row = currentReport.paralisacoesDetalhe?.[category] || {
      ativo: true,
      horas: [],
      frentes: "",
      local: "",
      maoDeObraParalisada: "",
      comentarios: "",
      total: "0h"
    };
    let currentHours = [...(row.horas || [])];
    if (currentHours.includes(hour)) {
      currentHours = currentHours.filter(h => h !== hour);
    } else {
      currentHours.push(hour);
    }
    handleUpdateStoppage(category, {
      horas: currentHours,
      total: `${currentHours.length}h`
    });
  };

  // If no "Em Digitação" RDO exists
  if (availableRdos.length === 0 || !currentReport) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-lg font-bold flex items-center justify-center">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-tight leading-none">RDO CAMPO</h1>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-0.5">Visão do Encarregado</p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>

        {/* Empty State Notice */}
        <div className="my-auto text-center max-w-md mx-auto space-y-4 py-12">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold text-white">Nenhum Diário em Digitação</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Não há nenhum RDO com status <strong>"Em Digitação"</strong> disponível para a obra selecionada no momento.
          </p>
          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-left text-xs space-y-2 text-slate-300">
            <p className="font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Procedimento do Encarregado:
            </p>
            <p>
              1. Solicite ao Engenheiro Responsável a abertura/criação do RDO do dia.
            </p>
            <p>
              2. Assim que o diário for criado, ele aparecerá aqui automaticamente para você preencher os dados de campo.
            </p>
          </div>

          {canSwitchToFull && onSwitchToFullView && (
            <button
              onClick={onSwitchToFullView}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer"
            >
              Alternar para Visão Completa de Engenharia
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-500 py-2 border-t border-slate-800">
          SEEL Engenharia — Módulo de Campo Mobile &copy; {new Date().getFullYear()}
        </div>
      </div>
    );
  }

  const associatedObra = obras.find(o => o.id === currentReport.obraId || o.nome === currentReport.obra) || currentObra;
  const registeredPq = associatedObra?.atividades || [];
  const registeredSubs = associatedObra?.subcontratadas || [];
  const registeredEfetivos = associatedObra?.quadroEfetivos || [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans pb-28">
      {/* 1. COMPACT STICKY TOP HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          {/* Brand + Worksite selection */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-lg font-bold flex items-center justify-center shrink-0">
              <HardHat className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-amber-400 uppercase tracking-wide">RDO CAMPO</span>
                {/* Online/Offline Badge */}
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isOnline 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}>
                  {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-200 truncate">{associatedObra?.nome || currentReport.obra || "Obra"}</p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-1.5 shrink-0">
            {canSwitchToFull && onSwitchToFullView && (
              <button
                onClick={onSwitchToFullView}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border border-slate-700 flex items-center gap-1"
                title="Alternar para Modo Engenharia"
              >
                Visão Completa
              </button>
            )}
            <button
              onClick={() => logout()}
              className="p-1.5 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-300 rounded-lg transition-colors cursor-pointer border border-slate-700"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast if active */}
        {syncFeedback && (
          <div className="bg-amber-500 text-slate-950 text-xs font-bold px-4 py-1.5 text-center flex items-center justify-center gap-1.5 animate-fade-in shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{syncFeedback}</span>
          </div>
        )}
      </header>

      {/* 2. RDO SELECTOR BAR */}
      <div className="bg-amber-500 text-slate-950 px-4 py-3 shadow-xs border-b border-amber-600/30">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-950/70 block">
              Diário em Digitação Selecionado
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight">{currentReport.rdoNo || "RDO"}</h2>
              <span className="text-xs font-bold text-amber-950/80 bg-amber-400/80 px-2 py-0.5 rounded">
                {formatDateFull(currentReport.data)}
              </span>
            </div>
          </div>

          {/* RDO Dropdown Selector if multiple "Em Digitação" */}
          {availableRdos.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-amber-950 uppercase shrink-0">Trocar RDO:</label>
              <select
                value={currentReport.id}
                onChange={(e) => {
                  const target = availableRdos.find(r => r.id === e.target.value);
                  if (target) setCurrentReport(target);
                }}
                className="bg-white text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1.5 border border-amber-600 focus:ring-2 focus:ring-slate-900 outline-none shadow-xs"
              >
                {availableRdos.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.rdoNo} — {r.data}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3. MAIN SINGLE-PAGE FIELD FORM CONTENT */}
      <main className="max-w-3xl w-full mx-auto p-4 space-y-6">

        {/* ========================================================================= */}
        {/* SEÇÃO 1: CLIMA & CONDIÇÕES DO TEMPO                                      */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">1. Clima & Tempo</h3>
                <p className="text-[10px] text-slate-500 font-medium">Selecione as condições de cada turno de trabalho</p>
              </div>
            </div>
          </div>

          {/* Turnos: Manhã, Tarde, Noite */}
          <div className="space-y-4">
            {/* Manhã */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Turno: Manhã</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CLIMATE_OPTIONS.map(opt => {
                  const isSelected = (currentReport.fatosRelevantes?.[0] || "") === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const fatos = [...(currentReport.fatosRelevantes || ["", "", ""])];
                        fatos[0] = opt.value;
                        updateLocalReport({ fatosRelevantes: fatos });
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                        isSelected 
                          ? `${opt.color} ring-2 ring-amber-500 shadow-sm scale-102` 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tarde */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Turno: Tarde</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CLIMATE_OPTIONS.map(opt => {
                  const isSelected = (currentReport.fatosRelevantes?.[1] || "") === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const fatos = [...(currentReport.fatosRelevantes || ["", "", ""])];
                        fatos[1] = opt.value;
                        updateLocalReport({ fatosRelevantes: fatos });
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                        isSelected 
                          ? `${opt.color} ring-2 ring-amber-500 shadow-sm scale-102` 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Noite */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Turno: Noite</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CLIMATE_OPTIONS.map(opt => {
                  const isSelected = (currentReport.fatosRelevantes?.[2] || "") === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const fatos = [...(currentReport.fatosRelevantes || ["", "", ""])];
                        fatos[2] = opt.value;
                        updateLocalReport({ fatosRelevantes: fatos });
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                        isSelected 
                          ? `${opt.color} ring-2 ring-amber-500 shadow-sm scale-102` 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pluviometria (mm de chuva) */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl">
              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase block">Chuva do Dia (mm):</label>
                <span className="text-[10px] text-slate-500">Informe o índice pluviométrico total caso tenha chovido</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={currentReport.precipitacao?.total || 0}
                  onChange={(e) => updateLocalReport({
                    precipitacao: {
                      ...currentReport.precipitacao,
                      total: Math.max(0, Number(e.target.value))
                    }
                  })}
                  className="w-28 h-10 bg-white border border-slate-300 rounded-xl px-3 text-center text-sm font-black text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="0.0"
                />
                <span className="text-xs font-black text-slate-600">mm</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 2: QUADRO DE EFETIVOS (EQUIPE DE CAMPO)                             */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">2. Quadro de Efetivos</h3>
                <p className="text-[10px] text-slate-500 font-medium">Lançamento de mão de obra presente no dia</p>
              </div>
            </div>

            {/* Cloning and Import Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCloneModalType("efetivo")}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Clonar equipe do RDO anterior"
              >
                <Copy className="w-3.5 h-3.5" />
                Clonar Equipe
              </button>
            </div>
          </div>

          {/* List of Labor Groups by Company */}
          <div className="space-y-4">
            {(currentReport.efetivoDetalhado || []).map((group, gIdx) => (
              <div key={group.id || gIdx} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                {/* Group Company Header */}
                <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span className="font-black text-xs uppercase tracking-wide text-amber-300">
                      {group.nome || "EMPRESA"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddLaborRow(gIdx)}
                    className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    + Função
                  </button>
                </div>

                {/* Items in Group */}
                <div className="p-3 space-y-2.5 divide-y divide-slate-200/70">
                  {(group.items || []).map((item, iIdx) => {
                    const present = Math.max(0, Number(item.c || 0) - Number(item.f || 0));
                    return (
                      <div key={item.id || iIdx} className={`pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5`}>
                        {/* Cargo / Role description */}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.cargo}
                            onChange={(e) => handleUpdateLaborItem(gIdx, item.id, { cargo: e.target.value })}
                            placeholder="Nome da Função / Cargo..."
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                              item.moiMod === "MOI" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                            }`}>
                              {item.moiMod || "MOD"}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              Presentes: <strong className="text-emerald-700 font-black text-xs">{present}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Numeric Increment / Decrement Steppers */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Cadastrados (C) */}
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase">Cadast.</span>
                            <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateLaborItem(gIdx, item.id, { c: Math.max(0, Number(item.c || 0) - 1) })}
                                className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 active:bg-slate-200 text-sm cursor-pointer border-none bg-transparent"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-xs font-black text-slate-900">{item.c || 0}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateLaborItem(gIdx, item.id, { c: Number(item.c || 0) + 1 })}
                                className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 active:bg-slate-200 text-sm cursor-pointer border-none bg-transparent"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Faltas (F) */}
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-extrabold text-red-500 uppercase">Faltas</span>
                            <div className="flex items-center border border-red-200 rounded-lg bg-red-50/50 overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateLaborItem(gIdx, item.id, { f: Math.max(0, Number(item.f || 0) - 1) })}
                                className="w-8 h-8 flex items-center justify-center font-bold text-red-700 hover:bg-red-100 active:bg-red-200 text-sm cursor-pointer border-none bg-transparent"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-xs font-black text-red-700">{item.f || 0}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateLaborItem(gIdx, item.id, { f: Number(item.f || 0) + 1 })}
                                className="w-8 h-8 flex items-center justify-center font-bold text-red-700 hover:bg-red-100 active:bg-red-200 text-sm cursor-pointer border-none bg-transparent"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Delete Item Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLaborRow(gIdx, item.id)}
                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer border-none bg-transparent mt-4"
                            title="Remover função"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quick Add Subcontractor Company */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const name = prompt("Digite o nome da empresa/subcontratada a adicionar:");
                  if (name && name.trim()) handleAddSubcontractorGroup(name);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                Adicionar Empresa / Subcontratada
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 3: QUADRO DE EQUIPAMENTOS                                           */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">3. Equipamentos Mobilizados</h3>
                <p className="text-[10px] text-slate-500 font-medium">Maquinários e equipamentos em operação na obra</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCloneModalType("equipamentos")}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Clonar equipamentos do RDO anterior"
              >
                <Copy className="w-3.5 h-3.5" />
                Clonar Equipamentos
              </button>
              <button
                type="button"
                onClick={handleAddEquipment}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Equipamento
              </button>
            </div>
          </div>

          {/* List of Equipments */}
          <div className="space-y-2.5">
            {(currentReport.equipamentosDetalhado || []).map((eq, idx) => (
              <div key={eq.id || idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    value={eq.descricao}
                    onChange={(e) => handleUpdateEquipment(idx, { descricao: e.target.value })}
                    placeholder="Descrição do equipamento (ex: Retroescavadeira)..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <input
                    type="text"
                    value={eq.empresa || ""}
                    onChange={(e) => handleUpdateEquipment(idx, { empresa: e.target.value })}
                    placeholder="Empresa Proprietária / Locada (ex: SEEL)..."
                    className="w-full sm:w-1/2 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-600 outline-none"
                  />
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleUpdateEquipment(idx, { quantidade: Math.max(1, Number(eq.quantidade || 1) - 1) })}
                      className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 active:bg-slate-200 text-sm cursor-pointer border-none bg-transparent"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-black text-slate-900">{eq.quantidade || 1}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateEquipment(idx, { quantidade: Number(eq.quantidade || 1) + 1 })}
                      className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 active:bg-slate-200 text-sm cursor-pointer border-none bg-transparent"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteEquipment(idx)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                    title="Excluir equipamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {(currentReport.equipamentosDetalhado || []).length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhum equipamento adicionado. Clique no botão acima para adicionar ou clonar do diário anterior.
              </p>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 4: ATIVIDADES DE CAMPO & PRODUÇÃO (PQ)                              */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">4. Atividades de Campo</h3>
                <p className="text-[10px] text-slate-500 font-medium">Serviços executados no dia e registro de fotos</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddActivity}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              + Nova Atividade
            </button>
          </div>

          {/* List of Activities */}
          <div className="space-y-4">
            {(currentReport.atividades || []).map((act, actIdx) => {
              return (
                <div key={act.id || actIdx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-xs rounded-md">
                      #{actIdx + 1}
                    </span>

                    {/* Quick PQ Selector Dropdown */}
                    {registeredPq.length > 0 && (
                      <select
                        value={registeredPq.find(r => r.ref === act.ref && r.identificador === act.identificador)?.id || ""}
                        onChange={(e) => {
                          const found = registeredPq.find(r => r.id === e.target.value);
                          if (found) {
                            handleUpdateActivity(actIdx, {
                              ref: found.ref || "001",
                              fase: found.fase,
                              identificador: found.identificador,
                              descricao: found.descricao,
                              intervalo: found.unidade || "un"
                            });
                          }
                        }}
                        className="flex-1 max-w-sm bg-white border border-amber-300 text-xs font-bold text-slate-800 rounded-lg px-2 py-1 outline-none truncate"
                      >
                        <option value="">-- Selecionar da PQ da Obra --</option>
                        {registeredPq.map(r => (
                          <option key={r.id} value={r.id}>
                            [{r.identificador || r.ref}] {r.descricao} ({r.unidade || "-"})
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(actIdx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                      title="Excluir atividade"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Activity Details */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Descrição do Serviço:</label>
                      <input
                        type="text"
                        value={act.descricao}
                        onChange={(e) => handleUpdateActivity(actIdx, { descricao: e.target.value })}
                        placeholder="Ex: Escavação de vala para assentamento de tubulação..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Produzido no Dia *</label>
                        <input
                          type="text"
                          value={act.total}
                          onChange={(e) => handleUpdateActivity(actIdx, { total: e.target.value })}
                          placeholder="ex: 15.5"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-slate-900 font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Unidade</label>
                        <input
                          type="text"
                          value={act.intervalo}
                          onChange={(e) => handleUpdateActivity(actIdx, { intervalo: e.target.value })}
                          placeholder="ex: m³, m, un"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Trecho / Estaca / Local</label>
                        <input
                          type="text"
                          value={act.fase || ""}
                          onChange={(e) => handleUpdateActivity(actIdx, { fase: e.target.value })}
                          placeholder="ex: Estaca 10 a 14"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                        />
                      </div>
                    </div>

                    {/* Observações de Campo */}
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Observações de Campo:</label>
                      <textarea
                        rows={2}
                        value={act.comentario || ""}
                        onChange={(e) => handleUpdateActivity(actIdx, { comentario: e.target.value })}
                        placeholder="Detalhes adicionais, equipe envolvida, condições do solo..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    {/* Photos Upload & Gallery */}
                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-600 uppercase flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-amber-600" />
                          Fotos Anexadas ({act.imagens?.length || 0})
                        </span>
                        
                        <label className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all">
                          <Camera className="w-3.5 h-3.5" />
                          Tirar Foto / Anexar
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            capture="environment"
                            onChange={(e) => handlePhotoUpload(e, actIdx)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Photo Thumbnails */}
                      {act.imagens && act.imagens.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                          {act.imagens.map((img, imgIdx) => (
                            <div key={imgIdx} className="relative group rounded-lg overflow-hidden border border-slate-300 aspect-square bg-slate-900">
                              <img
                                src={img}
                                alt={`Foto ${imgIdx + 1}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedImgs = act.imagens!.filter((_, i) => i !== imgIdx);
                                  handleUpdateActivity(actIdx, { imagens: updatedImgs });
                                }}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 cursor-pointer border-none"
                                title="Excluir foto"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {(currentReport.atividades || []).length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhuma atividade registrada no dia. Clique no botão acima para adicionar a produção executada em campo.
              </p>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 5: PARALISAÇÕES E FATORES INTERVENIENTES                            */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-50 rounded-xl text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">5. Paralisações & Intercorrências</h3>
                <p className="text-[10px] text-slate-500 font-medium">Registro de tempo parado por chuva, equipamentos ou outros motivos</p>
              </div>
            </div>
          </div>

          {/* Stoppage Categories */}
          <div className="space-y-3">
            {["chuva", "raios", "projetos", "vizinhos", "outros"].map((catKey) => {
              const row = currentReport.paralisacoesDetalhe?.[catKey] || {
                ativo: false,
                horas: [],
                frentes: "",
                local: "",
                maoDeObraParalisada: "",
                comentarios: "",
                total: "0h"
              };
              const isChecked = Boolean(row.ativo);
              const labelName = catKey === "raios" ? "Incidência de Raios" : catKey === "projetos" ? "Aguardando Projetos/Frentes" : catKey;

              return (
                <div key={catKey} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleUpdateStoppage(catKey, { ativo: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs font-black text-slate-800 uppercase capitalize">
                        Paralisação: <strong className="text-amber-700">{labelName}</strong>
                      </span>
                    </label>

                    {isChecked && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-black rounded-full font-mono">
                        {row.total || "0h"} paralisado
                      </span>
                    )}
                  </div>

                  {isChecked && (
                    <div className="space-y-3 pt-2 border-t border-slate-200/60 animate-slide-down">
                      {/* Hour Toggle Grid */}
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1.5">
                          Toque nos horários em que o serviço foi interrompido:
                        </span>
                        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                          {HOURS_LIST.map(hour => {
                            const isSlot = (row.horas || []).includes(hour);
                            return (
                              <button
                                key={hour}
                                type="button"
                                onClick={() => toggleStoppageHour(catKey, hour)}
                                className={`h-8 rounded-lg text-xs font-black transition-all select-none border font-mono cursor-pointer ${
                                  isSlot
                                    ? "bg-red-600 border-red-700 text-white shadow-xs"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {hour}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Comments / Reason Description */}
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Motivo / Justificativa:</label>
                        <input
                          type="text"
                          value={row.comentarios || ""}
                          onChange={(e) => handleUpdateStoppage(catKey, { comentarios: e.target.value })}
                          placeholder="Descreva o motivo da paralisação e frentes impactadas..."
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* 4. FLOATING BOTTOM BAR (SALVAR & SINCRONIZAR) */}
      <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 sm:p-4 z-40 shadow-2xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${pendingSync ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
            <div className="text-left leading-tight">
              <span className="text-[11px] font-bold text-white block">
                {pendingSync ? "Alterações locais salvas" : "Tudo sincronizado"}
              </span>
              <span className="text-[9px] text-slate-400">
                {isOnline ? "Pronto para enviar à nuvem" : "Salvamento local ativo (Offline)"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncData}
            disabled={isSaving}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer border-none"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sincronizar Dados
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. CLONE MODAL (EQUIPE OU EQUIPAMENTOS) */}
      {cloneModalType && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-emerald-600" />
                <h4 className="font-black text-sm uppercase">
                  {cloneModalType === "efetivo" ? "Clonar Equipe de Outro RDO" : "Clonar Equipamentos de Outro RDO"}
                </h4>
              </div>
              <button onClick={() => setCloneModalType(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer border-none bg-transparent">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Selecione o diário da lista abaixo para copiar {cloneModalType === "efetivo" ? "a equipe e cargos lançados" : "os equipamentos mobilizados"} diretamente para este RDO:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {reports
                .filter(r => r.id !== currentReport.id && (currentObra ? r.obraId === currentObra.id || r.obra === currentObra.nome : true))
                .sort((a, b) => (b.data || "").localeCompare(a.data || ""))
                .map(sourceRdo => (
                  <div
                    key={sourceRdo.id}
                    onClick={() => {
                      if (cloneModalType === "efetivo") handleCloneLabor(sourceRdo);
                      else handleCloneEquipment(sourceRdo);
                    }}
                    className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="font-black text-xs text-slate-900 block">{sourceRdo.rdoNo || "RDO"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">{formatDateFull(sourceRdo.data)}</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                      Copiar Dados
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setCloneModalType(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer border-none"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
