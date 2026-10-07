"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Users, LogOut, Sun, Moon, BookOpen, Briefcase } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function HodLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="student-layout">
      {/* LEFT SIDEBAR */}
      <aside className="student-sidebar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border-subtle)", marginBottom: "1.5rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, var(--royal-blue) 0%, var(--sky-blue) 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "1.1rem", color: "white", boxShadow: "0 4px 12px rgba(29, 78, 216, 0.3)" }}>
              VM
            </div>
            <div className="student-sidebar-logo-text">
              <h2 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0, fontFamily: "var(--font-serif, serif)" }}>VM-HUB</h2>
              <span style={{ fontSize: "0.75rem", color: "var(--sky-blue)", fontWeight: "600" }}>HOD Portal</span>
            </div>
          </div>
          
          <div className="student-nav-group">
            <Link href="/hod" className={`student-nav-item ${pathname === "/hod" ? "active" : ""}`} title="Dashboard">
              <Home size={18} />
              <span>Dashboard</span>
            </Link>
            <Link href="/hod/department" className={`student-nav-item ${pathname === "/hod/department" ? "active" : ""}`} title="Department">
              <Briefcase size={18} />
              <span>Department</span>
            </Link>
            <Link href="/hod/schedule" className={`student-nav-item ${pathname === "/hod/schedule" ? "active" : ""}`} title="My Schedule">
              <Calendar size={18} />
              <span>My Schedule</span>
            </Link>
            <Link href="/hod/courses" className={`student-nav-item ${pathname === "/hod/courses" ? "active" : ""}`} title="Courses">
              <BookOpen size={18} />
              <span>Courses</span>
            </Link>
            <Link href="/hod/faculty" className={`student-nav-item ${pathname === "/hod/faculty" ? "active" : ""}`} title="Faculty Members">
              <Users size={18} />
              <span>Faculty</span>
            </Link>
          </div>
        </div>

        <div className="student-nav-bottom">
          <Link href="/hod/profile"
            className="profile-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.6rem 0.75rem",
              borderRadius: "10px",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
              textDecoration: "none",
              color: "inherit",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--sky-blue)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--royal-blue) 0%, var(--sky-blue) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              color: "white",
              fontSize: "0.95rem"
            }}>
              H
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: "700", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                My Profile
              </div>
              <div style={{ fontSize: "0.725rem", color: "var(--sky-blue)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                HOD
              </div>
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>➔</span>
          </Link>

          {mounted && (
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", backgroundColor: "var(--bg-input)", color: "var(--text-main)", border: "1px solid var(--border-subtle)", padding: "0.6rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}>
              {theme === "dark" ? <><Sun size={16} /> Light Mode</> : <><Moon size={16} /> Dark Mode</>}
            </button>
          )}

          <button onClick={() => signOut({ callbackUrl: "/" })} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", color: "#ef4444", fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(239, 68, 68, 0.3)", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "0.6rem", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="student-main-container">
        {children}
      </div>
    </div>
  );
}
