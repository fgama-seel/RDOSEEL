/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { RdoReport, StoppageDetailRow, Activity } from "../types";
import { RainChart } from "./RainChart";
import { ArrowLeft, Printer, ShieldCheck, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useRdoStore } from "../context/RdoContext";
import { FormattedText } from "./RichTextarea";

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

// Helper to parse quantity and item description e.g. "3x Carpinteiro" -> { qtd: 3, desc: "Carpinteiro" }
const parseItemQty = (formatted: string): { desc: string; qtd: number } => {
  if (!formatted) return { desc: "", qtd: 1 };
  const match = formatted.match(/^(\d+)x?\s+(.*)$/i) || formatted.match(/^(\d+)\s*-\s*(.*)$/i);
  if (match) {
    return { qtd: Math.max(1, parseInt(match[1], 10) || 1), desc: match[2].trim() };
  }
  return { desc: formatted.trim(), qtd: 1 };
};

// Helper for humanized stoppage category labels
const getCategoryLabel = (key: string): string => {
  switch (key) {
    case "chuva": return "Chuva / Intempéries";
    case "raios": return "Incidência de Raios / Descargas Elétricas";
    case "projetos": return "Projetos / Revisões Técnico-Operacionais";
    case "vizinhos": return "Interferência de Vizinhos / Terceiros";
    case "outros": return "Outros Motivos de Inoperância";
    default: return key;
  }
};

// Barcode svg simulator
const BarcodeSvg: React.FC<{ code: string }> = ({ code }) => {
  const lines = [];
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed += code.charCodeAt(i);
  }
  for (let i = 0; i < 40; i++) {
    const w = ((seed + i) % 3) + 1;
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
      <rect x="0" y="0" width="3" height="3" fill="black" />
      <rect x="1" y="1" width="1" height="1" fill="white" />
      <rect x="7" y="0" width="3" height="3" fill="black" />
      <rect x="8" y="1" width="1" height="1" fill="white" />
      <rect x="0" y="7" width="3" height="3" fill="black" />
      <rect x="1" y="7" width="1" height="1" fill="white" />
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
  
  // Find current Obra object from store to populate missing contract / Obra details
  const currentObra = obras.find(o => o.id === report.obraId || o.nome === report.obra);

  const obraNome = report.obra || currentObra?.nome || "OBRA NÃO IDENTIFICADA";
  const contratoNo = currentObra?.numeroContrato || report.contratoNo || "-";
  const clienteContratante = currentObra?.cliente || report.cliente || report.contratante || "-";
  const empresaContratada = currentObra?.contratada || report.contratada || "SEEL ENGENHARIA LTDA";
  const gerenciadora = currentObra?.gerenciadora || report.gerenciadora || "-";
  
  const inicioDate = currentObra?.dataInicio 
    ? new Date(currentObra.dataInicio + "T12:00:00").toLocaleDateString("pt-BR")
    : (report.inicio || "-");
  const terminoDate = report.termino || "-";
  const prazoTotal = currentObra 
    ? (Number(currentObra.prazoContratual || 0) + Number(currentObra.aditivoPrazo || 0))
    : Number(report.prazo || 0);
  const prazoIncorrido = Number(report.prazoIncorrido || 0);
  const prazoRemanescente = Math.max(0, prazoTotal - prazoIncorrido);

  const displayEmitenteNome = report.emitenteAssinado
    ? (report.emitenteNome || currentObra?.emissorNomeDefault || "")
    : (currentObra?.emissorNomeDefault || report.emitenteNome || "Representante Emissor");

  const displayGerenciadoraNome = report.gerenciadoraAssinado
    ? (report.gerenciadoraNome || currentObra?.fiscalGerenciadoraNomeDefault || "")
    : (currentObra?.fiscalGerenciadoraNomeDefault || report.gerenciadoraNome || "Fiscal da Gerenciadora");

  const displayContratanteNome = report.contratanteAssinado
    ? (report.contratanteNome || currentObra?.fiscalContratanteNomeDefault || "")
    : (currentObra?.fiscalContratanteNomeDefault || report.contratanteNome || "Fiscal da Contratante");

  // Build Daily Monthly Rain Data
  const [monthlyRainLabels, monthlyRainValues] = React.useMemo(() => {
    const rDate = report.data; // YYYY-MM-DD
    if (!rDate) return [[], []];
    
    const [year, month] = rDate.split('-');
    const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
    
    const dailyValues: { day: number; total: number }[] = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const targetDate = `${year}-${month}-${dayStr}`;
      
      const rep = reports.find(r => 
        ((r.obraId === report.obraId) || (r.obra === report.obra)) && 
        r.data === targetDate
      );
      
      const val = rep ? Number(rep.precipitacao?.total || 0) : 0;
      dailyValues.push({ day: d, total: val });
    }

    if (report.data) {
      const curDay = parseInt(report.data.split('-')[2], 10);
      if (curDay >= 1 && curDay <= daysInMonth) {
        dailyValues[curDay - 1].total = Number(report.precipitacao?.total || 0);
      }
    }

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
    
    const monthDaySums: Record<number, Record<string, number>> = {};
    for (let m = 1; m <= 12; m++) monthDaySums[m] = {};
    
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
    for (let m = 1; m <= 12; m++) {
      valMap[m - 1] = Object.values(monthDaySums[m]).reduce((acc, v) => acc + v, 0);
    }
    
    return [months, valMap];
  }, [report, reports]);

  // Helper component to render signatures footer
  const PrintFooter: React.FC<{ pageNum: number; totalPages?: number }> = ({ pageNum, totalPages = 1 }) => (
    <div className="border-t border-gray-300 grid grid-cols-4 gap-2 text-center text-[10px] mt-auto pt-2 print-footer bg-white">
      {/* EMITENTE */}
      <div className="border-r border-gray-200 pr-2 flex flex-col justify-end align-middle h-24 pb-1">
        <span className="font-bold border-b border-gray-100 pb-1 text-gray-700 uppercase">EMITENTE</span>
        <div className="flex-1 flex flex-col items-center justify-center p-1">
          {report.emitenteAssinado ? (
            <div className="flex flex-col items-center">
              <span className="font-mono text-[8px] text-green-700 font-semibold bg-green-50 border border-green-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-green-600 inline" />
                ASSINADO DIGITALMENTE
              </span>
              <span className="text-[7.5px] text-gray-500 font-mono mt-0.5">{report.emitenteDataAssinatura || report.data}</span>
            </div>
          ) : (
            <div className="border-b border-gray-400 w-3/4 my-2"></div>
          )}
        </div>
        <span className="font-semibold text-gray-800 uppercase text-[8.5px]">{displayEmitenteNome}</span>
        <span className="text-[7.5px] text-gray-400 uppercase">SEEL ENGENHARIA</span>
      </div>

      {/* CONTRATANTE */}
      <div className="border-r border-gray-200 pr-2 flex flex-col justify-end align-middle h-24 pb-1">
        <span className="font-bold border-b border-gray-100 pb-1 text-gray-700 uppercase">CONTRATANTE</span>
        <div className="flex-1 flex flex-col items-center justify-center p-1">
          {report.contratanteAssinado ? (
            <div className="flex flex-col items-center">
              <span className="font-mono text-[8px] text-green-700 font-semibold bg-green-50 border border-green-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-green-600 inline" />
                ASSINADO DIGITALMENTE
              </span>
              <span className="text-[7.5px] text-gray-500 font-mono mt-0.5">{report.contratanteDataAssinatura || report.data}</span>
            </div>
          ) : (
            <div className="border-b border-gray-400 w-3/4 my-2"></div>
          )}
        </div>
        <span className="font-semibold text-gray-800 uppercase text-[8.5px]">{displayContratanteNome}</span>
        <span className="text-[7.5px] text-gray-400 uppercase">{clienteContratante}</span>
      </div>

      {/* GERENCIADORA */}
      <div className="border-r border-gray-200 pr-2 flex flex-col justify-end align-middle h-24 pb-1">
        <span className="font-bold border-b border-gray-100 pb-1 text-gray-700 uppercase">GERENCIADORA</span>
        <div className="flex-1 flex flex-col items-center justify-center p-1">
          {report.gerenciadoraAssinado ? (
            <div className="flex flex-col items-center">
              <span className="font-mono text-[8px] text-green-700 font-semibold bg-green-50 border border-green-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-green-600 inline" />
                ASSINADO DIGITALMENTE
              </span>
              <span className="text-[7.5px] text-gray-500 font-mono mt-0.5">{report.gerenciadoraDataAssinatura || report.data}</span>
            </div>
          ) : (
            <div className="border-b border-gray-400 w-3/4 my-2"></div>
          )}
        </div>
        <span className="font-semibold text-gray-800 uppercase text-[8.5px]">{displayGerenciadoraNome}</span>
        <span className="text-[7.5px] text-gray-400 uppercase">{gerenciadora}</span>
      </div>

      {/* CONTROLE DIGITAL E FOLHA */}
      <div className="flex flex-col justify-between items-center h-24 pb-1">
        <div className="w-full flex justify-between items-center px-1 text-[7.5px] text-gray-400 border-b border-gray-100 pb-1">
          <span>SISTEMA RDO</span>
          <span className="font-mono font-bold text-gray-700">PÁGINA {pageNum} DE {totalPages}</span>
        </div>
        <BarcodeSvg code={report.uuid || `SEEL-${report.rdoNo}-${report.data}`} />
        <div className="flex items-center gap-2 mt-1">
          <QrCodeSvg value={report.uuid || report.id} />
          <div className="text-left leading-tight">
            <span className="block text-[6.5px] font-mono text-gray-400">CHAVE DE AUTENTICIDADE:</span>
            <span className="block text-[7px] font-mono font-bold text-gray-800 truncate max-w-[90px]">{report.uuid?.slice(0, 16) || "SEEL-VERIFIED"}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Header component
  const PrintHeader: React.FC = () => (
    <div className="border-b-2 border-[#004899] pb-2 flex justify-between items-center mb-2">
      <div className="flex items-center gap-3">
        {currentObra?.logoUrl ? (
          <img src={currentObra.logoUrl} alt="Logo Obra" className="h-10 max-w-32 object-contain" />
        ) : (
          <div className="h-10 w-24 bg-[#004899] text-white flex items-center justify-center font-bold text-xs rounded tracking-wider">
            SEEL
          </div>
        )}
        <div className="border-l border-gray-300 pl-3">
          <h1 className="text-sm font-extrabold text-[#004899] uppercase tracking-wide">
            RELATÓRIO DIÁRIO DE OBRA (RDO)
          </h1>
          <p className="text-[9px] font-bold text-gray-600 uppercase">
            {obraNome}
          </p>
        </div>
      </div>

      <div className="text-right">
        <div className="text-xs font-black text-[#004899] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded font-mono inline-block">
          {report.rdoNo.toUpperCase().startsWith("RDO") ? report.rdoNo : `RDO-${report.rdoNo}`}
        </div>
        <p className="text-[9px] font-bold text-gray-700 mt-0.5 font-mono">
          DATA: {formatPrintDate(report.data)}
        </p>
      </div>
    </div>
  );

  // Complete Report Info Block (Obra Details)
  const ReportInfoBlock: React.FC = () => (
    <div className="border border-gray-300 divide-y divide-gray-200 text-[8px] bg-slate-50/50">
      {/* Line 1: Obra & Contrato */}
      <div className="grid grid-cols-12 divide-x divide-gray-200 font-sans">
        <div className="col-span-8 p-1.5 flex flex-col justify-center">
          <span className="text-[7px] text-gray-400 block leading-tight font-bold">DENOMINAÇÃO DA OBRA</span>
          <span className="font-extrabold text-gray-900 uppercase text-[9px] truncate">{obraNome}</span>
        </div>
        <div className="col-span-4 p-1.5 flex flex-col justify-center">
          <span className="text-[7px] text-gray-400 block leading-tight font-bold">CONTRATO N.º</span>
          <span className="font-bold text-gray-900 font-mono text-[8.5px]">{contratoNo}</span>
        </div>
      </div>

      {/* Line 2: Contratada, Contratante, Gerenciadora */}
      <div className="grid grid-cols-12 divide-x divide-gray-200 font-sans">
        <div className="col-span-4 p-1.5 flex flex-col justify-center">
          <span className="text-[7px] text-gray-400 block leading-tight font-bold">EMPRESA CONTRATADA</span>
          <span className="font-extrabold text-[#004899] text-[8.5px]">{empresaContratada}</span>
        </div>
        <div className="col-span-4 p-1.5 flex flex-col justify-center">
          <span className="text-[7px] text-gray-400 block leading-tight font-bold">CONTRATANTE / CLIENTE</span>
          <span className="font-bold text-gray-800 text-[8.5px]">{clienteContratante}</span>
        </div>
        <div className="col-span-4 p-1.5 flex flex-col justify-center">
          <span className="text-[7px] text-gray-400 block leading-tight font-bold">GERENCIADORA / FISCALIZAÇÃO</span>
          <span className="font-bold text-gray-800 text-[8.5px]">{gerenciadora}</span>
        </div>
      </div>

      {/* Line 3: Prazos, Inicio, Termino */}
      <div className="grid grid-cols-12 divide-x divide-gray-200 font-sans bg-white">
        <div className="col-span-3 p-1 flex flex-col justify-center">
          <span className="text-[6.5px] text-gray-400 block leading-tight font-bold">DATA DE INÍCIO</span>
          <span className="font-bold text-gray-800 font-mono text-[8px]">{inicioDate}</span>
        </div>
        <div className="col-span-3 p-1 flex flex-col justify-center">
          <span className="text-[6.5px] text-gray-400 block leading-tight font-bold">TÉRMINO PREVISTO</span>
          <span className="font-bold text-gray-800 font-mono text-[8px]">{terminoDate}</span>
        </div>
        <div className="col-span-2 p-1 flex flex-col justify-center">
          <span className="text-[6.5px] text-gray-400 block leading-tight font-bold">PRAZO TOTAL</span>
          <span className="font-bold text-gray-800 font-mono text-[8px]">{prazoTotal} dias</span>
        </div>
        <div className="col-span-2 p-1 flex flex-col justify-center">
          <span className="text-[6.5px] text-gray-400 block leading-tight font-bold">INCORRIDO</span>
          <span className="font-bold text-gray-800 font-mono text-[8px]">{prazoIncorrido} dias</span>
        </div>
        <div className="col-span-2 p-1 flex flex-col justify-center bg-blue-50/50">
          <span className="text-[6.5px] text-blue-800 block leading-tight font-bold">REMANESCENTE</span>
          <span className="font-extrabold text-blue-900 font-mono text-[8px]">{prazoRemanescente} dias</span>
        </div>
      </div>
    </div>
  );

  // Helper to render an activity card with inline image gallery
  const renderActivityCard = (act: Activity, idx: number) => {
    const activityComments = act.comentario || act.comentarios;
    const activityImages = act.imagens && act.imagens.length > 0 ? act.imagens : [];

    return (
      <div key={act.id || idx} className="p-2 flex flex-col gap-1.5 text-[8px] bg-white border border-gray-200 rounded my-1">
        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-[#004899] uppercase text-[8.5px]">
              #{(idx + 1).toString().padStart(2, "0")} — {act.fase ? `[${act.fase}] ` : ""}{act.local || act.identificador || "Frente de Serviço"}
            </span>
            {act.ref && (
              <span className="text-[7px] bg-gray-100 text-gray-700 font-mono px-1 rounded border border-gray-200">
                Ref: {act.ref}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {act.total && (
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[7.5px]">
                Qtd: {act.total} {act.intervalo || "un"}
              </span>
            )}
            {act.pqItemDesc && (
              <span className="text-[7.5px] bg-blue-50 text-blue-900 border border-blue-200 font-mono px-1 rounded">
                Planilha PQ: {act.pqItemDesc}
              </span>
            )}
          </div>
        </div>

        <div className="text-gray-800 leading-relaxed font-normal text-[8.5px]">
          <FormattedText text={act.descricao} />
        </div>

        {activityComments && (
          <div className="text-[7.5px] text-gray-600 italic bg-gray-50 p-1 border border-gray-200 rounded">
            <span className="font-bold not-italic text-gray-700">Comentários: </span>
            <FormattedText text={activityComments} />
          </div>
        )}

        {/* Activity Images inline gallery */}
        {activityImages.length > 0 && (
          <div className="mt-2 pt-1 border-t border-gray-100">
            <span className="text-[8px] font-bold text-[#004899] uppercase block mb-1.5">
              Fotos Anexas da Atividade ({activityImages.length}):
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {activityImages.map((imgUrl, imgIdx) => (
                <div key={imgIdx} className="border border-gray-300 rounded p-1.5 bg-white shadow-2xs flex flex-col items-center">
                  <div className="w-full h-52 flex items-center justify-center bg-gray-50 rounded border border-gray-200 overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={`Foto ${imgIdx + 1} - Atividade ${idx + 1}`}
                      className="max-h-52 max-w-full object-contain"
                    />
                  </div>
                  <span className="text-[7.5px] font-bold text-gray-700 mt-1 uppercase">
                    Foto {imgIdx + 1} de {activityImages.length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // BUILD DYNAMIC PAGES ARRAY FOR PERFECT PDF GENERATION
  const pages: React.ReactNode[] = [];

  // PAGE 1: DADOS GERAIS, RESUMOS E PRIMEIRAS ATIVIDADES
  const allActivities = report.atividades || [];
  let firstBatchCount = 0;
  if (allActivities.length > 0) {
    const act0HasImgs = Boolean(allActivities[0]?.imagens && allActivities[0].imagens.length > 0);
    if (act0HasImgs) {
      firstBatchCount = 1;
    } else if (allActivities.length > 1) {
      const act1HasImgs = Boolean(allActivities[1]?.imagens && allActivities[1].imagens.length > 0);
      firstBatchCount = act1HasImgs ? 1 : 2;
    } else {
      firstBatchCount = 1;
    }
  }
  const firstActivitiesBatch = allActivities.slice(0, firstBatchCount);
  const remainingActivities = allActivities.slice(firstBatchCount);

  pages.push(
    <div key="page-1" className="flex flex-col gap-2.5 text-[8.5px]">
      <ReportInfoBlock />

      {/* ACIDENTES vs EFETIVO SUMMARY */}
      <div className="mt-1 grid grid-cols-2 gap-2">
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
              <span className="font-bold font-mono">{report.efetivoSummary.moiTotal}</span>
            </div>
            <div className="flex justify-between p-1">
              <span>Mão de Obra Direta (MOD)</span>
              <span className="font-bold font-mono">{report.efetivoSummary.modTotal}</span>
            </div>
            <div className="flex justify-between p-1">
              <span>Subcontratados / Terceiros</span>
              <span className="font-bold font-mono">{report.efetivoSummary.subcontratadosTotal}</span>
            </div>
            <div className="flex justify-between p-1 text-red-600">
              <span>Afastados / Faltas / Licenças</span>
              <span className="font-bold font-mono">{report.efetivoSummary.afastadosTotal}</span>
            </div>
            <div className="flex justify-between p-1 bg-gray-50 font-bold text-[#004899]">
              <span>TOTAL DE PRESENTES NO DIA</span>
              <span className="font-mono">{report.efetivoSummary.totalGeralPresentes}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PARALISAÇÕES vs EQUIPAMENTOS SUMMARY */}
      <div className="grid grid-cols-2 gap-2">
        {/* Paralisações Summary */}
        <div className="border border-gray-300">
          <div className="bg-[#004899]/5 font-bold text-[8px] text-[#004899] px-2 py-0.5 border-b border-gray-300 flex justify-between">
            <span>PARALISAÇÕES DO EFETIVO</span>
            <span className="text-gray-400">(resumo)</span>
          </div>
          <div className="text-[8px] divide-y divide-gray-200">
            <div className="flex justify-between p-1">
              <span>Horas Paralisadas no Dia</span>
              <span className="font-bold font-mono text-red-600">{report.paralisacoesSummary.totalHorasParalisadasDia}h</span>
            </div>
            <div className="flex justify-between p-1">
              <span>Ocorrências de Paralisação</span>
              <span className="font-bold font-mono">{report.paralisacoesSummary.numeroParalisacoes}</span>
            </div>
          </div>
        </div>

        {/* Equipamentos Summary */}
        <div className="border border-gray-300">
          <div className="bg-[#004899]/5 font-bold text-[8px] text-[#004899] px-2 py-0.5 border-b border-gray-300 flex justify-between">
            <span>EQUIPAMENTOS MOBILIZADOS</span>
            <span className="text-gray-400">(resumo)</span>
          </div>
          <div className="text-[8px] divide-y divide-gray-200">
            <div className="flex justify-between p-1">
              <span>Equipamentos Próprios / Locados</span>
              <span className="font-bold font-mono">{report.equipamentosSummary.proptiosLocados}</span>
            </div>
            <div className="flex justify-between p-1">
              <span>Equipamentos de Subcontratados</span>
              <span className="font-bold font-mono">{report.equipamentosSummary.subcontratados}</span>
            </div>
            <div className="flex justify-between p-1 bg-gray-50 font-bold text-[#004899]">
              <span>TOTAL EQUIPAMENTOS</span>
              <span className="font-mono">{report.equipamentosSummary.totalEquipamentos}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ATIVIDADES EXECUTADAS (PRIMEIRO BLOCO) */}
      <div className="mt-1">
        <h3 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
          ATIVIDADES EXECUTADAS NO PERÍODO — FASES DE CAMPO
        </h3>

        <div className="mt-1 border border-gray-300 divide-y divide-gray-200 bg-white">
          {firstActivitiesBatch.length > 0 ? (
            firstActivitiesBatch.map((act, idx) => renderActivityCard(act, idx))
          ) : (
            <div className="p-3 text-center text-gray-400 italic text-[8px]">
              Nenhuma atividade de campo informada neste relatório.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // PAGE CONTINUATION FOR REMAINING ATIVIDADES & FATOS RELEVANTES
  if (remainingActivities.length > 0 || (report.fatosRelevantes && report.fatosRelevantes.length > 0)) {
    // Dynamic chunking based on activity card height estimation
    const activityChunks: Activity[][] = [];
    let currentActChunk: Activity[] = [];
    let currentChunkHeight = 0;

    remainingActivities.forEach((act) => {
      const hasImgs = Boolean(act.imagens && act.imagens.length > 0);
      const estimatedHeight = hasImgs ? 320 : 120;

      if (currentActChunk.length > 0 && (currentChunkHeight + estimatedHeight > 620)) {
        activityChunks.push(currentActChunk);
        currentActChunk = [act];
        currentChunkHeight = estimatedHeight;
      } else {
        currentActChunk.push(act);
        currentChunkHeight += estimatedHeight;
      }
    });
    if (currentActChunk.length > 0) {
      activityChunks.push(currentActChunk);
    }

    let globalActIndexCounter = firstBatchCount;

    if (activityChunks.length > 0) {
      activityChunks.forEach((chunk, chunkIdx) => {
        const startNum = globalActIndexCounter;
        globalActIndexCounter += chunk.length;

        pages.push(
          <div key={`atividades-cont-${chunkIdx}`} className="flex flex-col gap-3 text-[8.5px]">
            <div>
              <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
                ATIVIDADES EXECUTADAS NO PERÍODO (CONTINUAÇÃO — PARTE {chunkIdx + 2})
              </h4>

              <div className="mt-1 border border-gray-300 divide-y divide-gray-200 bg-white p-1">
                {chunk.map((act, idx) => renderActivityCard(act, startNum + idx))}
              </div>
            </div>
          </div>
        );
      });
    }

    if (report.fatosRelevantes && report.fatosRelevantes.length > 0) {
      pages.push(
        <div key="page-fatos-relevantes" className="flex flex-col gap-3 text-[8.5px]">
          <div>
            <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
              FATOS RELEVANTES — OCORRÊNCIAS EXTRAORDINÁRIAS DO DIA
            </h4>
            <div className="mt-1 border border-gray-300 divide-y divide-gray-200 bg-white">
              {report.fatosRelevantes.map((fato, idx) => (
                <div key={idx} className="p-1.5 flex gap-1.5 items-start text-[8px] text-gray-800">
                  <span className="font-bold text-[#004899]">{(idx + 1).toString().padStart(2, "0")}.</span>
                  <div className="flex-1">
                    <FormattedText text={fato} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }

  // PAGES FOR PARALISAÇÕES (CHUNKED INTO DEDICATED PAGES SO NO TABLE IS EVER CLIPPED)
  const activeParalisacoes = Object.entries(report.paralisacoesDetalhe || {}).filter(([, rowVal]) => {
    const row = rowVal as StoppageDetailRow;
    if (!row) return false;

    if (row.ativo === false) return false;
    if (row.ativo === true) return true;

    const rowAny = row as any;
    const hasHours = Boolean(row.horas && row.horas.length > 0);
    const hasComment = Boolean(row.comentarios && row.comentarios.trim());
    const hasFrentesItems = Boolean(row.frentesItems && row.frentesItems.length > 0);
    const hasLaborItems = Boolean(rowAny.laborItems && rowAny.laborItems.length > 0);
    const hasEquipItems = Boolean(rowAny.equipItems && rowAny.equipItems.length > 0);
    const hasCustomFrentes = Boolean(row.frentes && row.frentes.trim() && row.frentes !== "Todas as frentes");
    const hasTotal = Boolean(row.total && row.total !== "0h" && row.total !== "0");

    return hasHours || hasComment || hasFrentesItems || hasLaborItems || hasEquipItems || hasCustomFrentes || hasTotal;
  });

  if (activeParalisacoes.length > 0) {
    activeParalisacoes.forEach(([catKey, rowVal]) => {
      const row = rowVal as StoppageDetailRow;
      const catLabel = getCategoryLabel(catKey);

      const frentesList = (row.frentesItems && row.frentesItems.length > 0)
        ? row.frentesItems
        : row.frentes && row.frentes.trim()
          ? [{ id: 'f-init-' + catKey, nome: row.frentes }]
          : [];

      // Smart chunking based on total table items (labor + equip) per frente
      const frentesChunks: (typeof frentesList)[] = [];
      let currentFrChunk: typeof frentesList = [];
      let currentFrItemCount = 0;

      frentesList.forEach((f) => {
        const laborCount = f.maoDeObraDescs?.length || 0;
        const equipCount = f.equipamentoDescs?.length || 0;
        const totalItems = Math.max(1, laborCount + equipCount);

        if (currentFrChunk.length > 0 && (currentFrItemCount + totalItems > 10)) {
          frentesChunks.push(currentFrChunk);
          currentFrChunk = [f];
          currentFrItemCount = totalItems;
        } else {
          currentFrChunk.push(f);
          currentFrItemCount += totalItems;
        }
      });
      if (currentFrChunk.length > 0) {
        frentesChunks.push(currentFrChunk);
      }
      if (frentesChunks.length === 0) {
        frentesChunks.push([]);
      }

      frentesChunks.forEach((frenteChunk, chunkIdx) => {
        pages.push(
          <div key={`stoppage-${catKey}-${chunkIdx}`} className="flex flex-col gap-2.5 text-[8.5px]">
            <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide flex justify-between items-center">
              <span>TABELA DETALHADA DE PARALISAÇÕES DO EFETIVO {frentesChunks.length > 1 ? `(PARTE ${chunkIdx + 1})` : ''}</span>
              <span className="text-[8px] font-normal font-mono">Total no dia: {report.paralisacoesSummary.totalHorasParalisadasDia}h</span>
            </h4>

            <div className="border border-gray-300 p-2 space-y-2 bg-white">
              {/* Category Banner */}
              <div className="bg-slate-50 p-2 rounded border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <span className="font-bold text-[8.5px] uppercase text-[#004899] tracking-tight">
                    Paralisação por: <span className="font-extrabold text-blue-900">{catLabel}</span>
                  </span>
                  <span className="font-mono font-bold text-[8.5px] text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                    Duração Total: {row.total || "0h"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[8px]">
                  <span className="font-bold text-gray-700 uppercase shrink-0">Janela de Horas Paralisadas:</span>
                  <div className="flex flex-wrap gap-1">
                    {row.horas && row.horas.length > 0 ? (
                      row.horas.map(h => (
                        <span key={h} className="bg-red-50 text-red-700 border border-red-200 font-mono font-bold px-1.5 py-0.2 rounded text-[7.5px]">
                          {h}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 italic text-[7.5px]">Sem janela de horário informada</span>
                    )}
                  </div>
                </div>

                {row.comentarios && row.comentarios.trim() !== "" && (
                  <div className="text-[7.5px] bg-blue-50/70 border border-blue-200/80 p-1.5 rounded text-blue-900 leading-tight">
                    <span className="font-bold uppercase text-blue-950 mr-1">Nota Explicativa:</span>
                    <FormattedText text={row.comentarios} />
                  </div>
                )}
              </div>

              {/* Frentes */}
              <div>
                <span className="block text-[8px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                  Frentes de Trabalho, Mão de Obra e Equipamentos Parados:
                </span>

                {frenteChunk.length > 0 ? (
                  <div className="space-y-2">
                    {frenteChunk.map((f, fi) => {
                      const laborItems = (f.maoDeObraDescs || []).map(parseItemQty);
                      const equipItems = (f.equipamentoDescs || []).map(parseItemQty);

                      return (
                        <div key={f.id || fi} className="border border-gray-200 rounded text-[7.5px] bg-white overflow-hidden">
                          {/* Header da Frente */}
                          <div className="bg-gray-100 px-2 py-1 font-bold text-gray-800 border-b border-gray-200 flex flex-wrap justify-between items-center gap-1">
                            <span>• {f.nome || "Frente de trabalho"}</span>
                            {f.pqItemDesc && (
                              <span className="text-[7px] text-[#004899] font-mono font-normal">
                                Planilha PQ: {f.pqItemDesc}
                              </span>
                            )}
                          </div>

                          {/* Tabela de Insumos */}
                          <div className="p-1.5 space-y-1.5">
                            {/* Mão de Obra Parada */}
                            {laborItems.length > 0 ? (
                              <div>
                                <span className="block font-bold text-amber-900 text-[7px] uppercase mb-0.5">
                                  Mão de Obra Parada:
                                </span>
                                <table className="w-full text-left border-collapse border border-amber-200/80">
                                  <thead>
                                    <tr className="bg-amber-50 text-amber-950 font-bold text-[7px] border-b border-amber-200/80">
                                      <th className="p-1 border-r border-amber-200/80">Cargo / Função</th>
                                      <th className="p-1 w-24 text-center">Quantidade Parada</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-amber-100 text-gray-800">
                                    {laborItems.map((itm, lIdx) => (
                                      <tr key={lIdx} className="hover:bg-amber-50/30">
                                        <td className="p-1 border-r border-amber-200/60 font-medium">{itm.desc}</td>
                                        <td className="p-1 text-center font-bold font-mono text-amber-950">{itm.qtd} colabs</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-[7px] block">Sem especificação de mão de obra parada para esta frente.</span>
                            )}

                            {/* Equipamentos Parados */}
                            {equipItems.length > 0 && (
                              <div>
                                <span className="block font-bold text-sky-900 text-[7px] uppercase mb-0.5">
                                  Equipamentos Parados:
                                </span>
                                <table className="w-full text-left border-collapse border border-sky-200/80">
                                  <thead>
                                    <tr className="bg-sky-50 text-sky-950 font-bold text-[7px] border-b border-sky-200/80">
                                      <th className="p-1 border-r border-sky-200/80">Equipamento</th>
                                      <th className="p-1 w-24 text-center">Quantidade Parada</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-sky-100 text-gray-800">
                                    {equipItems.map((itm, eIdx) => (
                                      <tr key={eIdx} className="hover:bg-sky-50/30">
                                        <td className="p-1 border-r border-sky-200/60 font-medium">{itm.desc}</td>
                                        <td className="p-1 text-center font-bold font-mono text-sky-950">{itm.qtd} un</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-400 italic text-[7.5px] p-1 bg-gray-50 rounded border border-gray-200">
                    Todas as frentes de trabalho afetadas.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      });
    });
  }

  // PAGE FOR CLIMATE & RAIN CHARTS
  pages.push(
    <div key="page-climate" className="flex flex-col gap-2.5 text-[8.5px]">
      <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
        CONDIÇÕES CLIMÁTICAS & ÍNDICE PLUVIOMÉTRICO (CHUVA MM)
      </h4>
      
      {/* Rain summarizes text row */}
      <div className="border border-gray-300 p-1.5 grid grid-cols-6 gap-2 text-[8px] text-gray-600 bg-white leading-tight">
        <div>Manhã: <strong className="text-gray-800 font-mono">{report.precipitacao.manha} mm</strong></div>
        <div>Tarde: <strong className="text-gray-800 font-mono">{report.precipitacao.tarde} mm</strong></div>
        <div>Noite: <strong className="text-gray-800 font-mono">{report.precipitacao.noite} mm</strong></div>
        <div>Total Período: <strong className="text-blue-700 font-mono">{report.precipitacao.total} mm</strong></div>
        <div>Acumulado Mês: <strong className="text-gray-800 font-mono">{report.precipitacao.acumuladoMes} mm</strong></div>
        <div>Mês Anterior: <strong className="text-gray-800 font-mono">{report.precipitacao.acumuladoMesAnterior} mm</strong></div>
      </div>

      {/* Vector Rainfall charts */}
      <div className="grid grid-cols-1 gap-2">
        <div className="bg-white border border-gray-200 rounded p-1">
          <p className="text-[7.5px] uppercase font-bold text-gray-400 text-center mb-1">CÁLCULO E ANÁLISE DE CHUVA - DIÁRIO ACUMULADO NO MÊS</p>
          <RainChart labels={monthlyRainLabels} values={monthlyRainValues} />
        </div>
        <div className="bg-white border border-gray-200 rounded p-1">
          <p className="text-[7.5px] uppercase font-bold text-gray-400 text-center mb-1">CÁLCULO E ANÁLISE DE CHUVA - MENSAL ACUMULADO NO ANO</p>
          <RainChart labels={yearlyRainLabels} values={yearlyRainValues} />
        </div>
      </div>

      {/* ACCIDENTS EXTENDED NOTE */}
      <div className="border border-gray-300 p-1 flex justify-between bg-yellow-50/20 text-[7.5px] mt-1">
        <span className="font-bold text-gray-600 uppercase">INFORMAÇÕES DE SEGURANÇA (ACIDENTES):</span>
        <span className="font-bold text-emerald-700 italic">
          {report.acidentes.comAfastamentoDia === 0 && report.acidentes.semAfastamentoDia === 0 
            ? "NENHUMA OCORRÊNCIA DE ACIDENTE JUNTADA NESTE RDO DO DIA." 
            : "OCORRÊNCIA DE ACIDENTE REGISTRADA NO SISTEMA."}
        </span>
      </div>
    </div>
  );

  // PAGE FOR EFETIVO & EQUIPAMENTOS MOBILIZADOS (INTELLIGENTLY CHUNKED TO PREVENT OVERFLOW)
  const efetivoGroups = report.efetivoDetalhado || [];
  const equipItemsAll = report.equipamentosDetalhado || [];

  // Helper to chunk an array
  function chunkArray<T>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    );
  }

  // 1. Process Efetivo Groups into page blocks
  let hasMergedEquip = false;

  if (efetivoGroups.length > 0) {
    // Process each group, breaking large item lists into sub-chunks of max 12 items
    type EfetivoSubGroup = {
      id: string;
      groupName: string;
      items: typeof efetivoGroups[0]['items'];
      isFirstPart: boolean;
      isLastPart: boolean;
      totalC: number;
      totalF: number;
      totalA: number;
      totalT: number;
      partIndex: number;
      totalParts: number;
    };

    const subGroups: EfetivoSubGroup[] = [];

    efetivoGroups.forEach((group) => {
      const totalC = group.items.reduce((sum, item) => sum + (item.c || 0), 0);
      const totalF = group.items.reduce((sum, item) => sum + (item.f || 0), 0);
      const totalA = group.items.reduce((sum, item) => sum + (item.a || 0), 0);
      const totalT = group.items.reduce((sum, item) => sum + (item.t || 0), 0);

      const itemChunks = chunkArray(group.items, 12);
      itemChunks.forEach((chk, cIdx) => {
        subGroups.push({
          id: `${group.id}-part-${cIdx}`,
          groupName: group.nome,
          items: chk,
          isFirstPart: cIdx === 0,
          isLastPart: cIdx === itemChunks.length - 1,
          totalC,
          totalF,
          totalA,
          totalT,
          partIndex: cIdx + 1,
          totalParts: itemChunks.length,
        });
      });
    });

    // Group subGroups into page chunks where total items <= 14 per page
    const efetivoPageChunks: EfetivoSubGroup[][] = [];
    let currentEfChunk: EfetivoSubGroup[] = [];
    let currentEfItemCount = 0;

    subGroups.forEach((sg) => {
      if (currentEfChunk.length > 0 && (currentEfItemCount + sg.items.length > 14)) {
        efetivoPageChunks.push(currentEfChunk);
        currentEfChunk = [sg];
        currentEfItemCount = sg.items.length;
      } else {
        currentEfChunk.push(sg);
        currentEfItemCount += sg.items.length;
      }
    });
    if (currentEfChunk.length > 0) {
      efetivoPageChunks.push(currentEfChunk);
    }

    // Render Efetivo pages
    efetivoPageChunks.forEach((efChunk, pIdx) => {
      const totalPageItems = efChunk.reduce((sum, sg) => sum + sg.items.length, 0);
      const isLastEfetivoPage = pIdx === efetivoPageChunks.length - 1;

      // Check if we can fit small Equipamentos table on this last Efetivo page
      const canIncludeEquip = isLastEfetivoPage && equipItemsAll.length > 0 && totalPageItems <= 6 && equipItemsAll.length <= 6;
      if (canIncludeEquip) {
        hasMergedEquip = true;
      }

      pages.push(
        <div key={`page-efetivo-${pIdx}`} className="flex flex-col gap-3 text-[8.5px]">
          {/* EFETIVO - QUADRO DETALHADO */}
          <div>
            <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide flex justify-between items-center">
              <span>EFETIVO — QUADRO DETALHADO DO PESSOAL DE CAMPO {efetivoPageChunks.length > 1 ? `(PARTE ${pIdx + 1} DE ${efetivoPageChunks.length})` : ''}</span>
              <span className="text-[7.5px] font-normal font-mono">Página {pIdx + 1}</span>
            </h4>
            <p className="text-[6.5px] text-gray-400 italic mb-1 uppercase tracking-tight">
              Legenda: C - Cadastrados em Folha; F - Faltas no dia; A - Atestados Médicos; T - Total Geral Presente
            </p>

            <div className="space-y-2 border border-gray-300 p-1 bg-gray-50/50">
              {efChunk.map((sg) => (
                <div key={sg.id} className="bg-white border border-gray-200">
                  <div className="bg-[#004899]/10 p-1 flex justify-between font-bold text-xs text-[#004899]">
                    <span>
                      {sg.groupName} {sg.totalParts > 1 ? `(Item ${sg.items[0]?.id ? '' : ''}${sg.partIndex}/${sg.totalParts})` : ''}
                    </span>
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
                      {sg.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-1 border-r border-gray-200 font-medium text-gray-800">{item.cargo}</td>
                          <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-500">{item.moiMod}</td>
                          <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-700">{item.c}</td>
                          <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-700">{item.f}</td>
                          <td className="p-1 border-r border-gray-200 text-center font-mono text-gray-700">{item.a}</td>
                          <td className="p-1 text-center font-mono font-bold bg-gray-50 text-gray-800">{item.t}</td>
                        </tr>
                      ))}
                      {sg.isLastPart && (
                        <tr className="bg-gray-50/70 border-t border-gray-300 font-bold">
                          <td className="p-1 border-r border-gray-200 text-right pr-2 uppercase">TOTAL {sg.groupName}</td>
                          <td className="p-1 border-r border-gray-200"></td>
                          <td className="p-1 border-r border-gray-200 text-center font-mono">{sg.totalC}</td>
                          <td className="p-1 border-r border-gray-200 text-center font-mono">{sg.totalF}</td>
                          <td className="p-1 border-r border-gray-200 text-center font-mono">{sg.totalA}</td>
                          <td className="p-1 text-center font-mono text-blue-900 bg-blue-50">{sg.totalT}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          {/* EQUIPAMENTOS INCLUDED ON LAST EFETIVO PAGE IF SMALL */}
          {canIncludeEquip && (
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
                    {equipItemsAll.map((eq, eIdx) => (
                      <tr key={eq.id || eIdx} className="hover:bg-slate-50">
                        <td className="p-1 text-center border-r border-gray-200 text-gray-400 font-mono">
                          {(eIdx + 1).toString().padStart(2, "0")}
                        </td>
                        <td className="p-1 px-2 border-r border-gray-200 font-medium text-gray-800">{eq.descricao}</td>
                        <td className="p-1 border-r border-gray-200 text-gray-600">{eq.empresa}</td>
                        <td className="p-1 text-center font-bold font-mono text-gray-800">{eq.quantidade}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold text-gray-800 border-t border-gray-300">
                      <td className="p-1 border-r border-gray-200"></td>
                      <td className="p-1 px-2 border-r border-gray-200 text-right uppercase text-[7.5px]">TOTAL EQUIPAMENTOS MOBILIZADOS</td>
                      <td className="p-1 border-r border-gray-200"></td>
                      <td className="p-1 text-center font-mono text-blue-900 bg-blue-50/50">
                        {equipItemsAll.reduce((sum, eq) => sum + (eq.quantidade || 0), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    });
  }

  // 2. Process Equipamentos on dedicated pages if not already merged into last Efetivo page
  if (equipItemsAll.length > 0 && !hasMergedEquip) {
    const equipChunks = chunkArray(equipItemsAll, 14);

    equipChunks.forEach((chk, eqPIdx) => {
      const isLastEquipChunk = eqPIdx === equipChunks.length - 1;
      const totalEquipQty = equipItemsAll.reduce((sum, eq) => sum + (eq.quantidade || 0), 0);

      pages.push(
        <div key={`page-equip-${eqPIdx}`} className="flex flex-col gap-3 text-[8.5px]">
          <div>
            <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide flex justify-between items-center">
              <span>EQUIPAMENTOS MOBILIZADOS — DETALHAMENTO DE EQUIPAMENTO MECÂNICO {equipChunks.length > 1 ? `(PARTE ${eqPIdx + 1} DE ${equipChunks.length})` : ''}</span>
              <span className="text-[7.5px] font-normal font-mono">Total: {totalEquipQty} un</span>
            </h4>
            <div className="border border-gray-300 mt-1">
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
                  {chk.map((eq, eIdx) => {
                    const globalIdx = eqPIdx * 14 + eIdx;
                    return (
                      <tr key={eq.id || eIdx} className="hover:bg-slate-50">
                        <td className="p-1 text-center border-r border-gray-200 text-gray-400 font-mono">
                          {(globalIdx + 1).toString().padStart(2, "0")}
                        </td>
                        <td className="p-1 px-2 border-r border-gray-200 font-medium text-gray-800">{eq.descricao}</td>
                        <td className="p-1 border-r border-gray-200 text-gray-600">{eq.empresa}</td>
                        <td className="p-1 text-center font-bold font-mono text-gray-800">{eq.quantidade}</td>
                      </tr>
                    );
                  })}
                  {isLastEquipChunk && (
                    <tr className="bg-gray-50 font-bold text-gray-800 border-t border-gray-300">
                      <td className="p-1 border-r border-gray-200"></td>
                      <td className="p-1 px-2 border-r border-gray-200 text-right uppercase text-[7.5px]">TOTAL EQUIPAMENTOS MOBILIZADOS</td>
                      <td className="p-1 border-r border-gray-200"></td>
                      <td className="p-1 text-center font-mono text-blue-900 bg-blue-50/50">
                        {totalEquipQty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    });
  }



  // PAGE FOR COMMENTS (IF APPLICABLE)
  if ((report.comentariosGerenciadoraContratante && report.comentariosGerenciadoraContratante.length > 0) || (report.comentariosContratada && report.comentariosContratada.length > 0)) {
    pages.push(
      <div key="page-comments" className="flex flex-col gap-3 text-[8.5px]">
        <div>
          <h4 className="text-[9px] font-bold bg-[#004899] text-white py-0.5 px-2 uppercase tracking-wide">
            COMENTÁRIO DA FISCALIZAÇÃO / GERENCIADORA / CONTRATANTE
          </h4>
          <div className="border border-gray-300 p-2 min-h-14 bg-white flex flex-col gap-1 text-[8.5px]">
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

        {report.comentariosContratada && report.comentariosContratada.length > 0 && (
          <div className="mt-1.5">
            <h4 className="text-[9px] font-bold bg-amber-700 text-white py-0.5 px-2 uppercase tracking-wide">
              COMENTÁRIOS / RESPOSTA DA CONTRATADA (SEEL ENGENHARIA)
            </h4>
            <div className="border border-gray-300 p-2 min-h-10 bg-white flex flex-col gap-1 text-[8.5px]">
              {report.comentariosContratada.map((comm, idx) => (
                <div key={idx} className="flex gap-1 items-start text-gray-800 leading-tight">
                  <span className="text-amber-800 font-bold">{(idx + 1).toString().padStart(3, "0")} -</span>
                  <p className="flex-1 italic font-medium">{comm}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // PAGES FOR ANEXOS DOCUMENTAIS
  if (report.anexos && report.anexos.length > 0) {
    const numPages = Math.ceil(report.anexos.length / 2);
    for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
      const sliceAnexos = report.anexos.slice(pageIdx * 2, pageIdx * 2 + 2);
      pages.push(
        <div key={`anexo-page-${pageIdx}`} className="flex flex-col gap-3.5 text-[8.5px]">
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
      );
    }
  }

  const totalPages = pages.length;

  return (
    <div className="flex flex-col gap-6 print:gap-0 bg-transparent print:bg-white mb-6 print:mb-0">
      {pages.map((pageContent, idx) => (
        <div
          key={idx}
          className="bg-white border md:border-gray-300 p-4 md:p-8 flex flex-col w-full min-h-[1120px] print-page relative shadow-sm print:shadow-none print:border-none box-sizing:border-box"
        >
          <PrintHeader />
          <div className="mt-2 text-[8.5px] flex flex-col flex-1 pb-28">
            {pageContent}
          </div>
          <PrintFooter pageNum={idx + 1} totalPages={totalPages} />
        </div>
      ))}
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
              className="p-1 text-slate-500 hover:text-slate-850 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
