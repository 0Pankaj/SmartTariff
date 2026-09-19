import { useEffect, useState } from "react";
import { Users, PackageCheck, Cpu, Trophy, Gauge } from "lucide-react";
import { adminApi } from "@/services/adminApi";
import Card, { CardBody } from "@/components/common/Card";
import { CardSkeleton } from "@/components/common/Loader";

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    adminApi.dashboard().then((res) => { setData(res.data); setStatus("succeeded"); }).catch(() => setStatus("failed"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Platform-wide statistics and recommendation performance.</p>
      </div>

      {status === "loading" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {data && (
        <>
          {/* ML Engine Status Banner */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#081936] text-white shadow-md">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">SmartTariff V3.2 ML Engine</h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    Active & Serving
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  RandomForestRegressor • 10 Input Features • 100 Estimators • Trained on 20,000 Customers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#081936] shadow-xs">
                20 Active Tariff Plans Seeded
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Total Customers" value={data.cards.totalCustomers} color="indigo" />
            <StatCard icon={PackageCheck} label="Total Active Plans" value={data.cards.activePlans} color="emerald" />
            <StatCard icon={Trophy} label="Total Recommendations" value={data.cards.totalRecommendations} color="purple" />
            <StatCard icon={Gauge} label="Avg. Recommendation Score" value={`${data.cards.avgScore}%`} color="amber" />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = { indigo: "bg-slate-100 text-[#081936]", emerald: "bg-emerald-50 text-emerald-600", purple: "bg-slate-100 text-[#081936]", amber: "bg-amber-50 text-amber-600" };
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{label}</p>
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors[color]}`}><Icon className="h-4.5 w-4.5" /></span>
        </div>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      </CardBody>
    </Card>
  );
}
