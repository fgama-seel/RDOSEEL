import * as pdfjsLib from "pdfjs-dist";

// Set worker source for browser environment
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface RenderedPdfPage {
  pageNumber: number;
  totalPages: number;
  dataUrl: string;
  fileName: string;
}

/**
 * Converts a base64 DataURL, URL, or ArrayBuffer of a PDF file into an array of JPEG images,
 * one for each page of the PDF document.
 */
export async function convertPdfToImagePages(
  pdfSource: string | ArrayBuffer,
  fileName = "documento.pdf",
  requestedScale = 1.15,
  quality = 0.65
): Promise<RenderedPdfPage[]> {
  try {
    let loadingTask;
    if (typeof pdfSource === "string") {
      if (pdfSource.startsWith("data:")) {
        // Convert base64 DataURL to Uint8Array
        const base64Data = pdfSource.split(",")[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        loadingTask = pdfjsLib.getDocument({ data: bytes });
      } else {
        loadingTask = pdfjsLib.getDocument({ url: pdfSource });
      }
    } else {
      loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfSource) });
    }

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pages: RenderedPdfPage[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1 });
      
      // Keep page dimensions reasonable (max 900px wide, max 1250px tall) to prevent Firestore quota errors
      const maxDimension = 900;
      let effectiveScale = requestedScale;
      if (unscaledViewport.width * effectiveScale > maxDimension) {
        effectiveScale = maxDimension / unscaledViewport.width;
      }
      if (unscaledViewport.height * effectiveScale > 1300) {
        effectiveScale = Math.min(effectiveScale, 1300 / unscaledViewport.height);
      }

      const viewport = page.getViewport({ scale: effectiveScale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (ctx) {
        // Fill white background before rendering PDF page content
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render PDF page into canvas
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };
        await page.render(renderContext as any).promise;

        // Use quality 0.65 which provides sharp text and drawings while keeping payload tiny (~40-60KB)
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        pages.push({
          pageNumber: pageNum,
          totalPages: numPages,
          dataUrl,
          fileName,
        });
      }
    }

    return pages;
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw error;
  }
}
