/**
 * Direct Cloud Image Uploader for LetzRyd Fleet Portal
 * Uploads raw image files directly to Google Cloud Storage bucket via /api/storage/upload.
 * Storing clean bucket URLs prevents Cloud Run 413 Payload Too Large errors,
 * preserves 100% uncompressed raw camera quality, and eliminates database bloat.
 *
 * IMPORTANT: This function NEVER falls back to base64 — it throws on failure so callers
 * can show a proper error message instead of storing a 10MB payload that causes 413.
 */

export async function uploadDirectToGCS(
  fileOrBase64: File | Blob | string,
  folder = "uploads"
): Promise<string> {
  if (!fileOrBase64) return "";

  // If already a public HTTPS URL, return as-is (already uploaded)
  if (typeof fileOrBase64 === "string" && (fileOrBase64.startsWith("http://") || fileOrBase64.startsWith("https://"))) {
    return fileOrBase64;
  }

  let fileToSend: File | Blob;

  if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
    // Convert base64 dataURL → Blob (happens when camera captures via canvas)
    const arr = fileOrBase64.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    fileToSend = new Blob([u8arr], { type: mime });
  } else if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
    fileToSend = fileOrBase64;
  } else {
    throw new Error("Invalid input: expected a File, Blob, or dataURL string.");
  }

  let defaultExt = "jpg";
  const fileType = fileToSend.type ? fileToSend.type.toLowerCase() : "";
  const existingName = (fileToSend as File).name || "";
  
  if (fileType.includes("pdf") || existingName.toLowerCase().endsWith(".pdf")) {
    defaultExt = "pdf";
  } else if (fileType.includes("png") || existingName.toLowerCase().endsWith(".png")) {
    defaultExt = "png";
  } else if (fileType.includes("webp") || existingName.toLowerCase().endsWith(".webp")) {
    defaultExt = "webp";
  }

  const filename = existingName || `document_${Date.now()}.${defaultExt}`;
  formData.append("file", fileToSend, filename);

  const token = localStorage.getItem("lr_token");
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/storage/upload?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Image upload failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (data.url && (data.url.startsWith("http://") || data.url.startsWith("https://"))) {
    return data.url;
  }

  throw new Error("Image upload succeeded but no valid URL was returned from the server.");
}

/**
 * Drop-in compatible function used across all form components.
 * Automatically routes raw files directly to Google Cloud Storage.
 * THROWS on failure — callers must handle the error and show the user a message.
 */
export async function compressImage(
  fileOrBase64: File | Blob | string,
  _maxWidth?: number,
  _maxHeight?: number,
  _quality?: number,
  folder = "uploads"
): Promise<string> {
  return uploadDirectToGCS(fileOrBase64, folder);
}
