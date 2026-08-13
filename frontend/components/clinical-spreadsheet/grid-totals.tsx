import React from "react";

type GridTotalsProps = {
  totals: {
    colSums: Record<string, number>;
    totalInputs: number;
    totalOutputs: number;
    netBalance: number;
  };
};

export default function GridTotals({ totals }: GridTotalsProps) {
  return (
    <tfoot className="print:break-before-avoid">
      <tr className="border-t-2 border-slate-200 bg-slate-100 font-mono font-bold text-[12px] text-slate-900 print:bg-slate-100 print:text-black print:border-black">
        <td className="p-1 text-center text-slate-700 border-r border-slate-200 print:border-black">
          TOTAIS
        </td>

        <td className="p-1 text-center border-r border-slate-200 text-emerald-700 font-extrabold print:text-black print:border-black">
          {totals.colSums["MEDICATION"] ? `${totals.colSums["MEDICATION"]} ml` : "—"}
        </td>
        <td className="p-1 text-center border-r border-slate-200 text-emerald-700 font-extrabold print:text-black print:border-black">
          {totals.colSums["OTHER_INPUT"] ? `${totals.colSums["OTHER_INPUT"]} ml` : "—"}
        </td>
        <td className="p-1 text-center border-r border-slate-200 text-emerald-700 font-extrabold print:text-black print:border-black">
          {((totals.colSums["ORAL_DIET"] || 0) + (totals.colSums["ENTERAL_DIET"] || 0) + (totals.colSums["PARENTERAL_NUTRITION"] || 0) + (totals.colSums["FILTERED_WATER"] || 0)) > 0
            ? `${(totals.colSums["ORAL_DIET"] || 0) + (totals.colSums["ENTERAL_DIET"] || 0) + (totals.colSums["PARENTERAL_NUTRITION"] || 0) + (totals.colSums["FILTERED_WATER"] || 0)} ml`
            : "—"}
        </td>
        <td className="p-1 text-center border-r-2 border-r-emerald-300 text-emerald-700 font-extrabold print:text-black print:border-black">
          {totals.colSums["IV_HYDRATION"] ? `${totals.colSums["IV_HYDRATION"]} ml` : "—"}
        </td>

        <td className="p-1 text-center border-r border-slate-200 text-rose-700 font-extrabold print:text-black print:border-black">
          {totals.colSums["URINE"] ? `${totals.colSums["URINE"]} ml` : "—"}
        </td>
        <td className="p-1 text-center border-r border-slate-200 text-rose-700 font-extrabold print:text-black print:border-black">
          {totals.colSums["SNE_SNG"] ? `${totals.colSums["SNE_SNG"]} ml` : "—"}
        </td>
        <td className="p-1 text-center border-r border-slate-200 text-rose-700 font-extrabold print:text-black print:border-black">
          {totals.colSums["DRAIN"] ? `${totals.colSums["DRAIN"]} ml` : "—"}
        </td>
        <td className="p-1 text-center border-r border-slate-200 text-rose-700 font-extrabold print:text-black print:border-black">
          {totals.colSums["STOOL"] ? `${totals.colSums["STOOL"]} ml` : "—"}
        </td>
        <td className="p-1 text-center border-r-2 border-r-rose-300 text-rose-700 font-extrabold print:text-black print:border-black">
          {totals.colSums["OTHER_OUTPUT"] ? `${totals.colSums["OTHER_OUTPUT"]} ml` : "—"}
        </td>

        <td className="p-1 border-r border-slate-200 print:border-black"></td>
        <td className="p-1 border-r border-slate-200 print:border-black"></td>
        <td className="p-1 border-r border-slate-200 print:border-black"></td>
        <td className="p-1 border-r border-slate-200 print:border-black"></td>
        <td className="p-1 border-r border-slate-200 print:border-black"></td>
        <td className="p-1 print:border-black"></td>
      </tr>
    </tfoot>
  );
}
