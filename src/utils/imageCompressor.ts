/**
 * High-Resolution Image Compressor for LetzRyd Fleet Portal
 * Resizes high-resolution mobile camera shots (12MP-48MP / 10MB+) to 1920px Full HD at 82% quality.
 * Reduces photo size from ~10MB to ~300KB-400KB in the browser, preventing Cloud Run 413 Payload Too Large errors
 * while keeping odometer digits and vehicle condition crystal-clear.
 */

export async function compressImage(
  fileOrBase64: File | string,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.82
): Promise<string> {
  if (!fileOrBase64) return "";

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Constrain proportionally if exceeding bounds
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback to original string/reader
        if (typeof fileOrBase64 === "string") {
          resolve(fileOrBase64);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(fileOrBase64);
        }
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      if (typeof fileOrBase64 === "string") {
        resolve(fileOrBase64);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(fileOrBase64);
      }
    };

    if (typeof fileOrBase64 === "string") {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || "";
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(fileOrBase64);
    }
  });
}
