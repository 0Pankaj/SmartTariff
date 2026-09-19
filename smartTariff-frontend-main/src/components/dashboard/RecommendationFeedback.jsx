import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Star, MessageSquareHeart, CheckCircle2, Send, Edit3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { feedbackApi } from "@/services/feedbackApi";
import Button from "@/components/common/Button";
import toast from "react-hot-toast";

import { getToken } from "@/services/api";

const QUICK_TAGS = [
  "Accurate Match",
  "Great Value",
  "5G Ready",
  "Need More Data",
  "Price Too High",
];

export default function RecommendationFeedback({ recommendationId = "latest", onFeedbackSubmitted }) {
  const { user } = useAuth();
  const [rating, setRating] = useState("up");
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Check if feedback was already submitted
  useEffect(() => {
    if (!user || !getToken()) return;
    feedbackApi
      .mine()
      .then((res) => {
        const found = res.data?.find(
          (f) => f.recommendationId === recommendationId || f.recommendationId === "latest"
        );
        if (found) {
          setRating(found.rating);
          if (typeof found.rating === "number") setStars(found.rating);
          setComment(found.comment || "");
          setSubmitted(true);
        }
      })
      .catch(() => {});
  }, [user, recommendationId]);

  const handleTagClick = (tag) => {
    if (comment.includes(tag)) return;
    setComment((prev) => (prev ? `${prev}, ${tag}` : tag));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!user) {
      toast.error("Please login to submit feedback");
      return;
    }
    if (!rating) {
      toast.error("Please choose whether the recommendation was helpful");
      return;
    }

    setLoading(true);
    try {
      await feedbackApi.submit({
        customerId: user._id,
        recommendationId: recommendationId || "latest",
        rating,
        comment: comment.trim(),
      });
      setSubmitted(true);
      setIsEditing(false);
      toast.success("Thank you! Your feedback has been recorded.");
      if (onFeedbackSubmitted) onFeedbackSubmitted();
    } catch (err) {
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition duration-200 hover:shadow-md hover:border-slate-200">
      {/* Decorative background accent */}
      <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-indigo-50/60 blur-2xl" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-[#081936]">
            <MessageSquareHeart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#081936]">
              Rate this Recommendation
            </h3>
            <p className="text-[11px] font-medium text-slate-400">
              Help our AI refine tariff plan matches for you
            </p>
          </div>
        </div>

        {submitted && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#081936] hover:underline cursor-pointer"
          >
            <Edit3 className="h-3 w-3" /> Edit
          </button>
        )}
      </div>

      {submitted && !isEditing ? (
        /* Submitted View */
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-xs font-bold">Feedback Submitted</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            You rated this recommendation as{" "}
            <span className="font-semibold text-[#081936]">
              {rating === "up" ? "👍 Helpful" : "👎 Needs Improvement"}
            </span>
            .
          </p>
          {comment && (
            <p className="mt-2 text-xs italic text-slate-500 bg-white/70 rounded-lg p-2.5 border border-emerald-100/60">
              "{comment}"
            </p>
          )}
        </div>
      ) : (
        /* Form View */
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Reaction Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setRating("up")}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2 px-3 text-xs font-bold transition cursor-pointer ${
                rating === "up"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-xs"
                  : "border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-50 hover:border-slate-200"
              }`}
            >
              <ThumbsUp className={`h-4 w-4 ${rating === "up" ? "fill-emerald-600 text-emerald-600" : ""}`} />
              <span>Helpful Match</span>
            </button>

            <button
              type="button"
              onClick={() => setRating("down")}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2 px-3 text-xs font-bold transition cursor-pointer ${
                rating === "down"
                  ? "border-rose-300 bg-rose-50 text-rose-700 shadow-xs"
                  : "border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-50 hover:border-slate-200"
              }`}
            >
              <ThumbsDown className={`h-4 w-4 ${rating === "down" ? "fill-rose-600 text-rose-600" : ""}`} />
              <span>Not Relevant</span>
            </button>
          </div>

          {/* Quick Tag Pills */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Quick Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-[#081936] transition cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment Field */}
          <div>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you liked or what could be improved (optional)..."
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-[#081936] placeholder:text-slate-400 focus:border-[#081936] focus:ring-2 focus:ring-[#081936]/10 focus:outline-none transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              icon={Send}
              loading={loading}
              className="w-full sm:w-auto"
            >
              {submitted ? "Update Feedback" : "Submit Feedback"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
