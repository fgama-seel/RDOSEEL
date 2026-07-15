/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc,
  deleteDoc, 
  query, 
  where,
  orderBy,
  getDocFromServer
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Detect if we have real credentials
export const isFirebaseConfigured = 
  firebaseConfig && 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "PLACEHOLDER_API_KEY";

let app: any = null;
export let auth: any = null;
export let db: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    // Test connection as instructed by skill
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("the client is offline")) {
          console.warn("Firebase client is currently offline.");
        }
      }
    };
    testConnection();
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
}

// Error handlers as instructed by skill
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Global default fallback seed reports for when LocalStorage is empty.
// This is to populate initial charts and history for the user right away!
import { RdoReport } from "./types";

export const DEFAULT_REPORTS: RdoReport[] = [
  {
    id: "rdo-example-1",
    userId: "demo-user",
    rdoNo: "BDG-1224",
    data: "2019-05-08",
    obra: "BUILDING",
    cliente: "XWS",
    gestor: "",
    gerenciadora: "SABESP",
    prazo: 1461,
    prazoIncorrido: 1224,
    prazoFaltante: 237,
    inicio: "01/01/2016",
    termino: "31/12/2019",
    acidentes: {
      comAfastamentoDia: 0,
      comAfastamentoAusentesDia: 1,
      comAfastamentoAcumulado: 1,
      semAfastamentoDia: 0,
      semAfastamentoAcumulado: 8,
    },
    efetivoSummary: {
      moi: 2,
      mod: 7,
      subcontratadosMoiMod: 8,
      afastados: 0,
      total: 17,
    },
    paralisacoesSummary: {
      totalHorasParalisadasDia: 10,
      numeroParalisacoes: 4,
    },
    equipamentosSummary: {
      mobilizados: 15,
      subcontratadosMobilizados: 0,
      total: 15,
    },
    atividades: [
      {
        id: "act-1",
        ref: "001",
        fase: "ATIVIDADES - FASE 01 - REDE EXTERNA",
        identificador: "3.2",
        descricao: "Demolicao manual concreto armado (pilar / viga / laje) - incl empilhacao lateral no canteiro",
        intervalo: "E+m",
        total: "15"
      },
      {
        id: "act-2",
        ref: "002",
        fase: "ATIVIDADES - FASE 01 - REDE EXTERNA",
        identificador: "3.6",
        descricao: "Aterro apiloado (manual) em camadas de 20 cm com material de empréstimo",
        intervalo: "E+m",
        total: "22"
      },
      {
        id: "act-3",
        ref: "003",
        fase: "ATIVIDADES - GERÊNCIA",
        identificador: "1.1",
        descricao: "Engenheiro ou Arquiteto auxiliar/júnior de obra.",
        intervalo: "E+m",
        total: "1"
      },
      {
        id: "act-4",
        ref: "004",
        fase: "ATIVIDADES - FASE 12 - COND. REAL PARK",
        identificador: "3.4",
        descricao: "Demolição de lastro de concreto simples",
        intervalo: "E+m",
        total: "40"
      },
      {
        id: "act-5",
        ref: "005",
        fase: "ATIVIDADES - ADMINISTRAÇÃO CONTRATUAL",
        identificador: "4.2",
        descricao: "Concreto magro E=5cm, preparo com betoneira (2 imagens)",
        intervalo: "E+m",
        total: "50",
        comentario: "Comentário obra....",
        imagens: [
          "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=400",
          "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400"
        ]
      },
      {
        id: "act-6",
        ref: "006",
        fase: "ATIVIDADES - ADMINISTRAÇÃO CONTRATUAL",
        identificador: "4.3",
        descricao: "Forma tabua p/concreto em fundacao s/reaproveitamento",
        intervalo: "E+m",
        total: "12"
      },
      {
        id: "act-7",
        ref: "007",
        fase: "ATIVIDADES - ADMINISTRAÇÃO CONTRATUAL",
        identificador: "5.5",
        descricao: "Chapisco traço 1:3 com 0,5cm de espessura, preparo manual",
        intervalo: "E+m",
        total: "100"
      },
      {
        id: "act-8",
        ref: "008",
        fase: "ATIVIDADES - ADMINISTRAÇÃO CONTRATUAL",
        identificador: "13.6",
        descricao: "Limpeza final da obra",
        intervalo: "E+m",
        total: "1",
        comentario: "Limpeza da área...."
      },
      {
        id: "act-9",
        ref: "009",
        fase: "ATIVIDADES - SUPRIMENTOS",
        identificador: "5.1",
        descricao: "Painel de gesso acartonado simples interna, espessura final 100 mm",
        intervalo: "E+m",
        total: "18"
      },
      {
        id: "act-10",
        ref: "010",
        fase: "ATIVIDADES - PROJETOS",
        identificador: "Mapeamento",
        descricao: "Mapeamento topográfico do terreno adjacente",
        intervalo: "E+m",
        total: "1"
      }
    ],
    fatosRelevantes: [
      "Continuamos aguardando a aprovação da consulta técnica para alteração dos serviços"
    ],
    paralisacoesDetalhe: {
      chuva: {
        ativo: true,
        horas: ["14h", "15h", "16h", "17h"],
        frentes: "Todas as frentes",
        local: "Geral",
        maoDeObraParalisada: "Todas as equipes",
        comentarios: "Chuvoso e impedimento geral",
        total: "4h"
      },
      raios: {
        ativo: false,
        horas: [],
        frentes: "Todas as frentes",
        local: "",
        maoDeObraParalisada: "",
        comentarios: "Paralisadas todas as frentes das 14h (inclusive) até as 17h. O horário de paralisação foi registrado sob Chuva neste mesmo RDO.",
        total: "0h"
      },
      projetos: {
        ativo: true,
        horas: ["9h", "10h", "11h", "12h"],
        frentes: "Frente 1",
        local: "Local: Frente 1",
        maoDeObraParalisada: "Equipe de fundações",
        comentarios: "Revisão de fôrmas",
        total: "4h"
      },
      vizinhos: {
        ativo: true,
        horas: ["10h", "11h"],
        frentes: "Geral",
        local: "",
        maoDeObraParalisada: "Betoneiras",
        comentarios: "Paralisação devido a pedido do proprietário do local que...",
        total: "2h"
      },
      outros: {
        ativo: false,
        horas: [],
        frentes: "",
        local: "",
        maoDeObraParalisada: "",
        comentarios: "",
        total: "0h"
      }
    },
    chuvaMmPorHora: {
      "6h": 0, "7h": 0, "8h": 0, "9h": 0, "10h": 0, "11h": 0, "12h": 0, "13h": 0, "14h": 0,
      "15h": 0.3, "16h": 0, "17h": 0, "18h": 0, "19h": 0, "20h": 0, "21h": 0, "22h": 0, "23h": 0,
      "0h": 0, "1h": 0, "2h": 0, "3h": 0, "4h": 0, "5h": 0
    },
    precipitacao: {
      manha: 0.0,
      tarde: 0.34,
      noite: 0.0,
      total: 0.34,
      acumuladoMes: 0.34,
      acumuladoMesAnterior: 55.8,
    },
    efetivoDetalhado: [
      {
        id: "co-1",
        nome: "S SEEL - Engenharia",
        items: [
          { id: "li-1", cargo: "Armador", c: 1, f: 0, a: 0, t: 1, moiMod: "MOD" },
          { id: "li-2", cargo: "Carpinteiro", c: 2, f: 0, a: 0, t: 2, moiMod: "MOD" },
          { id: "li-3", cargo: "Mestre de obras", c: 1, f: 0, a: 0, t: 1, moiMod: "MOD" },
          { id: "li-4", cargo: "Teste1", c: 1, f: 0, a: 0, t: 1, moiMod: "MOI" },
          { id: "li-5", cargo: "Arquiteto", c: 1, f: 0, a: 0, t: 1, moiMod: "MOI" },
          { id: "li-6", cargo: "Eletricista", c: 1, f: 0, a: 0, t: 1, moiMod: "MOD" },
          { id: "li-7", cargo: "Soldador", c: 2, f: 0, a: 0, t: 2, moiMod: "MOD" }
        ]
      },
      {
        id: "co-2",
        nome: "Irmãos Freitas",
        items: [
          { id: "li-8", cargo: "Motorista caminhão e carro leve", c: 4, f: 0, a: 0, t: 4, moiMod: "MOI" },
          { id: "li-9", cargo: "Operador de equipamento movimentação", c: 2, f: 0, a: 0, t: 2, moiMod: "MOI" },
          { id: "li-10", cargo: "Vigia", c: 1, f: 0, a: 0, t: 1, moiMod: "MOI" }
        ]
      },
      {
        id: "co-3",
        nome: "Hidropav",
        items: [
          { id: "li-11", cargo: "Desenhista projetista", c: 1, f: 0, a: 0, t: 1, moiMod: "MOD" }
        ]
      }
    ],
    equipamentosDetalhado: [
      { id: "eq-1", descricao: "AUTO-BETONEIRA 1", quantidade: 12, empresa: "SEEL" },
      { id: "eq-2", descricao: "CAMINHÃO BASCULANTE 12M³", quantidade: 3, empresa: "SEEL" }
    ],
    comentariosGerenciadoraContratante: [
      "Alteração de escopo necessária. (1 imagem) (arquivo anexo: \"Certificado_Calibração_Interna.pdf\"; \"PLANILHA-16-03-2020.xlsx\")",
      "Edição texto conforme solicitação do cliente."
    ],
    emitenteNome: "",
    emitenteConsolidado: "Consolidado em 17/11/2021 14:10:00 por usuarioteste",
    emitenteHash: "ff2b2060a7b8e8ae496a9553579effac",
    contratanteNome: "",
    contratanteAprovado: "Aprovado em 17/11/2021 14:17:12 por clienteteste3",
    contratanteHash: "29381edd9b0233ff2655f9571859320a"
  }
];
