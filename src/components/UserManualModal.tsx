import React, { useState } from "react";
import { 
  X, 
  BookOpen, 
  CheckCircle2, 
  HardHat, 
  Calendar, 
  Users, 
  Camera, 
  FileSignature, 
  Printer, 
  ShieldAlert, 
  Briefcase, 
  CloudRain, 
  FileSpreadsheet, 
  Search, 
  ChevronRight,
  Sparkles,
  Layers,
  HelpCircle,
  Clock,
  RotateCcw,
  AlertTriangle,
  FileCheck,
  Archive,
  Download,
  Upload,
  Cloud,
  Check,
  ShieldCheck,
  Info,
  Wrench,
  Activity,
  Award,
  Zap,
  ArrowRight,
  FolderArchive,
  FileJson,
  BarChart3,
  Smartphone,
  Wifi,
  WifiOff,
  Copy,
  RefreshCw,
  ClipboardList
} from "lucide-react";

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ManualSectionId = 
  | "visao-geral"
  | "config-obras"
  | "preenchimento-rdo"
  | "fotos-evidencias"
  | "assinaturas-lote"
  | "relatorios-impressao"
  | "restauracao-dados"
  | "campo-mobile"
  | "faq-dicas";

interface ManualTopic {
  id: ManualSectionId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

const TOPICS: ManualTopic[] = [
  {
    id: "visao-geral",
    title: "1. Visão Geral & Fluxo Operacional",
    subtitle: "Ciclo de vida do diário, valor probatório e responsabilidades",
    icon: HardHat,
    badge: "Essencial",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300"
  },
  {
    id: "config-obras",
    title: "2. Cadastro e Gestão de Obras",
    subtitle: "Contratos, prazos automáticos, catálogos (PQ) e logotipos",
    icon: Briefcase
  },
  {
    id: "preenchimento-rdo",
    title: "3. Preenchimento Passo a Passo",
    subtitle: "Clima, efetivo MOD/MOI, equipamentos, produção e paralisações",
    icon: Calendar,
    badge: "Diário",
    badgeColor: "bg-blue-100 text-blue-900 border-blue-300"
  },
  {
    id: "fotos-evidencias",
    title: "4. Relatório Fotográfico de Campo",
    subtitle: "Evidências técnicas, boas práticas e compressão no celular",
    icon: Camera
  },
  {
    id: "assinaturas-lote",
    title: "5. Assinaturas Digitais & Em Lote",
    subtitle: "Aprovações do Emissor, Gerenciadora e Contratante",
    icon: FileSignature,
    badge: "Aprovação",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300"
  },
  {
    id: "relatorios-impressao",
    title: "6. Emissão em PDF & Relatórios",
    subtitle: "Folha timbrada A4, livro de diários e histogramas",
    icon: Printer
  },
  {
    id: "restauracao-dados",
    title: "7. Backup Semanal & Auditoria",
    subtitle: "Redundância total .ZIP na aba de Auditoria e restauração",
    icon: Archive,
    badge: "Segurança",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300"
  },
  {
    id: "campo-mobile",
    title: "8. Módulo de Campo (Encarregado)",
    subtitle: "Interface móvel em página única, offline-first e sincronização",
    icon: Smartphone,
    badge: "Mobile",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300"
  },
  {
    id: "faq-dicas",
    title: "9. Guia Rápido, FAQ & Dicas de Ouro",
    subtitle: "Soluções práticas de campo, glossário e prevenção de glosas",
    icon: HelpCircle
  }
];

export const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<ManualSectionId>("visao-geral");
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const filteredTopics = TOPICS.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* HEADER DO MODAL */}
        <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 p-2.5 rounded-xl flex items-center justify-center shadow-xs font-black">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white uppercase">
                  Manual Operacional do Usuário • RDO SEEL
                </h3>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded-full border border-amber-500/30">
                  Edição Oficial 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Guia didático de procedimentos, preenchimento de campo, assinaturas, backups e auditoria
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
            title="Fechar Manual"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* WORKSPACE: SIDEBAR + CONTEÚDO DIDÁTICO */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* BARRA LATERAL COM SELETOR DE CAPÍTULOS */}
          <aside className="w-full md:w-80 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
            {/* Campo de Busca Rápida */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Pesquisar no manual..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Lista de Tópicos */}
            <nav className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {filteredTopics.map((topic) => {
                const IconComponent = topic.icon;
                const isActive = activeSection === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setActiveSection(topic.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-2 border cursor-pointer ${
                      isActive
                        ? "bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs"
                        : "bg-white hover:bg-slate-100/80 text-slate-700 border-slate-200/80 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg ${isActive ? "bg-slate-950/15 text-slate-950" : "bg-amber-50 text-amber-700"}`}>
                        <IconComponent className="w-4 h-4 shrink-0" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs truncate font-extrabold">{topic.title}</div>
                        <div className={`text-[10px] truncate mt-0.5 ${isActive ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                          {topic.subtitle}
                        </div>
                      </div>
                    </div>

                    {topic.badge && (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 border ${
                        isActive 
                          ? "bg-slate-950 text-amber-400 border-slate-950" 
                          : topic.badgeColor || "bg-amber-100 text-amber-800 border-amber-300"
                      }`}>
                        {topic.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-200 bg-slate-100/80 text-[10px] text-slate-500 text-center font-medium">
              SEEL Serviços de Engenharia LTDA • Sistema RDO
            </div>
          </aside>

          {/* ÁREA PRINCIPAL DE LEITURA DIDÁTICA */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-slate-800 leading-relaxed bg-white">
            
            {/* ================================================================= */}
            {/* CAPÍTULO 1: VISÃO GERAL & FLUXO OPERACIONAL */}
            {/* ================================================================= */}
            {activeSection === "visao-geral" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300">
                      Capítulo 1
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">Introdução & Boas Práticas</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-2">
                    <HardHat className="w-6 h-6 text-amber-500" />
                    Visão Geral & Fluxo Operacional SEEL
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    O Diário de Obra (RDO) é o documento jurídico e técnico primário do contrato, utilizado para aprovação de medições, auditorias de qualidade e embasamento de pleitos.
                  </p>
                </div>

                {/* Card de Destaque Didático */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4.5 space-y-2">
                  <h4 className="text-xs font-black text-amber-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Qual é o Papel Fundamental do RDO?
                  </h4>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Registrar com <strong>precisão cronológica e fidedignidade</strong> todas as ocorrências diárias do canteiro de obras: efetivo mobilizado (MOD e MOI), condições meteorológicas por turno, avanço das frentes de serviço (PQ), maquinários em operação, ocorrências de segurança do trabalho e qualquer paralisação ou interferência externa que possa impactar o cronograma físico-financeiro.
                  </p>
                </div>

                {/* FLUXOGRAMA VISUAL DE 4 ETAPAS */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-amber-600" />
                    Fluxo do Diário de Obra (Ciclo de Aprovação):
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-center flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center shadow-xs">
                        1
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-900">Emissão Diária</h5>
                      <p className="text-[11px] text-slate-600 text-left">
                        O Engenheiro Residente ou Técnico de Campo da SEEL preenche os dados de produção, efetivo e clima ao final do expediente.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-center flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                        2
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-900">Fiscalização</h5>
                      <p className="text-[11px] text-slate-600 text-left">
                        A Gerenciadora / Fiscalização confere os quantitativos lançados, insere eventuais apontamentos e assina digitalmente.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-center flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        3
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-900">Homologação</h5>
                      <p className="text-[11px] text-slate-600 text-left">
                        O Fiscal do Contratante valida o documento, gerando valor jurídico para faturamento e liberação de medição.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-center flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        4
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-900">Livro de Obra</h5>
                      <p className="text-[11px] text-slate-600 text-left">
                        Exportação em lote de PDFs encadernados e backup semanal para proteção de 100% dos dados.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CARD DE REGRAS DE OURO */}
                <div className="border border-slate-200 rounded-2xl p-4.5 bg-slate-50/70 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Regras Obrigatórias de Procedimento SEEL:
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Periodicidade Diária:</strong> O RDO deve ser emitido impreterivelmente no mesmo dia ou até o início da manhã seguinte. Acumular dias gera risco de inconsistência em efetivo e clima.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Fins de Semana e Feriados:</strong> Mesmo sem expediente, emita o diário registrando a observação <em>"SEM EXPEDIENTE - DOMINGO/FERIADO"</em> e o clima do dia. Isso mantém a contagem cronológica perfeita.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Registro Imediato de Paralisações:</strong> Faltas de energia, chuvas torrenciais ou atrasos de liberação de projeto devem ter horários exatos registrados para assegurar direitos contratuais da SEEL.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* CAPÍTULO 2: CADASTRO E GESTÃO DE OBRAS */}
            {/* ================================================================= */}
            {activeSection === "config-obras" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300">
                      Capítulo 2
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">Parametrização & Contratos</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-2">
                    <Briefcase className="w-6 h-6 text-amber-500" />
                    Cadastro e Gestão de Obras
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Como parametrizar contratos, catálogos de serviços (PQ), prazos automáticos e equipes para preenchimento ágil.
                  </p>
                </div>

                <div className="space-y-4">
                  
                  {/* Passo 1 */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[10px] font-black">PASSO 1</span>
                      <h4 className="font-bold text-xs text-slate-900">Acessar o Painel de Configurações de Obras</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      No topo da barra lateral esquerda, clique em <strong>"Configurar Obra"</strong> (ou no seletor de obras). Neste painel você pode cadastrar novas obras, editar contratos existentes ou visualizar obras inativas.
                    </p>
                  </div>

                  {/* Passo 2 */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[10px] font-black">PASSO 2</span>
                      <h4 className="font-bold text-xs text-slate-900">Dados do Contrato e Contagem de Prazos</h4>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc leading-relaxed">
                      <li><strong>Nome da Obra:</strong> Nome oficial do empreendimento (ex: <em>"Obra 966 - Reforço e Fundações Especiais"</em>).</li>
                      <li><strong>Número do Contrato:</strong> Código contratual com o cliente (ex: <em>"CT-2026/045"</em>).</li>
                      <li><strong>Cliente e Contratada:</strong> Razão social do Cliente e SEEL SERVIÇOS DE ENGENHARIA LTDA.</li>
                      <li><strong>Data de Início da OS & Prazo Contratual (dias):</strong> Ao preencher a data de início e os dias contratuais, o sistema calcula em cada RDO o <strong>Prazo Decorrido</strong> e o <strong>Prazo a Vencer</strong> de forma 100% automatizada!</li>
                    </ul>
                  </div>

                  {/* Passo 3 */}
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded text-[10px] font-black">PASSO 3</span>
                      <h4 className="font-bold text-xs text-amber-950">Catálogo de Serviços / Atividades (PQ)</h4>
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      Cadastre as principais frentes de trabalho previstas no contrato (ex: <em>"Estaca Raiz Ø 310mm (m)"</em>, <em>"Tirantes Autoperfurantes (m)"</em>, <em>"Concreto Projetado (m²)"</em>, <em>"Injeção de Calda de Cimento (kg)"</em>).
                    </p>
                    <div className="p-2.5 bg-white rounded-lg border border-amber-200 text-[11px] text-amber-950 font-medium">
                      💡 <strong>Dica de Produtividade:</strong> Com o catálogo preenchido na obra, você importa todos os serviços para o diário em 1 clique, sem precisar digitar nomes e unidades repetidamente!
                    </div>
                  </div>

                  {/* Passo 4 */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[10px] font-black">PASSO 4</span>
                      <h4 className="font-bold text-xs text-slate-900">Logotipos Timbrados e Assinantes Padrão</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Faça o upload do <strong>Logo do Cliente</strong> e do <strong>Logo SEEL</strong> (PNG ou JPEG). Preencha também os nomes do Engenheiro Residente da SEEL, do Fiscal da Gerenciadora e do Fiscal do Cliente para que saiam pré-carregados nas assinaturas de cada novo diário.
                    </p>
                  </div>

                  {/* Reativação */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-100/60 space-y-1.5">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-amber-600" />
                      Reativação de Obras Desativadas:
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Se uma obra foi arquivada, acesse a aba <strong>"Inativas"</strong> no configurador de obras. O sistema mantém todos os RDOs anteriores salvos e permite reativar o contrato com apenas 1 clique.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* CAPÍTULO 3: PREENCHIMENTO PASSO A PASSO DO RDO */}
            {/* ================================================================= */}
            {activeSection === "preenchimento-rdo" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded border border-blue-300">
                      Capítulo 3
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">Operação de Campo</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-2">
                    <Calendar className="w-6 h-6 text-amber-500" />
                    Preenchimento Passo a Passo do Diário (RDO)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Como preencher cada aba do editor técnico para garantir conformidade e fidedignidade.
                  </p>
                </div>

                <div className="space-y-4">
                  
                  {/* Aba 1: Clima */}
                  <div className="border border-slate-200 rounded-2xl p-4.5 space-y-2 bg-slate-50/50">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-sky-600" />
                      1. Condições Climáticas & Praticabilidade do Terreno
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Assinale a condição meteorológica em cada um dos 3 turnos (<strong>Manhã, Tarde e Noite</strong>): <em>Bom, Nublado, Chuva Leve, Chuva Forte ou Impraticável</em>.
                    </p>
                    <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-900">
                      🌧️ <strong>Atenção Técnica:</strong> Se a chuva parou mas o terreno permaneceu encharcado/atolando caminhões e perfuratrizes, classifique o turno correspondente como <strong>"Impraticável"</strong> e justifique na aba de paralisações.
                    </div>
                  </div>

                  {/* Aba 2: Mão de Obra */}
                  <div className="border border-slate-200 rounded-2xl p-4.5 space-y-2 bg-slate-50/50">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      2. Efetivo de Mão de Obra (MOD, MOI e Terceirizados)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                        <span className="font-extrabold text-xs text-indigo-900 block">MOD (Mão de Obra Direta)</span>
                        <p className="text-[11px] text-slate-600">
                          Equipe diretamente ligada à produção física: Encarregados, Operadores de Perfuratriz, Sondadores, Soldadores, Armadores, Pedreiros, Serventes.
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                        <span className="font-extrabold text-xs text-indigo-900 block">MOI (Mão de Obra Indireta)</span>
                        <p className="text-[11px] text-slate-600">
                          Equipe de gestão, suporte e segurança: Engenheiro Residente, Técnico de Segurança (TST), Almoxarife, Auxiliar Administrativo.
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1">
                      <strong>Subcontratadas:</strong> Informe a quantidade de profissionais presentes de cada empresa parceira.
                    </p>
                  </div>

                  {/* Aba 3: Equipamentos */}
                  <div className="border border-slate-200 rounded-2xl p-4.5 space-y-2 bg-slate-50/50">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-600" />
                      3. Equipamentos & Maquinários Mobilizados
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Lance os maquinários presentes no canteiro (ex: <em>"Perfuratriz Hidráulica", "Compressor de Ar 750 CFM", "Bomba de Concreto", "Caminhão Munck"</em>). Especifique a quantidade e se operaram normalmente ou ficaram em manutenção.
                    </p>
                  </div>

                  {/* Aba 4: Produção e Avanço */}
                  <div className="border border-slate-200 rounded-2xl p-4.5 space-y-2 bg-slate-50/50">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      4. Atividades Executadas & Produção Diária (PQ)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Clique em <strong>"Adicionar do Catálogo"</strong> para importar os serviços da obra. Para cada item, preencha:
                    </p>
                    <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                      <li><strong>Quantidade Produzida no Dia:</strong> Ex: <em>18,50 m</em> ou <em>3 un</em>.</li>
                      <li><strong>Local / Eixo da Estrutura:</strong> Ex: <em>"Eixo B-C / Estacas E-04 a E-07 / Bloco 02"</em>.</li>
                      <li><strong>Descrição da Atividade:</strong> Detalhamento técnico da etapa executada (ex: perfuração, armação, injeção).</li>
                    </ul>
                  </div>

                  {/* Aba 5: Paralisações */}
                  <div className="border border-amber-200 rounded-2xl p-4.5 space-y-2 bg-amber-50/60">
                    <h4 className="font-extrabold text-xs text-amber-950 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      5. Paralisações & Fatores Intervenientes (Pleitos)
                    </h4>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      Qualquer interrupção deve ser registrada detalhadamente: horário de início, horário de término, motivo (chuva, falta de energia da concessionária, ausência de projeto liberado pelo cliente, etc.) e o impacto na produção.
                    </p>
                    <div className="p-2.5 bg-white rounded-lg border border-amber-200 text-[11px] text-amber-950 font-medium">
                      ⚖️ <strong>Importância Jurídica:</strong> Paralisações bem detalhadas no RDO são a prova técnica indispensável para justificar prorrogações de prazo de contrato e evitar aplicação indevida de multas.
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* CAPÍTULO 4: RELATÓRIO FOTOGRÁFICO DE CAMPO */}
            {/* ================================================================= */}
            {activeSection === "fotos-evidencias" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300">
                      Capítulo 4
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">Registro Fotográfico</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-2">
                    <Camera className="w-6 h-6 text-amber-500" />
                    Relatório Fotográfico & Evidências de Campo
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Como documentar visualmente os serviços para aprovação de medições e relatórios para a gerência.
                  </p>
                </div>

                <div className="space-y-4">
                  
                  {/* Recomendações */}
                  <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Instruções para Registro Fotográfico:
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-2 pl-4 list-disc leading-relaxed">
                      <li><strong>Quantidade Recomendada:</strong> De 2 a 6 fotos por diário, registrando as etapas críticas do dia (ex: perfuração, ensaios de campo, armação, injeção).</li>
                      <li><strong>Legendas Técnicas Claras:</strong> Nunca deixe fotos sem legenda. Escreva o que está sendo visto, com elemento estrutural e equipamento.</li>
                      <li><strong>Compressão Automática:</strong> O sistema comprime automaticamente imagens pesadas tiradas no celular para garantir que o salvamento e envio sejam instantâneos, sem travar o sinal de 4G da obra.</li>
                    </ul>
                  </div>

                  {/* Exemplos de Legendas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/60 space-y-1.5">
                      <span className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                        <X className="w-4 h-4 text-red-600" />
                        Legendas Genéricas (Evitar):
                      </span>
                      <p className="text-[11px] text-red-700 italic">
                        ❌ "Obra hoje"<br/>
                        ❌ "Serviço"<br/>
                        ❌ "Foto 1"
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1.5">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Legendas Técnicas (Padrão SEEL):
                      </span>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        ✅ "Execução da estaca raiz E-09 no Bloco 03 com perfuratriz hidráulica"<br/>
                        ✅ "Ensaio de fluidez de calda de cimento no agitador"
                      </p>
                    </div>
                  </div>

                  {/* Dica de Enquadramento */}
                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 text-xs text-indigo-950 space-y-1">
                    <strong className="block font-extrabold text-indigo-900">Dica de Enquadramento:</strong>
                    <p className="leading-relaxed">
                      Fotografe no modo paisagem (horizontal), garantindo boa iluminação e registrando o uso correto de Equipamentos de Proteção Individual (EPIs) pela equipe em campo.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* CAPÍTULO 5: ASSINATURAS DIGITAIS & EM LOTE */}
            {/* ================================================================= */}
            {activeSection === "assinaturas-lote" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                      Capítulo 5
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">Formalização Jurídica</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-2">
                    <FileSignature className="w-6 h-6 text-amber-500" />
                    Assinaturas Digitais & Assinatura em Lote
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Como formalizar os relatórios individualmente ou validar múltiplos diários no fechamento quinzenal/mensal.
                  </p>
                </div>

                <div className="space-y-4">
                  
                  {/* Assinatura Individual */}
                  <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      1. Assinatura Individual no Editor do RDO
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Ao final do editor do RDO, os 3 responsáveis (<strong>Emissor SEEL, Fiscal da Gerenciadora e Fiscal do Cliente</strong>) conferem seus dados e clicam em <strong>"Assinar Digitalmente"</strong>.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      O sistema gera automaticamente um carimbo digital com selo de autenticidade, data, hora e registro auditável.
                    </p>
                  </div>

                  {/* Assinatura em Lote */}
                  <div className="p-4.5 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-3">
                    <h4 className="font-extrabold text-xs text-amber-950 flex items-center gap-2">
                      <FileSignature className="w-4 h-4 text-amber-600" />
                      2. Como Utilizar a Ferramenta "Assinar em Lote"
                    </h4>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      Para fechamentos de quinzena, medições mensais ou aprovação em bloco pela fiscalização:
                    </p>
                    <ol className="text-xs text-amber-900 space-y-2 pl-4 list-decimal leading-relaxed">
                      <li>Na barra superior do sistema, clique no botão <strong>"Assinar em Lote"</strong>.</li>
                      <li>Selecione o seu perfil de assinatura (<em>Emissor SEEL, Gerenciadora ou Contratante</em>).</li>
                      <li>Defina o intervalo de datas da medição (ex: 01/08/2026 a 15/08/2026).</li>
                      <li>Selecione os diários pendentes e clique em <strong>"Confirmar Assinaturas em Lote"</strong>.</li>
                    </ol>
                  </div>

                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* CAPÍTULO 6: EMISSÃO EM PDF & RELATÓRIOS GERENCIAIS */}
            {/* ================================================================= */}
            {activeSection === "relatorios-impressao" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300">
                      Capítulo 6
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">Impressão & Visualização</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-2">
                    <Printer className="w-6 h-6 text-amber-500" />
                    Emissão Oficial em PDF & Relatórios Gerenciais
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Geração de PDFs prontos para impressão física timbrada, livros de obra e gráficos consolidados.
                  </p>
                </div>

                <div className="space-y-4">
                  
                  {/* Diário Individual */}
                  <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <Printer className="w-4 h-4 text-indigo-600" />
                      Impressão do Diário Individual (Formato A4 Timbrado)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      No topo do editor do RDO, clique no botão azul <strong>"Visualizar / Imprimir RDO"</strong>. O sistema gera a folha timbrada oficial contendo os logotipos da SEEL e do Cliente, tabelas de efetivo, clima, produção e assinaturas.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Clique em <strong>"Salvar como PDF / Imprimir"</strong> na prévia.
                    </p>
                  </div>

                  {/* Livro de Obra / Impressão em Lote */}
                  <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Impressão em Lote (Livro de Diários da Obra)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Na barra superior, clique em <strong>"Imprimir Lote"</strong>. Escolha o período desejado e gere o livro encadernado completo de diários em sequência contínua com quebras de página automáticas para entrega ao cliente.
                    </p>
                  </div>

                  {/* Relatórios Gerenciais */}
                  <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-amber-600" />
                      Aba "Relatórios Gerenciais"
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Clique na aba <strong>"Relatórios Gerenciais"</strong> no topo da tela para visualizar gráficos de histograma de efetivo ao longo do tempo, dias de chuva acumulados, status de assinaturas e curva de avanço de cada frente de serviço.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* CAPÍTULO 7: BACKUP SEMANAL & AUDITORIA */}
            {/* ================================================================= */}
            {activeSection === "restauracao-dados" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-purple-100 text-purple-800 rounded border border-purple-300">
                      Capítulo 7
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">Segurança & Redundância</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-2">
                    <Archive className="w-6 h-6 text-amber-500" />
                    Backup Semanal (.ZIP) & Gestão na Aba de Auditoria
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Como garantir tolerância zero à perda de dados com backups completos em formato .ZIP e restauração imediata.
                  </p>
                </div>

                <div className="space-y-4">
                  
                  {/* Onde Fica o Backup */}
                  <div className="p-4.5 rounded-2xl border border-purple-200 bg-purple-50/60 space-y-2">
                    <h4 className="font-extrabold text-xs text-purple-950 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-700" />
                      Onde Encontrar a Central de Backup no Sistema?
                    </h4>
                    <p className="text-xs text-purple-900 leading-relaxed">
                      A central de backup fica estrategicamente localizada dentro da aba <strong>"Auditoria"</strong> (no menu superior) ➔ sub-aba <strong>"Backup & Redundância"</strong>.
                    </p>
                  </div>

                  {/* Como Fazer Backup ZIP */}
                  <div className="p-4.5 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-3">
                    <h4 className="font-extrabold text-xs text-amber-950 flex items-center gap-2">
                      <Download className="w-4 h-4 text-amber-600" />
                      Passo a Passo para Exportar o Backup Semanal (.ZIP):
                    </h4>
                    <ol className="text-xs text-amber-900 space-y-2 pl-4 list-decimal leading-relaxed">
                      <li>Acesse a aba <strong>"Auditoria"</strong> no topo e clique na sub-aba <strong>"Backup & Redundância"</strong>.</li>
                      <li>Na opção <strong>"Exportar Pacote .ZIP"</strong>, confira o resumo dos RDOs e Obras calculados.</li>
                      <li>Clique em <strong>"Gerar e Baixar Pacote Completo (.ZIP)"</strong>.</li>
                      <li>O sistema criará um pacote ZIP completo com:
                        <ul className="list-disc pl-5 mt-1 text-[11px] space-y-0.5">
                          <li><em>backup_completo_rdo.json:</em> Snapshot unificado com 100% dos dados.</li>
                          <li><em>rdos_individuais/:</em> Pastas com cada diário em JSON legível.</li>
                          <li><em>obras_configuracoes/:</em> Configurações de cada contrato.</li>
                          <li><em>LEIAME_RESTAURACAO.txt:</em> Guia técnico de contingência.</li>
                        </ul>
                      </li>
                      <li><strong>Armazenamento Corporativo SEEL:</strong> Salve o arquivo ZIP baixado na nuvem corporativa (Google Drive / OneDrive) na pasta <code className="bg-white px-1 py-0.5 rounded text-amber-950 font-mono text-[10px]">SEEL/Backups_RDO</code>.</li>
                    </ol>
                  </div>

                  {/* Como Restaurar */}
                  <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      Como Restaurar Dados em Qualquer Dispositivo:
                    </h4>
                    <ol className="text-xs text-slate-600 space-y-2 pl-4 list-decimal leading-relaxed">
                      <li>Acesse <strong>"Auditoria" ➔ "Backup & Redundância" ➔ "Restaurar Dados"</strong>.</li>
                      <li>Arraste o arquivo .ZIP ou .JSON para a área demarcada.</li>
                      <li>O sistema validará o arquivo e mostrará a contagem de RDOs e Obras identificados.</li>
                      <li>Escolha o modo <em>"Mesclar com Dados Atuais (Recomendado)"</em> ou <em>"Substituição Completa"</em>.</li>
                      <li>Clique em <strong>"Confirmar e Restaurar Dados no Sistema"</strong>. A barra de progresso gravará tudo no banco de dados em segundos.</li>
                    </ol>
                  </div>

                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* CAPÍTULO 8: MÓDULO DE CAMPO & ENCARREGADO (MOBILE) */}
            {/* ================================================================= */}
            {activeSection === "campo-mobile" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300">
                      Capítulo 8
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">Operação em Smartphones</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-2">
                    <Smartphone className="w-6 h-6 text-amber-500" />
                    Módulo de Campo (Visão do Encarregado)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Interface simplificada de página única, desenhada sob medida para smartphones e tablets, com preenchimento offline e sincronização ágil.
                  </p>
                </div>

                {/* Card de Regra de Negócio & Restrição de Acesso */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4.5 space-y-2">
                  <h4 className="text-xs font-black text-amber-950 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Regras de Permissão do Usuário Encarregado:
                  </h4>
                  <ul className="text-xs text-amber-900 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li><strong>Sem Criação de RDO:</strong> O encarregado não pode abrir novos diários. A criação do RDO do dia é de responsabilidade da Engenharia/Gestor da Obra.</li>
                    <li><strong>Apenas RDOs "Em Digitação":</strong> O encarregado visualiza e edita exclusivamente os relatórios com status <em>"Em Digitação"</em>.</li>
                    <li><strong>Ocultação Automática:</strong> Assim que o diário é enviado para fiscalização, finalizado ou assinado, ele sai imediatamente da visualização do encarregado para evitar alterações acidentais pós-aprovação.</li>
                  </ul>
                </div>

                {/* SEÇÕES DISPONÍVEIS NA TELA DO ENCARREGADO */}
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    O que é Preenchido pelo Time de Campo (Página Única):
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        1. Data & Condições de Clima
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Seleção por toque dos turnos Manhã, Tarde e Noite (Sol, Nublado, Chuva Leve, Chuva Forte, Impraticável) e registro do índice pluviométrico em mm.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        2. Quadro de Efetivos & Faltas
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Botões de incremento rápidos <strong>(+)</strong> e <strong>(-)</strong> para Cadastrados, Faltas e Atestados, com cálculo de Presentes instantâneo e botão de <strong>Clonar Equipe do RDO anterior</strong>.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-sky-600" />
                        3. Equipamentos Mobilizados
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Lançamento rápido de máquinas em operação, identificação de fornecedor/locador e botão para <strong>Clonar Equipamentos</strong> do diário passado.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-amber-600" />
                        4. Produção (PQ) & Fotos de Campo
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Seleção das frentes cadastradas na Planilha de Quantidades, quantitativo produzido no dia, anotações de campo e captura de fotos direto da câmera do celular.
                      </p>
                    </div>
                  </div>

                  {/* Como Funciona o Preenchimento Offline & Sincronização */}
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                    <h4 className="text-xs font-black text-emerald-950 flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-emerald-700" />
                      Funcionamento Offline e Botão de Sincronização:
                    </h4>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      Mesmo sem sinal de 3G/4G ou Wi-Fi no canteiro de obras, o Encarregado pode realizar todo o preenchimento normalmente. Os dados são gravados no armazenamento local seguro do celular (rascunho local).
                    </p>
                    <div className="p-3 bg-white rounded-lg border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-700" /> Passo a Passo de Sincronização:
                      </p>
                      <p>1. Preencha as atividades, efetivos e fotos ao longo do dia.</p>
                      <p>2. Ao retornar para o escritório ou restabelecer conexão com a internet, toque no botão <strong>"Sincronizar Dados"</strong> no rodapé da tela.</p>
                      <p>3. Uma notificação verde confirmará que os dados foram consolidados na nuvem e já estão disponíveis para o Engenheiro.</p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* CAPÍTULO 9: GUIA RÁPIDO, FAQ & DICAS DE OURO */}
            {/* ================================================================= */}
            {activeSection === "faq-dicas" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300">
                      Capítulo 9
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">Resolução Rápida</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-2">
                    <HelpCircle className="w-6 h-6 text-amber-500" />
                    Guia Rápido, FAQ & Dicas de Ouro
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Respostas diretas para as dúvidas mais frequentes da rotina de engenharia em campo.
                  </p>
                </div>

                <div className="space-y-3">
                  
                  <details className="group border border-slate-200 rounded-2xl p-3.5 bg-slate-50 open:bg-white transition-colors">
                    <summary className="font-extrabold text-xs text-slate-900 cursor-pointer flex items-center justify-between">
                      <span>Como agir quando a chuva paralisar apenas parte das frentes de serviço?</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="text-xs text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100 leading-relaxed">
                      Registre no clima o período de chuva e, na aba de Paralisações, aponte especificamente quais frentes foram interrompidas (ex: <em>"Terraplenagem paralisada das 14h às 17h por solo encharcado; frentes cobertas mantiveram produção normal"</em>).
                    </p>
                  </details>

                  <details className="group border border-slate-200 rounded-2xl p-3.5 bg-slate-50 open:bg-white transition-colors">
                    <summary className="font-extrabold text-xs text-slate-900 cursor-pointer flex items-center justify-between">
                      <span>Posso preencher o diário se o sinal de 4G da obra oscilar ou cair?</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="text-xs text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100 leading-relaxed">
                      Sim! O sistema grava em cache local seguro no seu navegador. Assim que a conexão com a internet retornar e você clicar em salvar, todos os dados são sincronizados no banco de dados.
                    </p>
                  </details>

                  <details className="group border border-slate-200 rounded-2xl p-3.5 bg-slate-50 open:bg-white transition-colors">
                    <summary className="font-extrabold text-xs text-slate-900 cursor-pointer flex items-center justify-between">
                      <span>Qual a diferença prática entre MOD e MOI?</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="text-xs text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100 space-y-1 leading-relaxed">
                      <p><strong>MOD (Mão de Obra Direta):</strong> Executam os serviços físicos da obra (operadores, soldadores, pedreiros, serventes).</p>
                      <p><strong>MOI (Mão de Obra Indireta):</strong> Gestão, controle e suporte (engenheiros, técnicos de segurança, almoxarifes, encarregados).</p>
                    </div>
                  </details>

                  <details className="group border border-slate-200 rounded-2xl p-3.5 bg-slate-50 open:bg-white transition-colors">
                    <summary className="font-extrabold text-xs text-slate-900 cursor-pointer flex items-center justify-between">
                      <span>Como emitir um diário de domingo ou feriado sem expediente?</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="text-xs text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100 leading-relaxed">
                      Crie o diário normalmente na data, preencha o clima e na caixa de Observações digite <em>"SEM EXPEDIENTE - DOMINGO/FERIADO"</em>. O efetivo e equipamentos podem ficar zerados.
                    </p>
                  </details>

                  <details className="group border border-slate-200 rounded-2xl p-3.5 bg-slate-50 open:bg-white transition-colors">
                    <summary className="font-extrabold text-xs text-slate-900 cursor-pointer flex items-center justify-between">
                      <span>Como recuperar uma obra excluída ou desativada?</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="text-xs text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100 leading-relaxed">
                      Abra o painel <strong>"Configurar Obra"</strong> e clique na aba <strong>"Inativas"</strong>. O sistema listará a obra com todos os seus RDOs preservados. Basta clicar em <strong>"Reativar Obra"</strong>.
                    </p>
                  </details>

                </div>

                {/* Glossário Rápido */}
                <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2">
                  <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600" />
                    Glossário Técnico de Canteiro:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div><strong>RDO:</strong> Relatório Diário de Obra</div>
                    <div><strong>PQ:</strong> Produção / Quantitativo de Serviço</div>
                    <div><strong>OS:</strong> Ordem de Serviço Contratual</div>
                    <div><strong>TST:</strong> Técnico em Segurança do Trabalho</div>
                    <div><strong>DDS:</strong> Diálogo Diário de Segurança</div>
                    <div><strong>Pleito:</strong> Reivindicação de aditivo de prazo ou valor</div>
                  </div>
                </div>

              </div>
            )}

          </main>
        </div>

        {/* FOOTER DO MODAL */}
        <footer className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Dúvidas operacionais?</span>
            <span className="hidden sm:inline">Consulte a Gerência de Contratos ou a Engenharia SEEL.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer border-none shadow-xs"
          >
            Entendido, Fechar Manual
          </button>
        </footer>

      </div>
    </div>
  );
};
