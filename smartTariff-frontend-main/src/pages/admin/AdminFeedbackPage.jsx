import { useEffect, useState } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, Filter } from "lucide-react";
import { feedbackApi } from "@/services/feedbackApi";
import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/Loader";
import { formatDate } from "@/utils/format";

export default function AdminFeedbackPage() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [status, setStatus] = useState("loading");
  const [filter, setFilter] = useState("all");

  const load = (page = 1) => {
    setStatus("loading");
    feedbackApi
      .listAll({ page, limit: 8 })
      .then((res) => {
        setData(res.data.data);
        setPagination(res.data.pagination);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  };

  useEffect(() => {
    load(1);
  }, []);

  const filteredData = data.filter((f) => {
    const isUp = f.rating === "up" || f.rating >= 4;
    if (filter === "up") return isUp;
    if (filter === "down") return !isUp;
    return true;
  });

  const helpfulCount = data.filter((f) => f.rating === "up" || f.rating >= 4).length;
  const downCount = data.filter((f) => f.rating === "down" || (typeof f.rating === "number" && f.rating < 4)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Feedback</h1>
          <p className="mt-1 text-sm text-slate-500">
            Reviews and ratings submitted by customers on recommendation quality.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              filter === "all"
                ? "bg-[#081936] text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All ({data.length})
          </button>
          <button
            onClick={() => setFilter("up")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filter === "up"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Helpful ({helpfulCount})
          </button>
          <button
            onClick={() => setFilter("down")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filter === "down"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            Needs Work ({downCount})
          </button>
        </div>
      </div>

      <Card>
        {status === "loading" && <TableSkeleton rows={6} cols={4} />}
        {status === "succeeded" && filteredData.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title={filter === "all" ? "No feedback submitted yet" : "No feedback matching filter"}
            description={filter === "all" ? "When customers rate recommendations on their dashboard, their reviews appear here." : "Try switching to 'All' to view other submitted reviews."}
          />
        )}
        {status === "succeeded" && filteredData.length > 0 && (
          <>
            <div className="divide-y divide-slate-100">
              {filteredData.map((f) => {
                const isUp = f.rating === "up" || f.rating >= 4;
                return (
                  <div key={f._id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700">
                          {f.customerName ? f.customerName[0] : "C"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">{f.customerName}</p>
                          <span className="text-[11px] text-slate-400">{formatDate(f.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isUp ? "success" : "danger"}>
                          {isUp ? "👍 Helpful" : "👎 Needs Improvement"}
                        </Badge>
                      </div>
                    </div>
                    {f.comment && (
                      <p className="mt-3 rounded-xl bg-slate-50/80 p-3 text-xs text-slate-700 leading-relaxed border border-slate-100">
                        "{f.comment}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={load}
            />
          </>
        )}
      </Card>
    </div>
  );
}
