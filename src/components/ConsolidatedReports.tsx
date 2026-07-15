import React, { useState, useMemo } from "react";
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
  Info
} from "lucide-react";
import * as XLSX from "xlsx";

export const ConsolidatedReports: React.FC = () => {
  const { reports, currentObra } = useRdoStore();

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

  const [activeSubTab, setActiveSubTab] = useState<"histogramas" | "pluviometria" | "praticabilidade">("histogramas");

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
        </div>
      )}
    </div>
  );
};
