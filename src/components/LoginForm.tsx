"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

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
        // Fetch session to determine role from DB record
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
        setErrorMsg("Invalid credentials. Please check your email and password.");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("SignIn exception:", err);
      setErrorMsg("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="login-form-container">
      <h1 className="login-title">Welcome back</h1>
      <p className="login-subtitle">
        Sign in with your college email and password.
      </p>

      {errorMsg && (
        <div style={{
          backgroundColor: "#fef2f2",
          color: "#991b1b",
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          marginBottom: "1rem",
          fontSize: "0.875rem",
          border: "1px solid #fecaca"
        }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-form">
        <div className="input-group">
          <label htmlFor="email" className="input-label">COLLEGE EMAIL</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@veltechmultitech.org"
            className="premium-input"
            required
            autoComplete="email"
          />
        </div>

        <div className="input-group">
          <label htmlFor="password" className="input-label">PASSWORD</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="premium-input"
            required
            autoComplete="current-password"
          />
        </div>

        <button 
          type="submit" 
          className={`btn-primary full-width ${isLoading ? "loading" : ""}`}
          disabled={isLoading}
        >
          {isLoading ? "Authenticating..." : "Sign in to Dashboard"}
        </button>
      </form>
    </div>
  );
}
