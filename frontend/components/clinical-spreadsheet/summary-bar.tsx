type SummaryBarProps = {
  totals: {
    colSums: Record<string, number>;
    totalInputs: number;
    totalOutputs: number;
    netBalance: number;
  };
  cumulativeBalance: number | null;
};

export default function SummaryBar({ totals, cumulativeBalance }: SummaryBarProps) {
  const cumBalanceVal = cumulativeBalance !== null ? cumulativeBalance : totals.netBalance;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium print:bg-white print:border-black print:text-black">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-1.5 text-emerald-700 font-bold print:text-black">
          Total Entradas: <strong className="font-mono text-sm">{totals.totalInputs} ml</strong>
        </span>
        <span className="flex items-center gap-1.5 text-rose-700 font-bold print:text-black">
          Total Saídas: <strong className="font-mono text-sm">{totals.totalOutputs} ml</strong>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600 font-semibold print:text-black">Saldo Hídrico 24h:</span>
          <span
            className={`rounded-lg px-2.5 py-0.5 font-mono text-sm font-bold border ${
              totals.netBalance > 0
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 print:bg-transparent print:text-black print:border-none"
                : totals.netBalance < 0
                ? "bg-rose-50 text-rose-800 border-rose-200 print:bg-transparent print:text-black print:border-none"
                : "bg-slate-100 text-slate-700 border-slate-200 print:bg-transparent print:text-black"
            }`}
          >
            {totals.netBalance > 0 ? `+${totals.netBalance}` : totals.netBalance} ml
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-600 font-semibold print:text-black">Saldo Acumulado:</span>
          <span
            className={`rounded-lg px-2.5 py-0.5 font-mono text-sm font-medium border ${
              cumBalanceVal > 0
                ? "bg-blue-50 text-blue-700 border-blue-200 print:bg-transparent print:text-black print:border-none"
                : cumBalanceVal < 0
                ? "bg-red-50 text-red-700 border-red-200 print:bg-transparent print:text-black print:border-none"
                : "bg-slate-100 text-slate-700 border-slate-200 print:bg-transparent print:text-black"
            }`}
          >
            {cumBalanceVal > 0 ? `+${cumBalanceVal}` : cumBalanceVal} ml
          </span>
        </div>
      </div>
    </div>
  );
}
