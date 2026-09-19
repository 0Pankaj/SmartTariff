import { PiggyBank, ShieldCheck, Star } from "lucide-react";

export default function SavingsSummary({ savings = 120, overage = "₹0 - ₹20", benchmarkCount = "1000+" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {/* Column 1: Savings */}
        <div className="flex items-center gap-3.5 sm:px-3 first:pl-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[#081936]">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">You can save up to</p>
            <p className="text-base sm:text-lg font-extrabold text-[#081936]">
              ₹{savings} <span className="text-xs font-semibold text-slate-500">/ month</span>
            </p>
            <p className="text-[10px] text-slate-400">with these recommendations</p>
          </div>
        </div>

        {/* Column 2: Overage */}
        <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[#081936]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Estimated overage charges</p>
            <p className="text-base sm:text-lg font-extrabold text-[#081936]">
              {overage}
            </p>
            <p className="text-[10px] text-slate-400">with recommended plan</p>
          </div>
        </div>

        {/* Column 3: Customer Profiles */}
        <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[#081936]">
            <Star className="h-5 w-5 fill-[#081936] text-[#081936]" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Based on</p>
            <p className="text-base sm:text-lg font-extrabold text-[#081936]">
              {benchmarkCount} similar
            </p>
            <p className="text-[10px] text-slate-400">customer profiles</p>
          </div>
        </div>
      </div>
    </div>
  );
}
