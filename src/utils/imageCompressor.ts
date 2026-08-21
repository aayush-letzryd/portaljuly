/**
 * Image Utility for LetzRyd Fleet Portal
 * Reads uploaded files in full, uncompressed raw quality for direct cloud storage.
 */

export async function compressImage(
  fileOrBase64: File | string,
  _maxWidth?: number,
  _maxHeight?: number,
  _quality?: number
): Promise<string> {
  if (typeof fileOrBase64 === "string") {
    return fileOrBase64;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(fileOrBase64);
  });
}
