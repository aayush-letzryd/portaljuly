/**
 * Direct Cloud Image Uploader for LetzRyd Fleet Portal
 * Uploads raw image files directly to Google Cloud Storage bucket via /api/storage/upload.
 * Storing clean bucket URLs prevents Cloud Run 413 Payload Too Large errors,
 * preserves 100% uncompressed raw camera quality, and eliminates database bloat.
 */

export async function uploadDirectToGCS(
  fileOrBase64: File | Blob | string,
  folder = "uploads"
): Promise<string> {
  if (!fileOrBase64) return "";

  // If already an HTTP/HTTPS URL, return as-is
  if (typeof fileOrBase64 === "string" && (fileOrBase64.startsWith("http://") || fileOrBase64.startsWith("https://"))) {
    return fileOrBase64;
  }

  try {
    let fileToSend: File | Blob;

    if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
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
      return String(fileOrBase64);
    }

    const formData = new FormData();
    const filename = (fileToSend as File).name || `photo_${Date.now()}.jpg`;
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

    if (res.ok) {
      const data = await res.json();
      if (data.url && (data.url.startsWith("http://") || data.url.startsWith("https://"))) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn("Direct storage upload fallback to local dataURL:", err);
  }

  // Graceful fallback to dataURL if upload fails (e.g. offline)
  if (typeof fileOrBase64 === "string") {
    return fileOrBase64;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(fileOrBase64 as Blob);
  });
}

/**
 * Drop-in compatible function used across all form components.
 * Automatically routes raw files to Google Cloud Storage.
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

