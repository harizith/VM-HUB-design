"use client";

import { useEffect, useState } from "react";
import { Users, Megaphone, Calendar as CalendarIcon, BookOpen, Clock, ChevronRight, Activity, TrendingUp, CheckCircle, Briefcase } from "lucide-react";
import Link from "next/link";

export default function HodDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // update every min
    
    fetch("/api/hod/dashboard")
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setData(res.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("API error:", err);
        setLoading(false);
      });
      
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;

  const dateStr = currentTime.toLocaleDateString("en-US", { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = currentTime.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });

  // Get active period logic (Simplified based on current time)
  const currentHour = currentTime.getHours();
  let activePeriod = 0;
  if (currentHour >= 8 && currentHour < 9) activePeriod = 1;
  else if (currentHour >= 9 && currentHour < 10) activePeriod = 2;
  else if (currentHour >= 10 && currentHour < 11) activePeriod = 3;
  else if (currentHour >= 11 && currentHour < 12) activePeriod = 4;
  else if (currentHour >= 12 && currentHour < 13) activePeriod = 5;
  else if (currentHour >= 13 && currentHour < 14) activePeriod = 6;
  else if (currentHour >= 14 && currentHour < 15) activePeriod = 7;
  else if (currentHour >= 15 && currentHour < 16) activePeriod = 8;

  const happeningNow = data?.timetable?.find((t: any) => t.period === activePeriod);
  const upNext = data?.timetable?.find((t: any) => t.period === activePeriod + 1);

  if (loading) {
    return (
      <main className="student-main" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div className="loading-spinner"></div>
          <h2 style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>Syncing your dashboard...</h2>
        </div>
      </main>
    );
  }

  return (
    <main className="student-main">
      <header className="student-header" style={{ marginBottom: "2rem" }}>
        <div>
          <div className="student-date" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CalendarIcon size={14} /> {dateStr} 
            <span style={{ color: "var(--border-subtle)" }}>|</span> 
            <Clock size={14} /> {timeStr}
            <span style={{ color: "var(--border-subtle)" }}>|</span>
            <span style={{ backgroundColor: "rgba(56, 189, 248, 0.1)", color: "var(--sky-blue)", padding: "0.1rem 0.5rem", borderRadius: "4px", fontWeight: "700" }}>
              {data?.currentDayOrder === "Leave" ? "Leave / Holiday" : `Day Order ${data?.currentDayOrder || "III"}`}
            </span>
          </div>
          <h1>Welcome back, <span style={{ background: "linear-gradient(90deg, var(--royal-blue), var(--sky-blue))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{data?.hod?.name ? data.hod.name.split(" ")[0] : "HOD"}</span> 👋</h1>
        </div>
        <div className="student-course-info" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
          <strong style={{ fontSize: "1rem" }}>Department of {data?.hod?.department || "CSE"}</strong>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{data?.hod?.designation || "Head of Department"}</span>
        </div>
      </header>

      {/* Hero Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="student-card premium-card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem", borderTop: "3px solid var(--sky-blue)" }}>
          <div style={{ width: "45px", height: "45px", borderRadius: "10px", backgroundColor: "rgba(56, 189, 248, 0.1)", color: "var(--sky-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={20} />
          </div>
          <div>
            <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>TOTAL STUDENTS</p>
            <h3 style={{ margin: 0, fontSize: "1.5rem", color: "var(--text-main)" }}>1,200</h3>
          </div>
        </div>
        <div className="student-card premium-card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem", borderTop: "3px solid #22c55e" }}>
          <div style={{ width: "45px", height: "45px", borderRadius: "10px", backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Briefcase size={20} />
          </div>
          <div>
            <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>FACULTY MEMBERS</p>
            <h3 style={{ margin: 0, fontSize: "1.5rem", color: "var(--text-main)" }}>45</h3>
          </div>
        </div>
        <div className="student-card premium-card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem", borderTop: "3px solid #a855f7" }}>
          <div style={{ width: "45px", height: "45px", borderRadius: "10px", backgroundColor: "rgba(168, 85, 247, 0.1)", color: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>DEPT ATTENDANCE</p>
            <h3 style={{ margin: 0, fontSize: "1.5rem", color: "var(--text-main)" }}>89%</h3>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "1.5rem", marginBottom: "2rem" }}>
        
        {/* Left Column: Schedule & Ongoing */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Current Class Banner (If HOD has classes) */}
          <div className="student-banner" style={{ background: "linear-gradient(135deg, var(--royal-blue) 0%, #1e3a8a 100%)", borderRadius: "16px", padding: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 10px 25px -5px rgba(29, 78, 216, 0.4)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ display: "inline-flex", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e", boxShadow: "0 0 10px #22c55e" }}></span>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", letterSpacing: "0.05em", color: "rgba(255,255,255,0.8)" }}>DEPARTMENT OVERVIEW</span>
              </div>
              <h2 style={{ fontSize: "2.2rem", fontWeight: "800", margin: "0 0 0.5rem 0", color: "#fff", lineHeight: 1.2 }}>Department Operations Running Smoothly</h2>
              
              <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
                <Link href="/hod/department" style={{ backgroundColor: "#fff", color: "var(--royal-blue)", padding: "0.6rem 1.2rem", borderRadius: "8px", fontWeight: "700", fontSize: "0.9rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Activity size={16} /> View Reports
                </Link>
              </div>
            </div>
            
            <div style={{ position: "relative", width: "120px", height: "120px", flexShrink: 0 }}>
                <Briefcase size={80} color="rgba(255,255,255,0.2)" style={{ margin: "20px" }} />
            </div>
          </div>

          {/* Today's Schedule */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>Your Teaching Timeline</h3>
              <Link href="/hod/schedule" style={{ color: "var(--royal-blue)", fontSize: "0.85rem", fontWeight: "600", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                Full Schedule <ChevronRight size={16} />
              </Link>
            </div>
            
            {(!data?.timetable || data.timetable.length === 0) ? (
              <div style={{ padding: "2rem", backgroundColor: "var(--bg-card)", borderRadius: "12px", border: "1px dashed var(--border-subtle)", textAlign: "center", color: "var(--text-muted)" }}>
                {data?.currentDayOrder === "Leave" ? "Enjoy your leave! No classes scheduled for today." : `No classes scheduled for Day Order ${data?.currentDayOrder}. Use this time for department tasks.`}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {data.timetable.map((p: any, i: number) => {
                  const isActive = p.period === activePeriod;
                  const isPast = p.period < activePeriod;
                  
                  return (
                    <div key={i} style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      backgroundColor: isActive ? "rgba(29, 78, 216, 0.05)" : "var(--bg-card)", 
                      border: isActive ? "1px solid var(--royal-blue)" : "1px solid var(--border-subtle)",
                      borderRadius: "12px", 
                      padding: "1rem", 
                      position: "relative",
                      overflow: "hidden",
                      opacity: isPast ? 0.6 : 1
                    }}>
                      {isActive && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: "var(--royal-blue)" }}></div>}
                      
                      <div style={{ width: "80px", flexShrink: 0, borderRight: "1px solid var(--border-subtle)", paddingRight: "1rem", marginRight: "1rem" }}>
                        <div style={{ fontSize: "0.95rem", fontWeight: "700", color: isActive ? "var(--royal-blue)" : "var(--text-main)" }}>P{p.period}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.timeRange}</div>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)" }}>{p.subjectName}</div>
                        <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          <span><strong style={{ color: "var(--text-main)" }}>Class:</strong> {p.classId}</span>
                          <span><strong style={{ color: "var(--text-main)" }}>Room:</strong> {p.roomNo}</span>
                        </div>
                      </div>
                      
                      {isActive && (
                        <div style={{ backgroundColor: "rgba(56, 189, 248, 0.1)", color: "var(--sky-blue)", padding: "0.3rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700" }}>
                          NOW
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Up Next, Tasks, Notices */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Quick Actions */}
          <div className="student-card premium-card">
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)", margin: "0 0 1rem 0" }}>Quick Actions</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <Link href="/hod/faculty" style={{ backgroundColor: "rgba(56, 189, 248, 0.1)", color: "var(--sky-blue)", padding: "1rem", borderRadius: "10px", textAlign: "center", textDecoration: "none", fontWeight: "600", fontSize: "0.85rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", transition: "all 0.2s" }} className="hover-lift">
                <Users size={20} />
                Manage Staff
              </Link>
              <Link href="/hod/department" style={{ backgroundColor: "rgba(168, 85, 247, 0.1)", color: "#a855f7", padding: "1rem", borderRadius: "10px", textAlign: "center", textDecoration: "none", fontWeight: "600", fontSize: "0.85rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", transition: "all 0.2s" }} className="hover-lift">
                <Activity size={20} />
                Dept Stats
              </Link>
            </div>
          </div>

          {/* Notices */}
          <div className="student-card premium-card" style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Megaphone size={18} /> Announcements
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: "800", letterSpacing: "0.05em" }}>ADMIN</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>2h ago</span>
                </div>
                <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem", color: "var(--text-main)" }}>HOD Meeting</h4>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Principal's office at 2 PM regarding accreditations.</p>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ backgroundColor: "rgba(56, 189, 248, 0.1)", color: "var(--sky-blue)", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: "800", letterSpacing: "0.05em" }}>INFO</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Yesterday</span>
                </div>
                <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem", color: "var(--text-main)" }}>Mid-Semester Evaluation</h4>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Ensure all faculty upload marks by EOD Friday.</p>
              </div>
            </div>
            <button style={{ width: "100%", marginTop: "1rem", padding: "0.6rem", background: "none", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}>
              Post New Notice
            </button>
          </div>
          
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hover-lift:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
      `}} />
    </main>
  );
}
