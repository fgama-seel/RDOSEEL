import React, { useState, useMemo, useEffect } from "react";
import { 
  useRdoStore 
} from "../context/RdoContext";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Calendar, 
  Users, 
  Wrench, 
  CloudRain, 
  CloudLightning, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  Download,
  Info,
  ShieldAlert,
  Filter,
  Search,
  FileText,
  Printer,
  FileSpreadsheet,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Building2,
  DollarSign
} from "lucide-react";
import * as XLSX from "xlsx";

export const ConsolidatedReports: React.FC = () => {
  const { reports, currentObra, user, isGlobalAdmin } = useRdoStore();

  const currentUserEmail = user && 'email' in user ? (user.email?.toLowerCase() || "") : "";
  const permission = currentObra?.permissoes?.find(p => p?.email?.toLowerCase() === currentUserEmail);
  const accessLevel = permission ? permission.access : (currentObra?.userId === user?.uid ? "owner" : "view");
  const canEditAccess = isGlobalAdmin || (accessLevel !== "view" && accessLevel !== "fiscalizacao" && accessLevel !== "gerenciadora");

  // Date Range States
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to 30 days ago
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [activeSubTab, setActiveSubTab] = useState<"histogramas" | "pluviometria" | "praticabilidade" | "recursosOciosos">("histogramas");

  // Guard: Restrict Recursos Ociosos tab to users with Edit access only
  React.useEffect(() => {
    if (!canEditAccess && activeSubTab === "recursosOciosos") {
      setActiveSubTab("histogramas");
    }
  }, [canEditAccess, activeSubTab]);

  // Idle Resources Filters
  const [motivoFilter, setMotivoFilter] = useState<string>("TODOS");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<"TODOS" | "MO" | "EQUIP">("TODOS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [idleChartViewMode, setIdleChartViewMode] = useState<"diario" | "mensal">("diario");
  const [expandedObsMap, setExpandedObsMap] = useState<Record<string, boolean>>({});

  // Filter reports of active obra in the selected range
  const filteredReports = useMemo(() => {
    if (!currentObra) return [];
    return (reports || [])
      .filter(r => {
        const sameObra = r.obraId === currentObra.id || r.obra === currentObra.nome;
        if (!sameObra) return false;
        if (startDate && r.data < startDate) return false;
        if (endDate && r.data > endDate) return false;
        return true;
      })
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [reports, currentObra, startDate, endDate]);

  // 1. DATA PREPARATION: HISTOGRAMS (Personnel & Equipment)
  const histogramData = useMemo(() => {
    return filteredReports.map(report => {
      // Aggregate personnel
      let totalMOI = 0;
      let totalMOD = 0;
      let totalSubcontratado = 0;

      if (report.efetivoDetalhado) {
        report.efetivoDetalhado.forEach(group => {
          const isOwn = group.nome?.toLowerCase().includes("seel") || group.nome?.toLowerCase().includes("proprio");
          group.items?.forEach(item => {
            if (isOwn) {
              if (item.moiMod === "MOI") totalMOI += (item.t || 0);
              else totalMOD += (item.t || 0);
            } else {
              totalSubcontratado += (item.t || 0);
            }
          });
        });
      } else {
        // Fallback to summaries
        totalMOI = report.efetivoSummary?.moi || 0;
        totalMOD = report.efetivoSummary?.mod || 0;
        totalSubcontratado = report.efetivoSummary?.subcontratadosMoiMod || 0;
      }

      // Aggregate equipment
      let totalEquipProprio = 0;
      let totalEquipSubcontratado = 0;

      if (report.equipamentosDetalhado) {
        report.equipamentosDetalhado.forEach(eq => {
          const isOwn = eq.empresa?.toLowerCase().includes("seel") || eq.empresa?.toLowerCase().includes("proprio") || !eq.empresa;
          if (isOwn) {
            totalEquipProprio += (eq.quantidade || 0);
          } else {
            totalEquipSubcontratado += (eq.quantidade || 0);
          }
        });
      } else {
        totalEquipProprio = report.equipamentosSummary?.mobilizados || 0;
        totalEquipSubcontratado = report.equipamentosSummary?.subcontratadosMobilizados || 0;
      }

      // Format date label to DD/MM
      const dateParts = report.data.split("-");
      const label = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : report.data;

      return {
        rawDate: report.data,
        label,
        "Mão de Obra Indireta (MOI)": totalMOI,
        "Mão de Obra Direta (MOD)": totalMOD,
        "Subcontratados": totalSubcontratado,
        "Total Mão de Obra": totalMOI + totalMOD + totalSubcontratado,
        "Equipamentos Próprios": totalEquipProprio,
        "Equipamentos Subcontratados": totalEquipSubcontratado,
        "Total Equipamentos": totalEquipProprio + totalEquipSubcontratado,
      };
    });
  }, [filteredReports]);

  // 2. DATA PREPARATION: PLUVIOMETRY
  const pluviometryStats = useMemo(() => {
    let totalRain = 0;
    let rainDays = 0;
    let maxRain = 0;
    let maxRainDate = "";

    const dailyRainList = filteredReports.map(report => {
      const rain = report.precipitacao?.total || 0;
      totalRain += rain;
      if (rain > 0) {
        rainDays++;
        if (rain > maxRain) {
          maxRain = rain;
          maxRainDate = report.data;
        }
      }

      const dateParts = report.data.split("-");
      const label = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : report.data;

      // Status translation
      let rainStatus = "Sem Registro";
      if (rain > 0 && rain <= 5) rainStatus = "Chuva Fraca";
      else if (rain > 5 && rain <= 15) rainStatus = "Chuva Moderada";
      else if (rain > 15) rainStatus = "Chuva Forte";

      return {
        date: report.data,
        label,
        "Chuva (mm)": rain,
        status: rainStatus,
      };
    });

    const avgRain = dailyRainList.length > 0 ? totalRain / dailyRainList.length : 0;

    return {
      totalRain,
      rainDays,
      maxRain,
      maxRainDate,
      avgRain,
      dailyRainList
    };
  }, [filteredReports]);

  // 3. DATA PREPARATION: PRACTICABILITY & CLIMATE HOURS LOST
  const practicabilityStats = useMemo(() => {
    let totalWorkDays = filteredReports.length;
    let totalHoursChuvas = 0;
    let totalHoursRaios = 0;
    let totalHoursProjetos = 0;
    let totalHoursVizinhos = 0;
    let totalHoursOutros = 0;

    let practicableDays = 0;
    let impracticableDays = 0;

    const dailyStoppagesList = filteredReports.map(report => {
      // Stoppage details
      const detail = report.paralisacoesDetalhe;
      
      const getHoursVal = (row: any) => {
        if (!row) return 0;
        if (row.ativo === false) return 0;
        const totalStr = row.total || "0";
        const val = parseFloat(totalStr.replace("h", "").replace(",", "."));
        return isNaN(val) ? 0 : val;
      };

      const c = getHoursVal(detail?.chuva);
      const r = getHoursVal(detail?.raios);
      const p = getHoursVal(detail?.projetos);
      const v = getHoursVal(detail?.vizinhos);
      const o = getHoursVal(detail?.outros);

      const totalDayStoppages = report.paralisacoesSummary?.totalHorasParalisadasDia || (c + r + p + v + o);

      totalHoursChuvas += c;
      totalHoursRaios += r;
      totalHoursProjetos += p;
      totalHoursVizinhos += v;
      totalHoursOutros += o;

      // Standard workday is 8h. If paralisado >= 4h, classify as Impracticable day
      const isImpracticable = totalDayStoppages >= 4;
      if (isImpracticable) {
        impracticableDays++;
      } else {
        practicableDays++;
      }

      const dateParts = report.data.split("-");
      const label = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : report.data;

      return {
        date: report.data,
        label,
        "Horas Paralisadas": totalDayStoppages,
        "Praticável": isImpracticable ? 0 : 8 - totalDayStoppages,
        "Impraticável": totalDayStoppages,
        chuva: c,
        raios: r,
        projetos: p,
        vizinhos: v,
        outros: o,
        status: isImpracticable ? "Impraticável" : "Praticável"
      };
    });

    const totalLostHours = totalHoursChuvas + totalHoursRaios + totalHoursProjetos + totalHoursVizinhos + totalHoursOutros;

    const pieData = [
      { name: "Chuva", value: totalHoursChuvas, color: "#38bdf8" },
      { name: "Descargas (Raios)", value: totalHoursRaios, color: "#f59e0b" },
      { name: "Projetos", value: totalHoursProjetos, color: "#818cf8" },
      { name: "Vizinhos/Interferências", value: totalHoursVizinhos, color: "#ec4899" },
      { name: "Outros", value: totalHoursOutros, color: "#64748b" }
    ].filter(item => item.value > 0);

    return {
      totalWorkDays,
      totalHoursChuvas,
      totalHoursRaios,
      totalHoursProjetos,
      totalHoursVizinhos,
      totalHoursOutros,
      totalLostHours,
      practicableDays,
      impracticableDays,
      dailyStoppagesList,
      pieData
    };
  }, [filteredReports]);

  // 4. DATA PREPARATION: IDLE RESOURCES (RECURSOS OCIOSOS / PLEITO CONTRATUAL)
  const idleResourcesData = useMemo(() => {
    const parseQty = (formatted: string): { desc: string; qtd: number } => {
      if (!formatted) return { desc: "", qtd: 1 };
      const match = formatted.match(/^(\d+)x?\s+(.*)$/i) || formatted.match(/^(\d+)\s*-\s*(.*)$/i);
      if (match) {
        return { qtd: Math.max(1, parseInt(match[1], 10) || 1), desc: match[2].trim() };
      }
      return { desc: formatted.trim(), qtd: 1 };
    };

    const events: Array<{
      id: string;
      reportId?: string;
      rdoNo: string;
      data: string;
      obra: string;
      cliente: string;
      catKey: string;
      catLabel: string;
      horas: string[];
      horasStr: string;
      totalHours: number;
      comentarios: string;
      local: string;
      maoDeObraParalisadaText: string;
      frentesItems: any[];
      totalMaoDeObraCount: number;
      totalEquipamentoCount: number;
      totalHH: number;
      totalHE: number;
      laborList: { desc: string; qtd: number }[];
      equipList: { desc: string; qtd: number }[];
    }> = [];

    let aggregateHH = 0;
    let aggregateHE = 0;
    const impactedRdoSet = new Set<string>();

    const categoryTotals: Record<string, { label: string; totalHours: number; totalHH: number; totalHE: number; count: number }> = {};

    filteredReports.forEach(report => {
      const paralisacoes = report.paralisacoesDetalhe;
      if (!paralisacoes) return;

      Object.entries(paralisacoes).forEach(([catKey, catVal]) => {
        const row = catVal as any;
        if (!row || row.ativo === false) return;

        const totalHoursStr = row.total || "0";
        const totalHoursNum = parseFloat(String(totalHoursStr).replace("h", "").replace(",", ".")) || 0;
        
        const comentarios = (row.comentarios || "").trim();
        const local = (row.local || "").trim();
        const maoDeObraParalisadaText = (row.maoDeObraParalisada || "").trim();
        const frentesItems = Array.isArray(row.frentesItems) ? row.frentesItems : [];
        const horasArr = Array.isArray(row.horas) ? row.horas : [];

        // Skip if no hours, no frentes, and no comments
        if (totalHoursNum <= 0 && frentesItems.length === 0 && !comentarios && !maoDeObraParalisadaText) {
          return;
        }

        impactedRdoSet.add(report.data);

        let catLabel = "Outros Motivos";
        if (catKey === "chuva") catLabel = "Chuva / Clima";
        else if (catKey === "raios") catLabel = "Descargas Atmosféricas (Raios)";
        else if (catKey === "projetos") catLabel = "Projetos / Alterações de Escopo";
        else if (catKey === "vizinhos") catLabel = "Interferências / Vizinhos / Utilidades";
        else if (catKey === "outros") catLabel = "Outros Motivos / Paralisação Contratual";
        else if (catKey) catLabel = catKey.charAt(0).toUpperCase() + catKey.slice(1);

        // Aggregate labor and equipment in this event
        let eventLaborCount = 0;
        let eventEquipCount = 0;
        const laborList: { desc: string; qtd: number }[] = [];
        const equipList: { desc: string; qtd: number }[] = [];

        frentesItems.forEach(item => {
          (item.maoDeObraDescs || []).forEach((descStr: string) => {
            const parsed = parseQty(descStr);
            eventLaborCount += parsed.qtd;
            const existing = laborList.find(l => l.desc.toLowerCase() === parsed.desc.toLowerCase());
            if (existing) existing.qtd += parsed.qtd;
            else laborList.push({ desc: parsed.desc, qtd: parsed.qtd });
          });

          (item.equipamentoDescs || []).forEach((descStr: string) => {
            const parsed = parseQty(descStr);
            eventEquipCount += parsed.qtd;
            const existing = equipList.find(e => e.desc.toLowerCase() === parsed.desc.toLowerCase());
            if (existing) existing.qtd += parsed.qtd;
            else equipList.push({ desc: parsed.desc, qtd: parsed.qtd });
          });
        });

        // Fallback for labor count if text is provided
        if (eventLaborCount === 0 && maoDeObraParalisadaText) {
          eventLaborCount = 1;
        }

        const eventHH = eventLaborCount * totalHoursNum;
        const eventHE = eventEquipCount * totalHoursNum;

        aggregateHH += eventHH;
        aggregateHE += eventHE;

        if (!categoryTotals[catKey]) {
          categoryTotals[catKey] = { label: catLabel, totalHours: 0, totalHH: 0, totalHE: 0, count: 0 };
        }
        categoryTotals[catKey].totalHours += totalHoursNum;
        categoryTotals[catKey].totalHH += eventHH;
        categoryTotals[catKey].totalHE += eventHE;
        categoryTotals[catKey].count += 1;

        events.push({
          id: `idle-${report.data}-${catKey}-${Math.random().toString(36).substr(2, 6)}`,
          reportId: report.id,
          rdoNo: report.rdoNo || "-",
          data: report.data,
          obra: report.obra || currentObra?.nome || "",
          cliente: report.cliente || currentObra?.cliente || "-",
          catKey,
          catLabel,
          horas: horasArr,
          horasStr: horasArr.length > 0 ? horasArr.join(", ") : "Intervalo de Jornada",
          totalHours: totalHoursNum,
          comentarios,
          local,
          maoDeObraParalisadaText,
          frentesItems,
          totalMaoDeObraCount: eventLaborCount,
          totalEquipamentoCount: eventEquipCount,
          totalHH: eventHH,
          totalHE: eventHE,
          laborList,
          equipList
        });
      });
    });

    const chartDataByReason = Object.entries(categoryTotals).map(([key, val]) => ({
      name: val.label,
      "Horas-Homem (HH)": Math.round(val.totalHH * 10) / 10,
      "Horas-Equipamento (HE)": Math.round(val.totalHE * 10) / 10,
      "Total Horas Paralisadas": Math.round(val.totalHours * 10) / 10,
      count: val.count
    }));

    return {
      events,
      totalEvents: events.length,
      aggregateHH,
      aggregateHE,
      impactedRdosCount: impactedRdoSet.size,
      chartDataByReason,
      categoryTotals
    };
  }, [filteredReports, currentObra]);

  // Rates for idle hours cost calculations (stored in localStorage per Obra)
  const [laborHourlyRates, setLaborHourlyRates] = useState<Record<string, number>>({});
  const [equipHourlyRates, setEquipHourlyRates] = useState<Record<string, number>>({});

  // Load saved rates whenever currentObra changes
  useEffect(() => {
    if (!currentObra?.id) return;
    try {
      const savedLabor = localStorage.getItem(`idle_labor_rates_${currentObra.id}`);
      if (savedLabor) setLaborHourlyRates(JSON.parse(savedLabor));
      else setLaborHourlyRates({});

      const savedEquip = localStorage.getItem(`idle_equip_rates_${currentObra.id}`);
      if (savedEquip) setEquipHourlyRates(JSON.parse(savedEquip));
      else setEquipHourlyRates({});
    } catch (e) {
      console.error("Error loading saved rates from localStorage:", e);
    }
  }, [currentObra?.id]);

  const handleLaborRateChange = (cargo: string, val: number) => {
    setLaborHourlyRates(prev => {
      const next = { ...prev, [cargo]: val };
      if (currentObra?.id) {
        localStorage.setItem(`idle_labor_rates_${currentObra.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleEquipRateChange = (equip: string, val: number) => {
    setEquipHourlyRates(prev => {
      const next = { ...prev, [equip]: val };
      if (currentObra?.id) {
        localStorage.setItem(`idle_equip_rates_${currentObra.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  // Summary by Cargo / Function and by Equipment with cost calculations
  const idleSummary = useMemo(() => {
    const laborMap: Record<string, { cargo: string; totalHH: number; eventCount: number }> = {};
    const equipMap: Record<string, { equip: string; totalHE: number; eventCount: number }> = {};

    idleResourcesData.events.forEach(ev => {
      ev.laborList.forEach(l => {
        const key = l.desc.trim();
        if (!key) return;
        if (!laborMap[key]) {
          laborMap[key] = { cargo: key, totalHH: 0, eventCount: 0 };
        }
        laborMap[key].totalHH += (l.qtd * ev.totalHours);
        laborMap[key].eventCount += 1;
      });

      ev.equipList.forEach(e => {
        const key = e.desc.trim();
        if (!key) return;
        if (!equipMap[key]) {
          equipMap[key] = { equip: key, totalHE: 0, eventCount: 0 };
        }
        equipMap[key].totalHE += (e.qtd * ev.totalHours);
        equipMap[key].eventCount += 1;
      });
    });

    const laborListSummary = Object.values(laborMap).map(item => {
      const rate = laborHourlyRates[item.cargo] || 0;
      const totalCost = item.totalHH * rate;
      return { ...item, rate, totalCost };
    }).sort((a, b) => b.totalHH - a.totalHH);

    const equipListSummary = Object.values(equipMap).map(item => {
      const rate = equipHourlyRates[item.equip] || 0;
      const totalCost = item.totalHE * rate;
      return { ...item, rate, totalCost };
    }).sort((a, b) => b.totalHE - a.totalHE);

    const totalLaborCost = laborListSummary.reduce((acc, curr) => acc + curr.totalCost, 0);
    const totalEquipCost = equipListSummary.reduce((acc, curr) => acc + curr.totalCost, 0);
    const grandTotalCost = totalLaborCost + totalEquipCost;

    return {
      laborListSummary,
      equipListSummary,
      totalLaborCost,
      totalEquipCost,
      grandTotalCost
    };
  }, [idleResourcesData.events, laborHourlyRates, equipHourlyRates]);

  // Filtered idle events based on user controls
  const filteredIdleEvents = useMemo(() => {
    return idleResourcesData.events.filter(ev => {
      // Filter Motivo
      if (motivoFilter !== "TODOS" && ev.catKey !== motivoFilter) {
        return false;
      }
      // Filter Resource Type
      if (resourceTypeFilter === "MO" && ev.totalMaoDeObraCount === 0 && !ev.maoDeObraParalisadaText) {
        return false;
      }
      if (resourceTypeFilter === "EQUIP" && ev.totalEquipamentoCount === 0) {
        return false;
      }
      // Filter Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchObs = ev.comentarios.toLowerCase().includes(q);
        const matchMoText = ev.maoDeObraParalisadaText.toLowerCase().includes(q);
        const matchRdo = ev.rdoNo.toLowerCase().includes(q);
        const matchDate = ev.data.includes(q);
        const matchMotivo = ev.catLabel.toLowerCase().includes(q);
        const matchFrentes = ev.frentesItems.some(f => 
          (f.nome || "").toLowerCase().includes(q) || 
          (f.pqItemDesc || "").toLowerCase().includes(q)
        );
        const matchLabor = ev.laborList.some(l => l.desc.toLowerCase().includes(q));
        const matchEquip = ev.equipList.some(e => e.desc.toLowerCase().includes(q));

        if (!matchObs && !matchMoText && !matchRdo && !matchDate && !matchMotivo && !matchFrentes && !matchLabor && !matchEquip) {
          return false;
        }
      }
      return true;
    });
  }, [idleResourcesData.events, motivoFilter, resourceTypeFilter, searchQuery]);

  // Idle Resources Chart Data (Daily vs Monthly toggle)
  const idleChartData = useMemo(() => {
    const dailyMap: Record<string, { date: string; label: string; hh: number; he: number; hours: number; count: number }> = {};
    const monthlyMap: Record<string, { monthKey: string; label: string; hh: number; he: number; hours: number; count: number }> = {};

    filteredIdleEvents.forEach(ev => {
      // 1. Daily Map
      const dateStr = ev.data; // "YYYY-MM-DD"
      if (dateStr) {
        if (!dailyMap[dateStr]) {
          const parts = dateStr.split("-");
          const formattedLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
          dailyMap[dateStr] = { date: dateStr, label: formattedLabel, hh: 0, he: 0, hours: 0, count: 0 };
        }
        dailyMap[dateStr].hh += ev.totalHH;
        dailyMap[dateStr].he += ev.totalHE;
        dailyMap[dateStr].hours += ev.totalHours;
        dailyMap[dateStr].count += 1;
      }

      // 2. Monthly Map
      const monthKey = dateStr ? dateStr.substring(0, 7) : "Indefinido"; // "YYYY-MM"
      if (!monthlyMap[monthKey]) {
        const parts = monthKey.split("-");
        const formattedLabel = parts.length === 2 ? `${parts[1]}/${parts[0]}` : monthKey;
        monthlyMap[monthKey] = { monthKey, label: formattedLabel, hh: 0, he: 0, hours: 0, count: 0 };
      }
      monthlyMap[monthKey].hh += ev.totalHH;
      monthlyMap[monthKey].he += ev.totalHE;
      monthlyMap[monthKey].hours += ev.totalHours;
      monthlyMap[monthKey].count += 1;
    });

    const dailyList = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        name: item.label,
        fullDate: item.date.split("-").reverse().join("/"),
        "Horas-Homem (HH)": Math.round(item.hh * 10) / 10,
        "Horas-Equipamento (HE)": Math.round(item.he * 10) / 10,
        "Total Horas Paralisadas": Math.round(item.hours * 10) / 10,
        count: item.count
      }));

    const monthlyList = Object.values(monthlyMap)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(item => ({
        name: item.label,
        fullDate: item.label,
        "Horas-Homem (HH)": Math.round(item.hh * 10) / 10,
        "Horas-Equipamento (HE)": Math.round(item.he * 10) / 10,
        "Total Horas Paralisadas": Math.round(item.hours * 10) / 10,
        count: item.count
      }));

    return {
      dailyList,
      monthlyList,
      currentList: idleChartViewMode === "diario" ? dailyList : monthlyList
    };
  }, [filteredIdleEvents, idleChartViewMode]);

  // Printable Claim Report (PDF / Window Print)
  const handlePrintClaimReport = () => {
    if (filteredIdleEvents.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formattedStartDate = startDate.split("-").reverse().join("/");
    const formattedEndDate = endDate.split("-").reverse().join("/");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Recursos Ociosos - Pleito Contratual - ${currentObra?.nome || "SEEL"}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 20px; line-height: 1.4; }
            .header { border-bottom: 2px solid #004899; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 18px; font-weight: 900; color: #004899; letter-spacing: -0.5px; }
            .subhead { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .title { font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 16px; }
            .meta-item { display: flex; flex-direction: column; }
            .meta-label { font-size: 8.5px; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .meta-val { font-size: 12px; font-weight: bold; color: #0f172a; }
            .event-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid; background: #ffffff; }
            .event-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; }
            .event-date { font-weight: bold; font-size: 12px; color: #0f172a; }
            .event-motivo { font-weight: bold; font-size: 10px; padding: 2px 8px; border-radius: 4px; background: #fef3c7; color: #78350f; }
            .obs-box { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; padding: 8px 10px; border-radius: 4px; margin-top: 8px; }
            .obs-title { font-size: 9px; font-weight: bold; color: #92400e; text-transform: uppercase; margin-bottom: 2px; }
            .obs-text { font-size: 11px; color: #1e293b; font-weight: 500; white-space: pre-wrap; }
            .resource-tag { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; font-size: 9px; padding: 2px 6px; border-radius: 3px; margin: 2px; font-weight: 600; }
            .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">SEEL ENGENHARIA</div>
              <div class="subhead">Gestão de Administração Contratual & PMO</div>
            </div>
            <div style="text-align: right;">
              <div class="title">DOSSIÊ DE RECURSOS OCIOSOS</div>
              <div class="subhead">Período: ${formattedStartDate} a ${formattedEndDate}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Obra</span>
              <span class="meta-val">${currentObra?.nome || "-"}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Cliente</span>
              <span class="meta-val">${currentObra?.cliente || "-"}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Horas-Homem Ociosas</span>
              <span class="meta-val">${idleResourcesData.aggregateHH.toFixed(1)} HH</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Horas-Equipamento Ociosas</span>
              <span class="meta-val">${idleResourcesData.aggregateHE.toFixed(1)} HE</span>
            </div>
          </div>

          <div style="margin-bottom: 12px; font-size: 10px; color: #475569;">
            Total de <strong>${filteredIdleEvents.length}</strong> evento(s) registrado(s) no Diário de Obra (RDO) para embasamento de repactuação contratual, prorrogação de prazo (EOT) e custos de ociosidade.
          </div>

          <!-- HISTÓRICO DE OCIOSIDADE (DIÁRIO / MENSAL) -->
          <div style="margin-top: 10px; margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #ffffff;">
            <div style="font-size: 11px; font-weight: bold; color: #004899; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
              <span>HISTÓRICO ${idleChartViewMode === "diario" ? "DIÁRIO" : "MENSAL"} DE RECURSOS OCIOSOS (HH E HE)</span>
              <span style="font-size: 9px; color: #004899; font-weight: bold; background: #eff6ff; border: 1px solid #bfdbfe; padding: 2px 6px; border-radius: 4px;">VISÃO ${idleChartViewMode.toUpperCase()}</span>
            </div>
            
            <div style="font-size: 9.5px; color: #64748b; margin-bottom: 10px;">
              Apuração ${idleChartViewMode === "diario" ? "dia a dia" : "mês a mês"} das horas de paralisação e do impacto em Mão de Obra (HH) e Equipamentos (HE).
            </div>

            ${idleChartData.currentList.length > 0 ? `
              <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
                <thead>
                  <tr style="background: #f1f5f9; text-align: left;">
                    <th style="padding: 5px; border: 1px solid #cbd5e1;">${idleChartViewMode === "diario" ? "Data" : "Mês / Ano"}</th>
                    <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">Ocorrências</th>
                    <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: right;">Horas-Homem (HH)</th>
                    <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: right;">Horas-Equipamento (HE)</th>
                    <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: right;">Horas Paralisadas (Total)</th>
                  </tr>
                </thead>
                <tbody>
                  ${idleChartData.currentList.map(item => `
                    <tr>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${item.fullDate || item.name}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${item.count}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: right; color: #d97706; font-weight: bold;">${item["Horas-Homem (HH)"].toFixed(1)} HH</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: right; color: #0284c7; font-weight: bold;">${item["Horas-Equipamento (HE)"].toFixed(1)} HE</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: right; color: #b45309; font-weight: bold;">${item["Total Horas Paralisadas"].toFixed(1)} h</td>
                    </tr>
                  `).join('')}
                  <tr style="background: #f8fafc; font-weight: bold;">
                    <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: 800;">TOTAL DO PERÍODO</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${filteredIdleEvents.length}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color: #d97706; font-weight: 800;">${idleResourcesData.aggregateHH.toFixed(1)} HH</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color: #0284c7; font-weight: 800;">${idleResourcesData.aggregateHE.toFixed(1)} HE</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color: #b45309; font-weight: 800;">${filteredIdleEvents.reduce((acc, ev) => acc + ev.totalHours, 0).toFixed(1)} h</td>
                  </tr>
                </tbody>
              </table>
            ` : `<div style="text-align: center; color: #94a3b8; font-style: italic; padding: 10px;">Nenhum registro de ociosidade no período.</div>`}
          </div>

          <!-- QUADRO RESUMO DE OCIOSIDADE E CUSTOS DE PARALISAÇÃO -->
          <div style="margin-top: 10px; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #f8fafc;">
            <div style="font-size: 11px; font-weight: bold; color: #004899; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
              QUADRO RESUMO DE RECURSOS OCIOSOS E APURAÇÃO DE CUSTOS
            </div>
            
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              ${idleSummary.laborListSummary.length > 0 ? `
                <div style="flex: 1; min-width: 280px;">
                  <div style="font-size: 10px; font-weight: bold; color: #475569; margin-bottom: 4px;">1. Mão de Obra Paralisada (por Função)</div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
                    <thead>
                      <tr style="background: #e2e8f0; text-align: left;">
                        <th style="padding: 4px; border: 1px solid #cbd5e1;">Função / Cargo</th>
                        <th style="padding: 4px; border: 1px solid #cbd5e1; text-align: center;">Horas (HH)</th>
                        <th style="padding: 4px; border: 1px solid #cbd5e1; text-align: right;">Custo (R$/h)</th>
                        <th style="padding: 4px; border: 1px solid #cbd5e1; text-align: right;">Total (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${idleSummary.laborListSummary.map(item => `
                        <tr>
                          <td style="padding: 4px; border: 1px solid #e2e8f0; font-weight: 600;">${item.cargo}</td>
                          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: center;">${item.totalHH.toFixed(1)} h</td>
                          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${item.rate > 0 ? item.rate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
                          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${item.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                      `).join('')}
                      <tr style="background: #f1f5f9; font-weight: bold;">
                        <td style="padding: 4px; border: 1px solid #cbd5e1;">SUBTOTAL MÃO DE OBRA</td>
                        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center;">${idleResourcesData.aggregateHH.toFixed(1)} h</td>
                        <td style="padding: 4px; border: 1px solid #cbd5e1;"></td>
                        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #004899;">${idleSummary.totalLaborCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ` : ''}

              ${idleSummary.equipListSummary.length > 0 ? `
                <div style="flex: 1; min-width: 280px;">
                  <div style="font-size: 10px; font-weight: bold; color: #475569; margin-bottom: 4px;">2. Equipamentos Paralisados (por Modelo)</div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
                    <thead>
                      <tr style="background: #e2e8f0; text-align: left;">
                        <th style="padding: 4px; border: 1px solid #cbd5e1;">Equipamento / Modelo</th>
                        <th style="padding: 4px; border: 1px solid #cbd5e1; text-align: center;">Horas (HE)</th>
                        <th style="padding: 4px; border: 1px solid #cbd5e1; text-align: right;">Custo (R$/h)</th>
                        <th style="padding: 4px; border: 1px solid #cbd5e1; text-align: right;">Total (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${idleSummary.equipListSummary.map(item => `
                        <tr>
                          <td style="padding: 4px; border: 1px solid #e2e8f0; font-weight: 600;">${item.equip}</td>
                          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: center;">${item.totalHE.toFixed(1)} h</td>
                          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${item.rate > 0 ? item.rate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
                          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${item.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                      `).join('')}
                      <tr style="background: #f1f5f9; font-weight: bold;">
                        <td style="padding: 4px; border: 1px solid #cbd5e1;">SUBTOTAL EQUIPAMENTOS</td>
                        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center;">${idleResourcesData.aggregateHE.toFixed(1)} h</td>
                        <td style="padding: 4px; border: 1px solid #cbd5e1;"></td>
                        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #d97706;">${idleSummary.totalEquipCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ` : ''}
            </div>

            <div style="margin-top: 10px; padding: 8px 12px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: bold; color: #78350f;">
              <span>CUSTO TOTAL ESTIMADO DE PARALISAÇÃO NO PERÍODO:</span>
              <span style="font-size: 13px; font-weight: 900; color: #92400e;">${idleSummary.grandTotalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>

          ${filteredIdleEvents.map(ev => `
            <div class="event-card">
              <div class="event-header">
                <div>
                  <span class="event-date">Data: ${ev.data.split("-").reverse().join("/")}</span>
                  <span style="font-size: 10px; color: #64748b; margin-left: 8px;">(RDO nº ${ev.rdoNo})</span>
                </div>
                <div>
                  <span class="event-motivo">${ev.catLabel}</span>
                  <span style="font-weight: bold; font-size: 10px; margin-left: 8px;">Duração: ${ev.totalHours}h (${ev.horasStr})</span>
                </div>
              </div>

              ${ev.frentesItems.length > 0 ? `
                <div style="margin-bottom: 6px;">
                  <strong style="font-size: 9.5px; color: #475569;">Frentes & PQ:</strong> 
                  ${ev.frentesItems.map(f => `${f.nome} ${f.pqItemDesc ? `[PQ: ${f.pqItemDesc}]` : ""}`).join(" | ")}
                </div>
              ` : ""}

              ${ev.laborList.length > 0 ? `
                <div style="margin-bottom: 4px;">
                  <strong style="font-size: 9.5px; color: #004899;">Mão de Obra Afetada:</strong>
                  ${ev.laborList.map(l => `<span class="resource-tag">${l.qtd}x ${l.desc}</span>`).join(" ")}
                </div>
              ` : ev.maoDeObraParalisadaText ? `
                <div style="margin-bottom: 4px; font-size: 10px; color: #334155;">
                  <strong>Mão de Obra:</strong> ${ev.maoDeObraParalisadaText}
                </div>
              ` : ""}

              ${ev.equipList.length > 0 ? `
                <div style="margin-bottom: 6px;">
                  <strong style="font-size: 9.5px; color: #d97706;">Equipamentos Afetados:</strong>
                  ${ev.equipList.map(e => `<span class="resource-tag">${e.qtd}x ${e.desc}</span>`).join(" ")}
                </div>
              ` : ""}

              <div class="obs-box">
                <div class="obs-title">Observação do Motivo da Paralisação (Registrada em Diário):</div>
                <div class="obs-text">${ev.comentarios || ev.maoDeObraParalisadaText || "Sem observação detalhada cadastrada."}</div>
              </div>
            </div>
          `).join("")}

          <div class="footer">
            Relatório gerado automaticamente pelo Sistema SEEL RDO • Emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // EXPORT TO EXCEL FUNCTION
  const exportToExcel = () => {
    if (!currentObra || filteredReports.length === 0) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Mão de Obra e Equipamentos
    const hrData = histogramData.map(h => ({
      "Data": h.rawDate,
      "MOI (Indireta)": h["Mão de Obra Indireta (MOI)"],
      "MOD (Direta)": h["Mão de Obra Direta (MOD)"],
      "Subcontratados": h["Subcontratados"],
      "Total Mão de Obra": h["Total Mão de Obra"],
      "Equipamentos Próprios": h["Equipamentos Próprios"],
      "Equipamentos Subcontratados": h["Equipamentos Subcontratados"],
      "Total Equipamentos": h["Total Equipamentos"]
    }));
    const wsHR = XLSX.utils.json_to_sheet(hrData);
    XLSX.utils.book_append_sheet(wb, wsHR, "Efetivo e Equipamentos");

    // Sheet 2: Pluviometria
    const rainData = pluviometryStats.dailyRainList.map(r => ({
      "Data": r.date,
      "Chuva (mm)": r["Chuva (mm)"],
      "Intensidade": r.status
    }));
    const wsRain = XLSX.utils.json_to_sheet(rainData);
    XLSX.utils.book_append_sheet(wb, wsRain, "Pluviometria");

    // Sheet 3: Praticabilidade
    const pracData = practicabilityStats.dailyStoppagesList.map(s => ({
      "Data": s.date,
      "Horas Paralisadas": s["Horas Paralisadas"],
      "Status do Dia": s.status,
      "Paralisação Chuva (h)": s.chuva,
      "Paralisação Raios (h)": s.raios,
      "Paralisação Projetos (h)": s.projetos,
      "Paralisação Vizinhos (h)": s.vizinhos,
      "Paralisação Outros (h)": s.outros
    }));
    const wsPrac = XLSX.utils.json_to_sheet(pracData);
    XLSX.utils.book_append_sheet(wb, wsPrac, "Dias Praticáveis");

    // Sheet 4: Recursos Ociosos e Pleito Contratual
    const wsIdleData = idleResourcesData.events.map(ev => ({
      "Data": ev.data.split("-").reverse().join("/"),
      "RDO Nº": ev.rdoNo,
      "Obra": ev.obra,
      "Cliente": ev.cliente,
      "Motivo da Paralisação": ev.catLabel,
      "Duração Paralisada (Horas)": ev.totalHours,
      "Horarios Registrados": ev.horasStr,
      "Horas-Homem Ociosas (HH)": ev.totalHH,
      "Horas-Equipamento Ociosas (HE)": ev.totalHE,
      "Frentes de Serviço": ev.frentesItems.map(f => f.nome).filter(Boolean).join("; ") || "Geral da Obra",
      "Itens da PQ Vinculados": ev.frentesItems.map(f => f.pqItemDesc).filter(Boolean).join("; ") || "N/A",
      "Mão de Obra Ociosa (Cargos)": ev.laborList.map(l => `${l.qtd}x ${l.desc}`).join("; ") || ev.maoDeObraParalisadaText || "N/A",
      "Equipamentos Ociosos": ev.equipList.map(e => `${e.qtd}x ${e.desc}`).join("; ") || "N/A",
      "Observação do Motivo da Paralisação": ev.comentarios || ev.maoDeObraParalisadaText || "Sem observação registrada"
    }));
    const wsIdle = XLSX.utils.json_to_sheet(wsIdleData);
    XLSX.utils.book_append_sheet(wb, wsIdle, "Recursos Ociosos");

    // Sheet 5: Quadro Resumo Custos Mão de Obra
    if (idleSummary.laborListSummary.length > 0) {
      const wsCostLaborData = idleSummary.laborListSummary.map(item => ({
        "Cargo / Função": item.cargo,
        "Total Horas Ociosas (HH)": item.totalHH,
        "Ocorrências": item.eventCount,
        "Custo Hora Parada (R$/h)": item.rate,
        "Custo Total (R$)": item.totalCost
      }));
      const wsCostLabor = XLSX.utils.json_to_sheet(wsCostLaborData);
      XLSX.utils.book_append_sheet(wb, wsCostLabor, "Resumo Custos Mão de Obra");
    }

    // Sheet 6: Quadro Resumo Custos Equipamentos
    if (idleSummary.equipListSummary.length > 0) {
      const wsCostEquipData = idleSummary.equipListSummary.map(item => ({
        "Equipamento / Modelo": item.equip,
        "Total Horas Ociosas (HE)": item.totalHE,
        "Ocorrências": item.eventCount,
        "Custo Hora Parada (R$/h)": item.rate,
        "Custo Total (R$)": item.totalCost
      }));
      const wsCostEquip = XLSX.utils.json_to_sheet(wsCostEquipData);
      XLSX.utils.book_append_sheet(wb, wsCostEquip, "Resumo Custos Equipamentos");
    }

    // Save File
    XLSX.writeFile(wb, `CONSOLIDADO_RDO_${currentObra.nome.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div className="flex-1 bg-slate-50 p-5 md:p-6 overflow-y-auto custom-scrollbar font-sans">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
        <div>
          <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-widest bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            Relatórios Gerenciais
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1.5 flex items-center gap-2">
            Relatórios e Estatísticas da Obra
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Obra Ativa: <strong className="text-slate-800">{currentObra?.nome || "Nenhuma Obra Selecionada"}</strong>
          </p>
        </div>

        {/* Date Range Selectors & Excel Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-xs text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="border-none bg-transparent outline-none text-slate-700 font-semibold cursor-pointer"
            />
            <span className="text-slate-300 px-1">até</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="border-none bg-transparent outline-none text-slate-700 font-semibold cursor-pointer"
            />
          </div>

          {filteredReports.length > 0 && (
            <button
              onClick={exportToExcel}
              className="h-8.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-none shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Excel
            </button>
          )}
        </div>
      </div>

      {!currentObra ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-250/60 shadow-xs max-w-xl mx-auto mt-12 space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Nenhuma Obra Selecionada</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Selecione uma Obra Ativa no menu lateral para visualizar os relatórios e consolidar os dados dos diários.
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-250/60 shadow-xs max-w-xl mx-auto mt-12 space-y-3">
          <Info className="w-10 h-10 text-sky-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Sem dados para o período</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Não há relatórios diários (RDO) cadastrados nesta obra dentro do período selecionado de{" "}
            <strong>{startDate.split("-").reverse().join("/")}</strong> a{" "}
            <strong>{endDate.split("-").reverse().join("/")}</strong>.
          </p>
          <p className="text-[11px] text-slate-400">
            Ajuste os filtros de data acima ou crie diários para esta obra na aba principal.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subtabs Select */}
          <div className="flex border-b border-slate-200 gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveSubTab("histogramas")}
              className={`pb-2.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-none bg-transparent ${
                activeSubTab === "histogramas"
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Histogramas de Recursos
            </button>
            <button
              onClick={() => setActiveSubTab("pluviometria")}
              className={`pb-2.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-none bg-transparent ${
                activeSubTab === "pluviometria"
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Consolidado Pluviométrico
            </button>
            <button
              onClick={() => setActiveSubTab("praticabilidade")}
              className={`pb-2.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-none bg-transparent ${
                activeSubTab === "praticabilidade"
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Horas e Dias Praticáveis
            </button>
            {canEditAccess && (
              <button
                onClick={() => setActiveSubTab("recursosOciosos")}
                className={`pb-2.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer border-none bg-transparent flex items-center gap-1.5 ${
                  activeSubTab === "recursosOciosos"
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Recursos Ociosos
              </button>
            )}
          </div>

          {/* TAB 1: HISTOGRAMAS DE MÃO DE OBRA E EQUIPAMENTOS */}
          {activeSubTab === "histogramas" && (
            <div className="space-y-6">
              {/* Cards Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Média de Mão de Obra Diária</span>
                    <span className="text-lg font-bold text-slate-800">
                      {Math.round(histogramData.reduce((acc, curr) => acc + curr["Total Mão de Obra"], 0) / histogramData.length)} colaboradores
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="p-3 bg-sky-50 rounded-lg text-sky-600">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Média de Equipamentos Mobilizados</span>
                    <span className="text-lg font-bold text-slate-800">
                      {Math.round(histogramData.reduce((acc, curr) => acc + curr["Total Equipamentos"], 0) / histogramData.length * 10) / 10} un.
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total de Diários no Período</span>
                    <span className="text-lg font-bold text-slate-800">
                      {filteredReports.length} RDOs consolidados
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart: Manpower histogram */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">Histograma de Mão de Obra</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Evolução do contingente de pessoal próprio (SEEL) e subcontratado</p>
                </div>
                <div className="h-80 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                      <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Mão de Obra Direta (MOD)" stackId="a" fill="#1e3a8a" />
                      <Bar dataKey="Mão de Obra Indireta (MOI)" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Subcontratados" stackId="a" fill="#818cf8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart: Equipment Histogram */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">Histograma de Equipamentos</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Evolução da frota mobilizada na frentes de trabalho</p>
                </div>
                <div className="h-80 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                      <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Equipamentos Próprios" fill="#d97706" />
                      <Bar dataKey="Equipamentos Subcontratados" fill="#fbbf24" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONSOLIDADO DE PLUVIOMETRIA */}
          {activeSubTab === "pluviometria" && (
            <div className="space-y-6">
              {/* Rain statistics grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="p-3.5 bg-blue-50 text-blue-600 rounded-lg">
                    <CloudRain className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Precipitação Acumulada</span>
                    <span className="text-xl font-extrabold text-slate-800">{pluviometryStats.totalRain.toFixed(1)} mm</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="p-3.5 bg-sky-50 text-sky-600 rounded-lg">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Média Diária</span>
                    <span className="text-xl font-extrabold text-slate-800">{pluviometryStats.avgRain.toFixed(1)} mm/dia</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Dias com Chuva</span>
                    <span className="text-xl font-extrabold text-slate-800">{pluviometryStats.rainDays} dias</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="p-3.5 bg-amber-50 text-amber-600 rounded-lg">
                    <CloudLightning className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Pico Máximo Diário</span>
                    <span className="text-xl font-extrabold text-slate-800">{pluviometryStats.maxRain.toFixed(1)} mm</span>
                    {pluviometryStats.maxRainDate && (
                      <span className="text-[9px] text-slate-400 block font-semibold">{pluviometryStats.maxRainDate.split("-").reverse().join("/")}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rain line chart */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">Evolução Pluviométrica Diária</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Histórico das medições de precipitação no canteiro</p>
                </div>
                <div className="h-72 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pluviometryStats.dailyRainList} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                      <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                      <Tooltip />
                      <Line type="monotone" dataKey="Chuva (mm)" stroke="#0284c7" strokeWidth={3} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed rain table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">Registros de Chuvas Consolidados</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <th className="p-3">Data</th>
                        <th className="p-3">Precipitação</th>
                        <th className="p-3">Classificação Climática</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {pluviometryStats.dailyRainList.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-semibold">{row.date.split("-").reverse().join("/")}</td>
                          <td className="p-3 font-bold text-sky-700">{row["Chuva (mm)"].toFixed(1)} mm</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 font-bold uppercase text-[9px] rounded-full ${
                              row["Chuva (mm)"] > 15 
                                ? "bg-rose-50 text-rose-700 border border-rose-200" 
                                : row["Chuva (mm)"] > 0 
                                  ? "bg-blue-50 text-blue-700 border border-blue-200" 
                                  : "bg-slate-50 text-slate-500 border border-slate-200"
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIAS E HORAS PRATICÁVEIS & PARALISAÇÕES */}
          {activeSubTab === "praticabilidade" && (
            <div className="space-y-6">
              {/* Key Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Dias Praticáveis</span>
                    <span className="text-xl font-extrabold text-emerald-700">{practicabilityStats.practicableDays} dias</span>
                    <span className="text-[9px] text-slate-400 font-semibold block">Menos de 4 horas de interrupção</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Dias Impraticáveis (Chuvas/Outros)</span>
                    <span className="text-xl font-extrabold text-rose-700">{practicabilityStats.impracticableDays} dias</span>
                    <span className="text-[9px] text-slate-400 font-semibold block">4 horas ou mais de paralisação total</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total de Horas Paralisadas</span>
                    <span className="text-xl font-extrabold text-amber-700">{practicabilityStats.totalLostHours.toFixed(1)} horas</span>
                    <span className="text-[9px] text-slate-400 font-semibold block">Somatório de paralisações registradas</span>
                  </div>
                </div>
              </div>

              {/* Pie and Bar Container */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Chart Stoppages Reasons Pie */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">Motivos das Horas de Paralisação</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Distribuição das horas perdidas por fator</p>
                  </div>
                  <div className="h-64 flex items-center justify-center text-xs">
                    {practicabilityStats.pieData.length > 0 ? (
                      <div className="w-full h-full flex flex-col md:flex-row items-center justify-between">
                        <div className="w-full md:w-3/5 h-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={practicabilityStats.pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {practicabilityStats.pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => `${value}h`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Legend list */}
                        <div className="w-full md:w-2/5 flex flex-col gap-2 p-2">
                          {practicabilityStats.pieData.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                              <span className="text-[11px] font-semibold text-slate-700 truncate">{entry.name}:</span>
                              <span className="text-[11px] font-bold text-slate-900 ml-auto">{entry.value.toFixed(1)}h</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 py-12">
                        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        Nenhuma hora paralisada registrada neste período!
                      </div>
                    )}
                  </div>
                </div>

                {/* Stoppages Bar Chart */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">Horas Praticáveis vs Impraticáveis</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Relação diária de jornada de trabalho aproveitada contra paralisações</p>
                  </div>
                  <div className="h-64 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={practicabilityStats.dailyStoppagesList} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                        <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Praticável" stackId="stoppage" fill="#10b981" />
                        <Bar dataKey="Impraticável" stackId="stoppage" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detailed climate history */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">Histórico de Praticabilidade Diária</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <th className="p-3">Data</th>
                        <th className="p-3">Horas Paralisadas</th>
                        <th className="p-3">Classificação do Dia</th>
                        <th className="p-3">Detalhamento dos Motivos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {practicabilityStats.dailyStoppagesList.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-semibold">{row.date.split("-").reverse().join("/")}</td>
                          <td className="p-3 font-bold text-slate-900">{row["Horas Paralisadas"].toFixed(1)}h</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 font-bold uppercase text-[9px] rounded-full ${
                              row.status === "Impraticável" 
                                ? "bg-red-50 text-red-700 border border-red-200" 
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 max-w-xs truncate">
                            {[
                              row.chuva > 0 ? `Chuva: ${row.chuva}h` : "",
                              row.raios > 0 ? `Raios: ${row.raios}h` : "",
                              row.projetos > 0 ? `Projetos: ${row.projetos}h` : "",
                              row.vizinhos > 0 ? `Vizinhos: ${row.vizinhos}h` : "",
                              row.outros > 0 ? `Outros: ${row.outros}h` : "",
                            ].filter(Boolean).join(" | ") || "Nenhuma interrupção registrada"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RECURSOS OCIOSOS E ADMINISTRAÇÃO CONTRATUAL */}
          {activeSubTab === "recursosOciosos" && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Info Banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-50 border border-amber-200/80 rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        Relatório de Recursos Ociosos
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-extrabold tracking-wider">
                          BOAS PRÁTICAS PMO
                        </span>
                      </h3>
                      <p className="text-xs text-slate-600">
                        Consolidação formal de paralisações para segurança do contrato, aditivos de prazo (EOT) e controle de ociosidade de equipes e frota.
                      </p>
                    </div>
                  </div>

                  {filteredIdleEvents.length > 0 && (
                    <button
                      onClick={handlePrintClaimReport}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      Imprimir Dossiê de Recursos Ociosos (PDF)
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  {/* Motivo Filter */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 min-w-[200px]">
                    <Filter className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Motivo:</span>
                    <select
                      value={motivoFilter}
                      onChange={(e) => setMotivoFilter(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full"
                    >
                      <option value="TODOS">Todos os Motivos</option>
                      <option value="chuva">Chuva / Clima</option>
                      <option value="raios">Descargas Atmosféricas (Raios)</option>
                      <option value="projetos">Projetos / Mudanças de Escopo</option>
                      <option value="vizinhos">Interferências / Vizinhos / Utilidades</option>
                      <option value="outros">Outros Motivos / Paralisação Contratual</option>
                    </select>
                  </div>

                  {/* Resource Type Filter */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Recurso:</span>
                    <select
                      value={resourceTypeFilter}
                      onChange={(e) => setResourceTypeFilter(e.target.value as any)}
                      className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="TODOS">Todos (Mão de Obra + Equip.)</option>
                      <option value="MO">Mão de Obra (Efetivo)</option>
                      <option value="EQUIP">Equipamentos (Frota)</option>
                    </select>
                  </div>

                  {/* Free Text Search */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex-1 min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por observação, RDO, frente, cargo..."
                      className="bg-transparent border-none text-xs text-slate-800 font-medium focus:outline-none w-full"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">×</button>
                    )}
                  </div>
                </div>

                <div className="text-right text-[11px] font-bold text-slate-500 self-end md:self-center shrink-0">
                  Exibindo <span className="text-amber-700 font-extrabold">{filteredIdleEvents.length}</span> de {idleResourcesData.totalEvents} evento(s)
                </div>
              </div>

              {/* KPI Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: HH Lost */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Horas-Homem Ociosas (HH)</span>
                    <Users className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {idleResourcesData.aggregateHH.toFixed(1)} <span className="text-xs font-bold text-amber-600">HH</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Total de esforço direto e indireto retido no período</p>
                </div>

                {/* Card 2: HE Lost */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Horas-Equipamento (HE)</span>
                    <Wrench className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {idleResourcesData.aggregateHE.toFixed(1)} <span className="text-xs font-bold text-sky-600">HE</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Total de horas de maquinário e frota ociosa</p>
                </div>

                {/* Card 3: Events count */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Ocorrências no Período</span>
                    <Clock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {idleResourcesData.totalEvents} <span className="text-xs font-bold text-indigo-600">eventos</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Registros individuais de interrupção técnica/clima</p>
                </div>

                {/* Card 4: Impacted RDOs */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Diários com Ociosidade</span>
                    <Calendar className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {idleResourcesData.impactedRdosCount} <span className="text-xs font-bold text-slate-500">de {filteredReports.length} RDOs</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {filteredReports.length > 0 
                      ? `${((idleResourcesData.impactedRdosCount / filteredReports.length) * 100).toFixed(0)}% do período com alguma restrição`
                      : "Sem dados"
                    }
                  </p>
                </div>
              </div>

              {/* Chart 1: Time Evolution of Idle Resources (Diário / Mensal Toggle) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      {idleChartViewMode === "diario" 
                        ? "Evolução Diária de Recursos Ociosos (HH e HE)" 
                        : "Evolução Mensal de Recursos Ociosos (HH e HE)"}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {idleChartViewMode === "diario"
                        ? "Histórico diário do somatório de HH (Horas-Homem) e HE (Horas-Equipamento) afetados por paralisações."
                        : "Consolidação mensal do somatório de HH (Horas-Homem) e HE (Horas-Equipamento) afetados por paralisações."}
                    </p>
                  </div>

                  {/* Toggle Buttons: Diário vs Mensal */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIdleChartViewMode("diario")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        idleChartViewMode === "diario"
                          ? "bg-amber-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Visão Diária
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdleChartViewMode("mensal")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        idleChartViewMode === "mensal"
                          ? "bg-amber-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Visão Mensal
                    </button>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {idleChartData.currentList.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={idleChartData.currentList} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Horas-Homem (HH)" fill="#d97706" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Horas-Equipamento (HE)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic">
                      Nenhum registro de ociosidade no período selecionado.
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 2: Impact by Reason */}
              {idleResourcesData.chartDataByReason.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      Distribuição de Ociosidade (HH vs HE) por Motivo da Paralisação
                    </h4>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={idleResourcesData.chartDataByReason} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Horas-Homem (HH)" fill="#d97706" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Horas-Equipamento (HE)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* QUADRO RESUMO DE RECURSOS OCIOSOS E VALORAÇÃO FINANCEIRA (CUSTO HORA PARADA) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Quadro Resumo de Recursos Ociosos & Custo da Hora Parada
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Soma total das horas ociosas por função de mão de obra e modelo de equipamento. Digite o custo da hora parada (R$/h) para apuração e cálculo do valor de paralisação.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-2">
                    <div className="text-right">
                      <div className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider">Custo Total de Paralisação</div>
                      <div className="text-lg font-black text-emerald-900">
                        {idleSummary.grandTotalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* TABELA MÃO DE OBRA POR FUNÇÃO */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-amber-50/60 px-3 py-2 rounded-lg border border-amber-200/60">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-600" />
                        Mão de Obra por Função ({idleSummary.laborListSummary.length})
                      </span>
                      <span className="text-[10px] font-bold text-slate-600">
                        Subtotal MO: <strong className="text-amber-900">{idleSummary.totalLaborCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                      </span>
                    </div>

                    {idleSummary.laborListSummary.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        Nenhuma mão de obra detalhada registrada nas frentes paralisadas.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/90 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Cargo / Função</th>
                              <th className="p-2.5 text-center">Horas (HH)</th>
                              <th className="p-2.5 text-right">Custo Hora (R$/h)</th>
                              <th className="p-2.5 text-right">Custo Total (R$)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80 text-slate-800 font-medium">
                            {idleSummary.laborListSummary.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-2.5 font-bold text-slate-800">{item.cargo}</td>
                                <td className="p-2.5 text-center font-extrabold text-amber-700">{item.totalHH.toFixed(1)} h</td>
                                <td className="p-2.5 text-right">
                                  <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-1 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 shadow-2xs">
                                    <span className="text-[10px] font-bold text-slate-400">R$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0,00"
                                      value={item.rate || ""}
                                      onChange={(e) => handleLaborRateChange(item.cargo, parseFloat(e.target.value) || 0)}
                                      className="w-16 text-right font-extrabold text-slate-900 bg-transparent outline-none text-xs"
                                    />
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-extrabold text-emerald-800">
                                  {item.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* TABELA EQUIPAMENTOS POR MODELO */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-sky-50/60 px-3 py-2 rounded-lg border border-sky-200/60">
                      <span className="text-xs font-bold text-sky-900 uppercase tracking-wide flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-sky-600" />
                        Equipamentos por Modelo ({idleSummary.equipListSummary.length})
                      </span>
                      <span className="text-[10px] font-bold text-slate-600">
                        Subtotal Equip.: <strong className="text-sky-900">{idleSummary.totalEquipCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                      </span>
                    </div>

                    {idleSummary.equipListSummary.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        Nenhum equipamento detalhado registrado nas frentes paralisadas.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/90 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Equipamento / Modelo</th>
                              <th className="p-2.5 text-center">Horas (HE)</th>
                              <th className="p-2.5 text-right">Custo Hora (R$/h)</th>
                              <th className="p-2.5 text-right">Custo Total (R$)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80 text-slate-800 font-medium">
                            {idleSummary.equipListSummary.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-2.5 font-bold text-slate-800">{item.equip}</td>
                                <td className="p-2.5 text-center font-extrabold text-sky-700">{item.totalHE.toFixed(1)} h</td>
                                <td className="p-2.5 text-right">
                                  <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-1 focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 shadow-2xs">
                                    <span className="text-[10px] font-bold text-slate-400">R$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0,00"
                                      value={item.rate || ""}
                                      onChange={(e) => handleEquipRateChange(item.equip, parseFloat(e.target.value) || 0)}
                                      className="w-16 text-right font-extrabold text-slate-900 bg-transparent outline-none text-xs"
                                    />
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-extrabold text-emerald-800">
                                  {item.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Event Dossier Cards List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    Detalhamento dos Eventos de Ociosidade & Observações do Diário ({filteredIdleEvents.length})
                  </h4>
                </div>

                {filteredIdleEvents.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Nenhum recurso ocioso encontrado com os filtros selecionados.</p>
                    <p className="text-[11px] text-slate-400">Tente alterar os filtros de Motivo, Tipo de Recurso ou o campo de busca.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredIdleEvents.map((ev) => {
                      const isExpanded = expandedObsMap[ev.id] ?? true;
                      
                      // Theme badge by category
                      let badgeColor = "bg-amber-100 text-amber-900 border-amber-300";
                      if (ev.catKey === "chuva") badgeColor = "bg-sky-100 text-sky-900 border-sky-300";
                      else if (ev.catKey === "raios") badgeColor = "bg-amber-100 text-amber-900 border-amber-300";
                      else if (ev.catKey === "projetos") badgeColor = "bg-indigo-100 text-indigo-900 border-indigo-300";
                      else if (ev.catKey === "vizinhos") badgeColor = "bg-pink-100 text-pink-900 border-pink-300";

                      return (
                        <div key={ev.id} className="bg-white border border-slate-250/90 rounded-2xl p-4 shadow-2xs space-y-3 transition-all hover:border-amber-300">
                          {/* Top Row: Date + RDO + Motivo Badge + Duration */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                {ev.data.split("-").reverse().join("/")}
                              </span>
                              <span className="text-xs font-bold text-slate-600">
                                RDO nº <strong className="text-slate-900">{ev.rdoNo}</strong>
                              </span>
                              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${badgeColor}`}>
                                {ev.catLabel}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>{ev.totalHours.toFixed(1)}h de paralisação</span>
                              <span className="text-[10px] text-slate-400 font-normal">({ev.horasStr})</span>
                            </div>
                          </div>

                          {/* Frentes & PQ Item */}
                          {ev.frentesItems.length > 0 && (
                            <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 text-xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Frentes de Serviço e Planilha de Quantidades (PQ):</span>
                              <div className="flex flex-wrap gap-2 pt-0.5">
                                {ev.frentesItems.map((f, fIdx) => (
                                  <span key={fIdx} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-semibold text-slate-800 shadow-2xs">
                                    <strong className="text-amber-800">{f.nome || "Frente de Serviço"}</strong>
                                    {f.pqItemDesc && (
                                      <span className="text-slate-500 font-mono text-[10px] border-l border-slate-200 pl-1.5">
                                        {f.pqItemDesc}
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Resources Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {/* Mão de Obra */}
                            <div className="bg-amber-50/40 p-2.5 rounded-xl border border-amber-200/60 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-900 uppercase">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-amber-600" />
                                  Efetivo Afetado ({ev.totalMaoDeObraCount} pessoa(s))
                                </span>
                                <span className="text-amber-700">{ev.totalHH.toFixed(1)} HH</span>
                              </div>
                              {ev.laborList.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {ev.laborList.map((l, lIdx) => (
                                    <span key={lIdx} className="px-2 py-0.5 bg-white text-amber-950 font-semibold rounded border border-amber-300 text-[10.5px] shadow-2xs">
                                      <strong className="text-amber-800">{l.qtd}x</strong> {l.desc}
                                    </span>
                                  ))}
                                </div>
                              ) : ev.maoDeObraParalisadaText ? (
                                <p className="text-[11px] text-slate-700 italic font-medium">{ev.maoDeObraParalisadaText}</p>
                              ) : (
                                <p className="text-[10px] text-slate-400 italic">Nenhuma Mão de Obra específica vinculada.</p>
                              )}
                            </div>

                            {/* Equipamentos */}
                            <div className="bg-sky-50/40 p-2.5 rounded-xl border border-sky-200/60 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-extrabold text-sky-900 uppercase">
                                <span className="flex items-center gap-1">
                                  <Wrench className="w-3.5 h-3.5 text-sky-600" />
                                  Equipamentos Afetados ({ev.totalEquipamentoCount} máq.)
                                </span>
                                <span className="text-sky-700">{ev.totalHE.toFixed(1)} HE</span>
                              </div>
                              {ev.equipList.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {ev.equipList.map((e, eIdx) => (
                                    <span key={eIdx} className="px-2 py-0.5 bg-white text-sky-950 font-semibold rounded border border-sky-300 text-[10.5px] shadow-2xs">
                                      <strong className="text-sky-900">{e.qtd}x</strong> {e.desc}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 italic">Nenhum equipamento mobilizado paralisado.</p>
                              )}
                            </div>
                          </div>

                          {/* ESSENTIAL FIELD: OBSERVAÇÃO DO MOTIVO DA PARALISAÇÃO / RECURSO OCIOSO */}
                          <div className="bg-amber-50/80 border border-amber-300/80 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                                Observação do Motivo da Paralisação / Justificativa em Diário (Evidência Contratual)
                              </label>
                              
                              {(ev.comentarios.length > 120 || ev.maoDeObraParalisadaText.length > 120) && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedObsMap(prev => ({ ...prev, [ev.id]: !isExpanded }))}
                                  className="text-[10px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Ocultar</span>
                                      <ChevronUp className="w-3 h-3" />
                                    </>
                                  ) : (
                                    <>
                                      <span>Ver texto completo</span>
                                      <ChevronDown className="w-3 h-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                            <p className={`text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap bg-white/80 p-2.5 rounded-lg border border-amber-200/80 ${!isExpanded ? "line-clamp-2" : ""}`}>
                              {ev.comentarios || ev.maoDeObraParalisadaText || (
                                <span className="text-slate-400 italic">Nenhuma observação textual foi detalhada no diário de obras para este evento.</span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
