// Peak — small helpers shared across the bottom sheets (Log / Benchmark / Goal).
// Extracted verbatim from the former monolithic Sheets.tsx so each sheet file can
// import them without duplicating. (A .tsx file because NumInput renders JSX.)
import { inputStyle } from "../ui";

// Small numeric input that keeps the raw string while editing.
export function NumInput({ value, onChange, placeholder, step }: {
  value: string; onChange: (v: string) => void; placeholder?: string; step?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, padding: "10px 12px" }}
    />
  );
}

export const num = (v: string): number | undefined => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
};
