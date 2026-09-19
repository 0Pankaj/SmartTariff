import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Trophy, Database, Phone, MessageSquare, Calendar, Scale, Check } from "lucide-react";
import toast from "react-hot-toast";
import MatchScore from "./MatchScore";
import { formatCurrency, formatData, formatMinutes, formatCount } from "@/utils/format";
import { toggleCompare } from "@/store/slices/planSlice";

const RANK_CONFIGS = {
  1: {
    bg: "bg-[#10B981]",
    textColor: "text-[#10B981]",
    badgeBg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
    badgeLabel: "Best Match",
    strokeColor: "#10B981",
  },
  2: {
    bg: "bg-[#2563EB]",
    textColor: "text-[#2563EB]",
    badgeBg: "bg-blue-50 text-blue-700 border border-blue-200/60",
    badgeLabel: "Popular Choice",
    strokeColor: "#2563EB",
  },
  3: {
    bg: "bg-[#F97316]",
    textColor: "text-[#F97316]",
    badgeBg: "bg-orange-50 text-orange-700 border border-orange-200/60",
    badgeLabel: "Value Pick",
    strokeColor: "#F97316",
  },
};

export default function RecommendationCard({
  item,
  rank = 1,
  onCompareToggle,
  isComparing: propsIsComparing,
}) {
  const dispatch = useDispatch();
  const compareList = useSelector((s) => s.plans?.compareList || []);

  const plan = item?.plan || item;
  const targetId =
    plan?._id ||
    (plan?.planId ? (plan.planId.startsWith("plan_") ? plan.planId : `plan_${plan.planId}`) : null) ||
    item?.planId ||
    plan?.planCode;

  const isComparing =
    propsIsComparing !== undefined
      ? propsIsComparing
      : Boolean(
          (targetId && compareList.includes(targetId)) ||
          (plan?._id && compareList.includes(plan._id)) ||
          (plan?.planId && compareList.includes(plan.planId))
        );

  const score = typeof item?.score === "number" ? Math.round(item.score) : (rank === 1 ? 92 : rank === 2 ? 87 : 79);
  const reasons = item?.reasons || [];
  const config = RANK_CONFIGS[rank] || RANK_CONFIGS[1];

  const handleCompareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!targetId) return;

    if (onCompareToggle) {
      onCompareToggle(targetId);
      return;
    }

    if (isComparing) {
      const idToRemove =
        compareList.find((id) => id === targetId || id === plan?._id || id === plan?.planId) || targetId;
      dispatch(toggleCompare(idToRemove));
      toast.success(`Removed "${plan?.name || "Plan"}" from comparison`);
    } else {
      if (compareList.length >= 3) {
        toast.error("You can compare up to 3 plans at a time. Remove one to add this.");
        return;
      }
      dispatch(toggleCompare(targetId));
      toast.success(`Added "${plan?.name || "Plan"}" to comparison (${compareList.length + 1}/3)`);
    }
  };

  // Primary explanation summary
  const reasonText =
    reasons.length > 0
      ? `${reasons[0]}${reasons[1] ? ` and ${reasons[1].toLowerCase()}` : ""}.`
      : rank === 1
      ? "Great match for your high data usage and fits your budget."
      : rank === 2
      ? "More SMS benefits with good data allowance within budget."
      : "Balanced plan with sufficient data and lowest cost.";

  const validityText = plan?.validity ? `${plan.validity} Days Validity` : "30 Days Validity";

  return (
    <div className="flex flex-col sm:flex-row items-stretch overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition duration-200 hover:shadow-md hover:border-slate-200">
      {/* Left: Rank Column */}
      <div
        className={`flex w-full sm:w-14 shrink-0 flex-row sm:flex-col items-center justify-center gap-1 py-3 sm:py-0 px-4 sm:px-0 text-white ${config.bg}`}
      >
        {rank === 1 ? (
          <>
            <Trophy className="h-4 w-4" />
            <span className="text-xl sm:text-2xl font-extrabold">{rank}</span>
          </>
        ) : (
          <span className="text-xl sm:text-2xl font-extrabold">{rank}</span>
        )}
      </div>

      {/* Center: Plan details, specs, reasons */}
      <div className="flex flex-1 flex-col justify-center p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-[#081936]">
            {plan?.planCode || plan?.planId || "PLAN"}
          </span>
          <h3 className="text-base font-bold text-[#081936]">{plan?.name || "Tariff Plan"}</h3>
          {rank === 1 && (
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${config.badgeBg}`}>
              {config.badgeLabel}
            </span>
          )}
          {plan?.discountPercent > 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/70">
              Save {plan.discountPercent}%
            </span>
          )}
        </div>

        {/* Plan Feature Specs */}
        <div className="mt-2.5 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-slate-400" />
            <span>{plan?.dataLimit !== undefined ? `${formatData(plan.dataLimit)}/mo` : "100 GB/mo"}</span>
          </div>
          <span className="hidden sm:inline text-slate-200">•</span>
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>{plan?.callMinutes >= 999999 || plan?.callMinutes === null ? "Unlimited Voice" : formatMinutes(plan.callMinutes)}</span>
          </div>
          <span className="hidden sm:inline text-slate-200">•</span>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
            <span>{plan?.smsLimit !== undefined ? `${formatCount(plan.smsLimit)} SMS/mo` : "100 SMS/mo"}</span>
          </div>
          <span className="hidden sm:inline text-slate-200">•</span>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>{validityText}</span>
          </div>
        </div>

        {/* Explanation text */}
        <p className="mt-2 text-xs font-medium text-slate-500 line-clamp-1">
          {reasonText}
        </p>
      </div>

      {/* Right: Circular score, Price, Actions CTA */}
      <div className="flex shrink-0 flex-row sm:flex-row items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 sm:border-l border-slate-100 p-4 sm:p-5 bg-slate-50/30">
        {/* Circular Progress Ring */}
        <div className="shrink-0">
          <MatchScore score={score} size={60} strokeWidth={5} customColor={config.strokeColor} />
        </div>

        {/* Price & Action Buttons */}
        <div className="flex flex-col items-end gap-2.5">
          <div className="text-right">
            <p className="text-lg sm:text-xl font-extrabold tracking-tight text-[#081936] leading-none">
              ₹{plan?.price || 450}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              / {plan?.validity || 28} days
            </p>
            {plan?.durationMonths > 1 && (
              <p className="mt-0.5 text-[10px] font-bold text-[#081936]">
                ₹{plan.monthlyEquivalent}/mo
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCompareClick}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap ${
                isComparing
                  ? "border-[#081936] bg-[#081936] text-white hover:bg-[#0D2248]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-[#081936] hover:border-slate-300"
              }`}
              title={isComparing ? "Remove from comparison" : "Add to comparison (up to 3 plans)"}
            >
              {isComparing ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <Scale className="h-3.5 w-3.5 text-[#081936]" />
                  <span>Add to Compare</span>
                </>
              )}
            </button>

            <Link to={`/plans/${targetId || ""}`}>
              <button className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-95 cursor-pointer whitespace-nowrap">
                View Details
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
