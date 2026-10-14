"use client";

import React, { useEffect, useState } from "react";
import { Users, Search, Filter, MoreVertical, CheckCircle, XCircle, Mail, Phone, ChevronDown, FileText, Printer, X } from "lucide-react";
import AttendanceTrendChart from "@/components/AttendanceTrendChart";

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [dateString, setDateString] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<number | "All">("All");
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/students")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStudents(data.data.students || []);
          setTodayClasses(data.data.todayClasses || []);
          setAttendanceRecords(data.data.attendance || []);
          setDateString(data.data.dateString || new Date().toISOString().split("T")[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (student.vmNo && student.vmNo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedPeriod !== "All") {
      const cls = todayClasses.find(c => c.period === selectedPeriod);
      return matchesSearch && cls && student.computedClassId === cls.classId;
    }
    return matchesSearch;
  });

  const handleToggleAttendance = async (studentId: string, status: string, classId: string, subjectCode: string, dayOrder: number) => {
    if (selectedPeriod === "All") return alert("Please select a specific period to mark attendance.");
    
    try {
      const res = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          classId,
          dateString,
          dayOrder,
          period: selectedPeriod,
          subjectCode,
          status
        })
      });
      const data = await res.json();
      if (data.success) {
        setAttendanceRecords(prev => {
          const filtered = prev.filter(a => !(a.studentId === studentId && a.period === selectedPeriod));
          return [...filtered, data.data];
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeClassDetails = selectedPeriod !== "All" ? todayClasses.find(c => c.period === selectedPeriod) : null;
  const currentClassStudents = activeClassDetails ? students.filter(s => s.computedClassId === activeClassDetails.classId) : students;
  
  const presentCount = currentClassStudents.filter(s => {
    const rec = attendanceRecords.find(a => a.studentId === s.id && a.period === selectedPeriod);
    return rec?.status === "PRESENT";
  }).length;

  const absentCount = currentClassStudents.filter(s => {
    const rec = attendanceRecords.find(a => a.studentId === s.id && a.period === selectedPeriod);
    return rec?.status === "ABSENT";
  }).length;

  return (
    <main className="student-main">
      <header className="student-header">
        <div>
          <h1>My Students</h1>
          <p className="student-subtitle">Manage student progress and official 6-month historical attendance records</p>
        </div>
        <div className="student-course-info" style={{ display: "flex", gap: "1rem" }}>
          <button 
            onClick={() => {
              if (selectedPeriod === "All") {
                alert("Please select a specific period from the dropdown filter before exporting attendance.");
                return;
              }
              setShowExportModal(true);
            }}
            style={{ backgroundColor: "var(--sky-blue)", color: "white", padding: "0.6rem 1.2rem", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 4px 12px rgba(56, 189, 248, 0.3)" }}
          >
            <FileText size={16} /> Export Attendance PDF
          </button>
        </div>
      </header>

      {/* Analytics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div className="student-card premium-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "50px", height: "50px", borderRadius: "12px", backgroundColor: "rgba(56, 189, 248, 0.1)", color: "var(--sky-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.8rem", fontWeight: "800", margin: 0, color: "var(--text-main)" }}>{students.length}</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>Total Students</p>
          </div>
        </div>
        <div className="student-card premium-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "50px", height: "50px", borderRadius: "12px", backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.8rem", fontWeight: "800", margin: 0, color: "var(--text-main)" }}>94%</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>Avg Attendance</p>
          </div>
        </div>
        <div className="student-card premium-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "50px", height: "50px", borderRadius: "12px", backgroundColor: "rgba(168, 85, 247, 0.1)", color: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Filter size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.8rem", fontWeight: "800", margin: 0, color: "var(--text-main)" }}>{todayClasses.length}</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>Today's Lectures</p>
          </div>
        </div>
      </div>

      {/* D3.js 6-Month Attendance Trends & Predictive Insights */}
      <div style={{ marginBottom: "2rem" }}>
        <AttendanceTrendChart classId={activeClassDetails?.classId || "II-CSE-A"} />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flex: 1, minWidth: "300px", position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input 
            type="text" 
            placeholder="Search students by name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "0.8rem 1rem 0.8rem 2.8rem", borderRadius: "10px", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-input)", color: "var(--text-main)", outline: "none", fontSize: "0.95rem" }}
          />
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value === "All" ? "All" : Number(e.target.value))}
            style={{ padding: "0.8rem 1.2rem", borderRadius: "10px", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-card)", color: "var(--text-main)", fontWeight: "600", cursor: "pointer", outline: "none" }}
          >
            <option value="All">All Periods (Select Period to Mark Attendance)</option>
            {todayClasses.map(c => (
              <option key={c.id} value={c.period}>Period {c.period} ({c.classId} - {c.subjectCode})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="student-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--bg-input)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ padding: "1rem 1.5rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>STUDENT</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>ROLL NO / VM NO</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>DEPARTMENT</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>ATTENDANCE</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Loading students...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>No students found matching your criteria.</td>
                </tr>
              ) : (
                filteredStudents.map((student, i) => {
                  const currentClass = selectedPeriod !== "All" ? todayClasses.find(c => c.period === selectedPeriod) : null;
                  const attRecord = currentClass ? attendanceRecords.find(a => a.studentId === student.id && a.period === selectedPeriod) : null;
                  const currentStatus = attRecord ? attRecord.status : null;

                  return (
                    <tr key={student.id} style={{ borderBottom: i === filteredStudents.length - 1 ? "none" : "1px solid var(--border-subtle)", transition: "background-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-input)"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: "var(--text-main)", fontSize: "0.9rem" }}>
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", color: "var(--text-main)" }}>{student.name}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1.5rem", color: "var(--text-main)", fontWeight: "600", fontSize: "0.9rem" }}>
                        {student.studentProfile?.rollNumber || student.vmNo || "N/A"}
                      </td>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <span style={{ backgroundColor: "rgba(56, 189, 248, 0.1)", color: "var(--sky-blue)", padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600" }}>
                          {student.computedClassId || "Unknown"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        {selectedPeriod === "All" ? (
                           <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Select Period</span>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button 
                              onClick={() => handleToggleAttendance(student.id, "PRESENT", currentClass.classId, currentClass.subjectCode, currentClass.dayOrder)}
                              style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid", backgroundColor: currentStatus === "PRESENT" ? "rgba(34, 197, 94, 0.1)" : "transparent", borderColor: currentStatus === "PRESENT" ? "#22c55e" : "var(--border-subtle)", color: currentStatus === "PRESENT" ? "#22c55e" : "var(--text-muted)", cursor: "pointer", fontWeight: "600", fontSize: "0.8rem" }}
                            >
                              Present
                            </button>
                            <button 
                              onClick={() => handleToggleAttendance(student.id, "ABSENT", currentClass.classId, currentClass.subjectCode, currentClass.dayOrder)}
                              style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid", backgroundColor: currentStatus === "ABSENT" ? "rgba(239, 68, 68, 0.1)" : "transparent", borderColor: currentStatus === "ABSENT" ? "#ef4444" : "var(--border-subtle)", color: currentStatus === "ABSENT" ? "#ef4444" : "var(--text-muted)", cursor: "pointer", fontWeight: "600", fontSize: "0.8rem" }}
                            >
                              Absent
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border-subtle)", backgroundColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }} title="Email Student">
                            <Mail size={16} />
                          </button>
                          <button style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border-subtle)", backgroundColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }} title="More Options">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official PDF Export Modal */}
      {showExportModal && activeClassDetails && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div className="student-card premium-card" style={{ width: "100%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", backgroundColor: "var(--bg-card)", position: "relative" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>Official College Attendance Report Preview</h3>
              <button onClick={() => setShowExportModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            {/* Printable Report Container */}
            <div id="printable-attendance-report" style={{ backgroundColor: "#fff", color: "#000", padding: "2.5rem", borderRadius: "8px", fontFamily: "serif" }}>
              
              {/* College Header */}
              <div style={{ textAlign: "center", borderBottom: "2px solid #1e3a8a", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.35rem", fontWeight: "800", color: "#1e3a8a" }}>
                  VEL TECH MULTI TECH
                </h2>
                <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                  Dr. Rangarajan Dr. Sakunthala Engineering College
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                  (An Autonomous Institution | Approved by AICTE & Affiliated to Anna University)
                </p>
                <h3 style={{ margin: "1rem 0 0.25rem 0", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
                  PERIOD-WISE ATTENDANCE REPORT (OFFICIAL RECORD)
                </h3>
              </div>

              {/* Meta Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                <div>
                  <p style={{ margin: "0 0 0.3rem 0" }}><strong>Date:</strong> {dateString}</p>
                  <p style={{ margin: "0 0 0.3rem 0" }}><strong>Day Order:</strong> Day {activeClassDetails.dayOrder}</p>
                  <p style={{ margin: 0 }}><strong>Period:</strong> Period {activeClassDetails.period} ({activeClassDetails.timeRange})</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 0.3rem 0" }}><strong>Class ID:</strong> {activeClassDetails.classId}</p>
                  <p style={{ margin: "0 0 0.3rem 0" }}><strong>Subject:</strong> {activeClassDetails.subjectCode} - {activeClassDetails.subjectName}</p>
                  <p style={{ margin: 0 }}><strong>Total Enrolled:</strong> {currentClassStudents.length}</p>
                </div>
              </div>

              {/* Summary Stats */}
              <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem", padding: "0.75rem 1rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.9rem" }}>
                <div><strong>Present:</strong> <span style={{ color: "#16a34a", fontWeight: "700" }}>{presentCount}</span></div>
                <div><strong>Absent:</strong> <span style={{ color: "#dc2626", fontWeight: "700" }}>{absentCount}</span></div>
                <div><strong>Percentage:</strong> <strong style={{ color: "#2563eb" }}>{currentClassStudents.length > 0 ? Math.round((presentCount / currentClassStudents.length) * 100) : 0}%</strong></div>
              </div>

              {/* Student Attendance Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginBottom: "2rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", border: "1px solid #cbd5e1" }}>S.No</th>
                    <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", border: "1px solid #cbd5e1" }}>Roll No / VM No</th>
                    <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", border: "1px solid #cbd5e1" }}>Student Name</th>
                    <th style={{ padding: "0.6rem 0.75rem", textAlign: "center", border: "1px solid #cbd5e1" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sections = [...new Set(currentClassStudents.map(s => s.studentProfile?.section || "N/A"))].sort();
                    return sections.map(section => (
                      <React.Fragment key={section}>
                        <tr style={{ backgroundColor: "#f1f5f9" }}>
                          <td colSpan={4} style={{ padding: "0.5rem 0.75rem", fontWeight: "800", border: "1px solid #cbd5e1", color: "#1e3a8a" }}>Section {section}</td>
                        </tr>
                        {currentClassStudents
                          .filter(s => (s.studentProfile?.section || "N/A") === section)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((s, idx) => {
                            const rec = attendanceRecords.find(a => a.studentId === s.id && a.period === selectedPeriod);
                            const status = rec ? rec.status : "NOT MARKED";
                            return (
                              <tr key={s.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #cbd5e1" }}>{idx + 1}</td>
                                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #cbd5e1", fontWeight: "600" }}>{s.studentProfile?.rollNumber || s.vmNo || "N/A"}</td>
                                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #cbd5e1" }}>{s.name}</td>
                                <td style={{ padding: "0.5rem 0.75rem", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: "700", color: status === "PRESENT" ? "#16a34a" : status === "ABSENT" ? "#dc2626" : "#64748b" }}>
                                  {status}
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    ));
                  })()}
                </tbody>
              </table>

              {/* Signatures */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3rem", fontSize: "0.9rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ borderBottom: "1px solid #000", width: "180px", marginBottom: "0.5rem", height: "30px" }}></div>
                  <strong>Faculty Signature</strong>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ borderBottom: "1px solid #000", width: "180px", marginBottom: "0.5rem", height: "30px" }}></div>
                  <strong>Head of Department (HOD)</strong>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
              <button 
                onClick={() => setShowExportModal(false)}
                style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", border: "1px solid var(--border-subtle)", backgroundColor: "transparent", color: "var(--text-main)", fontWeight: "600", cursor: "pointer" }}
              >
                Close
              </button>
              <button 
                onClick={() => {
                  window.print();
                }}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.5rem", borderRadius: "8px", border: "none", backgroundColor: "var(--royal-blue)", color: "#fff", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 12px rgba(29, 78, 216, 0.3)" }}
              >
                <Printer size={16} /> Print / Save as PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
