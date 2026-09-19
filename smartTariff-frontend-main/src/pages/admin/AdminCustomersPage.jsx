import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { customerApi } from "@/services/customerApi";
import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { TableSkeleton } from "@/components/common/Loader";
import { formatData, formatMinutes } from "@/utils/format";

export default function AdminCustomersPage() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("loading");
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = (page = 1, s = search) => {
    setStatus("loading");
    customerApi.listAll({ page, limit: 8, search: s })
      .then((res) => { setData(res.data.data); setPagination(res.data.pagination); setStatus("succeeded"); })
      .catch(() => setStatus("failed"));
  };

  useEffect(() => { load(1); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(1, search);
  };

  const toggleStatus = async () => {
    const newStatus = !confirmTarget.isActive;
    await customerApi.setStatus(confirmTarget._id, newStatus);
    toast.success(`Customer ${newStatus ? "activated" : "deactivated"}`);
    setConfirmTarget(null);
    load(pagination.page);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await customerApi.deleteCustomer(deleteTarget._id);
      toast.success(`Customer ${deleteTarget.name} deleted successfully`);
      setDeleteTarget(null);
      load(pagination.page);
    } catch (err) {
      toast.error(err.message || "Failed to delete customer");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Management</h1>
        <p className="mt-1 text-sm text-slate-500">View, search and manage all registered customers.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      <Card>
        {status === "loading" && <TableSkeleton rows={6} cols={6} />}
        {status === "succeeded" && data.length === 0 && <EmptyState icon={Users} title="No customers found" />}
        {status === "succeeded" && data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Phone</th>
                    <th className="p-4 font-medium">Current Plan</th>
                    <th className="p-4 font-medium">Data Usage</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="p-4 font-medium text-slate-800">{c.name}</td>
                      <td className="p-4 text-slate-600">{c.email}</td>
                      <td className="p-4 text-slate-600">{c.phone}</td>
                      <td className="p-4 text-slate-600">{c.currentPlan}</td>
                      <td className="p-4 text-slate-600">{formatData(c.dataUsage)}</td>
                      <td className="p-4">
                        <Badge variant={c.isActive ? "success" : "danger"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link to={`/admin/customers/${c._id}`}><Button size="sm" variant="secondary">View</Button></Link>
                          <Button size="sm" variant={c.isActive ? "secondary" : "success"} onClick={() => setConfirmTarget(c)}>
                            {c.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(c)} className="flex items-center gap-1">
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={load} />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={toggleStatus}
        title={confirmTarget?.isActive ? "Deactivate customer?" : "Activate customer?"}
        message={`This will ${confirmTarget?.isActive ? "deactivate" : "activate"} ${confirmTarget?.name}'s account.`}
        confirmLabel={confirmTarget?.isActive ? "Deactivate" : "Activate"}
        variant={confirmTarget?.isActive ? "danger" : "success"}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Customer Permanently?"
        message={`Are you sure you want to permanently delete customer ${deleteTarget?.name} (${deleteTarget?.email})? All associated profiles, usage history, recommendations, and feedback will be removed.`}
        confirmLabel="Delete Customer"
        variant="danger"
      />
    </div>
  );
}
