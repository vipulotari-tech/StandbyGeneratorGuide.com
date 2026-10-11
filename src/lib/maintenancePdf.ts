/**
 * Download a maintenance log as a real PDF without third-party services.
 * The browser renders full-Unicode text onto canvas, then embeds each page as
 * a JPEG in an ISO PDF document. No worksheet data leaves the device.
 */
export interface MaintenancePdfData {
  details: string[];
  entries: string[][];
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const SCALE = 2;
const LEFT = 42;
const RIGHT = 42;
const BOTTOM = 795;
const TEXT_X = 217;
const TEXT_W = PAGE_W - TEXT_X - RIGHT;
const GREEN = '#203b34';
const GOLD = '#c5a16c';
const MUTED = '#52685e';
const DETAILS = [
  'Generator model / serial', 'ATS model', 'Fuel', 'Manual / revision',
  'Service provider / contact', 'Exercise schedule from manual', 'Next inspection',
];
const COLUMNS = [
  'Date', 'Run hours', 'Work, parts / oil used, alarms', 'Performed by',
  'Next due (date / hours)',
];

function linesFor(ctx: CanvasRenderingContext2D, input: string, width: number): string[] {
  const output: string[] = [];
  // Preserve line breaks, and wrap unusually long serial numbers as well.
  for (const paragraph of input.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph.trim()) {
      output.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= width) {
        line = next;
        continue;
      }
      if (line) output.push(line);
      line = '';
      for (const char of Array.from(word)) {
        if (line && ctx.measureText(line + char).width > width) {
          output.push(line);
          line = '';
        }
        line += char;
      }
    }
    if (line) output.push(line);
  }
  return output.length ? output : [''];
}

function makePage(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(PAGE_W * SCALE);
  canvas.height = Math.ceil(PAGE_H * SCALE);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('PDF generation needs browser canvas support.');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  return { canvas, ctx };
}

function renderPages(data: MaintenancePdfData): HTMLCanvasElement[] {
  const pages: HTMLCanvasElement[] = [];
  let current = makePage();
  let ctx = current.ctx;
  let y = 0;

  const startPage = () => {
    if (pages.length) { current = makePage(); ctx = current.ctx; }
    pages.push(current.canvas);
    ctx.fillStyle = GREEN;
    ctx.fillRect(0, 0, PAGE_W, 10);
    ctx.fillStyle = GOLD;
    ctx.fillRect(LEFT, 38, 38, 3);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = GREEN;
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('GENERATOR MAINTENANCE LOG', LEFT, 76);
    ctx.font = '10px Arial, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.fillText('STANDBY GENERATOR GUIDE  /  HOMEOWNER RECORD', LEFT, 100);
    y = 127;
  };
  const nextPageIfNeeded = (height: number) => {
    if (y + height > BOTTOM) startPage();
  };
  const section = (title: string) => {
    nextPageIfNeeded(67);
    ctx.fillStyle = '#eaf2ec';
    ctx.fillRect(LEFT, y, PAGE_W - LEFT - RIGHT, 31);
    ctx.fillStyle = GREEN;
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillText(title, LEFT + 12, y + 21);
    y += 42;
  };
  const row = (name: string, raw: string) => {
    const value = raw.trim();
    ctx.font = '11px Arial, sans-serif';
    const lines = value ? linesFor(ctx, value, TEXT_W) : [''];
    // Keep the label and the first line together when breaking pages.
    nextPageIfNeeded(39);
    let firstLineOnPage = true;
    for (let i = 0; i < lines.length; i++) {
      if (y + 19 > BOTTOM) {
        startPage();
        firstLineOnPage = true;
      }
      if (firstLineOnPage) {
        ctx.fillStyle = MUTED;
        ctx.font = 'bold 9.3px Arial, sans-serif';
        const nameParts = linesFor(ctx, name, TEXT_X - LEFT - 15);
        nameParts.forEach((part, n) => ctx.fillText(part, LEFT + 7, y + 13 + n * 11));
      }
      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = '#1b2923';
      if (value && lines[i]) ctx.fillText(lines[i], TEXT_X, y + 14);
      else {
        ctx.strokeStyle = '#acbdb0';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(TEXT_X, y + 17);
        ctx.lineTo(PAGE_W - RIGHT - 2, y + 17);
        ctx.stroke();
      }
      y += 18;
      firstLineOnPage = false;
    }
    nextPageIfNeeded(12);
    ctx.fillStyle = '#e7ede7';
    ctx.fillRect(LEFT + 5, y + 3, PAGE_W - LEFT - RIGHT - 10, 0.6);
    y += 13;
  };

  startPage();
  section('01  GENERATOR DETAILS');
  DETAILS.forEach((label, i) => row(label, data.details[i] ?? ''));
  y += 9;
  section('02  SERVICE & INSPECTION ENTRIES');
  for (let n = 0; n < 12; n++) {
    nextPageIfNeeded(105);
    ctx.fillStyle = GREEN;
    ctx.fillRect(LEFT, y, PAGE_W - LEFT - RIGHT, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText(`SERVICE ENTRY ${String(n + 1).padStart(2, '0')}`, LEFT + 12, y + 19);
    y += 36;
    COLUMNS.forEach((label, i) => row(label, data.entries[n]?.[i] ?? ''));
    y += 10;
  }
  pages.forEach((canvas, index) => {
    const footer = canvas.getContext('2d');
    if (!footer) return;
    footer.save();
    footer.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    footer.strokeStyle = '#d6e0d8';
    footer.lineWidth = .7;
    footer.beginPath();
    footer.moveTo(LEFT, 805);
    footer.lineTo(PAGE_W - RIGHT, 805);
    footer.stroke();
    footer.fillStyle = MUTED;
    footer.font = '8px Arial, sans-serif';
    footer.fillText('Homeowner-entered information; verify all service against the manufacturer manual.', LEFT, 820);
    footer.fillText(`${index + 1} / ${pages.length}`, PAGE_W - RIGHT - 28, 820);
    footer.restore();
  });
  return pages;
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob || blob.type !== 'image/jpeg') {
        reject(new Error('Unable to render the PDF page as JPEG.'));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/jpeg', .89);
  });
}

/** Package page images into a standards-compliant PDF 1.4 with exact byte offsets. */
function packagePdf(images: { bytes: Uint8Array; width: number; height: number }[]): Blob {
  const enc = new TextEncoder();
  const pieces: Uint8Array[] = [];
  let length = 0;
  const offsets: number[] = [0];
  const push = (p: Uint8Array) => { pieces.push(p); length += p.byteLength; };
  const write = (t: string) => push(enc.encode(t));
  const object = (id: number, body: string, stream?: Uint8Array) => {
    offsets[id] = length;
    write(`${id} 0 obj\n${body}`);
    if (stream) {
      write('stream\n');
      push(stream);
      write('\nendstream\n');
    }
    write('endobj\n');
  };

  write('%PDF-1.4\n% Maintenance worksheet\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>\n');
  const kids = images.map((_, i) => `${4 + i * 3} 0 R`).join(' ');
  object(2, `<< /Type /Pages /Count ${images.length} /Kids [${kids}] >>\n`);

  for (let i = 0; i < images.length; i++) {
    const { bytes, width, height } = images[i];
    const imageId = 3 + i * 3, pageId = imageId + 1, contentId = imageId + 2;
    object(imageId,
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\n`,
      bytes);
    object(pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\n`);
    const command = enc.encode(`q ${PAGE_W} 0 0 ${PAGE_H} 0 0 cm /Im0 Do Q\n`);
    object(contentId, `<< /Length ${command.byteLength} >>\n`, command);
  }

  const xrefAt = length;
  const count = 3 + images.length * 3;
  write(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id++) write(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  write(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  const result = new Uint8Array(length);
  let at = 0;
  for (const item of pieces) { result.set(item, at); at += item.byteLength; }
  return new Blob([result], { type: 'application/pdf' });
}

export async function createMaintenancePdf(data: MaintenancePdfData): Promise<Blob> {
  const pages = renderPages(data);
  const images = await Promise.all(pages.map(async (canvas) => ({
    bytes: await toJpeg(canvas), width: canvas.width, height: canvas.height,
  })));
  return packagePdf(images);
}
