import React from "react";

const INPUT_COLUMNS = [
  { key: "MEDICATION", label: "Medicações" },
  { key: "OTHER_INPUT", label: "Outras Entr." },
  { key: "NUTRITION", label: "Nutrição" },
  { key: "IV_HYDRATION", label: "IV Hydr." },
];

const OUTPUT_COLUMNS = [
  { key: "URINE", label: "Diurese" },
  { key: "SNE_SNG", label: "SNE/SNG" },
  { key: "DRAIN", label: "Dreno" },
  { key: "STOOL", label: "Fezes" },
  { key: "OTHER_OUTPUT", label: "Outras Saídas" },
];

const VITAL_COLUMNS = [
  { key: "pulse", label: "P" },
  { key: "blood_pressure", label: "PA" },
  { key: "temperature", label: "T" },
  { key: "respiration", label: "R" },
  { key: "spo2", label: "SpO2" },
  { key: "hgt", label: "HGT" },
];

export default function GridHeader() {
  return (
    <thead>
      <tr className="border-b border-slate-200 bg-slate-100 font-bold tracking-wider text-slate-700 uppercase print:bg-slate-100 print:text-black print:border-black">
        <th className="w-14 p-1.5 text-center border-r border-slate-200 print:border-black" rowSpan={2}>
          HORA
        </th>
        <th className="p-1.5 text-center border-r-2 border-r-emerald-300 bg-emerald-50 text-emerald-900 font-extrabold print:bg-emerald-50 print:text-black print:border-black" colSpan={4}>
          GANHOS (ENTRADAS)
        </th>
        <th className="p-1.5 text-center border-r-2 border-r-rose-300 bg-rose-50 text-rose-900 font-extrabold print:bg-rose-50 print:text-black print:border-black" colSpan={5}>
          PERDAS (SAÍDAS)
        </th>
        <th className="p-1.5 text-center bg-sky-50 text-sky-900 font-extrabold print:bg-sky-50 print:text-black print:border-black" colSpan={6}>
          SINAIS VITAIS
        </th>
      </tr>

      <tr className="border-b-2 border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 print:border-black print:text-black print:bg-white">
        {INPUT_COLUMNS.map((col) => (
          <th
            key={col.key}
            className={`w-[8%] p-1 text-center border-r border-slate-200 bg-emerald-50/50 text-emerald-950 font-bold print:border-black print:bg-white ${col.key === "IV_HYDRATION" ? "border-r-2 border-r-emerald-300" : ""}`}
          >
            {col.label}
          </th>
        ))}
        {OUTPUT_COLUMNS.map((col) => (
          <th
            key={col.key}
            className={`w-[6%] p-1 text-center border-r border-slate-200 bg-rose-50/50 text-rose-950 font-bold print:border-black print:bg-white ${col.key === "OTHER_OUTPUT" ? "border-r-2 border-r-rose-300" : ""}`}
          >
            {col.label}
          </th>
        ))}
        {VITAL_COLUMNS.map((col) => (
          <th
            key={col.key}
            className={`w-[5%] p-1 text-center border-r border-slate-200 bg-sky-50/50 text-sky-950 font-bold print:border-black print:bg-white ${col.key === "HGT" ? "" : ""}`}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}
