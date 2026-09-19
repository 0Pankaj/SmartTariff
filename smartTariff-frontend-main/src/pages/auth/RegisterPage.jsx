import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import Logo from "@/components/common/Logo";
import { register, clearAuthError } from "@/store/slices/authSlice";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", phone: "" });
  const [errors, setErrors] = useState({});
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status } = useSelector((s) => s.auth);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!/^\d{10}$/.test(form.phone)) e.phone = "Enter a valid 10-digit phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearAuthError());
    if (!validate()) return;
    const res = await dispatch(register(form));
    if (register.fulfilled.match(res)) {
      toast.success("Account created successfully!");
      navigate("/dashboard", { replace: true });
    } else {
      toast.error(res.payload || "Registration failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo to="/" size="lg" showText={true} subtitle="" />
        </div>
        <h1 className="text-center text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-1 text-center text-sm text-slate-500">Get personalized tariff recommendations in minutes.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            id="register-name"
            label="Full name"
            placeholder="Priya Sharma"
            autoComplete="name"
            value={form.name}
            error={errors.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            id="register-email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={form.email}
            error={errors.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            id="register-phone"
            label="Phone number"
            placeholder="9876543210"
            autoComplete="tel"
            value={form.phone}
            error={errors.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          />
          <Input
            id="register-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={form.password}
            error={errors.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Input
            id="register-confirm-password"
            label="Confirm password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={form.confirmPassword}
            error={errors.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
          <Button type="submit" className="w-full" icon={UserPlus} loading={status === "loading"}>
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="font-medium text-[#081936] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
