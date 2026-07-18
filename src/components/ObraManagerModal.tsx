import React, { useState, useEffect } from "react";
import { useRdoStore } from "../context/RdoContext";
import { ObraConfig, ObraActivity, ObraPermission } from "../types";
import { compressImage } from "../utils/imageUtils";
import { 
  X, 
  Plus, 
  Trash2, 
  Briefcase, 
  Save, 
  Calendar, 
  Upload, 
  Image as ImageIcon,
  Users, 
  Hash, 
  Layers,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  Download
} from "lucide-react";

interface ObraManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ObraManagerModal: React.FC<ObraManagerModalProps> = ({ isOpen, onClose }) => {
  const { obras, saveObra, deleteObra, currentObra, setCurrentObra, user } = useRdoStore();

  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [numeroContrato, setNumeroContrato] = useState("");
  const [cliente, setCliente] = useState("");
  const [contratada, setContratada] = useState("SEEL SERVIÇOS DE ENGENHARIA LTDA");
  const [gerenciadora, setGerenciadora] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [prazoContratual, setPrazoContratual] = useState<number>(0);
  const [aditivoPrazo, setAditivoPrazo] = useState<number>(0);
  const [logoCliente, setLogoCliente] = useState<string | undefined>(undefined);
  const [logoSeel, setLogoSeel] = useState<string | undefined>(undefined);
  const [atividades, setAtividades] = useState<ObraActivity[]>([]);
  const [subcontratadas, setSubcontratadas] = useState<string[]>([]);
  const [permissoes, setPermissoes] = useState<ObraPermission[]>([]);

  // Default signers per Obra
  const [emissorNomeDefault, setEmissorNomeDefault] = useState("");
  const [fiscalGerenciadoraNomeDefault, setFiscalGerenciadoraNomeDefault] = useState("");
  const [fiscalAprovadorNomeDefault, setFiscalAprovadorNomeDefault] = useState("");

  // Subcontractor temp field
  const [newSub, setNewSub] = useState("");
  
  // Permission temp fields
  const [newPermEmail, setNewPermEmail] = useState("");
  const [newPermAccess, setNewPermAccess] = useState<"view" | "edit" | "fiscalizacao" | "gerenciadora">("view");

  // Activity temp fields
  const [newActRef, setNewActRef] = useState("");
  const [newActFase, setNewActFase] = useState("");
  const [newActIdentificador, setNewActIdentificador] = useState("");
  const [newActDescricao, setNewActDescricao] = useState("");
  const [newActUnidade, setNewActUnidade] = useState("m³");

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Load selected Obra into form
  useEffect(() => {
    if (selectedObraId === "new") {
      // Clear form for new Obra
      setNome("");
      setNumeroContrato("");
      setCliente("");
      setContratada("SEEL SERVIÇOS DE ENGENHARIA LTDA");
      setGerenciadora("");
      setDataInicio(new Date().toISOString().split("T")[0]);
      setPrazoContratual(365);
      setAditivoPrazo(0);
      setLogoCliente(undefined);
      setLogoSeel(undefined);
      setAtividades([]);
      setSubcontratadas([]);
      setPermissoes([]);
      setEmissorNomeDefault("");
      setFiscalGerenciadoraNomeDefault("");
      setFiscalAprovadorNomeDefault("");
    } else {
      const idx = obras.find(o => o.id === selectedObraId);
      if (idx) {
        setNome(idx.nome || "");
        setNumeroContrato(idx.numeroContrato || "");
        setCliente(idx.cliente || "");
        setContratada(idx.contratada || "SEEL SERVIÇOS DE ENGENHARIA LTDA");
        setGerenciadora(idx.gerenciadora || "");
        setDataInicio(idx.dataInicio || "");
        setPrazoContratual(idx.prazoContratual || 0);
        setAditivoPrazo(idx.aditivoPrazo || 0);
        setLogoCliente(idx.logoCliente);
        setLogoSeel(idx.logoSeel);
        setAtividades(idx.atividades || []);
        setSubcontratadas(idx.subcontratadas || []);
        setPermissoes(idx.permissoes || []);
        setEmissorNomeDefault(idx.emissorNomeDefault || "");
        setFiscalGerenciadoraNomeDefault(idx.fiscalGerenciadoraNomeDefault || "");
        setFiscalAprovadorNomeDefault(idx.fiscalAprovadorNomeDefault || "");
      } else if (obras.length > 0) {
        setSelectedObraId(obras[0].id || "");
      }
    }
  }, [selectedObraId, obras]);

  // Set initial selected Obra
  useEffect(() => {
    if (isOpen && obras.length > 0 && !selectedObraId) {
      setSelectedObraId(obras[0].id || "");
    }
  }, [isOpen, obras, selectedObraId]);

  if (!isOpen) return null;

  // Image upload to base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "cliente" | "seel") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem selecionada é muito grande (> 5MB). Por favor, escolha uma imagem menor.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const compressed = await compressImage(base64, 512, 512, 0.8);
      if (target === "cliente") {
        setLogoCliente(compressed);
      } else {
        setLogoSeel(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  // Download XLS template
  const handleDownloadTemplate = () => {
    try {
      import("xlsx").then((XLSX) => {
        const data = [
          ["Referencia", "Fase", "CodigoDP", "Descricao", "Unidade"],
          ["001", "ATIVIDADES - FASE 01 - REDE EXTERNA", "3.2", "Demolicao manual concreto armado (pilar / viga / laje)", "m³"],
          ["002", "ATIVIDADES - FASE 01 - REDE EXTERNA", "3.6", "Aterro apiloado (manual) em camadas de 20 cm", "m³"],
          ["003", "ATIVIDADES - GERÊNCIA", "1.1", "Engenheiro ou Arquiteto auxiliar/júnior de obra", "un"],
          ["004", "ATIVIDADES - FASE 12 - COND. REAL PARK", "3.4", "Demolição de lastro de concreto simples", "m³"],
          ["005", "ATIVIDADES - ADMINISTRAÇÃO CONTRATUAL", "4.2", "Concreto magro E=5cm, preparo com betoneira", "m²"]
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo_PQ_SEEL");
        XLSX.writeFile(workbook, "Modelo_Planilha_PQ_SEEL.xlsx");
      }).catch(err => {
        alert("Erro ao carregar o gerador de planilhas Excel.");
        console.error(err);
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar modelo excel.");
    }
  };

  // Parsing uploaded file
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        import("xlsx").then((XLSX) => {
          const bstr = evt.target?.result;
          const workbook = XLSX.read(bstr, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (rows.length <= 1) {
            alert("A planilha está vazia ou não possui cabeçalhos.");
            return;
          }

          const headers = rows[0].map((h: any) => 
            String(h || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          );

          const refIdx = headers.findIndex((h: string) => h.includes("ref") || h.includes("item"));
          const faseIdx = headers.findIndex((h: string) => h.includes("fas") || h.includes("grup"));
          const codIdx = headers.findIndex((h: string) => h.includes("cod") || h.includes("ident"));
          const descIdx = headers.findIndex((h: string) => h.includes("desc") || h.includes("serv") || h.includes("ativ"));
          const uniIdx = headers.findIndex((h: string) => h.includes("uni") || h.includes("und"));

          const finalRefIdx = refIdx !== -1 ? refIdx : 0;
          const finalFaseIdx = faseIdx !== -1 ? faseIdx : 1;
          const finalCodIdx = codIdx !== -1 ? codIdx : 2;
          const finalDescIdx = descIdx !== -1 ? descIdx : 3;
          const finalUniIdx = uniIdx !== -1 ? uniIdx : 4;

          const parsedActivities: ObraActivity[] = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const rawRef = String(row[finalRefIdx] || `idx-${i}`).trim();
            const rawFase = String(row[finalFaseIdx] || "FASE GERAL").trim().toUpperCase();
            const rawCod = String(row[finalCodIdx] || "").trim();
            const rawDesc = String(row[finalDescIdx] || "").trim();
            const rawUni = String(row[finalUniIdx] || "un").trim();

            if (!rawDesc) continue;

            parsedActivities.push({
              id: "xlsx-" + Math.random().toString(36).substr(2, 9),
              ref: rawRef,
              fase: rawFase,
              identificador: rawCod,
              descricao: rawDesc,
              unidade: rawUni
            });
          }

          if (parsedActivities.length === 0) {
            alert("Nenhum item de atividade válido foi localizado na planilha. Altere as colunas.");
            return;
          }

          const confirmAppend = window.confirm(
            `Carregamos ${parsedActivities.length} atividades da sua planilha.\n\nClique em [OK/Confirmar] para ADICIONAR ao catálogo atual de ${atividades.length} itens.\nClique em [Cancelar] para SUBSTITUIR o catálogo atual existente.`
          );

          if (confirmAppend) {
            setAtividades(prev => [...prev, ...parsedActivities]);
          } else {
            setAtividades(parsedActivities);
          }

          setMessage({ 
            text: `Importado ${parsedActivities.length} itens da planilha excel com sucesso! Lembre-se de clicar no botão "Salvar Alterações" no rodapé para consolidar!`, 
            type: "success" 
          });
        });
      } catch (err: any) {
        alert("Erro ao ler dados do arquivo: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const calculateEndDate = (start: string, duration: number, extra: number): string => {
    if (!start) return "-";
    try {
      const date = new Date(start + "T12:00:00");
      const totalDays = Number(duration || 0) + Number(extra || 0);
      date.setDate(date.getDate() + totalDays);
      return date.toLocaleDateString("pt-BR");
    } catch {
      return "-";
    }
  };

  // Add temp lists actions
  const handleAddSubcontratada = () => {
    if (!newSub.trim()) return;
    if (subcontratadas.includes(newSub.trim())) {
      alert("Subcontratada já cadastrada.");
      return;
    }
    setSubcontratadas([...subcontratadas, newSub.trim()]);
    setNewSub("");
  };

  const handleRemoveSubcontratada = (name: string) => {
    setSubcontratadas(subcontratadas.filter(s => s !== name));
  };

  const handleAddPermission = () => {
    if (!newPermEmail.trim()) return;
    const emailLower = newPermEmail.trim().toLowerCase();
    
    // Simple email regex validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      alert("Formato de e-mail inválido.");
      return;
    }

    if (permissoes.some(p => p?.email?.toLowerCase() === emailLower)) {
      alert("Este e-mail já possui permissão configurada nesta obra.");
      return;
    }

    setPermissoes([...permissoes, { email: emailLower, access: newPermAccess }]);
    setNewPermEmail("");
  };

  const handleRemovePermission = (email: string) => {
    setPermissoes(permissoes.filter(p => p.email !== email));
  };

  const handleAddActivity = () => {
    if (!newActDescricao.trim() || !newActIdentificador.trim()) {
      alert("Por favor, preencha o Identificador (Código DP/PQ) e a Descrição da atividade.");
      return;
    }

    const newActivity: ObraActivity = {
      id: "act-cfg-" + Math.random().toString(36).substr(2, 9),
      ref: newActRef.trim() || (atividades.length + 1).toString().padStart(3, "0"),
      fase: newActFase.trim() || "ATUACAO GERAL",
      identificador: newActIdentificador.trim(),
      descricao: newActDescricao.trim(),
      unidade: newActUnidade
    };

    setAtividades([...atividades, newActivity]);
    setNewActRef("");
    setNewActFase("");
    setNewActIdentificador("");
    setNewActDescricao("");
    setNewActUnidade("m³");
  };

  const handleRemoveActivity = (id: string) => {
    setAtividades(atividades.filter(a => a.id !== id));
    setMessage({ 
      text: "Atividade removida localmente. Clique em 'Salvar Alterações' para confirmar definitivamente.", 
      type: "success" 
    });
  };

  // Save the full Obra details
  const handleSaveObraConfig = async () => {
    if (!nome.trim() || !cliente.trim() || !contratada.trim() || !gerenciadora.trim()) {
      setMessage({ text: "Nome da Obra, Cliente, Contratada (SEEL) e Gerenciadora são campos obrigatórios.", type: "error" });
      return;
    }

    const obraData: ObraConfig = {
      id: selectedObraId === "new" ? undefined : selectedObraId,
      userId: user?.uid || "demo-user",
      nome: nome.trim().toUpperCase(),
      numeroContrato: numeroContrato.trim(),
      cliente: cliente.trim().toUpperCase(),
      contratada: contratada.trim().toUpperCase(),
      gerenciadora: gerenciadora.trim().toUpperCase(),
      dataInicio,
      prazoContratual: Number(prazoContratual || 0),
      aditivoPrazo: Number(aditivoPrazo || 0),
      logoCliente,
      logoSeel,
      subcontratadas,
      permissoes,
      atividades,
      
      // Signers Default Names
      emissorNomeDefault: emissorNomeDefault.trim(),
      fiscalGerenciadoraNomeDefault: fiscalGerenciadoraNomeDefault.trim(),
      fiscalAprovadorNomeDefault: fiscalAprovadorNomeDefault.trim()
    };

    try {
      await saveObra(obraData);
      setMessage({ text: "Configuração da obra gravada com sucesso!", type: "success" });
      setTimeout(() => setMessage(null), 3500);
      if (selectedObraId === "new") {
        setSelectedObraId(obras[0]?.id || "");
      }
    } catch (e: any) {
      setMessage({ text: "Falha ao gravar os dados: " + (e.message || e), type: "error" });
    }
  };

  const handleDeleteObraClick = async () => {
    if (selectedObraId === "new") return;
    if (obras.length <= 1) {
      alert("Não é possível remover a única obra ativa do sistema.");
      return;
    }
    const confirm = window.confirm(`Tem certeza que deseja excluir as configurações da obra "${nome}"? RDOs vinculados a este código continuarão salvos, mas perderão a referência de dados.`);
    if (confirm) {
      try {
        await deleteObra(selectedObraId);
        setSelectedObraId(obras[0]?.id || "");
        setMessage({ text: "Obra excluída com sucesso.", type: "success" });
        setTimeout(() => setMessage(null), 3000);
      } catch (e: any) {
        alert("Erro ao remover obra: " + e.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Navbar Header */}
        <header className="bg-slate-900 text-white h-14 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-sm tracking-wide">PAINEL DE CONFIGURAÇÕES DE OBRAS</h3>
              <p className="text-[10px] text-slate-400">Contratos, cadastros de atividades (PQ), logotipos e permissões de acesso</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-1.5 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Modal Workspace Grid */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Work Selector Sidebar */}
          <aside className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4 flex flex-col gap-3 shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Selecionar Obra</span>
            
            <select
              value={selectedObraId}
              onChange={(e) => setSelectedObraId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-amber-500"
            >
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
              <option value="new">+ Cadastrar Nova Obra</option>
            </select>

            <div className="border-t border-slate-200 pt-3 mt-1 flex flex-col gap-1 text-[11px] text-slate-500">
              <p className="font-semibold text-slate-700">Dica profissional:</p>
              <p className="leading-relaxed">Preencha o catálogo da obra (atividades e subcontratadas) para que, na criação de diários novos, o sistema complete as tabelas automaticamente sem re-digitar nada.</p>
            </div>

            {selectedObraId !== "new" && (
              <button
                onClick={handleDeleteObraClick}
                className="w-full mt-auto py-1 px-2 border border-red-200 text-red-600 rounded bg-red-50 hover:bg-red-100 transition-colors text-xs font-bold leading-none flex items-center justify-center gap-1.5 p-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remover Obra
              </button>
            )}
          </aside>

          {/* Form Editing Workspace Scroll Container */}
          <main className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {message && (
              <div className={`p-3 rounded text-xs font-bold flex gap-2 items-center ${
                message.type === "success" 
                  ? "bg-green-50 border border-green-200 text-green-700" 
                  : "bg-red-50 border border-red-200 text-red-750"
              }`}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {message.text}
              </div>
            )}

            {/* SECT 1: GENERAL METADATA */}
            <section className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                1. Informações Gerais do Contrato
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 font-sans">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Nome Completo da Obra *</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: ADUTORA DE AGUA TRATADA MOOCA"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Número do Contrato</label>
                  <input
                    type="text"
                    value={numeroContrato}
                    onChange={(e) => setNumeroContrato(e.target.value)}
                    placeholder="Ex: CT-2023/12"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Cliente Contratante *</label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Ex: SABESP / COMGÁS"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Empresa Contratada *</label>
                  <input
                    type="text"
                    value={contratada}
                    onChange={(e) => setContratada(e.target.value)}
                    placeholder="Ex: SEEL SERVIÇOS DE ENGENHARIA LTDA"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none font-bold text-slate-700"
                  />
                </div>

                <div className="space-y-1 col-span-1 md:col-span-2">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Gerenciadora Fiscal *</label>
                  <input
                    type="text"
                    value={gerenciadora}
                    onChange={(e) => setGerenciadora(e.target.value)}
                    placeholder="Ex: CONSÓRCIO SEEL"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </section>

            {/* SECT 2: TIMELINES AND DEADLINES */}
            <section className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                2. Datas de Vigência e Prazos Contratuais
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Data de Início *</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Prazo Contratual (Dias)</label>
                  <input
                    type="number"
                    value={prazoContratual}
                    onChange={(e) => setPrazoContratual(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Aditivo de Prazo (Dias)</label>
                  <input
                    type="number"
                    value={aditivoPrazo}
                    onChange={(e) => setAditivoPrazo(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="bg-slate-100/80 border rounded p-2.5 text-center flex flex-col justify-center h-[34px] leading-none">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">Final Previsto</span>
                  <span className="text-xs font-mono font-bold text-slate-700 block">
                    {calculateEndDate(dataInicio, prazoContratual, aditivoPrazo)}
                  </span>
                </div>
              </div>
            </section>

            {/* SECT 3: SIGNATÁRIOS E RESPONSÁVEIS DE ASSINATURA */}
            <section className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <Users className="w-4 h-4 text-sky-600" />
                3. Responsáveis pelas Assinaturas Digitais do RDO
              </h4>
              <p className="text-[10px] text-slate-500 leading-normal uppercase font-bold">
                Configure os nomes oficiais que aparecerão nos RDOs desta obra para as três vias de assinaturas digitais.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Nome do Engenheiro Emissor (Contratada)</label>
                  <input
                    type="text"
                    value={emissorNomeDefault}
                    onChange={(e) => setEmissorNomeDefault(e.target.value)}
                    placeholder="Ex: Engenheiro Fulano de Tal"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Nome do Fiscal da Gerenciadora</label>
                  <input
                    type="text"
                    value={fiscalGerenciadoraNomeDefault}
                    onChange={(e) => setFiscalGerenciadoraNomeDefault(e.target.value)}
                    placeholder="Ex: Fiscal Cicrano de Tal"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Nome do Fiscal Aprovador (Contratante)</label>
                  <input
                    type="text"
                    value={fiscalAprovadorNomeDefault}
                    onChange={(e) => setFiscalAprovadorNomeDefault(e.target.value)}
                    placeholder="Ex: Engenheiro Fiscal Sabesp"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none font-medium"
                  />
                </div>
              </div>
            </section>

            {/* SECT 4: LOGO UPLOADS */}
            <section className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                4. Logotipo de Clientes e Engenharia
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* cliente logo */}
                <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-white flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Logo do Cliente (SABESP, etc.)</span>
                  {logoCliente ? (
                    <div className="relative group border p-2 rounded bg-slate-50">
                      <img src={logoCliente} alt="Cliente Logo preview" className="h-12 object-contain" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => setLogoCliente(undefined)}
                        className="absolute -top-1.5 -right-1.5 bg-red-650 text-white rounded-full p-0.5 hover:bg-red-700 shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Upload className="w-6 h-6 mb-1 text-slate-300" />
                      <span className="text-[9px] text-slate-400 font-medium">PNG, JPG, SVG menor que 500KB</span>
                    </div>
                  )}
                  <input
                    type="file"
                    id="client-logo-inp"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, "cliente")}
                    className="hidden"
                  />
                  <label
                    htmlFor="client-logo-inp"
                    className="px-3 py-1 text-[11px] font-bold border rounded bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer text-slate-700 uppercase"
                  >
                    Carregar Arquivo
                  </label>
                </div>

                {/* seel logo */}
                <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-white flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Logo da Engenharia (SEEL / EPC)</span>
                  {logoSeel ? (
                    <div className="relative group border p-2 rounded bg-slate-50">
                      <img src={logoSeel} alt="SEEL Logo preview" className="h-12 object-contain" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => setLogoSeel(undefined)}
                        className="absolute -top-1.5 -right-1.5 bg-red-650 text-white rounded-full p-0.5 hover:bg-red-700 shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Upload className="w-6 h-6 mb-1 text-slate-300" />
                      <span className="text-[9px] text-slate-400 font-medium">PNG, JPG, SVG menor que 500KB</span>
                    </div>
                  )}
                  <input
                    type="file"
                    id="seel-logo-inp"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, "seel")}
                    className="hidden"
                  />
                  <label
                    htmlFor="seel-logo-inp"
                    className="px-3 py-1 text-[11px] font-bold border rounded bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer text-slate-700 uppercase"
                  >
                    Carregar Arquivo
                  </label>
                </div>
              </div>
            </section>

            {/* SECT 4: SUBCONTRATADOS */}
            <section className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                4. Cadastro de Empresas Subcontratadas
              </h4>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  placeholder="Nome Fantasia da Subcontratada..."
                  className="flex-1 bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubcontratada()}
                />
                <button
                  type="button"
                  onClick={handleAddSubcontratada}
                  className="p-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tags grid list */}
              <div className="flex flex-wrap gap-2 pt-1">
                {subcontratadas.length > 0 ? (
                  subcontratadas.map((sub, i) => (
                    <span 
                      key={i} 
                      className="bg-amber-100 hover:bg-amber-200 border border-amber-250 text-amber-900 rounded-full px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {sub}
                      <button onClick={() => handleRemoveSubcontratada(sub)} className="text-amber-800 hover:text-red-700">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-[11px] italic text-slate-400">Nenhuma empresa subcontratada vinculada a este contrato.</p>
                )}
              </div>
            </section>

            {/* SECT 5: SHARE PERMISSIONS */}
            <section className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                5. Compartilhamento e Permissões de Usuários
              </h4>

              <div className="flex gap-2 items-center">
                <input
                  type="email"
                  value={newPermEmail}
                  onChange={(e) => setNewPermEmail(e.target.value)}
                  placeholder="E-mail do Engenheiro/Fiscal..."
                  className="flex-1 bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleAddPermission()}
                />
                <select
                  value={newPermAccess}
                  onChange={(e) => setNewPermAccess(e.target.value as "view" | "edit" | "fiscalizacao" | "gerenciadora")}
                  className="bg-white border border-slate-300 rounded p-2 text-xs outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                >
                  <option value="view">Visualização</option>
                  <option value="edit">Edição</option>
                  <option value="fiscalizacao">Fiscalização</option>
                  <option value="gerenciadora">Gerenciadora</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddPermission}
                  className="p-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Permission List Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white text-[11px]">
                <table className="w-full text-left divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2">E-mail do Usuário</th>
                      <th className="px-3.5 py-2">Permissão</th>
                      <th className="px-3.5 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-250 bg-white">
                    {permissoes.length > 0 ? (
                      permissoes.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3.5 py-2 font-medium">{p.email}</td>
                          <td className="px-3.5 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                              p.access === "edit" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                              p.access === "fiscalizacao" ? "bg-amber-50 text-amber-700 border border-amber-200" : 
                              p.access === "gerenciadora" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                              "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}>
                              {p.access === "edit" ? "EDIÇÃO (ESCRITA)" : 
                               p.access === "fiscalizacao" ? "FISCALIZAÇÃO" : 
                               p.access === "gerenciadora" ? "GERENCIADORA" :
                               "LEITURA (VISUALIZAÇÃO)"}
                            </span>
                          </td>
                          <td className="px-3.5 py-2 text-right">
                            <button
                              onClick={() => handleRemovePermission(p.email)}
                              className="text-red-500 hover:text-red-750 font-bold"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-3.5 py-4 text-center text-slate-400 italic">Preencha o e-mail para dar acesso a outros usuários.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECT 6: PLANILHA DE QUANTIDADES (PQ) ACTIVIDADES */}
            <section className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  6. Planilha de Quantidades da Obra (PQ)
                </h4>
                
                {/* Excel Integration block */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Baixe o modelo pré-formatado de planilha Excel para importar rápido suas atividades"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    Planilha Modelo
                  </button>
                  
                  <label className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-705 shadow-xs shrink-0">
                    <Upload className="w-3.5 h-3.5 text-white" />
                    Carregar Planilha (XLSX)
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleExcelImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-4 gap-3 grid grid-cols-5 items-end text-slate-700">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase block">Cód. Ref</label>
                  <input
                    type="text"
                    value={newActRef}
                    onChange={(e) => setNewActRef(e.target.value)}
                    placeholder="Ex: 001"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase block">Fase/Grupo</label>
                  <input
                    type="text"
                    value={newActFase}
                    onChange={(e) => setNewActFase(e.target.value)}
                    placeholder="Ex: FASE 1 - REDE"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase block">Código DP *</label>
                  <input
                    type="text"
                    value={newActIdentificador}
                    onChange={(e) => setNewActIdentificador(e.target.value)}
                    placeholder="Ex: 3.2"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase block">Unidade</label>
                  <input
                    type="text"
                    value={newActUnidade}
                    onChange={(e) => setNewActUnidade(e.target.value)}
                    placeholder="Ex: m³, un, m²"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddActivity}
                  className="w-full bg-amber-500 hover:bg-amber-600 font-bold rounded text-white py-2 flex items-center justify-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  Cadastrar Itens
                </button>

                <div className="col-span-5 space-y-1 mt-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase block">Descrição Completa da Atividade *</label>
                  <input
                    type="text"
                    value={newActDescricao}
                    onChange={(e) => setNewActDescricao(e.target.value)}
                    placeholder="Ex: Demolição manual de concreto armado pilar/viga..."
                    className="w-full bg-slate-50 border border-slate-205 rounded p-2 text-xs outline-none"
                  />
                </div>
              </div>

              {/* PQ listing Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white text-[11px] max-h-64 overflow-y-auto">
                <table className="w-full text-left divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] sticky top-0">
                    <tr>
                      <th className="px-3.5 py-2">Ref</th>
                      <th className="px-3.5 py-2 font-mono">Fase</th>
                      <th className="px-3.5 py-2">Item DP</th>
                      <th className="px-3.5 py-2 w-3/5">Descrição Serviço</th>
                      <th className="px-3.5 py-2">Uni</th>
                      <th className="px-3.5 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-250 bg-white">
                    {atividades.length > 0 ? (
                      atividades.map((act) => (
                        <tr key={act.id} className="hover:bg-slate-50">
                          <td className="px-3.5 py-1.5 font-bold text-slate-400">{act.ref}</td>
                          <td className="px-3.5 py-1.5 text-slate-550 italic truncate max-w-[120px]">{act.fase}</td>
                          <td className="px-3.5 py-1.5 font-bold text-slate-800 font-mono">{act.identificador}</td>
                          <td className="px-3.5 py-1.5 text-slate-700 leading-relaxed truncate max-w-[280px]">{act.descricao}</td>
                          <td className="px-3.5 py-1.5 font-mono text-slate-500">{act.unidade || "-"}</td>
                          <td className="px-3.5 py-1.5 text-right">
                            <button
                              onClick={() => {
                                if (window.confirm(`Deseja realmente excluir a atividade "${act.identificador} - ${act.descricao.substring(0, 40)}..."?`)) {
                                  handleRemoveActivity(act.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-650 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors shrink-0 outline-none select-none cursor-pointer"
                              title="Excluir atividade do catálogo"
                            >
                              <Trash2 className="w-3 h-3 text-red-650" />
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3.5 py-6 text-center text-slate-400 italic">Cadastre acima as linhas da Planilha de Quantidades da Obra. Elas estarão disponíveis ao preencher os relatórios diários rápidos.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </main>
        </div>

        {/* ModalFooter Action Hooks */}
        <footer className="h-16 border-t border-slate-200 bg-slate-50 px-6 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 font-semibold italic">Confirme as alterações antes de fechar ou mudar de obra.</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 bg-white font-bold rounded text-xs text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-wider"
            >
              Fechar Painel
            </button>
            <button
              onClick={handleSaveObraConfig}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 font-bold rounded text-xs text-slate-900 flex items-center gap-1.5 shadow-sm transition-all uppercase tracking-wider"
            >
              <Save className="w-4 h-4 text-slate-900" />
              Salvar Alterações
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};
