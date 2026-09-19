import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { customerApi } from "@/services/customerApi";
import Card, { CardBody, CardHeader } from "@/components/common/Card";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { PageLoader } from "@/components/common/Loader";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { formatData, formatMinutes, formatCount, formatCurrency, formatDate, monthKeyToLabel, scoreColor } from "@/utils/format";
import { UsageAreaChart } from "@/components/charts/UsageChart";

export default function AdminCustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    customerApi.getDetail(id).then((res) => { setData(res.data); setStatus("succeeded"); }).catch(() => setStatus("failed"));
  }, [id]);

  if (status === "loading") return <PageLoader label="Loading customer profile..." />;
  if (status === "failed") return <ErrorState message="Could not load customer details" />;

  const { user, profile, usage, recommendations, feedback, currentPlan } = data;

  const handleToggleStatus = async () => {
    const newStatus = !user.isActive;
    await customerApi.setStatus(user._id, newStatus);
    setData((prev) => ({
      ...prev,
      user: { ...prev.user, isActive: newStatus },
    }));
    toast.success(`Customer ${newStatus ? "activated" : "deactivated"}`);
    setShowStatusConfirm(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await customerApi.deleteCustomer(user._id);
      toast.success(`Customer ${user.name} deleted successfully`);
      setShowDeleteConfirm(false);
      navigate("/admin/customers");
    } catch (err) {
      toast.error(err.message || "Failed to delete customer");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/admin/customers")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#081936] cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </button>

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-[#081936]">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
            <p className="text-sm text-slate-500">{user.email} · {user.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Inactive"}</Badge>
          <Button
            size="sm"
            variant={user.isActive ? "secondary" : "success"}
            onClick={() => setShowStatusConfirm(true)}
          >
            {user.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Customer</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><h2 className="font-semibold text-slate-800">Current Plan</h2></CardHeader>
          <CardBody>
            {currentPlan ? (
              <>
                <p className="font-semibold text-slate-800">{currentPlan.name}</p>
                <p className="text-sm text-slate-500">{currentPlan.category ? `${currentPlan.category} · ` : ""}{formatCurrency(currentPlan.price)}/month</p>
              </>
            ) : <p className="text-sm text-slate-400">No active plan assigned</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-semibold text-slate-800">Preferences</h2></CardHeader>
          <CardBody className="space-y-1.5 text-sm">
            <p className="flex justify-between"><span className="text-slate-500">Monthly Budget</span><span className="font-medium">{formatCurrency(profile?.monthlyBudget)}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">Min. Data</span><span className="font-medium">{formatData(profile?.minimumData)}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">Min. Calls</span><span className="font-medium">{formatMinutes(profile?.minimumCallMinutes)}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">5G Required</span><span className="font-medium">{profile?.requires5G ? "Yes" : "No"}</span></p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-semibold text-slate-800">Latest Usage</h2></CardHeader>
          <CardBody className="space-y-1.5 text-sm">
            {usage[0] ? (
              <>
                <p className="flex justify-between"><span className="text-slate-500">Data</span><span className="font-medium">{formatData(usage[0].dataUsage)}</span></p>
                <p className="flex justify-between"><span className="text-slate-500">Calls</span><span className="font-medium">{formatMinutes(usage[0].callMinutes)}</span></p>
                <p className="flex justify-between"><span className="text-slate-500">SMS</span><span className="font-medium">{formatCount(usage[0].smsCount)}</span></p>
              </>
            ) : <p className="text-slate-400">No usage recorded</p>}
          </CardBody>
        </Card>
      </div>

      {usage.length > 0 && (
        <Card>
          <CardHeader><h2 className="font-semibold text-slate-800">Data Usage Trend</h2></CardHeader>
          <CardBody><UsageAreaChart data={usage.slice(0, 6)} dataKey="dataUsage" color="#6366f1" label="Data (GB)" /></CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Recommendation History</h2></CardHeader>
        <CardBody>
          {recommendations.length ? (
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((r) => {
                const top = r.plans.find((p) => p.rank === 1);
                return (
                  <div key={r._id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
                    <span className="text-slate-500">{formatDate(r.generatedAt)}</span>
                    <span className={`font-semibold ${scoreColor(top?.score || 0)}`}>{top?.score}%</span>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState title="No recommendations generated" />}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Feedback</h2></CardHeader>
        <CardBody>
          {feedback.length ? (
            <div className="space-y-3">
              {feedback.map((f) => (
                <div key={f._id} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant={f.rating === "up" ? "success" : "danger"}>{f.rating === "up" ? "Helpful" : "Not helpful"}</Badge>
                    <span className="text-xs text-slate-400">{formatDate(f.createdAt)}</span>
                  </div>
                  {f.comment && <p className="mt-2 text-slate-600">{f.comment}</p>}
                </div>
              ))}
            </div>
          ) : <EmptyState title="No feedback submitted" />}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={showStatusConfirm}
        onClose={() => setShowStatusConfirm(false)}
        onConfirm={handleToggleStatus}
        title={user.isActive ? "Deactivate customer?" : "Activate customer?"}
        message={`This will ${user.isActive ? "deactivate" : "activate"} ${user.name}'s account.`}
        confirmLabel={user.isActive ? "Deactivate" : "Activate"}
        variant={user.isActive ? "danger" : "success"}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Customer Permanently?"
        message={`Are you sure you want to permanently delete customer ${user.name} (${user.email})? All associated data including profile, usage telemetry, recommendations, and feedback will be wiped.`}
        confirmLabel="Delete Customer"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
