export const ORG_LOGO_MAX_BYTES = 5 * 1024;
const SOURCE_MAX_BYTES = 8 * 1024 * 1024;

export function orgLogoByteSize(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  if (raw.startsWith("data:")) {
    const comma = raw.indexOf(",");
    if (comma < 0) return 0;
    const b64 = raw.slice(comma + 1);
    return Math.floor((b64.length * 3) / 4);
  }
  return new TextEncoder().encode(raw).length;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read compressed image."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

function drawToCanvas(img: HTMLImageElement, maxEdge: number) {
  const w = Math.max(1, img.naturalWidth || img.width);
  const h = Math.max(1, img.naturalHeight || img.height);
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not compress image.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Could not compress image."));
        else resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

/** Compress any image down to ≤ 5 KB JPEG, then return a data URL for storage. */
export async function readOrgLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)) {
    throw new Error("Choose an image file (PNG, JPG, GIF, WebP, SVG).");
  }
  if (file.size > SOURCE_MAX_BYTES) {
    throw new Error("Image is too large to compress. Choose a file under 8 MB.");
  }

  const img = await loadImage(file);
  let maxEdge = Math.min(256, Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 32));
  let quality = 0.82;
  let best: Blob | null = null;

  for (let i = 0; i < 14; i++) {
    const canvas = drawToCanvas(img, maxEdge);
    const blob = await canvasToJpeg(canvas, quality);
    best = blob;
    if (blob.size <= ORG_LOGO_MAX_BYTES) break;
    if (quality > 0.42) {
      quality = Math.max(0.4, quality - 0.12);
    } else {
      maxEdge = Math.max(24, Math.round(maxEdge * 0.72));
      quality = 0.72;
    }
  }

  if (!best || best.size > ORG_LOGO_MAX_BYTES) {
    throw new Error("Could not compress this image under 5 KB. Try a simpler logo.");
  }

  const dataUrl = await blobToDataUrl(best);
  if (orgLogoByteSize(dataUrl) > ORG_LOGO_MAX_BYTES) {
    throw new Error("Could not compress this image under 5 KB. Try a simpler logo.");
  }
  return dataUrl;
}
