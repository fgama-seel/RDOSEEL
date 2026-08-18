/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AccidentSummary {
  comAfastamentoDia: number;
  comAfastamentoAusentesDia: number;
  comAfastamentoAcumulado: number;
  semAfastamentoDia: number;
  semAfastamentoAcumulado: number;
}

export interface EffectiveSummary {
  moi: number;
  mod: number;
  subcontratadosMoiMod: number;
  afastados: number;
  total: number;
  moiTotal?: number;
  modTotal?: number;
  subcontratadosTotal?: number;
  afastadosTotal?: number;
  totalGeralPresentes?: number;
}

export interface StoppagesSummary {
  totalHorasParalisadasDia: number;
  numeroParalisacoes: number;
}

export interface EquipmentSummary {
  mobilizados: number;
  subcontratadosMobilizados: number;
  total: number;
  proptiosLocados?: number;
  subcontratados?: number;
  totalEquipamentos?: number;
}

export interface Activity {
  id: string;
  ref: string;
  fase: string; // e.g. "Fase 01 - Rede Externa", "Gerência", "Planejamento" etc.
  identificador: string;
  descricao: string;
  intervalo: string;
  total: string;
  comentario?: string;
  comentarios?: string;
  local?: string;
  pqItemDesc?: string;
  imagens?: string[]; // base64 encoded jpeg/png or urls
}

export const HOURS_LIST = [
  "6h", "7h", "8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h", "20h", "21h", "22h", "23h",
  "0h", "1h", "2h", "3h", "4h", "5h"
];

export interface StoppageFrenteItem {
  id: string;
  nome: string;
  pqItemId?: string;
  pqItemDesc?: string;
  maoDeObraIds?: string[];
  maoDeObraDescs?: string[];
  equipamentoIds?: string[];
  equipamentoDescs?: string[];
}

export interface StoppageDetailRow {
  ativo: boolean;
  horas: string[]; // array of strings like "14h", "15h" etc.
  frentes: string;
  frentesItems?: StoppageFrenteItem[];
  local: string;
  maoDeObraParalisada: string;
  comentarios: string;
  total: string; // e.g. "4h"
}

export interface StoppagesDetail {
  [key: string]: StoppageDetailRow;
  chuva: StoppageDetailRow;
  raios: StoppageDetailRow;
  projetos: StoppageDetailRow;
  vizinhos: StoppageDetailRow;
  outros: StoppageDetailRow;
}

export interface PrecipitationResumo {
  manha: number;
  tarde: number;
  noite: number;
  total: number;
  acumuladoMes: number;
  acumuladoMesAnterior: number;
}

export interface LaborDetailItem {
  id: string;
  cargo: string;
  c: number; // Cadastrados
  f: number; // Faltas
  a: number; // Atestado
  t: number; // Total
  moiMod: "MOI" | "MOD";
}

export interface CompanyLaborGroup {
  id: string;
  nome: string;
  items: LaborDetailItem[];
}

export interface EquipmentMobilizedDetail {
  id: string;
  descricao: string;
  quantidade: number;
  empresa: string;
}

export interface RdoReport {
  id?: string;
  userId: string;
  rdoNo: string;
  data: string; // YYYY-MM-DD
  obra: string;
  obraId?: string; // Links to the ObraConfig
  anexos?: { id: string, dataUrl: string, name?: string, type?: string }[]; // base64 images or PDFs
  status?: "Em Digitação" | "Enviado para Fiscalização" | "Finalizado" | "Assinado" | "Cancelado" | string;
  creatorEmail?: string;
  cliente: string;
  contratada?: string; // Main contractor (e.g., SEEL)
  gestor: string;
  gerenciadora: string;
  prazo: number;
  prazoIncorrido: number;
  prazoFaltante: number;
  inicio: string; // DD/MM/YYYY
  termino: string; // DD/MM/YYYY
  
  // Summaries
  acidentes: AccidentSummary;
  efetivoSummary: EffectiveSummary;
  paralisacoesSummary: StoppagesSummary;
  equipamentosSummary: EquipmentSummary;
  
  // Sections
  atividades: Activity[];
  fatosRelevantes: string[];
  paralisacoesDetalhe: StoppagesDetail;
  
  // Climatic conditions
  chuvaMmPorHora: Record<string, number>; // keys like "6h", "7h", etc.
  precipitacao: PrecipitationResumo;
  
  // Detailed Boards
  efetivoDetalhado: CompanyLaborGroup[];
  equipamentosDetalhado: EquipmentMobilizedDetail[];
  comentariosGerenciadoraContratante: string[];
  comentariosFiscalizacao?: string[];
  comentariosGerenciadora?: string[];
  comentariosContratada?: string[];
  fiscalizacaoFinalizada?: boolean; // Tracking if fiscalização has been approved/finalized
  gerenciadoraFinalizada?: boolean; // Tracking if gerenciadora has been approved/finalized
  
  // Notification fields for Contractor alerts
  hasCommentNotification?: boolean;
  commentNotificationDate?: string;
  commentNotificationSource?: string;
  commentNotificationText?: string;
  
  // Signatures
  uuid?: string;
  contratoNo?: string;
  contratante?: string;
  emitenteNome: string;
  emitenteConsolidado: string;
  emitenteHash: string;
  emitenteAssinado?: boolean;
  emitenteDataAssinatura?: string;
  
  gerenciadoraNome?: string;
  gerenciadoraConsolidado?: string;
  gerenciadoraHash?: string;
  gerenciadoraAssinado?: boolean;
  gerenciadoraDataAssinatura?: string;
  
  contratanteNome: string;
  contratanteAprovado: string;
  contratanteHash: string;
  contratanteAssinado?: boolean;
  contratanteDataAssinatura?: string;
  
  createdAt?: string;
  updatedAt?: string;
}

export interface ObraActivity {
  id: string;
  ref: string;
  fase: string;
  identificador: string;
  descricao: string;
  unidade?: string;
}

export interface ObraPermission {
  email: string;
  access: "view" | "edit" | "fiscalizacao" | "gerenciadora" | "adm" | "encarregado";
}

export interface AuditLog {
  id?: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ObraEfetivoMember {
  id: string;
  empresa: string;
  cargo: string;
  moiMod: "MOI" | "MOD";
  cadastradosPadrao?: number;
}

export interface ObraConfig {
  id?: string;
  userId: string;
  nome: string;
  numeroContrato: string;
  cliente: string;
  contratada?: string; // Main contractor (e.g., SEEL)
  gerenciadora: string;
  dataInicio: string; // YYYY-MM-DD
  prazoContratual: number; // in days
  aditivoPrazo: number; // in days
  logoCliente?: string; // base64
  logoSeel?: string; // base64
  logoUrl?: string;
  atividades: ObraActivity[]; // PQ catalogue
  subcontratadas: string[]; // list of companies
  quadroEfetivos?: ObraEfetivoMember[]; // Quadro de Efetivos cadastrado na Obra
  permissoes: ObraPermission[];
  permissoesEmails?: string[];
  
  // Default Signers Configured per Obra
  emissorNomeDefault?: string;
  fiscalGerenciadoraNomeDefault?: string;
  fiscalContratanteNomeDefault?: string;
  fiscalAprovadorNomeDefault?: string;
  
  createdAt?: string;
  updatedAt?: string;
}

export interface OrphanObraInfo {
  key: string;
  nome: string;
  obraId?: string;
  totalRdos: number;
  lastRdoDate?: string;
  cliente?: string;
  contratada?: string;
  gerenciadora?: string;
  numeroContrato?: string;
}

