"use client";

import { useEffect, useState } from "react";
import { BookOpen, Search, Clock, Award } from "lucide-react";

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("/api/admin/subjects")
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setCourses(res.subjects);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = courses.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ padding: "2rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", margin: "0 0 0.5rem 0", background: "linear-gradient(90deg, #a855f7, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Department Courses
        </h1>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>View all subjects offered by the department.</p>
      </header>

      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ position: "relative", maxWidth: "400px" }}>
          <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input 
            type="text" 
            placeholder="Search by course code or name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "0.8rem 1rem 0.8rem 2.5rem", borderRadius: "8px", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-input)", color: "var(--text-main)" }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>Loading courses...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {filtered.map(c => (
            <div key={c.id} className="student-card premium-card" style={{ padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-main)" }}>{c.name}</h3>
                  <span style={{ fontSize: "0.8rem", color: "#a855f7", fontWeight: "bold" }}>{c.code}</span>
                </div>
                <div style={{ backgroundColor: "rgba(168,85,247,0.1)", color: "#a855f7", padding: "0.4rem", borderRadius: "8px" }}>
                  <BookOpen size={20} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Award size={14} /> {c.credits} Credits
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Clock size={14} /> Sem {c.semester}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
