"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { Shield, Lock, Mail, ArrowRight, UserCheck, CheckCircle2 } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleQuickSelect = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setErrorMsg("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const targetEmail = email.trim().toLowerCase();
    const targetPassword = password.trim();

    try {
      const res = await signIn("credentials", {
        email: targetEmail,
        password: targetPassword,
        redirect: false,
      });

      if (res?.status === 200 || res?.ok) {
        const sessionRes = await fetch("/api/auth/session").then((r) => r.json());
        const userRole = sessionRes?.user?.role;

        if (userRole === "ADMIN") {
          window.location.href = "/admin";
        } else if (userRole === "HOD") {
          window.location.href = "/hod";
        } else if (userRole === "TEACHER" || userRole === "STAFF" || userRole === "FACULTY") {
          window.location.href = "/teacher";
        } else {
          window.location.href = "/student";
        }
      } else {
        console.error("SignIn failed:", res);
        setErrorMsg("Authentication failed. Please verify your institutional email ID and ERP password.");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("SignIn exception:", err);
      setErrorMsg("Connection error communicating with campus authentication server.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-5">
      <div className="space-y-1.5 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
          <Shield className="w-3.5 h-3.5" /> Secure Single Sign-On (SSO)
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Campus Portal Sign In
        </h2>
        <p className="text-xs text-slate-400">
          Enter your official college email ID and password to access your role dashboard.
        </p>
      </div>

      {/* Quick Role Fillers for Institutional Review */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Select Account Type (Quick Sign In)</span>
          <span className="text-[10px] text-blue-400 lowercase font-normal">click to auto-populate</span>
        </label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickSelect("student@veltechmultitech.org", "password123")}
            className={`p-2 rounded-lg border text-left transition-all flex items-center justify-between ${
              email === "student@veltechmultitech.org"
                ? "bg-blue-600/20 border-blue-500 text-blue-200"
                : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="font-semibold text-xs">Student Portal</div>
              <div className="text-[10px] text-slate-400 truncate">student@veltech...</div>
            </div>
            {email === "student@veltechmultitech.org" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
          </button>

          <button
            type="button"
            onClick={() => handleQuickSelect("teacher@veltechmultitech.org", "password123")}
            className={`p-2 rounded-lg border text-left transition-all flex items-center justify-between ${
              email === "teacher@veltechmultitech.org"
                ? "bg-blue-600/20 border-blue-500 text-blue-200"
                : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="font-semibold text-xs">Faculty Portal</div>
              <div className="text-[10px] text-slate-400 truncate">teacher@veltech...</div>
            </div>
            {email === "teacher@veltechmultitech.org" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
          </button>

          <button
            type="button"
            onClick={() => handleQuickSelect("hod@veltechmultitech.org", "password123")}
            className={`p-2 rounded-lg border text-left transition-all flex items-center justify-between ${
              email === "hod@veltechmultitech.org"
                ? "bg-blue-600/20 border-blue-500 text-blue-200"
                : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="font-semibold text-xs">HOD Portal</div>
              <div className="text-[10px] text-slate-400 truncate">hod@veltech...</div>
            </div>
            {email === "hod@veltechmultitech.org" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
          </button>

          <button
            type="button"
            onClick={() => handleQuickSelect("admin@veltechmultitech.org", "password123")}
            className={`p-2 rounded-lg border text-left transition-all flex items-center justify-between ${
              email === "admin@veltechmultitech.org"
                ? "bg-blue-600/20 border-blue-500 text-blue-200"
                : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="font-semibold text-xs">Admin Console</div>
              <div className="text-[10px] text-slate-400 truncate">admin@veltech...</div>
            </div>
            {email === "admin@veltechmultitech.org" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-950/40 border border-red-500/40 text-red-300 px-3.5 py-2.5 rounded-lg text-xs font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-blue-400" /> College Email ID / Roll No
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. rollno@veltechmultitech.org"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-400" /> ERP Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Authenticating Credentials...
            </span>
          ) : (
            <>
              <UserCheck className="w-4 h-4" /> Sign In to ERP Portal <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 text-center leading-relaxed">
        Protected by Autonomous Institutional Authentication Service. Unauthorized access is subject to academic disciplinary action.
      </div>
    </div>
  );
}
