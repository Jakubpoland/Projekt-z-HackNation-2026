// Czyta PDF albo zdjęcie w przeglądarce. Najpierw warstwa tekstu, a gdy jej nie ma — OCR pierwszych stron.

export async function readScanFiles(files: File[], onStatus: (message: string) => void): Promise<string> {
  const chunks: string[] = [];
  for (const file of files) {
    chunks.push(`\nNAZWA PLIKU: ${file.name}\n`);
    onStatus(`Otwieram ${file.name}…`);
    if (file.type.startsWith("image/")) {
      chunks.push(await ocrImage(file, onStatus));
      continue;
    }
    const data = new Uint8Array(await file.arrayBuffer());
    chunks.push(await readPdf(data, onStatus));
  }
  return chunks.join("\n");
}

async function readPdf(data: Uint8Array, onStatus: (message: string) => void): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const doc = await pdfjs.getDocument({ data }).promise;
  const limit = Math.min(doc.numPages, 4);
  const pieces: string[] = [];
  let letters = 0;
  for (let i = 1; i <= limit; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    letters += text.replace(/\s/g, "").length;
    pieces.push(text);
  }
  if (letters > 80) return pieces.join("\n");

  onStatus("Skan bez tekstu. Odczytuję obraz pierwszych stron…");
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("pol");
  try {
    const ocr: string[] = [];
    for (let i = 1; i <= limit; i++) {
      onStatus(`Czytam stronę ${i} z ${limit}…`);
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      ocr.push(data.text);
    }
    return ocr.join("\n");
  } finally {
    await worker.terminate();
  }
}

async function ocrImage(file: File, onStatus: (message: string) => void): Promise<string> {
  onStatus(`Czytam zdjęcie ${file.name}…`);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("pol");
  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
