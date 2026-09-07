/**
 * Indian Date & Time Formatting Utilities
 */

export const formatIndianDateTime = (dateStr?: string | null): string => {
  if (!dateStr || dateStr.trim() === "" || dateStr === "null" || dateStr === "None") return "—";
  try {
    const cleanStr = dateStr.trim().replace(" ", "T");
    const [datePart, timePart] = cleanStr.split("T");
    if (datePart && timePart) {
      const dParts = datePart.split("-");
      if (dParts.length === 3) {
        const [year, month, day] = dParts;
        const timeClean = timePart.split(".")[0].split("+")[0].split("Z")[0];
        const tParts = timeClean.split(":");
        const hh = parseInt(tParts[0] || "0", 10);
        const mm = tParts[1] || "00";
        const ampm = hh >= 12 ? "PM" : "AM";
        const h12 = hh % 12 || 12;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mIdx = parseInt(month, 10) - 1;
        const mName = months[mIdx] || month;
        return `${day.padStart(2, "0")} ${mName} ${year}, ${String(h12).padStart(2, "0")}:${mm.padStart(2, "0")} ${ampm}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

export const formatIndianDate = (dateStr?: string | null): string => {
  if (!dateStr || dateStr.trim() === "" || dateStr === "null" || dateStr === "None") return "—";
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mIdx = parseInt(month, 10) - 1;
      const mName = months[mIdx] || month;
      return `${day.padStart(2, "0")} ${mName} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};
