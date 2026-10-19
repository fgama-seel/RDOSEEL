import { RdoReport } from "../types";
import { compressImage } from "./imageUtils";

/**
 * Calculates estimated document size in bytes as it will be stored in JSON/Firestore.
 */
export function estimateReportSize(report: any): number {
  try {
    const jsonStr = JSON.stringify(report);
    return new Blob([jsonStr]).size;
  } catch {
    return 0;
  }
}

/**
 * Optimizes all heavy media (anexos and activity images) within an RDO report
 * to ensure it fits comfortably within Firestore's 1,048,576 bytes limit.
 */
export async function optimizeReportMedia(report: RdoReport): Promise<RdoReport> {
  const currentSize = estimateReportSize(report);

  // If already under 600KB and has no huge individual dataUrls, no aggressive optimization is needed
  const hasHugeAnexos = (report.anexos || []).some(a => a.dataUrl && a.dataUrl.length > 80000);
  const hasHugeActImages = (report.atividades || []).some(act => (act.imagens || []).some(img => img && img.length > 80000));

  if (currentSize < 600000 && !hasHugeAnexos && !hasHugeActImages) {
    return report;
  }

  const optimized: RdoReport = JSON.parse(JSON.stringify(report));

  // 1. Optimize Anexos
  if (optimized.anexos && optimized.anexos.length > 0) {
    for (let i = 0; i < optimized.anexos.length; i++) {
      const item = optimized.anexos[i];
      if (item.dataUrl && item.dataUrl.startsWith("data:image/")) {
        // Recompress to optimal dimensions and quality
        try {
          const compressed = await compressImage(item.dataUrl, 900, 1250, 0.65);
          optimized.anexos[i].dataUrl = compressed;
        } catch (e) {
          console.warn("Could not recompress anexo image", e);
        }
      }
    }
  }

  // 2. Optimize Activity Images
  if (optimized.atividades && optimized.atividades.length > 0) {
    for (let actIdx = 0; actIdx < optimized.atividades.length; actIdx++) {
      const act = optimized.atividades[actIdx];
      if (act.imagens && act.imagens.length > 0) {
        const compressedImgs: string[] = [];
        for (let imgIdx = 0; imgIdx < act.imagens.length; imgIdx++) {
          const img = act.imagens[imgIdx];
          if (img && img.startsWith("data:image/") && img.length > 60000) {
            try {
              const comp = await compressImage(img, 900, 900, 0.65);
              compressedImgs.push(comp);
            } catch {
              compressedImgs.push(img);
            }
          } else {
            compressedImgs.push(img);
          }
        }
        optimized.atividades[actIdx].imagens = compressedImgs;
      }
    }
  }

  return optimized;
}

/**
 * Splits report into main doc and subcollection media if total size exceeds 850KB.
 */
export function prepareReportForFirestore(report: RdoReport): {
  mainDoc: any;
  subcollectionMedia?: { anexos: any[] };
} {
  const cloned = JSON.parse(JSON.stringify(report));
  const totalSize = estimateReportSize(cloned);

  // Firestore hard limit is 1,048,576 bytes. We use 850,000 bytes as our safety threshold.
  if (totalSize > 850000 && cloned.anexos && cloned.anexos.length > 0) {
    const originalAnexos = cloned.anexos;
    cloned.hasSubcollectionAnexos = true;
    cloned.anexosCount = originalAnexos.length;
    cloned.anexos = []; // strip from main document

    return {
      mainDoc: cloned,
      subcollectionMedia: { anexos: originalAnexos }
    };
  }

  return {
    mainDoc: cloned
  };
}
