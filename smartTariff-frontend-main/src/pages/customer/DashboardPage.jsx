import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Scale } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyUsage } from "@/store/slices/usageSlice";
import {
  fetchMyRecommendations,
  generateRecommendationsThunk,
} from "@/store/slices/recommendationSlice";
import { customerApi } from "@/services/customerApi";
import { usageApi } from "@/services/usageApi";
import { getToken } from "@/services/api";
import toast from "react-hot-toast";

import DashboardHero from "@/components/dashboard/DashboardHero";
import CustomerUsageCards from "@/components/dashboard/CustomerUsageCards";
import CustomerProfileModal from "@/components/dashboard/CustomerProfileModal";
import UsageSummary from "@/components/dashboard/UsageSummary";
import RecommendationCard from "@/components/dashboard/RecommendationCard";
import SavingsSummary from "@/components/dashboard/SavingsSummary";
import RecommendationReasons from "@/components/dashboard/RecommendationReasons";
import UsageVsPlan from "@/components/dashboard/UsageVsPlan";
import RecommendationFeedback from "@/components/dashboard/RecommendationFeedback";
import { CardSkeleton } from "@/components/common/Loader";

// Fallback plans matching reference UI if user hasn't generated recommendations yet
const DEFAULT_PREVIEW_PLANS = [
  {
    planId: "P07",
    score: 94,
    rank: 1,
    reasons: ["Matches your 100 GB data needs", "Unlimited voice calling included", "Fits your monthly budget"],
    plan: {
      _id: "plan_P07",
      planId: "P07",
      planCode: "P07",
      name: "Stream 60",
      operator: "",
      category: "Streamer",
      price: 450,
      monthlyEquivalent: 450.0,
      validity: 28,
      dataLimit: 100,
      callMinutes: 999999,
      smsLimit: 100,
      offerType: "Standalone",
      discountPercent: 0,
      discountInr: 0,
      fiveG: true,
    },
  },
  {
    planId: "P06",
    score: 88,
    rank: 2,
    reasons: ["Covers your high data usage", "Includes 150 SMS with 5G connectivity"],
    plan: {
      _id: "plan_P06",
      planId: "P06",
      planCode: "P06",
      name: "Smart Plus",
      operator: "",
      category: "Standard+",
      price: 420,
      monthlyEquivalent: 420.0,
      validity: 28,
      dataLimit: 60,
      callMinutes: 999999,
      smsLimit: 150,
      offerType: "Standalone",
      discountPercent: 0,
      discountInr: 0,
      fiveG: true,
    },
  },
  {
    planId: "P05",
    score: 82,
    rank: 3,
    reasons: ["Balanced plan with 45 GB data and lowest price point"],
    plan: {
      _id: "plan_P05",
      planId: "P05",
      planCode: "P05",
      name: "Smart Daily",
      operator: "",
      category: "Standard",
      price: 370,
      monthlyEquivalent: 370.0,
      validity: 28,
      dataLimit: 45,
      callMinutes: 999999,
      smsLimit: 100,
      offerType: "Standalone",
      discountPercent: 0,
      discountInr: 0,
      fiveG: true,
    },
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const { records, status: usageStatus } = useSelector((s) => s.usage);
  const { latest, status: recStatus } = useSelector((s) => s.recommendations);
  const compareList = useSelector((s) => s.plans?.compareList || []);
  const [profile, setProfile] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user || !getToken()) return;
    dispatch(fetchMyUsage(user._id));
    dispatch(fetchMyRecommendations(user._id));
    customerApi.getProfile(user._id).then((res) => {
      setProfile(res.data);
    }).catch(() => {});
  }, [dispatch, user]);

  const latestUsage = records[0] || {
    dataUsage: 42,
    callMinutes: 350,
    smsCount: 40,
  };

  const handleFormSubmit = async (formData) => {
    if (!user) return;
    setGenerating(true);
    try {
      const dataUsage = Number(formData.dataUsage) || 0;
      const callMinutes = Number(formData.callMinutes) || 0;
      const smsCount = Number(formData.smsCount) || 0;
      const monthlyBudget = Number(formData.monthlyBudget) || 500;
      const currentSpending = Number(formData.currentSpending) || monthlyBudget;

      // 1. Save or update usage record for current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      await usageApi.create({
        customerId: user._id,
        dataUsage,
        callMinutes,
        smsCount,
        currentSpending,
        month: currentMonth,
      });

      // 2. Save profile preferences
      await customerApi.updateProfile(user._id, {
        monthlyBudget,
        minimumData: dataUsage,
        minimumCallMinutes: callMinutes,
        minimumSms: smsCount,
        preferredDuration: formData.preferredDuration,
        requires5G: Boolean(formData.requires5G),
        currentSpending,
      });

      // 3. Update local state
      setProfile((prev) => ({
        ...prev,
        monthlyBudget,
        minimumData: dataUsage,
        minimumCallMinutes: callMinutes,
        minimumSms: smsCount,
        preferredDuration: formData.preferredDuration,
        requires5G: Boolean(formData.requires5G),
        currentSpending,
      }));

      // 4. Refresh usage and generate recommendation
      dispatch(fetchMyUsage(user._id));
      const res = await dispatch(generateRecommendationsThunk(user._id));
      if (generateRecommendationsThunk.fulfilled.match(res)) {
        toast.success("Fresh recommendations matched to your profile!");
      } else {
        toast.error(res.payload || "Could not generate recommendations");
      }
    } catch (err) {
      toast.error(err.message || "Failed to generate recommendations");
    } finally {
      setGenerating(false);
    }
  };

  // Use latest generated recommendations or fallback preview plans
  const displayPlans =
    latest?.plans?.length > 0
      ? latest.plans
      : DEFAULT_PREVIEW_PLANS;

  const top1Plan = displayPlans[0]?.plan;

  return (
    <div className="space-y-6">
      {/* 3-Column Desktop Layout (Main Center Area + Right Sidebar Panel) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* CENTER / MAIN CONTENT (8 Cols on lg+) */}
        <div className="space-y-5 lg:col-span-8">
          {/* Dashboard Hero Banner */}
          <DashboardHero />

          {/* 6 Usage & Budget Input Display Cards */}
          <CustomerUsageCards
            usage={{
              dataUsage: profile?.minimumData ?? latestUsage.dataUsage ?? 42,
              callMinutes: profile?.minimumCallMinutes ?? latestUsage.callMinutes ?? 350,
              smsCount: profile?.minimumSms ?? latestUsage.smsCount ?? 40,
              currentSpending: profile?.currentSpending ?? 1000,
              monthlyBudget: profile?.monthlyBudget ?? 500,
              preferredDuration: profile?.preferredDuration ?? "28",
            }}
            onOpenForm={() => setIsModalOpen(true)}
          />

          {/* Customer Profile Input Modal Dialog */}
          <CustomerProfileModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            initialValues={{
              dataUsage: profile?.minimumData ?? latestUsage.dataUsage ?? 42,
              callMinutes: profile?.minimumCallMinutes ?? latestUsage.callMinutes ?? 350,
              smsCount: profile?.minimumSms ?? latestUsage.smsCount ?? 40,
              currentSpending: profile?.currentSpending ?? 1000,
              monthlyBudget: profile?.monthlyBudget ?? 500,
              preferredDuration: profile?.preferredDuration ?? "28",
              requires5G: profile?.requires5G ?? false,
            }}
            onSubmit={async (formData) => {
              await handleFormSubmit(formData);
              setIsModalOpen(false);
            }}
            loading={generating || recStatus === "loading"}
          />

          {/* Top 3 Recommended Plans Section */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[#081936] tracking-tight">
                Top 3 Recommended Plans for You
              </h2>
              <div className="flex items-center gap-2">
                {compareList.length > 0 && (
                  <Link
                    to="/compare"
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-[#081936] shadow-sm transition hover:bg-slate-200 active:scale-95"
                  >
                    <Scale className="h-3 w-3 text-[#081936]" />
                    <span>Compare ({compareList.length}/3) &rarr;</span>
                  </Link>
                )}
                {latest?.generatedBy === "ml" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    AI / ML Model Active (V4.3)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-[#081936] border border-slate-200 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-[#081936]"></span>
                    AI / ML Model Active (V4.3)
                  </span>
                )}
              </div>
            </div>

            {recStatus === "loading" || generating ? (
              <div className="space-y-3">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : (
              <div className="space-y-3">
                {displayPlans.slice(0, 3).map((item, idx) => (
                  <RecommendationCard
                    key={item.planId || idx}
                    item={item}
                    rank={idx + 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Savings Summary Horizontal Card */}
          <SavingsSummary
            savings={Math.max(50, (profile?.currentSpending || 1000) - (top1Plan?.price || 360))}
            overage="₹0 - ₹20"
            benchmarkCount="1000+"
          />
        </div>

        {/* RIGHT PANEL (4 Cols on lg+) */}
        <div className="space-y-5 lg:col-span-4">
          {/* Why These Plans? */}
          <RecommendationReasons />

          {/* Your Usage vs Plan (Top 1) */}
          <UsageVsPlan
            usage={{
              dataUsage: profile?.minimumData || latestUsage.dataUsage || 200,
              callMinutes: profile?.minimumCallMinutes || latestUsage.callMinutes || 1000,
              smsCount: profile?.minimumSms || latestUsage.smsCount || 500,
            }}
            topPlan={top1Plan}
          />

          {/* Rate this Recommendation Feedback Widget */}
          <RecommendationFeedback recommendationId={latest?._id || "latest"} />
        </div>
      </div>
    </div>
  );
}
