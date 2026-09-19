"""
ml-service/app/predictor.py
Inference engine executing RandomForest predictions and explainability reasons.
"""
from typing import Any, Dict, List, Optional
import pandas as pd
from .model import load_model, FEATURE_ORDER, load_config
from .schemas import SinglePredictionInput, RecommendationRequestPayload


def parse_preferred_duration_months(pref_duration: Any) -> Optional[int]:
    if pref_duration is None or pref_duration == "":
        return None
    try:
        num = int(pref_duration)
    except (ValueError, TypeError):
        return None
    if num >= 300:
        return 12
    elif num >= 150:
        return 6
    elif num >= 70:
        return 3
    elif num > 12:
        return 1
    return num


def get_duration_months(p: Dict[str, Any]) -> int:
    dur = p.get("durationMonths") or p.get("duration_months")
    if dur:
        return int(dur)
    val = int(p.get("validity", 28) or 28)
    if val >= 300:
        return 12
    elif val >= 150:
        return 6
    elif val >= 70:
        return 3
    return 1


def generate_reasons(
    plan: Dict[str, Any],
    customer: Dict[str, Any],
    usage: Dict[str, Any],
    score: int,
) -> List[str]:
    reasons = []

    discount_pct = float(plan.get("discountPercent") or plan.get("discount_percent") or 0.0)
    discount_inr = float(plan.get("discountInr") or plan.get("discount_inr") or 0.0)

    if discount_pct > 0:
        reasons.append(f"Bundle deal: Save {discount_pct}% (₹{int(discount_inr)} discount)")

    pref_dur_months = parse_preferred_duration_months(customer.get("preferredDuration"))
    dur_months = get_duration_months(plan)
    if pref_dur_months and dur_months == pref_dur_months:
        if dur_months == 12:
            reasons.append("Matches your 1 Year annual plan preference")
        elif dur_months == 6:
            reasons.append("Matches your 6-Month plan preference")
        elif dur_months == 3:
            reasons.append("Matches your 3-Month bundle preference")
        elif dur_months == 1:
            reasons.append("Matches your 1-Month plan preference")

    data_limit = float(plan.get("dataLimit") or plan.get("data_per_month_gb") or 0.0)
    req_data = float(usage.get("dataUsage") or customer.get("minimumData") or 0.0)
    if data_limit >= req_data and req_data > 0:
        reasons.append(f"Matches your {int(data_limit)} GB monthly data needs")
    elif data_limit >= req_data * 0.75:
        reasons.append(f"Covers {int(data_limit)} GB of your required data")

    monthly_eq = float(plan.get("monthlyEquivalent") or plan.get("monthly_equivalent_inr") or plan.get("price") or 0.0)
    budget = float(customer.get("monthlyBudget") or 500.0)
    if monthly_eq <= budget:
        reasons.append("Fits your monthly budget")
    elif monthly_eq <= budget * 1.15:
        reasons.append("Close to your target monthly budget")

    reasons.append("Unlimited voice calling included")

    if plan.get("fiveG") and customer.get("requires5G"):
        reasons.append("Includes 5G as required")
    elif plan.get("fiveG"):
        reasons.append("5G ready high-speed network")

    if score >= 85:
        reasons.append(f"High ML Match Score ({score}%)")

    return reasons[:5]


def predict_single_vector(features: SinglePredictionInput) -> float:
    model = load_model()
    if model is None:
        raise RuntimeError("Model is unavailable.")

    df = pd.DataFrame([features.model_dump()])[FEATURE_ORDER]
    pred = model.predict(df)
    return float(pred[0])


def predict_recommendations(payload: RecommendationRequestPayload) -> Dict[str, Any]:
    model = load_model()
    if model is None:
        raise RuntimeError("Model is unavailable.")

    customer_dict = payload.customer.model_dump()
    usage_dict = payload.usage.model_dump()
    plans_list = [p.model_dump() for p in payload.plans]

    if not plans_list:
        return {"recommendations": [], "generatedBy": "ml"}

    # Filter candidate plans strictly by preferred duration if specified
    preferred_duration = customer_dict.get("preferredDuration")
    pref_dur_months = parse_preferred_duration_months(preferred_duration)
    if pref_dur_months is not None:
        duration_filtered = [p for p in plans_list if get_duration_months(p) == pref_dur_months]
        if duration_filtered:
            plans_list = duration_filtered

    cust_internet = float(usage_dict.get("dataUsage") or customer_dict.get("minimumData") or 0.0)
    cust_sms = float(usage_dict.get("smsCount") or customer_dict.get("minimumSms") or 0.0)
    cust_budget = float(customer_dict.get("monthlyBudget") or 500.0)
    requires_5g = bool(customer_dict.get("requires5G"))

    feature_rows = []
    for p in plans_list:
        data_allowance = p.get("dataLimit")
        if data_allowance is None or data_allowance >= 999:
            data_val = 250.0
        else:
            data_val = float(data_allowance)

        sms_allowance = p.get("smsLimit")
        if sms_allowance is None or sms_allowance >= 999:
            sms_val = 500.0
        else:
            sms_val = float(sms_allowance)

        dur_months = get_duration_months(p)
        m_eq = p.get("monthlyEquivalent") or p.get("price", 199.0)
        m_eq = float(m_eq)
        disc_pct = float(p.get("discountPercent", 0.0) or 0.0)

        data_coverage = data_val / cust_internet if cust_internet > 0 else 10.0
        sms_coverage = sms_val / cust_sms if cust_sms > 0 else 10.0
        data_waste = max(0, data_val - cust_internet) / data_val if data_val > 0 else 0.0
        sms_waste = max(0, sms_val - cust_sms) / sms_val if sms_val > 0 else 0.0
        price_to_budget = m_eq / cust_budget if cust_budget > 0 else 2.0

        if preferred_duration:
            duration_match_val = 1.0 if dur_months == pref_dur_months else 0.0
        else:
            duration_match_val = 0.5

        row = {
            "data_per_month_gb": data_val,
            "sms_per_month": sms_val,
            "monthly_equivalent_inr": m_eq,
            "duration_months": dur_months,
            "discount_percent": disc_pct,
            "data_coverage_ratio": data_coverage,
            "sms_coverage_ratio": sms_coverage,
            "data_waste_ratio": data_waste,
            "sms_waste_ratio": sms_waste,
            "price_to_budget_ratio": price_to_budget,
            "duration_match": duration_match_val,
        }
        feature_rows.append(row)

    df_input = pd.DataFrame(feature_rows)[FEATURE_ORDER]
    predictions = model.predict(df_input)

    scored_plans = []
    for plan_info, pred in zip(plans_list, predictions):
        raw_score = float(pred)

        # Apply duration preference weight
        if preferred_duration:
            plan_validity = int(plan_info.get("validity", 28) or 28)
            pref_num = int(preferred_duration)
            if pref_num >= 300 and plan_validity >= 300:
                raw_score *= 1.15
            elif 70 <= pref_num < 300 and 70 <= plan_validity < 300:
                raw_score *= 1.12
            elif pref_num < 70 and plan_validity < 70:
                raw_score *= 1.05

        # 5G constraint penalty
        if requires_5g and not plan_info.get("fiveG"):
            raw_score *= 0.75

        bounded_score = max(0, min(100, int(round(raw_score))))
        scored_plans.append({
            "planId": plan_info.get("planId"),
            "planCode": plan_info.get("planCode"),
            "score": bounded_score,
            "rawScore": round(float(pred), 2),
            "plan": plan_info,
        })

    scored_plans.sort(key=lambda x: x["score"], reverse=True)

    final_recs = []
    for rank_idx, item in enumerate(scored_plans[:3]):
        reasons = generate_reasons(item["plan"], customer_dict, usage_dict, item["score"])
        final_recs.append({
            "planId": item["planId"],
            "rank": rank_idx + 1,
            "score": item["score"],
            "reasons": reasons,
        })

    cfg = load_config() or {}
    model_name = cfg.get("model_version", "SmartTariff V4.3")

    return {
        "recommendations": final_recs,
        "generatedBy": "ml",
        "model": model_name,
    }
