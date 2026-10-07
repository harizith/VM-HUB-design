"use client";

import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";

export default function SchedulePage() {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayOrder, setDayOrder] = useState("I");

  useEffect(() => {
    fetch("/api/hod/dashboard")
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setTimetable(res.data.timetable || []);
          setDayOrder(res.data.currentDayOrder || "I");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "2rem", margin: "0 0 0.5rem 0", background: "linear-gradient(90deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            My Schedule
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>View your teaching timetable for today.</p>
        </div>
        <div style={{ padding: "0.5rem 1rem", backgroundColor: "rgba(245,158,11,0.1)", color: "#f59e0b", borderRadius: "8px", fontWeight: "bold" }}>
          Day Order {dayOrder}
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>Loading schedule...</div>
      ) : timetable.length === 0 ? (
        <div className="student-card premium-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <CalendarIcon size={48} style={{ opacity: 0.2, margin: "0 auto 1rem auto" }} />
          <h3>No classes scheduled</h3>
          <p>You have a free schedule for today.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {timetable.map((t, idx) => (
            <div key={idx} className="student-card premium-card" style={{ padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "2rem" }}>
              <div style={{ width: "100px", borderRight: "1px solid var(--border-subtle)" }}>
                <h3 style={{ margin: 0, color: "#f59e0b", fontSize: "1.5rem" }}>P{t.period}</h3>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{t.timeRange}</span>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem" }}>{t.subjectName}</h4>
                <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><MapPin size={14} /> Room: {t.roomNo}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><Clock size={14} /> Class: {t.classId}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
