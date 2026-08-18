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
  RotateCcw
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
  | "faq-dicas";

interface ManualTopic {
  id: ManualSectionId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: string;
}

const TOPICS: ManualTopic[] = [
  {
    id: "visao-geral",
    title: "1. Visão Geral & Fluxo Operacional",
    subtitle: "Ciclo de vida do RDO e responsabilidades legais",
    icon: HardHat,
    badge: "Essencial"
  },
  {
    id: "config-obras",
    title: "2. Cadastro e Configuração de Obras",
    subtitle: "Contratos, catálogo de atividades (PQ), logotipos e equipes",
    icon: Briefcase
  },
  {
    id: "preenchimento-rdo",
    title: "3. Preenchimento Passo a Passo do RDO",
    subtitle: "Clima, efetivo MOD/MOI, equipamentos, produção e paralisações",
    icon: Calendar,
    badge: "Diário"
  },
  {
    id: "fotos-evidencias",
    title: "4. Relatório Fotográfico de Campo",
    subtitle: "Anexo de fotos, legendas técnicas e compressão automática",
    icon: Camera
  },
  {
    id: "assinaturas-lote",
    title: "5. Assinaturas Digitais & Assinatura em Lote",
    subtitle: "Fluxo de aprovação: Emissor, Gerenciadora e Contratante",
    icon: FileSignature
  },
  {
    id: "relatorios-impressao",
    title: "6. Impressão Oficial em PDF & Relatórios",
    subtitle: "Emissão de diários individuais, lotes encadernados e histogramas",
    icon: Printer
  },
  {
    id: "restauracao-dados",
    title: "7. Restauração & Gestão de Obras",
    subtitle: "Como recuperar obras e histórico a partir dos RDOs salvos",
    icon: RotateCcw
  },
  {
    id: "faq-dicas",
    title: "8. Boas Práticas & Dúvidas Frequentes",
    subtitle: "Dicas de campo para evitar glosas e manter conformidade",
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <header className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-lg flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm tracking-wide text-white">MANUAL OPERACIONAL DO USUÁRIO</h3>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30">
                  SEEL ENGENHARIA
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Guia de procedimentos, preenchimento, normas contratuais e boas práticas em campo</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Fechar Manual"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Workspace: Sidebar Navigation + Content Viewer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Menu Lateral de Tópicos */}
          <aside className="w-full md:w-80 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
            {/* Campo de Busca Rápida */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Buscar no manual..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Lista de Seções */}
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredTopics.map((topic) => {
                const IconComponent = topic.icon;
                const isActive = activeSection === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setActiveSection(topic.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 border cursor-pointer ${
                      isActive
                        ? "bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs"
                        : "bg-white hover:bg-slate-100/80 text-slate-700 border-slate-200/70 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? "text-slate-950" : "text-amber-600"}`} />
                      <div className="truncate">
                        <div className="text-xs truncate">{topic.title}</div>
                        <div className={`text-[10px] truncate ${isActive ? "text-slate-900" : "text-slate-400"}`}>
                          {topic.subtitle}
                        </div>
                      </div>
                    </div>

                    {topic.badge && (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        isActive 
                          ? "bg-slate-950 text-amber-400" 
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {topic.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-200 bg-slate-100/60 text-[10px] text-slate-500 text-center">
              Sistema RDO SEEL v3.4 • Atualizado 2026
            </div>
          </aside>

          {/* Área Principal de Leitura */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-slate-800 leading-relaxed bg-white">
            
            {/* SEÇÃO 1: VISÃO GERAL */}
            {activeSection === "visao-geral" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Capítulo 1</span>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <HardHat className="w-5 h-5 text-amber-500" />
                    Visão Geral & Fluxo Operacional SEEL
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    O Diário de Obra (RDO) é o documento jurídico e técnico mais importante do canteiro de obras.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Qual é o objetivo principal do RDO?
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Registrar com fidedignidade cronológica todos os acontecimentos diários da obra: efetivo presente, condições meteorológicas, avanço das atividades contratadas (PQ), equipamentos mobilizados, paralisações e interferências que possam justificar pleitos ou aditivos de prazo contratuais.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Ciclo de Vida do RDO na Obra:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center">1</div>
                      <h5 className="font-bold text-xs text-slate-900">Emissão Diária</h5>
                      <p className="text-[11px] text-slate-600">O engenheiro/técnico da SEEL cria o RDO no fim do expediente ou turno, preenchendo todos os dados de produção e clima.</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">2</div>
                      <h5 className="font-bold text-xs text-slate-900">Fiscalização</h5>
                      <p className="text-[11px] text-slate-600">A Gerenciadora/Fiscalização analisa as anotações, registra apontamentos se necessário e insere sua assinatura digital.</p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">3</div>
                      <h5 className="font-bold text-xs text-slate-900">Homologação</h5>
                      <p className="text-[11px] text-slate-600">O Contratante assina o diário, finalizando a validade jurídica para medições e auditorias de qualidade.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-150 pt-4 space-y-2">
                  <h4 className="font-bold text-xs text-slate-900">Regras Fundamentais de Procedimento:</h4>
                  <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1.5">
                    <li><strong>Não acumular dias sem emissão:</strong> O RDO deve ser gerado no mesmo dia ou no máximo na manhã seguinte para evitar perda de dados de efetivo.</li>
                    <li><strong>Dias sem expediente (Fins de semana e Feriados):</strong> Devem ser gerados normalmente com a observação "SEM EXPEDIENTE - DOMINGO/FERIADO" e registro do tempo correspondente.</li>
                    <li><strong>Fiel à Realidade:</strong> Em caso de chuvas ou impedimentos de terceiros, lance imediatamente na aba de Paralisações com horários exatos.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* SEÇÃO 2: CADASTRO E CONFIGURAÇÃO DE OBRAS */}
            {activeSection === "config-obras" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Capítulo 2</span>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-amber-500" />
                    Cadastro e Configuração de Obras
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Como parametrizar contratos, catálogos de serviços e equipes para preenchimento ágil e padronizado.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded text-[10px] font-black">ETAPA 1</span>
                      Acessar o Painel de Configurações de Obras
                    </h4>
                    <p className="text-xs text-slate-600">
                      Na barra lateral esquerda (onde ficam listados os RDOs), clique no botão <strong>"Configurar Obra"</strong> (ou no seletor de obras no topo).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded text-[10px] font-black">ETAPA 2</span>
                      Preenchimento das Informações do Contrato
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc">
                      <li><strong>Nome da Obra:</strong> Nome oficial do empreendimento (ex: "Obra 966 - Reforço Estrutural").</li>
                      <li><strong>Número do Contrato:</strong> Código contratual com o cliente (ex: "CT-2026/045").</li>
                      <li><strong>Cliente e Contratada:</strong> Razão social do Contratante e da SEEL SERVIÇOS DE ENGENHARIA LTDA.</li>
                      <li><strong>Data de Início e Prazo (dias):</strong> Insira a data da Ordem de Serviço (OS) e o prazo contratual. O sistema calcula automaticamente o <em>Prazo Decorrido</em> e <em>Prazo a Vencer</em> em cada RDO!</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded text-[10px] font-black">ETAPA 3</span>
                      Catálogo de Atividades (PQ) e Subcontratadas
                    </h4>
                    <p className="text-xs text-slate-600">
                      Cadastre as principais frentes de trabalho da obra (ex: <em>"Estaca Raiz Ø 310mm"</em>, <em>"Injeção de Calda de Cimento"</em>, <em>"Tirantes Autoperfurantes"</em>).
                    </p>
                    <div className="bg-amber-100/60 p-2.5 rounded-lg text-[11px] text-amber-900 border border-amber-200">
                      💡 <strong>Vantagem Operacional:</strong> Cadastrando o catálogo na obra, ao criar um novo diário você pode importar todos os serviços em 1 clique sem digitar nada novamente!
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded text-[10px] font-black">ETAPA 4</span>
                      Logotipos e Assinantes Padrão
                    </h4>
                    <p className="text-xs text-slate-600">
                      Faça o upload do Logo do Cliente e do Logo SEEL (PNG ou JPEG). Preencha também os nomes do Engenheiro Residente da SEEL, do Fiscal da Gerenciadora e do Fiscal do Cliente para saírem pré-preenchidos nas assinaturas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 3: PREENCHIMENTO DO RDO */}
            {activeSection === "preenchimento-rdo" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Capítulo 3</span>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    Preenchimento Passo a Passo do RDO
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Como preencher as abas do diário com precisão técnica e sem retrabalho.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Aba 1 */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/50">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-sky-600" />
                      1. Condições Climáticas & Praticabilidade
                    </h4>
                    <p className="text-xs text-slate-600">
                      Assinale a condição do tempo em cada um dos três turnos (Manhã, Tarde e Noite): <strong>Bom, Nublado, Chuva Leve, Chuva Forte ou Impraticável</strong>.
                    </p>
                    <p className="text-[11px] text-slate-500 italic">
                      Nota: Se o solo estiver encharcado impedindo movimentação de maquinário pesado (ex: perfuratrizes), marque a condição do terreno como "Impraticável".
                    </p>
                  </div>

                  {/* Aba 2 */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/50">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      2. Mão de Obra (MOD, MOI e Terceirizados)
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                      <li><strong>MOD (Mão de Obra Direta):</strong> Pessoal diretamente ligado à produção (Encarregados, Operadores de Perfuratriz, Sondadores, Soldadores, Armadores, Serventes).</li>
                      <li><strong>MOI (Mão de Obra Indireta):</strong> Equipe técnica e apoio (Engenheiro Residente, Técnico de Segurança do Trabalho, Almoxarife, Administrativo).</li>
                      <li><strong>Subcontratadas:</strong> Lançar o quantitativo de cada empresa parceira em serviço.</li>
                    </ul>
                  </div>

                  {/* Aba 3 */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/50">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      3. Avanço de Atividades & Produção Diária (PQ)
                    </h4>
                    <p className="text-xs text-slate-600">
                      Lance as atividades executadas no dia. Use o botão <strong>"Adicionar Atividade do Catálogo"</strong> para puxar os serviços cadastrados na obra.
                    </p>
                    <p className="text-xs text-slate-600">
                      Preencha a quantidade produzida no dia (ex: 24 m³ ou 3 estacas) e o local exato (ex: <em>"Eixo A-B / Bloco 04"</em>).
                    </p>
                  </div>

                  {/* Aba 4 */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/50">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      4. Paralisações e Fatores Intervenientes
                    </h4>
                    <p className="text-xs text-slate-600">
                      Qualquer interrupção de serviço deve ser detalhada: horário de início, horário de término, motivo (chuva, falta de energia da concessionária, atraso na liberação de projeto pelo cliente, etc.) e o impacto na equipe.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 4: RELATÓRIO FOTOGRÁFICO */}
            {activeSection === "fotos-evidencias" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Capítulo 4</span>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-amber-500" />
                    Relatório Fotográfico & Evidências de Campo
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Como documentar visualmente os serviços para aprovação de medição.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-bold text-xs text-slate-900">Instruções para Anexo de Fotos:</h4>
                    <ul className="text-xs text-slate-600 space-y-2 pl-4 list-disc">
                      <li><strong>Quantidade recomendada:</strong> De 2 a 6 fotos por diário, registrando as etapas críticas (ex: perfuração, armação, concretagem, ensaios de campo).</li>
                      <li><strong>Legendas Claras:</strong> Nunca deixe uma foto sem legenda. Escreva exatamente o que está sendo visto (ex: <em>"Execução da estaca E-12 no Eixo 4 com perfuratriz hidráulica"</em>).</li>
                      <li><strong>Compressão Automática:</strong> O sistema comprime automaticamente imagens pesadas tiradas no celular para garantir que o salvamento e o envio sejam instantâneos, sem travar o sinal de internet da obra.</li>
                    </ul>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5">
                    <h5 className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Boas Práticas de Enquadramento:
                    </h5>
                    <p className="text-xs text-emerald-800">
                      Tire fotos horizontais (paisagem) com boa iluminação, mostrando tanto a visão geral da frente de serviço quanto detalhes técnicos do elemento estrutural e uso correto de EPIs pela equipe.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 5: ASSINATURAS DIGITAIS E LOTE */}
            {activeSection === "assinaturas-lote" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Capítulo 5</span>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <FileSignature className="w-5 h-5 text-amber-500" />
                    Assinaturas Digitais & Assinatura em Lote
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Como validar e formalizar os relatórios individualmente ou em múltiplos diários.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-bold text-xs text-slate-900">1. Assinatura Individual no RDO</h4>
                    <p className="text-xs text-slate-600">
                      No final do editor do RDO, cada responsável (Emissor SEEL, Fiscalização Gerenciadora e Contratante) pode inserir seu nome, cargo/função e clicar em <strong>"Assinar Digitalmente"</strong>.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      O sistema registra data, hora e carimbo digital com selo de autenticidade criptografado.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
                    <h4 className="font-bold text-xs text-amber-950 flex items-center gap-2">
                      <FileSignature className="w-4 h-4 text-amber-600" />
                      2. Como usar a Ferramenta "Assinar em Lote"
                    </h4>
                    <p className="text-xs text-amber-900">
                      Para agilizar fechamentos de quinzena ou mês:
                    </p>
                    <ol className="text-xs text-amber-800 space-y-1.5 pl-4 list-decimal">
                      <li>Na barra superior, clique no botão <strong>"Assinar em Lote"</strong>.</li>
                      <li>Selecione o papel que está assinando (Emissor, Gerenciadora ou Contratante).</li>
                      <li>Filtre o período de datas desejado.</li>
                      <li>Marque os diários que deseja aprovar e clique em <strong>"Confirmar Assinaturas"</strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 6: IMPRESSÃO EM PDF E RELATÓRIOS */}
            {activeSection === "relatorios-impressao" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Capítulo 6</span>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Printer className="w-5 h-5 text-amber-500" />
                    Impressão Oficial em PDF & Relatórios Gerenciais
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Geração de PDFs prontos para impressão física ou envio eletrônico à fiscalização.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-bold text-xs text-slate-900">Impressão do Diário Individual (A4 SEEL)</h4>
                    <p className="text-xs text-slate-600">
                      No editor do RDO, clique no botão azul <strong>"Visualizar / Imprimir RDO"</strong> no topo da página. O sistema exibirá a prévia exata no layout padrão timbrado da SEEL.
                    </p>
                    <p className="text-xs text-slate-600">
                      Clique em <strong>"Salvar como PDF / Imprimir"</strong> no topo da prévia.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-bold text-xs text-slate-900">Impressão em Lote (Livro de Diários da Obra)</h4>
                    <p className="text-xs text-slate-600">
                      Na barra superior, clique em <strong>"Imprimir Lote"</strong>. Você pode selecionar o período (ex: 01/08/2026 a 31/08/2026) e gerar todos os diários encadernados em sequência contínua com quebras de página automáticas.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-bold text-xs text-slate-900">Aba "Relatórios Gerenciais"</h4>
                    <p className="text-xs text-slate-600">
                      No topo, clique na aba <strong>"Relatórios Gerenciais"</strong> para visualizar os gráficos consolidados de histograma de mão de obra, dias de chuva acumulados, status de assinaturas e avanço de cada serviço.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 7: RESTAURAÇÃO DE OBRAS */}
            {activeSection === "restauracao-dados" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Capítulo 7</span>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-amber-500" />
                    Restauração de Obras & Gestão de Dados
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Como recuperar obras e garantir a integridade dos diários existentes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-bold text-xs text-slate-900">Como funciona a Restauração de Obras?</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Caso uma obra tenha sido excluída por engano das configurações, os diários (RDOs) salvos continuam preservados no banco de dados. O sistema possui um scanner inteligente capaz de reconstruir a obra a partir dos RDOs.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
                    <h4 className="font-bold text-xs text-amber-900">Passo a Passo para Restaurar uma Obra:</h4>
                    <ol className="text-xs text-amber-800 space-y-1.5 pl-4 list-decimal">
                      <li>Abra o <strong>"Painel de Configurações de Obras"</strong>.</li>
                      <li>Na barra lateral esquerda, localize a caixa <strong>"Restaurar Obra"</strong>.</li>
                      <li>Selecione no menu suspenso a obra que deseja reativar (o sistema mostra o nome da obra e a quantidade de RDOs encontrados).</li>
                      <li>Clique no botão <strong>"Restaurar Obra Selecionada"</strong>.</li>
                      <li>Pronto! O cadastro da obra, atividades e dados contratuais serão reativados imediatamente.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 8: BOAS PRÁTICAS E FAQ */}
            {activeSection === "faq-dicas" && (
              <div className="space-y-6 animate-fade-in max-w-3xl">
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Capítulo 8</span>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-500" />
                    Boas Práticas & Dúvidas Frequentes (FAQ)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Orientações práticas para o dia a dia na engenharia de campo.
                  </p>
                </div>

                <div className="space-y-3">
                  <details className="group border border-slate-200 rounded-xl p-3 bg-slate-50 open:bg-white transition-colors">
                    <summary className="font-bold text-xs text-slate-900 cursor-pointer flex items-center justify-between">
                      <span>Como agir quando a chuva paralisar apenas parte das frentes de serviço?</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
                      Registre no clima o período de chuva e na aba de Paralisações aponte especificamente quais frentes foram paralisadas (ex: <em>"Terraplenagem paralisada das 14h às 17h por solo encharcado; frentes internas mantiveram produção normal"</em>).
                    </p>
                  </details>

                  <details className="group border border-slate-200 rounded-xl p-3 bg-slate-50 open:bg-white transition-colors">
                    <summary className="font-bold text-xs text-slate-900 cursor-pointer flex items-center justify-between">
                      <span>Posso emitir o diário offline se o sinal de 4G da obra oscilar?</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
                      Sim! O sistema grava em cache local no seu navegador. Assim que a conexão for restabelecida e você clicar em Salvar, todos os dados são sincronizados no banco de dados.
                    </p>
                  </details>

                  <details className="group border border-slate-200 rounded-xl p-3 bg-slate-50 open:bg-white transition-colors">
                    <summary className="font-bold text-xs text-slate-900 cursor-pointer flex items-center justify-between">
                      <span>Qual a diferença entre Mão de Obra Direta (MOD) e Indireta (MOI)?</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
                      <strong>MOD:</strong> Profissionais que realizam a atividade-fim de produção (operadores, soldadores, pedreiros, serventes). <br/>
                      <strong>MOI:</strong> Profissionais de gestão, suporte técnico e segurança (engenheiros, técnicos de segurança, almoxarifes, encarregados gerais).
                    </p>
                  </details>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Footer */}
        <footer className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Dúvidas operacionais?</span>
            <span>Consulte o responsável técnico da obra ou a gerência de contratos SEEL.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
          >
            Entendido, Fechar Manual
          </button>
        </footer>

      </div>
    </div>
  );
};
