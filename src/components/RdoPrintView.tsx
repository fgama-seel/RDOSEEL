/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { RdoReport, StoppageDetailRow } from "../types";
import { RainChart } from "./RainChart";
import { ArrowLeft, Printer, ShieldCheck, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useRdoStore } from "../context/RdoContext";

interface RdoPrintViewProps {
  report?: RdoReport;
  reportsToPrint?: RdoReport[];
  onClose: () => void;
  batchPrintedMode?: "single" | "individual";
}

// Helper to format short date like "08/05/2019, Qua"
const formatPrintDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  const dateObj = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
  const formattedDate = dateObj.toLocaleDateString("pt-BR", options);
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const weekDay = weekDays[dateObj.getDay()];
  return `${formattedDate}, ${weekDay}`;
};

// Barcode svg simulator
const BarcodeSvg: React.FC<{ code: string }> = ({ code }) => {
  // Generate pseudo-random line widths
  const lines = [];
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed += code.charCodeAt(i);
  }
  for (let i = 0; i < 40; i++) {
    const w = ((seed + i) % 3) + 1;
    const spacing = ((seed * i) % 2) + 1;
    lines.push(<line key={i} x1={i * 4} y1="0" x2={i * 4} y2="30" stroke="black" strokeWidth={w} />);
  }
  return (
    <div className="flex flex-col items-center justify-center mt-1">
      <svg width="160" height="25" className="opacity-85">
        {lines}
      </svg>
      <span className="font-mono text-[7px] text-gray-500 mt-1 uppercase tracking-widest">{code}</span>
    </div>
  );
};

// QR Code SVG simulator
const QrCodeSvg: React.FC<{ value: string }> = ({ value }) => {
  return (
    <svg width="40" height="40" viewBox="0 0 10 10" className="opacity-90">
      <rect width="10" height="10" fill="white" />
      {/* Draw square mock grids */}
      <rect x="0" y="0" width="3" height="3" fill="black" />
      <rect x="1" y="1" width="1" height="1" fill="white" />
      <rect x="7" y="0" width="3" height="3" fill="black" />
      <rect x="8" y="1" width="1" height="1" fill="white" />
      <rect x="0" y="7" width="3" height="3" fill="black" />
      <rect x="1" y="7" width="1" height="1" fill="white" />
      {/* Random internal dots */}
      <rect x="4" y="1" width="1" height="1" fill="black" />
      <rect x="5" y="2" width="1" height="1" fill="black" />
      <rect x="4" y="4" width="2" height="2" fill="black" />
      <rect x="8" y="5" width="1" height="1" fill="black" />
      <rect x="7" y="8" width="1" height="1" fill="black" />
      <rect x="9" y="8" width="1" height="1" fill="black" />
    </svg>
  );
};

const SingleReportPrint: React.FC<{ report: RdoReport }> = ({ report }) => {
  const { obras, reports } = useRdoStore();
  const currentObra = obras.find(o => o.id === report.obraId || o.nome === report.obra);

  const displayEmitenteNome = report.emitenteAssinado
    ? (report.emitenteNome || currentObra?.emissorNomeDefault || "")
    : (currentObra?.emissorNomeDefault || report.emitenteNome || "Representante Emissor");

  const displayGerenciadoraNome = report.gerenciadoraAssinado
    ? (report.gerenciadoraNome || currentObra?.fiscalGerenciadoraNomeDefault || "")
    : (currentObra?.fiscalGerenciadoraNomeDefault || report.gerenciadoraNome || "Fiscal da Gerenciadora");

  const displayContratanteNome = report.contratanteAssinado
    ? (report.contratanteNome || currentObra?.fiscalAprovadorNomeDefault || "")
    : (currentObra?.fiscalAprovadorNomeDefault || report.contratanteNome || "Fiscal Contratante");

  const hoursList = [
    "6h", "7h", "8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h", "20h", "21h", "22h", "23h",
    "0h", "1h", "2h", "3h", "4h", "5h"
  ];

  // Build Monthly Daily Rain Data
  const [monthlyRainLabels, monthlyRainValues] = React.useMemo(() => {
    const rDate = report.data; // YYYY-MM-DD
    if (!rDate) return [[], []];
    
    const [year, month, dayStr] = rDate.split('-');
    const currentDay = parseInt(dayStr, 10);
    const numDays = currentDay; // up to the report's day
    
    // Initialize day map
    const dailyValues = new Array(numDays).fill({}).map((_, i) => ({ day: i + 1, total: 0 }));
    
    const relevantReports = reports.filter(r => {
      if ((r.obraId !== report.obraId) && (r.obra !== report.obra)) return false;
      if (!r.data || !r.data.startsWith(`${year}-${month}`)) return false;
      return parseInt(r.data.split('-')[2], 10) <= currentDay;
    });

    relevantReports.forEach(r => {
      const d = parseInt(r.data.split('-')[2], 10);
      const val = Number(r.precipitacao?.total || 0);
      const cell = dailyValues.find(x => x.day === d);
      if (cell) cell.total = Math.max(cell.total, val); // in case of multiple reports same day, take max or sum, let's take max.
    });

    // Special case for the current report (if it's not saved to store yet or has newer modifications)
    const currentVal = Number(report.precipitacao?.total || 0);
    const cell = dailyValues.find(x => x.day === currentDay);
    if (cell) cell.total = Math.max(cell.total, currentVal);

    return [
      dailyValues.map(d => String(d.day)),
      dailyValues.map(d => d.total)
    ];
  }, [report, reports]);

  // Build Yearly Monthly Rain Data
  const [yearlyRainLabels, yearlyRainValues] = React.useMemo(() => {
    const rDate = report.data; // YYYY-MM-DD
    if (!rDate) return [[], []];
    
    const [year] = rDate.split('-');
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // Sum MAX daily precipitation per day over the month to avoid duplicate reports counting twice
    const monthDaySums: Record<number, Record<string, number>> = {};
    for (let m=1; m<=12; m++) monthDaySums[m] = {};
    
    const relevantReports = reports.filter(r => {
      if ((r.obraId !== report.obraId) && (r.obra !== report.obra)) return false;
      return r.data && r.data.startsWith(`${year}-`);
    });

    relevantReports.forEach(r => {
      const [, m, d] = r.data.split('-');
      const mInt = parseInt(m, 10);
      const val = Number(r.precipitacao?.total || 0);
      if (mInt >= 1 && mInt <= 12) {
        monthDaySums[mInt][d] = Math.max(monthDaySums[mInt][d] || 0, val);
      }
    });

    const valMap = new Array(12).fill(0);
    for (let m=1; m<=12; m++) {
      valMap[m-1] = Object.values(monthDaySums[m]).reduce((acc, v) => acc + v, 0);
    }
    
    return [months, valMap];
  }, [report, reports]);

  // Helper component to render signatures footer
  const PrintFooter: React.FC<{ pageNum: number }> = ({ pageNum }) => (
    <div className="border-t border-gray-300 grid grid-cols-4 gap-2 text-center text-[10px] mt-auto pt-2 print-footer bg-white">
      {/* EMITENTE */}
      <div className="border-r border-gray-200 pr-2 flex flex-col justify-end align-middle h-24 pb-1">
        <span className="font-bold border-b border-gray-100 pb-1 text-gray-700 uppercase">EMITENTE</span>
        {report.emitenteAssinado ? (
          <div className="flex flex-col items-center justify-end h-16">
            <span className="text-[7px] text-emerald-600 font-extrabold uppercase bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded leading-none mb-1">
              ✓ ASSINADO DIGITALMENTE
            </span>
            <span className="text-[6px] text-slate-500 font-mono scale-[0.85] truncate max-w-full leading-none mb-1">
              {report.emitenteConsolidado}
            </span>
            <span className="text-[6px] text-slate-400 font-mono scale-[0.85] truncate max-w-full leading-none mb-1">
              HASH: {report.emitenteHash ? report.emitenteHash.substring(0, 16) : ""}
            </span>
            <span className="font-semibold block truncate max-w-full text-gray-800 leading-none mt-1">{displayEmitenteNome}</span>
            <span className="text-[7px] text-gray-400 block font-mono mt-0.5">SEEL ENGENHARIA</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-end h-16">
            <div className="w-4/5 border-b border-gray-300 mt-auto mb-1"></div>
            <span className="font-semibold block truncate max-w-full text-gray-800 leading-none">{displayEmitenteNome}</span>
            <span className="text-[7px] text-gray-400 block font-mono mt-1">SEEL ENGENHARIA</span>
          </div>
        )}
      </div>
      
      {/* GERENCIADORA */}
      <div className="border-r border-gray-200 pr-2 flex flex-col justify-end align-middle h-24 pb-1">
        <span className="font-bold border-b border-gray-100 pb-1 text-gray-700 uppercase">GERENCIADORA</span>
        {report.gerenciadoraAssinado ? (
          <div className="flex flex-col items-center justify-end h-16">
            <span className="text-[7px] text-emerald-600 font-extrabold uppercase bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded leading-none mb-1">
              ✓ ASSINADO DIGITALMENTE
            </span>
            <span className="text-[6px] text-slate-500 font-mono scale-[0.85] truncate max-w-full leading-none mb-1">
              {report.gerenciadoraConsolidado}
            </span>
            <span className="text-[6px] text-slate-400 font-mono scale-[0.85] truncate max-w-full leading-none mb-1">
              HASH: {report.gerenciadoraHash ? report.gerenciadoraHash.substring(0, 16) : ""}
            </span>
            <span className="font-semibold block truncate max-w-full text-gray-800 leading-none mt-1">{displayGerenciadoraNome}</span>
            <span className="text-[7px] text-gray-400 block font-mono mt-0.5">{report.gerenciadora || "GERENCIADORA"}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-end h-16">
            <div className="w-4/5 border-b border-gray-300 mt-auto mb-1"></div>
            <span className="font-semibold block truncate max-w-full text-gray-800 leading-none">{displayGerenciadoraNome}</span>
            <span className="text-[7px] text-gray-400 block font-mono mt-1">{report.gerenciadora || "GERENCIADORA"}</span>
          </div>
        )}
      </div>

      {/* CONTRATANTE */}
      <div className="border-r border-gray-200 pr-2 flex flex-col justify-end align-middle h-24 pb-1">
        <span className="font-bold border-b border-gray-100 pb-1 text-gray-700 uppercase">CONTRATANTE</span>
        {report.contratanteAssinado ? (
          <div className="flex flex-col items-center justify-end h-16">
            <span className="text-[7px] text-emerald-600 font-extrabold uppercase bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded leading-none mb-1">
              ✓ APROVADO DIGITALMENTE
            </span>
            <span className="text-[6px] text-slate-500 font-mono scale-[0.85] truncate max-w-full leading-none mb-1">
              {report.contratanteAprovado}
            </span>
            <span className="text-[6px] text-slate-400 font-mono scale-[0.85] truncate max-w-full leading-none mb-1">
              HASH: {report.contratanteHash ? report.contratanteHash.substring(0, 16) : ""}
            </span>
            <span className="font-semibold block truncate max-w-full text-gray-800 leading-none mt-1">{displayContratanteNome}</span>
            <span className="text-[7px] text-gray-400 block font-mono mt-0.5">{report.cliente || "CLIENTE"}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-end h-16">
            <div className="w-4/5 border-b border-gray-300 mt-auto mb-1"></div>
            <span className="font-semibold block truncate max-w-full text-gray-800 leading-none">{displayContratanteNome}</span>
            <span className="text-[7px] text-gray-400 block font-mono mt-1">{report.cliente || "CLIENTE"}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between align-middle items-center h-24 text-[9px]">
        <span className="font-bold text-gray-700 text-center uppercase tracking-wide">Paginação</span>
        <div className="text-center font-sans">
          <p className="font-bold text-gray-800">Pág.{pageNum}</p>
          <p className="text-gray-400">de 3</p>
        </div>
        <QrCodeSvg value={`RDO-${report.rdoNo}-PAGE-${pageNum}`} />
      </div>
    </div>
  );

  // Common Headings inside A4 sheet
  const PrintHeader = () => (
    <div className="flex justify-between items-stretch border border-gray-300 pb-0 bg-white">
      {/* Sabesp + Seel Vector representation */}
      <div className="w-1/4 min-w-[120px] p-2 flex flex-col justify-center items-center border-r border-gray-300 gap-1">
        <div className="flex items-center gap-1 w-full justify-center">
          {currentObra?.logoCliente ? (
            <img src={currentObra.logoCliente} alt="Logo Cliente" className="h-8 max-w-[50%] object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="bg-[#00adef] text-white font-black text-[10px] px-1 rounded-sm tracking-tighter flex items-center h-5">
              SABESP
            </div>
          )}
          {currentObra?.logoSeel ? (
            <img src={currentObra.logoSeel} alt="Logo Contratada" className="h-8 max-w-[50%] object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="bg-[#004899] text-white font-extrabold text-[10px] px-1 rounded-sm leading-tight flex items-center h-5 border border-[#3b82f6]">
              SEEL
            </div>
          )}
        </div>
        <span className="text-[7px] text-center font-semibold text-gray-400 block tracking-tight">SERVIÇOS DE ENGENHARIA</span>
      </div>

      <div className="flex-1 px-4 py-2 flex flex-col justify-center items-center border-r border-gray-300 text-center">
        <h1 className="text-lg font-bold tracking-tight text-gray-800 font-sans uppercase">Relatório Diário de Obras</h1>
        <p className="text-[8px] text-gray-400 font-sans tracking-widest mt-0.5">FORMULÁRIO DIÁRIO INTEGRADO - VERSÃO WEB</p>
      </div>

      <div className="w-1/4 p-2 flex flex-col justify-center bg-[#004899] text-white text-center leading-none">
        <span className="text-[9px] uppercase tracking-wider text-blue-200">RDO Nº</span>
        <span className="text-sm font-bold block mt-1 tracking-wider">{report.rdoNo}</span>
      </div>
    </div>
  );

  // Key-Value Grid Block
  const ReportInfoBlock = () => (
    <div className="mt-2 border border-gray-300 text-[9px] grid grid-cols-12 gap-0 divide-x divide-y divide-gray-300 bg-white">
      <div className="col-span-12 md:col-span-8 p-1.5 flex items-center">
        <span className="font-bold text-gray-500 uppercase mr-1">OBRA:</span>
        <span className="font-bold text-[#004899] text-xs">{report.obra}</span>
      </div>
      <div className="col-span-12 md:col-span-4 p-1.5 flex items-center">
        <span className="font-bold text-gray-500 uppercase mr-1">DATA:</span>
        <span className="font-bold text-gray-800">{formatPrintDate(report.data)}</span>
      </div>

      <div className="col-span-4 p-1.5 flex items-center">
        <span className="font-bold text-gray-500 uppercase mr-1">CLIENTE:</span>
        <span className="font-semibold text-gray-800">{report.cliente}</span>
      </div>
      <div className="col-span-4 p-1.5 flex items-center">
        <span className="font-bold text-gray-500 uppercase mr-1">CONTRATADA:</span>
        <span className="font-bold text-gray-800">{report.contratada || "SEEL ENGENHARIA"}</span>
      </div>
      <div className="col-span-4 p-1.5 flex items-center">
        <span className="font-bold text-gray-500 uppercase mr-1">GESTOR:</span>
        <span className="font-semibold text-gray-800">{report.gestor}</span>
      </div>

      {/* Deadlines Block */}
      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">PRAZO CONTRATUAL</span>
        <span className="font-bold text-gray-800">{report.prazo} dias</span>
      </div>
      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">PRAZO INCORRIDO</span>
        <span className="font-bold text-gray-800">{report.prazoIncorrido} dias</span>
      </div>
      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">PRAZO REMANESCENTE</span>
        <span className="font-bold text-gray-800">{report.prazoFaltante} dias</span>
      </div>

      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">INÍCIO DA OBRA</span>
        <span className="font-bold text-gray-800">{report.inicio || "-"}</span>
      </div>
      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">TÉRMINO DA OBRA</span>
        <span className="font-bold text-gray-800">{report.termino || "-"}</span>
      </div>
      <div className="col-span-4 p-1 flex flex-col">
        <span className="text-[7px] text-gray-400 block leading-tight">GERENCIADORA</span>
        <span className="font-bold text-gray-800">{report.gerenciadora || "-"}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 print:gap-0 bg-transparent print:bg-white mb-6 print:mb-0">
        
        {/* ================= PAGE 1 ================= */}
        <div className="bg-white border md:border-gray-300 p-4 md:p-8 flex flex-col w-full min-h-[1120px] print-page relative shadow-sm print:shadow-none print:border-none">
          <PrintHeader />
          <ReportInfoBlock />

          {/* ACIDENTES vs EFETIVO SUMMARY */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {/* Acidentes Summary Table */}
            <div className="border border-gray-300">
              <div className="bg-[#004899]/5 font-bold text-[8px] text-[#004899] px-2 py-0.5 border-b border-gray-300 flex justify-between">
                <span>ACIDENTES</span>
                <span className="text-gray-400">(resumo)</span>
              </div>
              <div className="text-[8px] divide-y divide-gray-200">
                <div className="flex justify-between p-1">
                  <span>Acidentes com afastamento no dia</span>
                  <span className="font-bold font-mono">{report.acidentes.comAfastamentoDia}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Acidentes com afastamento - ausentes no dia</span>
                  <span className="font-bold font-mono">{report.acidentes.comAfastamentoAusentesDia}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Acidentes com afastamento - acumulado obra</span>
                  <span className="font-bold font-mono">{report.acidentes.comAfastamentoAcumulado}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Acidentes sem afastamento no dia</span>
                  <span className="font-bold font-mono">{report.acidentes.semAfastamentoDia}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Acidentes sem afastamento - acumulado obra</span>
                  <span className="font-bold font-mono">{report.acidentes.semAfastamentoAcumulado}</span>
                </div>
              </div>
            </div>

            {/* Efetivo Summary Table */}
            <div className="border border-gray-300">
              <div className="bg-[#004899]/5 font-bold text-[8px] text-[#004899] px-2 py-0.5 border-b border-gray-300 flex justify-between">
                <span>EFETIVO</span>
                <span className="text-gray-400">(resumo)</span>
              </div>
              <div className="text-[8px] divide-y divide-gray-200">
                <div className="flex justify-between p-1">
                  <span>Mão de Obra Indireta (MOI)</span>
                  <span className="font-bold font-mono">{report.efetivoSummary.moi}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Mão de Obra Direta (MOD)</span>
                  <span className="font-bold font-mono">{report.efetivoSummary.mod}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Subcontratados - MOI / MOD</span>
                  <span className="font-bold font-mono">{report.efetivoSummary.subcontratadosMoiMod}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Afastados / Outros</span>
                  <span className="font-bold font-mono">{report.efetivoSummary.afastados}</span>
                </div>
                <div className="flex justify-between p-1 bg-gray-50 font-bold border-t border-gray-300 leading-none py-1.5">
                  <span className="text-[#004899]">EFETIVO TOTAL</span>
                  <span className="font-mono text-[#004899]">{report.efetivoSummary.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* PARALISAÇÕES vs EQUIPAMENTOS SUMMARY */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {/* Paralisações Table */}
            <div className="border border-gray-300">
              <div className="bg-[#004899]/5 font-bold text-[8px] text-[#004899] px-2 py-0.5 border-b border-gray-300 flex justify-between">
                <span>PARALISAÇÕES</span>
                <span className="text-gray-400">(resumo)</span>
              </div>
              <div className="text-[8px] divide-y divide-gray-200">
                <div className="flex justify-between p-1">
                  <span>Acumulado de horas paralisadas no dia</span>
                  <span className="font-bold font-mono">{report.paralisacoesSummary.totalHorasParalisadasDia}h</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Número total de paralisações</span>
                  <span className="font-bold font-mono">{report.paralisacoesSummary.numeroParalisacoes}</span>
                </div>
              </div>
            </div>

            {/* Equipamentos Summary Table */}
            <div className="border border-gray-300">
              <div className="bg-[#004899]/5 font-bold text-[8px] text-[#004899] px-2 py-0.5 border-b border-gray-300 flex justify-between">
                <span>EQUIPAMENTOS</span>
                <span className="text-gray-400">(resumo)</span>
              </div>
              <div className="text-[8px] divide-y divide-gray-200">
                <div className="flex justify-between p-1">
                  <span>Equipamentos Próprios Mobilizados</span>
                  <span className="font-bold font-mono">{report.equipamentosSummary.mobilizados}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>Equipamentos Subcontratados</span>
                  <span className="font-bold font-mono">{report.equipamentosSummary.subcontratadosMobilizados}</span>
                </div>
                <div className="flex justify-between p-1 bg-gray-50 font-bold border-t border-gray-300 leading-none py-1.5">
                  <span className="text-[#004899]">EQUIPAMENTOS TOTAL</span>
                  <span className="font-mono text-[#004899]">{report.equipamentosSummary.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE ACTIVITIES (First Block) */}
          <div className="mt-3 flex-1 flex flex-col">
            <h3 className="text-[9px] font-bold bg-[#004899] text-white py-1 px-2 uppercase tracking-wide">
              ATIVIDADES EXECUTADAS NO PERÍODO — FASES DE CAMPO
            </h3>

            {report.atividades && report.atividades.length > 0 ? (
              <div className="border border-gray-300 border-t-0 text-[8.5px]">
                {/* We chunk or list the activities. On page 1 we print up to 4-5 activities, especially if they have images, avoiding page breaking */}
                {report.atividades.slice(0, 5).map((act, idx) => (
                  <div key={act.id || idx} className="border-b border-gray-200 p-2 last:border-b-0">
                    <div className="flex items-start text-gray-400 text-[7.5px] uppercase font-bold tracking-tight mb-1">
                      <span className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded-sm mr-2">{act.ref}</span>
                      <span>{act.fase}</span>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-20 font-mono text-gray-500 text-[8px] shrink-0">
                        ID: {act.identificador}
                      </div>
                      <div className="flex-1 text-gray-800">
                        {act.descricao}
                      </div>
                      <div className="w-24 text-right pr-2">
                        <span className="text-gray-400">Total: </span>
                        <span className="font-mono font-bold text-gray-800">{act.total} {act.intervalo}</span>
                      </div>
                    </div>

                    {act.comentario && (
                      <p className="mt-1.5 ml-2 text-[8px] italic text-[#004899] bg-[#004899]/5 px-2 py-0.5 rounded-sm">
                        COMENTÁRIO: {act.comentario}
                      </p>
                    )}

                    {/* Rendering images if applicable */}
                    {act.imagens && act.imagens.length > 0 && (
                      <div className="flex gap-2.5 mt-2.5 ml-2">
                        {act.imagens.slice(0, 2).map((imgUrl, imgIdx) => (
                          <div key={imgIdx} className="w-1/2 max-w-[240px] aspect-[4/3] rounded border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                            <img
                              src={imgUrl}
                              alt={`Imagem anexa ${imgIdx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {report.atividades.length > 5 && (
                  <p className="text-[7.5px] italic text-gray-400 p-1.5 text-center border-t border-gray-100 bg-gray-50">
                    As demais atividades continuam na página 2 de planejamento.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex-1 border border-gray-300 border-t-0 flex items-center justify-center text-gray-400 text-[9px] italic py-8">
                Nenhuma atividade cadastrada para este RDO.
              </div>
            )}
          </div>

          <PrintFooter pageNum={1} />
        </div>

        {/* ================= PAGE 2 ================= */}
        <div className="bg-white border md:border-gray-300 p-4 md:p-8 flex flex-col w-full min-h-[1120px] print-page relative shadow-sm print:shadow-none print:border-none">
          <PrintHeader />
          
          <div className="mt-2 text-[8.5px] flex flex-col flex-1 gap-2.5">
            {/* CONTINUING ACTIVITIES (If any) */}
            {report.atividades && report.atividades.length > 5 && (
              <div>
                <h4 className="text-[9px] font-bold bg-gray-800 text-white py-0.5 px-2 uppercase tracking-wide">
                  Atividades - Planejamento & Outros (Continuação)
                </h4>
                <div className="border border-gray-300 border-t-0">
                  {report.atividades.slice(5).map((act, idx) => (
                    <div key={act.id || idx} className="border-b border-gray-200 p-1.5 last:border-b-0 flex gap-2">
                      <div className="w-8 text-blue-700 font-bold">{act.ref}</div>
                      <div className="w-24 text-gray-400 font-mono text-[8px]">{act.identificador}</div>
                      <div className="flex-1 text-gray-800">{act.descricao}</div>
                      <div className="w-24 text-right pr-2">
                        <span className="font-mono">{act.total} {act.intervalo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FATOS RELEVANTES - ALTERAÇÃO DE ESCOPO CONTRATADO */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                FATOS RELEVANTES — OCORRÊNCIAS EXTRAORDINÁRIAS DO DIA
              </h4>
              <div className="border border-gray-300 p-2 min-h-12 bg-white">
                {report.fatosRelevantes && report.fatosRelevantes.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1">
                    {report.fatosRelevantes.map((fato, fIdx) => (
                      <li key={fIdx} className="text-gray-800 text-[8.5px]">{fato}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 italic text-[8px] text-center">Nenhuma ocorrência extraordinária ou alteração de escopo anotada.</p>
                )}
              </div>
            </div>

            {/* PARALISAÇÕES - TIMETABLE GRID */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                TABELA DETALHADA DE PARALISAÇÕES DO EFETIVO
              </h4>
              <div className="border border-gray-300 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300 text-[7px] text-gray-500">
                      <th className="p-1 border-r border-gray-200 w-16">CATEGORIA</th>
                      <th className="p-1 border-r border-gray-200">JANELA DE HORAS PARALISADAS (6H ÀS 5H DO DIA SEGUINTE)</th>
                      <th className="p-1 border-r border-gray-200 w-24">FRENTES AFETADAS</th>
                      <th className="p-1 border-r border-gray-200 w-20">EQUIPES AFETADAS</th>
                      <th className="p-1 w-12 text-center">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(report.paralisacoesDetalhe || {}).map(([key, rowVal]) => {
                      const row = rowVal as StoppageDetailRow;
                      return (
                        <tr key={key} className={row.ativo ? "bg-white text-[8px]" : "bg-gray-50/50 text-[8px] opacity-70"}>
                          <td className="p-1 border-r border-gray-300 font-bold capitalize text-blue-900 bg-gray-50/30">
                            {key === "raios" ? "Raios" : key}
                          </td>
                          <td className="p-1 border-r border-gray-300">
                            {/* Render hour tag bullets that are paralisadas */}
                            <div className="flex flex-wrap gap-1">
                              {row.ativo && row.horas.length > 0 ? (
                                row.horas.map(h => (
                                  <span key={h} className="bg-red-50 text-red-700 border border-red-200 rounded px-1 text-[7.5px] font-bold font-mono">
                                    {h}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-[7.5px] italic">Sem paralisação</span>
                              )}
                            </div>
                            {row.comentarios && (
                              <p className="text-[7.5px] italic text-[#004899] mt-0.5">Nota: {row.comentarios}</p>
                            )}
                          </td>
                          <td className="p-1 border-r border-gray-300 text-gray-600 truncate max-w-[120px]">
                            {row.ativo ? row.frentes || "Todas" : "-"}
                          </td>
                          <td className="p-1 border-r border-gray-300 text-gray-600 truncate max-w-[100px]">
                            {row.ativo ? row.maoDeObraParalisada || "Toda equipe" : "-"}
                          </td>
                          <td className="p-1 text-center font-bold text-red-600 font-mono">
                            {row.ativo ? row.total || "0h" : "0h"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACCIDENTS EXTENDED NOTE */}
            <div className="border border-gray-300 p-1 flex justify-between bg-yellow-50/20 text-[7.5px]">
              <span className="font-bold text-gray-600 uppercase">INFORMAÇÕES DE SEGURANÇA (ACIDENTES):</span>
              <span className="font-bold text-emerald-700 italic">
                {report.acidentes.comAfastamentoDia === 0 && report.acidentes.semAfastamentoDia === 0 
                  ? "NENHUMA OCORRÊNCIA DE ACIDENTE JUNTADA NESTE RDO DO DIA." 
                  : "OCORRÊNCIA DE ACIDENTE REGISTRADA NO SISTEMA."}
              </span>
            </div>

            {/* CLIMATIC CONDITIONS & RAINFALL DETAILS */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                CONDIÇÕES CLIMÁTICAS & ÍNDICE PLUVIOMÉTRICO (CHUVA MM)
              </h4>
              
              {/* Rain summarizes text row */}
              <div className="mt-1 border border-gray-300 p-1.5 grid grid-cols-6 gap-2 text-[8px] text-gray-600 bg-white leading-tight">
                <div>Manhã: <strong className="text-gray-800 font-mono">{report.precipitacao.manha} mm</strong></div>
                <div>Tarde: <strong className="text-gray-800 font-mono">{report.precipitacao.tarde} mm</strong></div>
                <div>Noite: <strong className="text-gray-800 font-mono">{report.precipitacao.noite} mm</strong></div>
                <div>Total Período: <strong className="text-blue-700 font-mono">{report.precipitacao.total} mm</strong></div>
                <div>Acumulado Mês: <strong className="text-gray-800 font-mono">{report.precipitacao.acumuladoMes} mm</strong></div>
                <div>Mês Anterior: <strong className="text-gray-800 font-mono">{report.precipitacao.acumuladoMesAnterior} mm</strong></div>
              </div>

              {/* Vector Rainfall charts */}
              <div className="mt-2 grid grid-cols-1 gap-2">
                <div className="bg-white border border-gray-200 rounded p-1">
                  <p className="text-[7.5px] uppercase font-bold text-gray-400 text-center mb-1">CÁLCULO E ANÁLISE DE CHUVA - DIÁRIO ACUMULADO NO MÊS</p>
                  <RainChart labels={monthlyRainLabels} values={monthlyRainValues} />
                </div>
                <div className="bg-white border border-gray-200 rounded p-1">
                  <p className="text-[7.5px] uppercase font-bold text-gray-400 text-center mb-1">CÁLCULO E ANÁLISE DE CHUVA - MENSAL ACUMULADO NO ANO</p>
                  <RainChart labels={yearlyRainLabels} values={yearlyRainValues} />
                </div>
              </div>
            </div>
          </div>

          <PrintFooter pageNum={2} />
        </div>

        {/* ================= PAGE 3 ================= */}
        <div className="bg-white border md:border-gray-300 p-4 md:p-8 flex flex-col w-full min-h-[1120px] print-page relative shadow-sm print:shadow-none print:border-none">
          <PrintHeader />

          <div className="mt-2 text-[8.5px] flex flex-col flex-1 gap-3.5">
            {/* EFETIVO - QUADRO DETALHADO */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                EFETIVO - QUADRO DETALHADO DO PESSOAL DE CAMPO
              </h4>
              <p className="text-[6.5px] text-gray-400 italic mb-1 uppercase tracking-tight">Legenda: C - Cadastrados em Folha; F - Faltas no dia; A - Atestados Médicos; T - Total Geral Presente</p>

              <div className="space-y-2 border border-gray-300 p-1 bg-gray-50/50">
                {report.efetivoDetalhado && report.efetivoDetalhado.length > 0 ? (
                  report.efetivoDetalhado.map((group) => {
                    // Calc group totals
                    const totalC = group.items.reduce((sum, item) => sum + (item.c || 0), 0);
                    const totalF = group.items.reduce((sum, item) => sum + (item.f || 0), 0);
                    const totalA = group.items.reduce((sum, item) => sum + (item.a || 0), 0);
                    const totalT = group.items.reduce((sum, item) => sum + (item.t || 0), 0);

                    return (
                      <div key={group.id} className="bg-white border border-gray-200">
                        <div className="bg-[#004899]/10 p-1 flex justify-between font-bold text-xs text-[#004899]">
                          <span>{group.nome}</span>
                          <span className="text-[8px] bg-[#004899] text-white px-1 py-0.5 rounded uppercase">Grupo de Efetivo</span>
                        </div>
                        
                        <table className="w-full text-left font-sans text-[8px] border-collapse">
                          <thead>
                            <tr className="bg-gray-100 border-b border-gray-200 text-gray-500 font-semibold">
                              <th className="p-1 border-r border-gray-200">CARGO / FUNÇÃO</th>
                              <th className="p-1 border-r border-gray-200 w-16 text-center">TIPO</th>
                              <th className="p-1 border-r border-gray-200 w-12 text-center">C</th>
                              <th className="p-1 border-r border-gray-200 w-12 text-center">F</th>
                              <th className="p-1 border-r border-gray-200 w-12 text-center">A</th>
                              <th className="p-1 w-12 text-center bg-gray-50">T</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-1 border-r border-gray-200 font-medium text-gray-800">{item.cargo}</td>
                                <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-500">{item.moiMod}</td>
                                <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-700">{item.c}</td>
                                <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-700">{item.f}</td>
                                <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-700">{item.a}</td>
                                <td className="p-1 text-center font-mono font-bold bg-gray-50 text-gray-800">{item.t}</td>
                              </tr>
                            ))}
                            {/* Company Subtotals */}
                            <tr className="bg-gray-50/70 border-t border-gray-300 font-bold">
                              <td className="p-1 border-r border-gray-200 text-right pr-2 uppercase">TOTAL {group.nome}</td>
                              <td className="p-1 border-r border-gray-200"></td>
                              <td className="p-1 border-r border-gray-200 text-center font-mono">{totalC}</td>
                              <td className="p-1 border-r border-gray-200 text-center font-mono">{totalF}</td>
                              <td className="p-1 border-r border-gray-200 text-center font-mono">{totalA}</td>
                              <td className="p-1 text-center font-mono text-blue-900 bg-blue-50">{totalT}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-400 italic text-[8px] text-center p-3">Nenhum trabalhador detalhado no quadro de efetivo.</p>
                )}
              </div>
            </div>

            {/* EQUIPAMENTOS MOBILIZADOS DETAIL */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                EQUIPAMENTOS MOBILIZADOS — DETALHAMENTO DE EQUIPAMENTO MECÂNICO
              </h4>
              <div className="border border-gray-300">
                <table className="w-full text-left font-sans text-[8px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300 text-gray-500 font-bold uppercase text-[7.5px]">
                      <th className="p-1 px-2 border-r border-gray-200 w-16 text-center">Ref</th>
                      <th className="p-1 border-r border-gray-200">DESCRIÇÃO DO EQUIPAMENTO</th>
                      <th className="p-1 border-r border-gray-200 w-32">EMPRESA RESPONSÁVEL / PROPRIEDADE</th>
                      <th className="p-1 w-24 text-center">QTD MOBILIZADA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {report.equipamentosDetalhado && report.equipamentosDetalhado.length > 0 ? (
                      report.equipamentosDetalhado.map((eq, eIdx) => (
                        <tr key={eq.id || eIdx} className="hover:bg-slate-50">
                          <td className="p-1 text-center border-r border-gray-200 text-gray-400 font-mono">
                            {(eIdx + 1).toString().padStart(2, "0")}
                          </td>
                          <td className="p-1 px-2 border-r border-gray-200 font-medium text-gray-800">{eq.descricao}</td>
                          <td className="p-1 border-r border-gray-200 text-gray-600">{eq.empresa}</td>
                          <td className="p-1 text-center font-bold font-mono text-gray-800">{eq.quantidade}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-gray-400 italic">Nenhum equipamento mecânico cadastrado no dia.</td>
                      </tr>
                    )}
                    {/* Total Row */}
                    <tr className="bg-gray-50 font-bold text-gray-800 border-t border-gray-300">
                      <td className="p-1 border-r border-gray-200"></td>
                      <td className="p-1 px-2 border-r border-gray-200 text-right uppercase text-[7.5px]">TOTAL EQUIPAMENTOS MOBILIZADOS</td>
                      <td className="p-1 border-r border-gray-200"></td>
                      <td className="p-1 text-center font-mono text-blue-900 bg-blue-50/50">
                        {report.equipamentosDetalhado.reduce((sum, eq) => sum + (eq.quantidade || 0), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* COMENTÁRIO GERENCIADORA / CONTRATANTE */}
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                COMENTÁRIO DA FISCALIZAÇÃO / GERENCIADORA / CONTRATANTE
              </h4>
              <div className="border border-gray-300 p-2 min-h-16 bg-white flex flex-col gap-1 text-[8.5px]">
                {report.comentariosGerenciadoraContratante && report.comentariosGerenciadoraContratante.length > 0 ? (
                  report.comentariosGerenciadoraContratante.map((comm, idx) => (
                    <div key={idx} className="flex gap-1 items-start text-gray-700 leading-tight">
                      <span className="text-[#004899] font-bold">{(idx + 1).toString().padStart(3, "0")} -</span>
                      <p className="flex-1 italic">{comm}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 italic text-[8px] text-center my-auto">Nenhum comentário adicionado pela fiscalização contratante.</p>
                )}
              </div>
            </div>
          </div>

          <PrintFooter pageNum={3} />
        </div>

        {/* ================= PAGE(S) ANEXOS ================= */}
        {report.anexos && report.anexos.length > 0 && Array.from({ length: Math.ceil(report.anexos.length / 2) }).map((_, pageIdx) => {
          const sliceAnexos = (report.anexos || []).slice(pageIdx * 2, pageIdx * 2 + 2);
          return (
            <div key={`anexo-page-${pageIdx}`} className="bg-white border md:border-gray-300 p-4 md:p-8 flex flex-col w-full min-h-[1120px] print-page relative shadow-sm print:shadow-none print:border-none">
              <PrintHeader />

              <div className="mt-2 text-[8.5px] flex flex-col flex-1 gap-3.5">
                <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                  ANEXOS DOCUMENTAIS - PARTE {pageIdx + 1}
                </h4>

                <div className="flex-1 flex flex-col gap-4">
                  {sliceAnexos.map((anexo, idx) => {
                    const isPdf = anexo.type === "application/pdf" || (anexo.dataUrl && anexo.dataUrl.startsWith("data:application/pdf"));
                    return (
                      <div key={idx} className="flex-1 border border-gray-300 rounded p-1 flex flex-col items-center justify-center bg-gray-50 overflow-hidden relative">
                         {isPdf ? (
                           <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm">
                             <FileText className="w-12 h-12 text-red-600 mb-2" />
                             <h5 className="text-[10px] font-bold text-gray-800 uppercase tracking-wide font-sans">{anexo.name || "Documento PDF Anexo"}</h5>
                             <p className="text-[7px] text-gray-400 mt-1 uppercase font-mono">Tipo: Documento Digital PDF</p>
                             <div className="w-16 border-b border-gray-200 my-2"></div>
                             <p className="text-[8px] text-gray-400 leading-relaxed font-sans">
                               O arquivo digital correspondente a este anexo foi consolidado com sucesso e faz parte integrante deste RDO eletrônico.
                             </p>
                           </div>
                         ) : (
                           <img src={anexo.dataUrl} className="max-w-full max-h-[440px] object-contain" alt="Anexo documental do relatório" />
                         )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <PrintFooter pageNum={4 + pageIdx} />
            </div>
          );
        })}

    </div>
  );
};

export const RdoPrintView: React.FC<RdoPrintViewProps> = ({ report, reportsToPrint, onClose, batchPrintedMode = "single" }) => {
  const [exportMode, setExportMode] = React.useState<"single" | "individual">(batchPrintedMode);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const reportsArray = reportsToPrint && reportsToPrint.length > 0
    ? reportsToPrint
    : (report ? [report] : []);

  const totalReportsCount = reportsArray.length;
  const currentActiveReport = reportsArray[activeIndex] || null;

  const getPrintTitle = () => {
    if (exportMode === "individual" || totalReportsCount === 1) {
      const rdoNumber = currentActiveReport?.rdoNo || "000";
      return rdoNumber.toUpperCase().startsWith("RDO") ? rdoNumber : `RDO-${rdoNumber}`;
    }
    return `LOTE_RDO_${totalReportsCount}_relatorios`;
  };

  const triggerPrintCombined = () => {
    const originalTitle = document.title;
    document.title = getPrintTitle();
    window.focus();
    setTimeout(() => {
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 1000);
    }, 100);
  };

  const triggerPrintSingleAndAdvance = () => {
    const originalTitle = document.title;
    document.title = getPrintTitle();
    window.focus();
    setTimeout(() => {
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 1000);
      if (activeIndex < totalReportsCount - 1) {
        setTimeout(() => {
          setActiveIndex(prev => prev + 1);
        }, 300);
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto flex flex-col p-4 md:p-6 print-container no-print:p-0">
      {/* Action panel at top (hidden during printing) */}
      <div className="bg-white max-w-5xl w-full mx-auto p-3 md:p-4 rounded-t-xl border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-center shadow-md no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Editor
          </button>
          
          {totalReportsCount > 1 && (
            <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-0.5">
              <button
                onClick={() => setExportMode("single")}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md cursor-pointer uppercase tracking-tight transition-all ${
                  exportMode === "single"
                    ? "bg-white text-[#004899] shadow-xs"
                    : "text-slate-500 hover:text-slate-850"
                }`}
              >
                PDF Único (Lote)
              </button>
              <button
                onClick={() => setExportMode("individual")}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md cursor-pointer uppercase tracking-tight transition-all ${
                  exportMode === "individual"
                    ? "bg-white text-[#004899] shadow-xs"
                    : "text-slate-500 hover:text-slate-850"
                }`}
              >
                Individual por Dia
              </button>
            </div>
          )}
        </div>

        {/* Individual Mode Navigation */}
        {totalReportsCount > 1 && exportMode === "individual" && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/85 rounded-xl px-2 py-0.5">
            <button
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
              className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Diário Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="text-center font-mono text-[10px] text-slate-700 min-w-32 font-semibold uppercase">
              RDO <span className="font-bold text-[#004899]">{currentActiveReport?.rdoNo}</span> ({activeIndex + 1}/{totalReportsCount})
              <div className="text-[8px] text-slate-400 mt-0.5">{currentActiveReport ? formatPrintDate(currentActiveReport.data).split(",")[0] : ""}</div>
            </div>

            <button
              disabled={activeIndex === totalReportsCount - 1}
              onClick={() => setActiveIndex(prev => Math.min(totalReportsCount - 1, prev + 1))}
              className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Próximo Diário"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <div className="hidden sm:flex bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg items-center gap-1.5 text-xs text-blue-700">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <span>Assinaturas Ativas</span>
          </div>

          <div className="hidden no-print flex-col justify-center px-2 mr-2">
            <span className="text-[10px] text-amber-600 font-bold leading-tight">Nota: Se a janela de impressão não abrir,</span>
            <span className="text-[9px] text-amber-700">Abra o aplicativo em uma nova guia.</span>
          </div>

          {exportMode === "single" ? (
            <button
              onClick={triggerPrintCombined}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#004899] hover:bg-blue-800 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm cursor-pointer uppercase tracking-wider"
            >
              <Printer className="w-4 h-4" />
              {totalReportsCount > 1 ? `Imprimir Lote (${totalReportsCount} RDOs)` : "Imprimir RDO (Exportar PDF)"}
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={triggerPrintCombined}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold text-xs transition-colors shadow-sm cursor-pointer uppercase tracking-wider"
                title="Imprimir apenas o RDO atualmente visualizado"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Este
              </button>
              
              <button
                onClick={triggerPrintSingleAndAdvance}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm cursor-pointer uppercase tracking-wider animate-pulse hover:animate-none"
                title="Imprime o RDO atual e depois avança automaticamente para o próximo dia na lista"
              >
                <Printer className="w-4 h-4" />
                {activeIndex === totalReportsCount - 1 ? "Imprimir Último" : "Imprimir e Avançar"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pages Container */}
      <div id="print-container-wrapper" className="max-w-5xl w-full mx-auto bg-slate-100 p-0 md:p-4 rounded-b-xl flex flex-col gap-6 scroll-smooth print:gap-0 print:p-0 print:bg-white print:max-w-none print:w-full">
        {exportMode === "single" ? (
          reportsArray.map((rep) => (
            <SingleReportPrint key={rep.id || rep.rdoNo} report={rep} />
          ))
        ) : (
          currentActiveReport && (
            <SingleReportPrint key={currentActiveReport.id || currentActiveReport.rdoNo} report={currentActiveReport} />
          )
        )}
      </div>
    </div>
  );
};
