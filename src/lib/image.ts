/** Client-side 圖片壓縮：最長邊 1024px、JPEG quality 0.8，再轉 base64。 */

export const MAX_EDGE = 1024;
export const JPEG_QUALITY = 0.8;

export interface CompressedImage {
  /** 不含 `data:` prefix 的 base64 內容 */
  base64: string;
  mimeType: string;
  /** 預覽用 data URL */
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
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
      reject(new Error("圖片讀取失敗，請換一張照片試試"));
    };
    img.src = url;
  });
}

/** 縮到最長邊 1024px 並輸出 JPEG base64。 */
export async function compressImage(
  file: File,
  maxEdge: number = MAX_EDGE,
  quality: number = JPEG_QUALITY,
): Promise<CompressedImage> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("瀏覽器不支援 canvas，無法壓縮圖片");
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);

  return {
    base64,
    mimeType: "image/jpeg",
    dataUrl,
    width,
    height,
    bytes: Math.round((base64.length * 3) / 4),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
