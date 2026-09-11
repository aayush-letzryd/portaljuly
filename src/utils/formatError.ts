/**
 * Transforms any error (FastAPI 422 list of dicts, objects, strings, Error instances)
 * into a clean, human-readable string without ever outputting "[object Object]".
 */
export function formatErrorMessage(err: any, fallback = "An unexpected error occurred"): string {
  if (!err) return fallback;

  if (typeof err === "string") {
    const trimmed = err.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatErrorMessage(parsed, fallback);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  // Handle FastAPI 422 validation detail array: [{ loc: [...], msg: "...", type: "..." }]
  if (Array.isArray(err)) {
    const messages = err.map((item: any) => {
      if (typeof item === "string") return item;
      if (typeof item === "object" && item !== null) {
        const loc = Array.isArray(item.loc)
          ? item.loc.filter((x: any) => x !== "body" && x !== "query").join(" -> ")
          : "";
        const msg = item.msg || item.message || JSON.stringify(item);
        return loc ? `${loc}: ${msg}` : msg;
      }
      return String(item);
    });
    return messages.filter(Boolean).join("; ") || fallback;
  }

  // Handle Error instances or plain objects
  if (typeof err === "object") {
    if (err.detail) {
      return formatErrorMessage(err.detail, fallback);
    }
    if (err.message && err.message !== "[object Object]") {
      return formatErrorMessage(err.message, fallback);
    }
    if (err.msg) {
      return String(err.msg);
    }
    if (err.error) {
      return formatErrorMessage(err.error, fallback);
    }
    try {
      const jsonStr = JSON.stringify(err);
      if (jsonStr !== "{}" && jsonStr !== "[]") {
        return jsonStr;
      }
    } catch {
      // ignore
    }
  }

  return String(err) === "[object Object]" ? fallback : String(err);
}
