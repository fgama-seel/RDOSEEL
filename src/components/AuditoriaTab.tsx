import React, { useEffect, useState } from "react";
import { Activity, Clock, User, ShieldAlert, Download } from "lucide-react";
import { useRdoStore } from "../context/RdoContext";
import { AuditLog } from "../types";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const AuditoriaTab: React.FC = () => {
  const { getAuditLogs, isGlobalAdmin } = useRdoStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isGlobalAdmin) {
      loadLogs();
    }
  }, [isGlobalAdmin]);

  const loadLogs = async () => {
    setIsLoading(true);
    const result = await getAuditLogs();
    setLogs(result);
    setIsLoading(false);
  };

  const handleExportExcel = () => {
    if (logs.length === 0) return;

    const dataToExport = logs.map(log => ({
      Data: new Date(log.timestamp).toLocaleString("pt-BR"),
      Ação: log.action,
      Usuário: log.userEmail,
      Detalhes: log.details
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoria");

    // Formatar colunas
    const wscols = [
      { wch: 20 }, // Data
      { wch: 15 }, // Ação
      { wch: 25 }, // Usuário
      { wch: 60 }  // Detalhes
    ];
    worksheet["!cols"] = wscols;

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    saveAs(data, `RDO_Auditoria_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isGlobalAdmin) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-slate-800">Acesso Negado</h2>
        <p className="text-sm text-slate-500">Você não tem permissão para acessar a área de auditoria.</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden flex flex-col font-sans animate-fade-in">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 text-indigo-700">
          <Activity className="w-5 h-5" />
          <h2 className="font-bold uppercase tracking-wider text-sm">Auditoria do Sistema</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={logs.length === 0}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-emerald-600 border border-emerald-700 rounded shadow-xs hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar para Excel"
          >
            <Download className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            onClick={loadLogs}
            className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-300 rounded shadow-xs hover:bg-slate-50 text-slate-700 transition-colors"
          >
            Atualizar
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Activity className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Nenhum log de auditoria encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={log.id || i} className="flex gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="shrink-0 mt-1 text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-800">
                      {log.action}
                    </p>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 break-words">
                    {log.details}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-400">
                    <User className="w-3 h-3" />
                    {log.userEmail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
