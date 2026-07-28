/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  RdoReport, 
  CompanyLaborGroup, 
  EquipmentMobilizedDetail, 
  Activity, 
  StoppagesDetail,
  ObraConfig,
  AuditLog
} from "../types";
import { 
  isFirebaseConfigured, 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType,
  DEFAULT_REPORTS 
} from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from "firebase/firestore";

interface RdoContextType {
  user: User | { uid: string; email: string } | null;
  isLoading: boolean;
  isFirebase: boolean;
  isLocalFallback: boolean;
  setIsLocalFallback: (fallback: boolean) => void;
  reports: RdoReport[];
  currentReport: RdoReport | null;
  setCurrentReport: (rdo: RdoReport | null) => void;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  saveReport: (report: RdoReport) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  createNewReport: () => RdoReport;
  loadReportToEdit: (id: string) => void;
  // Obras additions
  obras: ObraConfig[];
  currentObra: ObraConfig | null;
  setCurrentObra: (obra: ObraConfig | null) => void;
  saveObra: (obra: ObraConfig) => Promise<void>;
  deleteObra: (id: string) => Promise<void>;
  isObrasLoading: boolean;
  
  // Admin & Audit
  isGlobalAdmin: boolean;
  logAction: (action: string, details: string) => Promise<void>;
  getAuditLogs: () => Promise<AuditLog[]>;
  firebaseError: string | null;
  clearFirebaseError: () => void;
}

const RdoContext = createContext<RdoContextType | undefined>(undefined);

const LOCAL_REPORTS_KEY = "rdo_reports_local";
const LOCAL_USER_KEY = "rdo_user_local";

const GLOBAL_ADMINS = ["adm@adm.com", "dev@seel.com.br", "fgama@seel.com.br"];

const safeSetLocalStorage = (key: string, value: any) => {
  try {
    const stringified = typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, stringified);
  } catch (err: any) {
    console.warn(`localStorage quota exceeded for key '${key}', applying fallback optimization...`, err);
    if (Array.isArray(value)) {
      try {
        const slice = value.slice(0, 25);
        localStorage.setItem(key, JSON.stringify(slice));
      } catch (err2) {
        try {
          const stripped = value.slice(0, 15).map((item: any) => {
            if (!item || typeof item !== "object") return item;
            return {
              ...item,
              fotos: item.fotos?.map((f: any) => ({
                ...f,
                url: typeof f?.url === "string" && f.url.startsWith("data:") ? "" : f?.url
              })),
              anexos: item.anexos?.map((a: any) => ({
                ...a,
                url: typeof a?.url === "string" && a.url.startsWith("data:") ? "" : a?.url
              })),
              emitenteAssinaturaImg: typeof item.emitenteAssinaturaImg === "string" && item.emitenteAssinaturaImg.startsWith("data:") ? "" : item.emitenteAssinaturaImg,
              gerenciadoraAssinaturaImg: typeof item.gerenciadoraAssinaturaImg === "string" && item.gerenciadoraAssinaturaImg.startsWith("data:") ? "" : item.gerenciadoraAssinaturaImg,
              contratanteAssinaturaImg: typeof item.contratanteAssinaturaImg === "string" && item.contratanteAssinaturaImg.startsWith("data:") ? "" : item.contratanteAssinaturaImg,
            };
          });
          localStorage.setItem(key, JSON.stringify(stripped));
        } catch (err3) {
          console.error("Critical: Storage quota exceeded even after stripping large assets.", err3);
        }
      }
    }
  }
};

const DEFAULT_OBRAS: ObraConfig[] = [
  {
    id: "obra-saneamento-leste",
    userId: "demo-user",
    nome: "SANEAMENTO LESTE",
    numeroContrato: "CT-2015/09",
    cliente: "SABESP",
    contratada: "SEEL SERVIÇOS DE ENGENHARIA LTDA",
    gerenciadora: "SEEL",
    dataInicio: "2016-01-01",
    prazoContratual: 1400,
    aditivoPrazo: 61,
    subcontratadas: ["Irmãos Freitas", "Hidropav"],
    permissoes: [],
    atividades: [
      { id: "act-1", ref: "001", fase: "ATIVIDADES - FASE 01 - REDE EXTERNA", identificador: "3.2", descricao: "Demolicao manual concreto armado (pilar / viga / laje) - incl empilhacao lateral no canteiro", unidade: "m³" },
      { id: "act-2", ref: "002", fase: "ATIVIDADES - FASE 01 - REDE EXTERNA", identificador: "3.6", descricao: "Aterro apiloado (manual) em camadas de 20 cm com material de empréstimo", unidade: "m³" },
      { id: "act-3", ref: "003", fase: "ATIVIDADES - GERÊNCIA", identificador: "1.1", descricao: "Engenheiro ou Arquiteto auxiliar/júnior de obra.", unidade: "un" },
      { id: "act-4", ref: "004", fase: "ATIVIDADES - FASE 12 - COND. REAL PARK", identificador: "3.4", descricao: "Demolição de lastro de concreto simples", unidade: "m³" },
      { id: "act-5", ref: "005", fase: "ATIVIDADES - ADMINISTRAÇÃO CONTRATUAL", identificador: "4.2", descricao: "Concreto magro E=5cm, preparo com betoneira", unidade: "m²" }
    ]
  }
];

export const RdoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | { uid: string; email: string } | null>(null);
  const [reports, setReports] = useState<RdoReport[]>([]);
  const [currentReport, setCurrentReport] = useState<RdoReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  
  // Obras additions
  const [obras, setObras] = useState<ObraConfig[]>([]);
  const [currentObra, setCurrentObra] = useState<ObraConfig | null>(null);
  const [isObrasLoading, setIsObrasLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const clearFirebaseError = () => setFirebaseError(null);
  
  const isGlobalAdmin = user?.email ? GLOBAL_ADMINS.includes(user.email.toLowerCase()) : false;

  const [useLocalFallback, setUseLocalFallbackState] = useState(() => {
    return localStorage.getItem("rdo_use_local_mode") === "true";
  });

  const setIsLocalFallback = (fallback: boolean) => {
    safeSetLocalStorage("rdo_use_local_mode", fallback ? "true" : "false");
    setUseLocalFallbackState(fallback);
  };

  const activeIsFirebase = isFirebaseConfigured && !useLocalFallback;

  // Auth State
  useEffect(() => {
    if (activeIsFirebase && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      });
      return unsubscribe;
    } else {
      // Local Mode Auth Check
      const storedUser = localStorage.getItem(LOCAL_USER_KEY);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      }
      setIsLoading(false);
    }
  }, [activeIsFirebase]);

  // Fetch Obras when User changes
  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setObras([]);
      setCurrentObra(null);
      return;
    }

    if (activeIsFirebase && db) {
      const fetchFirebaseObras = async () => {
        setIsObrasLoading(true);
        try {
          const loadedMap: Record<string, ObraConfig> = {};

          // Fetch ALL Obras from Firestore
          const qAll = query(collection(db, "obras"));
          const snapAll = await getDocs(qAll);
          snapAll.forEach((docSnap) => {
            loadedMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as ObraConfig;
          });

          let loaded = Object.values(loadedMap);

          if (loaded.length === 0) {
            // Seed a default obra for the user in Firebase if they have none
            const defaultSeeded: ObraConfig = {
              id: "obra-saneamento-leste",
              userId: user.uid,
              nome: "SANEAMENTO LESTE",
              numeroContrato: "CT-2015/09",
              cliente: "SABESP",
              contratada: "SEEL SERVIÇOS DE ENGENHARIA LTDA",
              gerenciadora: "SEEL",
              dataInicio: "2016-01-01",
              prazoContratual: 1400,
              aditivoPrazo: 61,
              subcontratadas: ["Irmãos Freitas", "Hidropav"],
              permissoes: [],
              permissoesEmails: [],
              atividades: [
                { id: "act-1", ref: "001", fase: "ATIVIDADES - FASE 01 - REDE EXTERNA", identificador: "3.2", descricao: "Demolicao manual concreto armado (pilar / viga / laje) - incl empilhacao lateral no canteiro", unidade: "m³" },
                { id: "act-2", ref: "002", fase: "ATIVIDADES - FASE 01 - REDE EXTERNA", identificador: "3.6", descricao: "Aterro apiloado (manual) em camadas de 20 cm com material de empréstimo", unidade: "m³" },
                { id: "act-3", ref: "003", fase: "ATIVIDADES - GERÊNCIA", identificador: "1.1", descricao: "Engenheiro ou Arquiteto auxiliar/júnior de obra.", unidade: "un" },
                { id: "act-4", ref: "004", fase: "ATIVIDADES - FASE 12 - COND. REAL PARK", identificador: "3.4", descricao: "Demolição de lastro de concreto simples", unidade: "m³" },
                { id: "act-5", ref: "005", fase: "ATIVIDADES - ADMINISTRAÇÃO CONTRATUAL", identificador: "4.2", descricao: "Concreto magro E=5cm, preparo com betoneira", unidade: "m²" }
              ],
              createdAt: new Date().toISOString()
            };
            const docRef = doc(db, "obras", "obra-saneamento-leste");
            await setDoc(docRef, defaultSeeded);
            loaded = [defaultSeeded];
          }

          setObras(loaded);
          localStorage.setItem("rdo_obras_local", JSON.stringify(loaded));
          const storedCurrentId = localStorage.getItem("rdo_current_obra_id");
          const found = loaded.find(o => o.id === storedCurrentId);
          setCurrentObra(found || loaded[0]);
        } catch (error: any) {
          console.error("Firebase fetch Obras failed, falling back to local:", error);
          if (error?.message?.toLowerCase().includes("quota") || error?.code?.includes("resource-exhausted")) {
            setFirebaseError("O limite diário de leituras do Firebase (Quota Exceeded) foi atingido. O aplicativo alternou para os dados salvos em modo Local para garantir continuidade.");
          }
          loadLocalObras();
        } finally {
          setIsObrasLoading(false);
        }
      };
      fetchFirebaseObras();
    } else {
      loadLocalObras();
    }
  }, [user, isLoading, activeIsFirebase]);

  const logAction = async (action: string, details: string) => {
    if (!user || !activeIsFirebase || !db) return;
    try {
      const logEntry: AuditLog = {
        userId: user.uid,
        userEmail: user.email || "unknown",
        action,
        details,
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, "audit_logs"), logEntry);
    } catch (e) {
      console.error("Failed to log action", e);
    }
  };

  const getAuditLogs = async (): Promise<AuditLog[]> => {
    if (!activeIsFirebase || !db) return [];
    try {
      const qLogs = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
      const snap = await getDocs(qLogs);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
    } catch (e) {
      console.error("Failed to fetch audit logs", e);
      return [];
    }
  };

  const loadLocalObras = () => {
    const raw = localStorage.getItem("rdo_obras_local");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ObraConfig[];
        setObras(parsed);
        if (parsed.length > 0) {
          const storedCurrentId = localStorage.getItem("rdo_current_obra_id");
          const found = parsed.find(o => o.id === storedCurrentId);
          setCurrentObra(found || parsed[0]);
        }
      } catch {
        setObras(DEFAULT_OBRAS);
        setCurrentObra(DEFAULT_OBRAS[0]);
      }
    } else {
      safeSetLocalStorage("rdo_obras_local", DEFAULT_OBRAS);
      setObras(DEFAULT_OBRAS);
      setCurrentObra(DEFAULT_OBRAS[0]);
    }
  };

  useEffect(() => {
    if (currentObra?.id) {
      safeSetLocalStorage("rdo_current_obra_id", currentObra.id);
    }
  }, [currentObra]);

  // Fetch Reports when User or currentObra changes
  useEffect(() => {
    if (isLoading) return;

    if (!user || !currentObra) {
      setReports([]);
      setCurrentReport(null);
      return;
    }

    if (activeIsFirebase && db) {
      const fetchFirebaseReports = async () => {
        setIsReportsLoading(true);
        const path = "rdos";
        try {
          const snapAll = await getDocs(collection(db, path));
          const allLoaded: RdoReport[] = [];
          snapAll.forEach((docSnap) => {
            const rData = docSnap.data();
            allLoaded.push({ 
              id: docSnap.id, 
              ...rData,
              obraId: rData.obraId || "obra-saneamento-leste",
              status: rData.status || "Em Digitação"
            } as RdoReport);
          });
          
          let filtered = allLoaded.filter(r => 
            r.obraId === currentObra.id || 
            r.obra === currentObra.nome || 
            (!r.obraId && currentObra.id === "obra-saneamento-leste")
          );

          // If Firestore rdos collection is empty, seed default sample reports to Firebase
          if (allLoaded.length === 0) {
            const seededReports: RdoReport[] = [];
            for (const defR of DEFAULT_REPORTS) {
              const cleaned = {
                ...defR,
                obraId: currentObra.id,
                userId: user.uid,
                createdAt: new Date().toISOString()
              };
              const docRef = doc(db, path, defR.id);
              await setDoc(docRef, cleaned);
              seededReports.push(cleaned);
            }
            filtered = seededReports;
          }

          // Sync cache in localStorage safely
          safeSetLocalStorage(LOCAL_REPORTS_KEY, allLoaded);

          filtered.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
          
          setReports(filtered);
          if (filtered.length > 0) {
             const storedCurrentRdoId = localStorage.getItem("rdo_current_report_id");
             const found = filtered.find(r => r.id === storedCurrentRdoId);
             setCurrentReport(found || filtered[0]);
          } else {
             setCurrentReport(null);
          }
        } catch (error: any) {
          console.error("Firebase fetch failed, falling back to local:", error);
          const isQuota = error?.message?.toLowerCase().includes("quota") || error?.code?.includes("resource-exhausted");
          if (isQuota) {
            setFirebaseError("O limite diário de leituras do Firebase Firestore (Spark 50.000 leituras/dia) foi atingido. O sistema ativou a cópia Local dos RDOs para não interromper seu trabalho.");
          }
          loadLocalReports();
        } finally {
          setIsReportsLoading(false);
        }
      };
      fetchFirebaseReports();
    } else {
      loadLocalReports();
    }
  }, [user, isLoading, activeIsFirebase, currentObra?.id]);

  const loadLocalReports = () => {
    const raw = localStorage.getItem(LOCAL_REPORTS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as RdoReport[];
        const updated = parsed.map(r => ({
          ...r,
          obraId: r.obraId || "obra-saneamento-leste",
          status: r.status || "Em Digitação"
        }));
        
        let filtered = updated;
        if (currentObra) {
          filtered = updated.filter(r => 
            r.obraId === currentObra.id || 
            r.obra === currentObra.nome || 
            (!r.obraId && currentObra.id === "obra-saneamento-leste")
          );
        }

        filtered.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
        setReports(filtered);
        if (filtered.length > 0) {
          const storedCurrentRdoId = localStorage.getItem("rdo_current_report_id");
          const found = filtered.find(r => r.id === storedCurrentRdoId);
          setCurrentReport(found || filtered[0]);
        } else {
          setCurrentReport(null);
        }
      } catch {
        const seeded = DEFAULT_REPORTS.map(r => ({ ...r, obraId: "obra-saneamento-leste", status: "Em Digitação" as const }));
        setReports(seeded);
        setCurrentReport(seeded[0]);
      }
    } else {
      const seeded = DEFAULT_REPORTS.map(r => ({ ...r, obraId: "obra-saneamento-leste", status: "Em Digitação" as const }));
      safeSetLocalStorage(LOCAL_REPORTS_KEY, seeded);
      setReports(seeded);
      setCurrentReport(seeded[0]);
    }
  };

  // Auth Operations
  const login = async (email: string, pass: string) => {
    if (activeIsFirebase && auth) {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      // Local Mock Login
      const mockUser = { uid: "demo-user", email };
      safeSetLocalStorage(LOCAL_USER_KEY, mockUser);
      setUser(mockUser);
    }
  };

  const signup = async (email: string, pass: string) => {
    if (activeIsFirebase && auth) {
      await createUserWithEmailAndPassword(auth, email, pass);
    } else {
      // Local Mock Signup
      const mockUser = { uid: "demo-user", email };
      safeSetLocalStorage(LOCAL_USER_KEY, mockUser);
      setUser(mockUser);
    }
  };

  const loginWithGoogle = async () => {
    if (activeIsFirebase && auth) {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } else {
      // Local Mock Google Login
      const mockUser = { uid: "demo-user-google", email: "google-user@seel.com.br" };
      safeSetLocalStorage(LOCAL_USER_KEY, mockUser);
      setUser(mockUser);
    }
  };

  const logout = async () => {
    if (activeIsFirebase && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
      setUser(null);
    }
  };

  // Save Report
  const saveReport = async (report: RdoReport) => {
    if (!user) throw new Error("Usuário não autenticado");

    // Trava para impedir RDOs com a mesma data para a mesma obra/obraId
    const isDuplicate = (reports || []).some(r => {
      if (r.id === report.id) return false;
      const sameObra = report.obraId 
        ? r.obraId === report.obraId 
        : r.obra === report.obra;
      return sameObra && r.data === report.data;
    });

    if (isDuplicate) {
      const formattedDate = (report.data || "").split('-').reverse().join('/');
      alert(`Já existe um RDO cadastrado para o dia ${formattedDate} nesta obra! Por favor, escolha outra data.`);
      throw new Error(`Data duplicada: RDO já existe para ${report.data}`);
    }

    const reportToSave: RdoReport = {
      ...report,
      userId: user.uid,
      updatedAt: new Date().toISOString(),
    };

    const oldReport = report.id ? reports.find(r => r.id === report.id) : null;
    
    let logMessage = `RDO ${reportToSave.rdoNo} da obra ${reportToSave.obra} (Data: ${reportToSave.data}) ${report.id ? "atualizado" : "criado"}. Status: ${reportToSave.status}`;
    let logActionType = report.id ? "UPDATE_RDO" : "CREATE_RDO";

    if (oldReport) {
      if (oldReport.status !== reportToSave.status) {
        logActionType = "STATUS_CHANGE";
        logMessage = `Status do RDO ${reportToSave.rdoNo} da obra ${reportToSave.obra} alterado de '${oldReport.status}' para '${reportToSave.status}'.`;
      } else if (
        (oldReport.emitenteAssinado !== reportToSave.emitenteAssinado) ||
        (oldReport.gerenciadoraAssinado !== reportToSave.gerenciadoraAssinado) ||
        (oldReport.contratanteAssinado !== reportToSave.contratanteAssinado)
      ) {
        logActionType = "SIGNATURE_UPDATE";
        logMessage = `Assinaturas atualizadas no RDO ${reportToSave.rdoNo} da obra ${reportToSave.obra}.`;
      }
    }

    // Always update local cache array safely
    let localUpdatedList: RdoReport[] = [];
    if (reportToSave.id) {
      localUpdatedList = reports.map(r => r.id === reportToSave.id ? reportToSave : r);
    } else {
      if (!reportToSave.id) {
        reportToSave.id = "rdo-" + Math.random().toString(36).substr(2, 9);
      }
      reportToSave.createdAt = new Date().toISOString();
      localUpdatedList = [reportToSave, ...reports];
    }
    safeSetLocalStorage(LOCAL_REPORTS_KEY, localUpdatedList);

    if (activeIsFirebase && db) {
      const path = "rdos";
      try {
        const cleanedReport = JSON.parse(JSON.stringify(reportToSave));
        if (cleanedReport.id) {
          const docRef = doc(db, path, cleanedReport.id);
          await setDoc(docRef, cleanedReport);
          setReports(prev => 
            prev.map(r => r.id === cleanedReport.id ? cleanedReport : r)
          );
        } else {
          const collRef = collection(db, path);
          const docRef = await addDoc(collRef, cleanedReport);
          reportToSave.id = docRef.id;
          cleanedReport.id = docRef.id;
          setReports(prev => [cleanedReport, ...prev]);
        }
        setCurrentReport(reportToSave);
        await logAction(logActionType, logMessage);
      } catch (error: any) {
        console.error("Erro no salvamento do Firebase, mantendo salvo em LocalStorage:", error);
        const isQuota = error?.message?.toLowerCase().includes("quota") || error?.code?.includes("resource-exhausted");
        if (isQuota) {
          setFirebaseError("O limite de operações do Firebase foi atingido. Seu RDO foi salvo com sucesso no armazenamento local do navegador.");
        }
        setReports(localUpdatedList);
        setCurrentReport(reportToSave);
      }
    } else {
      // Local Save
      setReports(localUpdatedList);
      setCurrentReport(reportToSave);
    }
  };

  // Delete Report
  const deleteReport = async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    
    // Find report details before deletion
    const reportToDelete = reports.find(r => r.id === id);
    let logMessage = `RDO (ID: ${id}) deletado.`;
    if (reportToDelete) {
      logMessage = `RDO ${reportToDelete.rdoNo} da obra ${reportToDelete.obra} (Data: ${reportToDelete.data}) deletado. Status: ${reportToDelete.status}`;
    }

    if (activeIsFirebase && db) {
      const path = `rdos/${id}`;
      try {
        await deleteDoc(doc(db, "rdos", id));
        setReports(prev => prev.filter(r => r.id !== id));
        if (currentReport?.id === id) {
          const remaining = reports.filter(r => r.id !== id);
          setCurrentReport(remaining.length > 0 ? remaining[0] : null);
        }
        await logAction("DELETE_RDO", logMessage);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      // Local Delete
      const updatedReports = reports.filter(r => r.id !== id);
      safeSetLocalStorage(LOCAL_REPORTS_KEY, updatedReports);
      setReports(updatedReports);
      if (currentReport?.id === id) {
        setCurrentReport(updatedReports.length > 0 ? updatedReports[0] : null);
      }
      await logAction("DELETE_RDO", logMessage);
    }
  };

  // Helper to calculate end date
  const calculateEndDate = (startDateStr: string, durationDays: number, extensionDays: number): string => {
    if (!startDateStr) return "";
    try {
      const date = new Date(startDateStr + "T12:00:00");
      const totalDays = Number(durationDays || 0) + Number(extensionDays || 0);
      date.setDate(date.getDate() + totalDays);
      return date.toISOString().split("T")[0];
    } catch (e) {
      return "";
    }
  };

  // Helper to calculate project days elapsed/remaining
  const computeProjectDays = (startDateStr: string, rdoDateStr: string, totalPeriodDays: number) => {
    if (!startDateStr || !rdoDateStr) {
      return { incorrido: 0, faltante: totalPeriodDays };
    }
    try {
      const start = new Date(startDateStr + "T12:00:00");
      const rdo = new Date(rdoDateStr + "T12:00:00");
      
      const diffTime = rdo.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const incorrido = Math.max(0, diffDays);
      const faltante = Math.max(0, totalPeriodDays - incorrido);
      
      return { incorrido, faltante };
    } catch (e) {
      return { incorrido: 0, faltante: totalPeriodDays };
    }
  };

  // Create template report helper
  const createNewReport = (): RdoReport => {
    let todayStr = new Date().toISOString().split("T")[0];
    
    // Obter data mais recente dos relatos da obra atual ou globais
    const targetReports = currentObra 
      ? reports.filter(r => r.obraId === currentObra.id)
      : reports;
    
    if (targetReports.length > 0) {
      const sorted = [...targetReports].sort((a, b) => b.data.localeCompare(a.data));
      const latestData = sorted[0].data;
      try {
        const d = new Date(latestData + "T12:00:00");
        d.setDate(d.getDate() + 1);
        todayStr = d.toISOString().split("T")[0];
      } catch (e) {
        console.error("Erro ao incrementar data de RDO:", e);
      }
    } else if (reports.length > 0) {
      const sorted = [...reports].sort((a, b) => b.data.localeCompare(a.data));
      const latestData = sorted[0].data;
      try {
        const d = new Date(latestData + "T12:00:00");
        d.setDate(d.getDate() + 1);
        todayStr = d.toISOString().split("T")[0];
      } catch (e) {
        console.error("Erro ao incrementar data de RDO:", e);
      }
    }
    
    const defaultStoppages: StoppagesDetail = {
      chuva: {
        ativo: false,
        horas: [],
        frentes: "Todas as frentes",
        local: "Geral",
        maoDeObraParalisada: "Todas as equipes",
        comentarios: "",
        total: "0h"
      },
      raios: {
        ativo: false,
        horas: [],
        frentes: "Todas as frentes",
        local: "",
        maoDeObraParalisada: "",
        comentarios: "",
        total: "0h"
      },
      projetos: {
        ativo: false,
        horas: [],
        frentes: "",
        local: "",
        maoDeObraParalisada: "",
        comentarios: "",
        total: "0h"
      },
      vizinhos: {
        ativo: false,
        horas: [],
        frentes: "",
        local: "",
        maoDeObraParalisada: "",
        comentarios: "",
        total: "0h"
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
    };

    // Requirement 3: Copy information from previous RDO if possible
    if (currentObra) {
      const matchedReports = reports.filter(r => r.obraId === currentObra.id);
      if (matchedReports.length > 0) {
        // Sort descending by date to get the absolute previous RDO
        const sorted = [...matchedReports].sort((a, b) => b.data.localeCompare(a.data));
        const lastRdo = sorted[0];

        // Compute incremental report number
        let nextRdoNo = lastRdo.rdoNo;
        const matchDigits = lastRdo.rdoNo.match(/^(.*?)(\d+)$/);
        if (matchDigits) {
          const prefix = matchDigits[1];
          const digits = matchDigits[2];
          const nextVal = (parseInt(digits, 10) + 1).toString().padStart(digits.length, "0");
          nextRdoNo = prefix + nextVal;
        } else {
          nextRdoNo = lastRdo.rdoNo + "-1";
        }

        // Calculate current elapsed days based on the new RDO's date
        const totalPeriodDays = Number(currentObra.prazoContratual || 0) + Number(currentObra.aditivoPrazo || 0);
        const { incorrido, faltante } = computeProjectDays(currentObra.dataInicio, todayStr, totalPeriodDays);

        return {
          ...lastRdo,
          id: undefined, // Let it generate a new id on saving
          rdoNo: nextRdoNo,
          data: todayStr,
          status: "Em Digitação",
          creatorEmail: user?.email || "",
          fiscalizacaoFinalizada: false,
          gerenciadoraFinalizada: false,
          emitenteAssinado: false,
          gerenciadoraAssinado: false,
          contratanteAssinado: false,
          prazoIncorrido: incorrido,
          prazoFaltante: faltante,
          // Reset signature parameters with current default names for new RDOs
          emitenteNome: currentObra.emissorNomeDefault || "",
          emitenteConsolidado: "",
          emitenteHash: "",
          gerenciadoraNome: currentObra.fiscalGerenciadoraNomeDefault || "",
          gerenciadoraConsolidado: "",
          gerenciadoraHash: "",
          contratanteNome: currentObra.fiscalAprovadorNomeDefault || "",
          contratanteAprovado: "",
          contratanteHash: "",
          createdAt: undefined,
          updatedAt: undefined
        };
      }
    }

    // Default template from Current Obra
    if (currentObra) {
      const totalPeriodDays = Number(currentObra.prazoContratual || 0) + Number(currentObra.aditivoPrazo || 0);
      const calculatedEnd = calculateEndDate(currentObra.dataInicio, currentObra.prazoContratual, currentObra.aditivoPrazo);
      
      const dateParts = (currentObra?.dataInicio || "").split("-");
      const formattedInicio = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : "01/01/2026";
      
      const endParts = calculatedEnd.split("-");
      const formattedTermino = endParts.length === 3 ? `${endParts[2]}/${endParts[1]}/${endParts[0]}` : "31/12/2026";

      const { incorrido, faltante } = computeProjectDays(currentObra.dataInicio, todayStr, totalPeriodDays);

      const effectiveLabor: CompanyLaborGroup[] = [
        {
          id: "seel-labor",
          nome: "S SEEL - Engenharia",
          items: [
            { id: "seel-l1", cargo: "Armador", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" as const },
            { id: "seel-l2", cargo: "Carpinteiro", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" as const },
            { id: "seel-l3", cargo: "Mestre de obras", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" as const },
            { id: "seel-l4", cargo: "Encarregado", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" as const },
            { id: "seel-l5", cargo: "Servente", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" as const },
            { id: "seel-l6", cargo: "Engenheiro de Obra", c: 0, f: 0, a: 0, t: 0, moiMod: "MOI" as const }
          ]
        },
        ...(currentObra.subcontratadas || []).map((sub, idx) => ({
          id: `sub-labor-${idx}`,
          nome: sub,
          items: [
            { id: `sub-l1-${idx}`, cargo: "Encarregado", c: 0, f: 0, a: 0, t: 0, moiMod: "MOI" as const },
            { id: `sub-l2-${idx}`, cargo: "Oficial", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" as const },
            { id: `sub-l3-${idx}`, cargo: "Ajudante", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" as const }
          ]
        }))
      ];

      const defaultActivities = (currentObra.atividades || []).map((act, index) => ({
        id: `act-r-${index}`,
        ref: act.ref,
        fase: act.fase,
        identificador: act.identificador,
        descricao: act.descricao,
        intervalo: "E+m",
        total: "0"
      }));

      return {
        userId: user?.uid || "demo-user",
        rdoNo: `RDO-${todayStr.replace(/-/g, "")}`,
        data: todayStr,
        obra: currentObra.nome,
        obraId: currentObra.id,
        status: "Em Digitação",
        creatorEmail: user?.email || "",
        fiscalizacaoFinalizada: false,
        emitenteAssinado: false,
        contratanteAssinado: false,
        cliente: currentObra.cliente,
        contratada: currentObra.contratada || "SEEL SERVIÇOS DE ENGENHARIA LTDA",
        gestor: "",
        gerenciadora: currentObra.gerenciadora,
        prazo: totalPeriodDays,
        prazoIncorrido: incorrido,
        prazoFaltante: faltante,
        inicio: formattedInicio,
        termino: formattedTermino,
        acidentes: {
          comAfastamentoDia: 0,
          comAfastamentoAusentesDia: 0,
          comAfastamentoAcumulado: 0,
          semAfastamentoDia: 0,
          semAfastamentoAcumulado: 0
        },
        efetivoSummary: {
          moi: 0,
          mod: 0,
          subcontratadosMoiMod: 0,
          afastados: 0,
          total: 0
        },
        paralisacoesSummary: {
          totalHorasParalisadasDia: 0,
          numeroParalisacoes: 0
        },
        equipamentosSummary: {
          mobilizados: 0,
          subcontratadosMobilizados: 0,
          total: 0
        },
        atividades: defaultActivities,
        fatosRelevantes: [],
        paralisacoesDetalhe: defaultStoppages,
        chuvaMmPorHora: {
          "6h": 0, "7h": 0, "8h": 0, "9h": 0, "10h": 0, "11h": 0, "12h": 0, "13h": 0, "14h": 0,
          "15h": 0, "16h": 0, "17h": 0, "18h": 0, "19h": 0, "20h": 0, "21h": 0, "22h": 0, "23h": 0,
          "0h": 0, "1h": 0, "2h": 0, "3h": 0, "4h": 0, "5h": 0
        },
        precipitacao: {
          manha: 0,
          tarde: 0,
          noite: 0,
          total: 0,
          acumuladoMes: 0,
          acumuladoMesAnterior: 0
        },
        efetivoDetalhado: effectiveLabor,
        equipamentosDetalhado: [],
        comentariosGerenciadoraContratante: [],
        comentariosFiscalizacao: [],
        comentariosGerenciadora: [],
        emitenteNome: currentObra.emissorNomeDefault || "",
        emitenteConsolidado: "",
        emitenteHash: "ff2b2060a7b8e8ae496a9553579effac",
        gerenciadoraNome: currentObra.fiscalGerenciadoraNomeDefault || "",
        gerenciadoraConsolidado: "",
        gerenciadoraHash: "",
        contratanteNome: currentObra.fiscalAprovadorNomeDefault || "",
        contratanteAprovado: "",
        contratanteHash: "29381edd9b0233ff2655f9571859320a"
      };
    }

    // Ultimate fallback if no currentObra exists either
    const defaultLabor: CompanyLaborGroup[] = [
      {
        id: "group-1",
        nome: "S SEEL - Engenharia",
        items: [
          { id: "itm-1", cargo: "Armador", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" },
          { id: "itm-2", cargo: "Carpinteiro", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" },
          { id: "itm-3", cargo: "Mestre de obras", c: 0, f: 0, a: 0, t: 0, moiMod: "MOD" }
        ]
      }
    ];

    return {
      userId: user?.uid || "demo-user",
      rdoNo: `RDO-${todayStr.replace(/-/g, "")}`,
      data: todayStr,
      obra: "SANEAMENTO LESTE",
      obraId: "obra-saneamento-leste",
      status: "Em Digitação",
      cliente: "SABESP",
      contratada: "SEEL SERVIÇOS DE ENGENHARIA LTDA",
      gestor: "",
      gerenciadora: "SEEL",
      prazo: 365,
      prazoIncorrido: 100,
      prazoFaltante: 265,
      inicio: "01/01/2026",
      termino: "31/12/2026",
      acidentes: {
        comAfastamentoDia: 0,
        comAfastamentoAusentesDia: 0,
        comAfastamentoAcumulado: 0,
        semAfastamentoDia: 0,
        semAfastamentoAcumulado: 0
      },
      efetivoSummary: {
        moi: 0,
        mod: 0,
        subcontratadosMoiMod: 0,
        afastados: 0,
        total: 0
      },
      paralisacoesSummary: {
        totalHorasParalisadasDia: 0,
        numeroParalisacoes: 0
      },
      equipamentosSummary: {
        mobilizados: 0,
        subcontratadosMobilizados: 0,
        total: 0
      },
      atividades: [
        {
          id: "act-new-1",
          ref: "001",
          fase: "ATIVIDADES - FASE 01 - REDE EXTERNA",
          identificador: "1.1",
          descricao: "Escavação manual de valas em solo de 1ª categoria",
          intervalo: "E+m",
          total: "0"
        }
      ],
      fatosRelevantes: [],
      paralisacoesDetalhe: defaultStoppages,
      chuvaMmPorHora: {
        "6h": 0, "7h": 0, "8h": 0, "9h": 0, "10h": 0, "11h": 0, "12h": 0, "13h": 0, "14h": 0,
        "15h": 0, "16h": 0, "17h": 0, "18h": 0, "19h": 0, "20h": 0, "21h": 0, "22h": 0, "23h": 0,
        "0h": 0, "1h": 0, "2h": 0, "3h": 0, "4h": 0, "5h": 0
      },
      precipitacao: {
        manha: 0,
        tarde: 0,
        noite: 0,
        total: 0,
        acumuladoMes: 0,
        acumuladoMesAnterior: 0
      },
      efetivoDetalhado: defaultLabor,
      equipamentosDetalhado: [],
      comentariosGerenciadoraContratante: [],
      comentariosFiscalizacao: [],
      comentariosGerenciadora: [],
      emitenteNome: "",
      emitenteConsolidado: "",
      emitenteHash: "ff2b2060a7b8e8ae496a9553579effac",
      contratanteNome: "",
      contratanteAprovado: "",
      contratanteHash: "29381edd9b0233ff2655f9571859320a"
    };
  };

  // Save/Delete Obra Functions
  const saveObra = async (obra: ObraConfig) => {
    if (!user) throw new Error("Usuário não autenticado");

    const permissionsEmails = (obra.permissoes || []).map(p => p?.email?.trim().toLowerCase()).filter(Boolean);
    const obraToSave = {
      ...obra,
      userId: obra.userId || user.uid,
      permissoesEmails: permissionsEmails,
      updatedAt: new Date().toISOString(),
    };

    // Update ONLY non-signed reports for this Obra with updated default signer names (signed reports are preserved)
    const targetObraId = obraToSave.id;
    const targetObraName = obraToSave.nome;
    const reportsToUpdateBatch: RdoReport[] = [];

    const updatedReportsList = reports.map(r => {
      const isSameObra = (targetObraId && r.obraId === targetObraId) || (targetObraName && r.obra === targetObraName);
      if (!isSameObra) return r;

      let rChanged = false;
      const updatedR = { ...r };

      // 1. Emitente: update ONLY if NOT signed
      if (!r.emitenteAssinado) {
        if (updatedR.emitenteNome !== (obraToSave.emissorNomeDefault || "")) {
          updatedR.emitenteNome = obraToSave.emissorNomeDefault || "";
          rChanged = true;
        }
      }

      // 2. Gerenciadora: update ONLY if NOT signed
      if (!r.gerenciadoraAssinado) {
        if (updatedR.gerenciadoraNome !== (obraToSave.fiscalGerenciadoraNomeDefault || "")) {
          updatedR.gerenciadoraNome = obraToSave.fiscalGerenciadoraNomeDefault || "";
          rChanged = true;
        }
      }

      // 3. Contratante / Fiscalização: update ONLY if NOT signed
      if (!r.contratanteAssinado) {
        if (updatedR.contratanteNome !== (obraToSave.fiscalAprovadorNomeDefault || "")) {
          updatedR.contratanteNome = obraToSave.fiscalAprovadorNomeDefault || "";
          rChanged = true;
        }
      }

      if (rChanged) {
        reportsToUpdateBatch.push(updatedR);
        return updatedR;
      }
      return r;
    });

    if (reportsToUpdateBatch.length > 0) {
      setReports(updatedReportsList);
      if (currentReport) {
        const foundCurr = updatedReportsList.find(x => x.id === currentReport.id);
        if (foundCurr) setCurrentReport(foundCurr);
      }
      if (activeIsFirebase && db) {
        try {
          for (const repToSave of reportsToUpdateBatch) {
            if (repToSave.id) {
              const docRef = doc(db, "rdos", repToSave.id);
              await setDoc(docRef, JSON.parse(JSON.stringify(repToSave)));
            }
          }
        } catch (err) {
          console.error("Erro ao atualizar RDOs não assinados no Firestore:", err);
        }
      } else {
        safeSetLocalStorage(LOCAL_REPORTS_KEY, updatedReportsList);
      }
    }

    if (activeIsFirebase && db) {
      const path = "obras";
      try {
        const cleanedObra = JSON.parse(JSON.stringify(obraToSave));
        if (cleanedObra.id) {
          const docRef = doc(db, path, cleanedObra.id);
          await setDoc(docRef, cleanedObra);
          setObras(prev => 
            prev.map(o => o.id === cleanedObra.id ? cleanedObra : o)
          );
          if (currentObra?.id === cleanedObra.id) {
            setCurrentObra(cleanedObra);
          }
        } else {
          cleanedObra.createdAt = new Date().toISOString();
          // Safe removal in case some empty properties leak
          delete cleanedObra.id;
          const collRef = collection(db, path);
          const docRef = await addDoc(collRef, cleanedObra);
          const savedWithId = { ...cleanedObra, id: docRef.id };
          setObras(prev => [savedWithId, ...prev]);
          setCurrentObra(savedWithId);
        }
        await logAction(
          obra.id ? "UPDATE_OBRA" : "CREATE_OBRA", 
          `Obra ${obraToSave.nome} (ID: ${obra.id || 'novo'}) ${obra.id ? "atualizada" : "criada"}.`
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      let updatedObras: ObraConfig[] = [];
      if (obraToSave.id) {
        updatedObras = obras.map(o => o.id === obraToSave.id ? { ...obraToSave } : o);
      } else {
        const generatedId = "obra-" + Math.random().toString(36).substr(2, 9);
        const newObra = {
          ...obraToSave,
          id: generatedId,
          createdAt: new Date().toISOString()
        };
        updatedObras = [newObra, ...obras];
        obraToSave.id = generatedId;
      }
      
      safeSetLocalStorage("rdo_obras_local", updatedObras);
      setObras(updatedObras);
      const savedRef = updatedObras.find(o => o.id === obraToSave.id) || obraToSave;
      setCurrentObra(savedRef);
    }
  };

  const deleteObra = async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado");

    const obraToDelete = obras.find(o => o.id === id);
    let logMessage = `Obra (ID: ${id}) deletada.`;
    if (obraToDelete) {
      logMessage = `Obra ${obraToDelete.nome} (ID: ${id}) deletada.`;
    }

    if (activeIsFirebase && db) {
      const path = `obras/${id}`;
      try {
        await deleteDoc(doc(db, "obras", id));
        const remaining = obras.filter(o => o.id !== id);
        setObras(remaining);
        if (currentObra?.id === id) {
          setCurrentObra(remaining.length > 0 ? remaining[0] : null);
        }
        await logAction("DELETE_OBRA", logMessage);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const updatedObras = obras.filter(o => o.id !== id);
      safeSetLocalStorage("rdo_obras_local", updatedObras);
      setObras(updatedObras);
      if (currentObra?.id === id) {
        setCurrentObra(updatedObras.length > 0 ? updatedObras[0] : null);
      }
    }
  };

  const loadReportToEdit = (id: string) => {
    const report = reports.find(r => r.id === id);
    if (report) {
      setCurrentReport(report);
    }
  };

  return (
    <RdoContext.Provider value={{
      user,
      isLoading,
      isFirebase: activeIsFirebase,
      isLocalFallback: useLocalFallback,
      setIsLocalFallback,
      reports,
      currentReport,
      setCurrentReport,
      login,
      signup,
      loginWithGoogle,
      logout,
      saveReport,
      deleteReport,
      createNewReport,
      loadReportToEdit,
      // Obras additions
      obras,
      currentObra,
      setCurrentObra,
      saveObra,
      deleteObra,
      isObrasLoading,
      // Admin
      isGlobalAdmin,
      logAction,
      getAuditLogs,
      firebaseError,
      clearFirebaseError
    }}>
      {children}
    </RdoContext.Provider>
  );
};

export const useRdoStore = () => {
  const context = useContext(RdoContext);
  if (context === undefined) {
    throw new Error("useRdoStore must be used within an RdoProvider");
  }
  return context;
};
