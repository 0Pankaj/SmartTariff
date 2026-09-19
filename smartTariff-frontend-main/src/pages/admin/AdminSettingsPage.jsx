import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShieldCheck, Cpu, RefreshCw } from "lucide-react";
import Card, { CardBody, CardHeader } from "@/components/common/Card";
import Button from "@/components/common/Button";
import { recommendationApi } from "@/services/recommendationApi";

export default function AdminSettingsPage() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await recommendationApi.getModelStatus();
      setModelInfo(res.data);
      toast.success("ML Model status refreshed");
    } catch {
      toast.error("Could not fetch backend ML status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Platform configuration, ML model status, and backend system telemetry.</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[#081936]" />
            <h2 className="font-semibold text-slate-800">SmartTariff V4.3 ML Engine Configuration</h2>
          </div>
          <Button size="sm" variant="secondary" icon={RefreshCw} loading={loading} onClick={fetchStatus}>
            Refresh Status
          </Button>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-600">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Engine Model Type</p>
              <p className="text-sm font-bold text-[#081936] mt-0.5">{modelInfo?.model_type || "RandomForestRegressor (Scikit-Learn)"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Serving Status</p>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">Active & Serving (FastAPI)</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Feature Vector</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">10 Engineered Features</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimators / Trees</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">100 Trees (Config V4.3)</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Data is persisted in the backend database (PostgreSQL) and real-time inference is executed by the backend ML pipeline.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
