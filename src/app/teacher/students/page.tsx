"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  Users, Search, Filter, CheckCircle, Mail, MoreVertical, 
  FileText, Printer, X, Calendar as CalendarIcon, RefreshCw, 
  Clock, ArrowRight, History, Percent, CheckSquare, BarChart2,
  CheckCheck, XCircle
} from "lucide-react";
import AttendanceTrendChart from "@/components/AttendanceTrendChart";

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [dateString, setDateString] = useState("");
  const [todayDateString, setTodayDateString] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetDayOrder, setTargetDayOrder] = useState("III");
  const [loading, setLoading] = useState(true);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<number | "All">("All");
  const [showExportModal, setShowExportModal] = useState(false);
  const [activePreset, setActivePreset] = useState<"today" | "yesterday" | "last7days" | "custom">("today");
  const [attendanceViewMode, setAttendanceViewMode] = useState<"raw" | "percentage">("raw");
  const [isBulkMarking, setIsBulkMarking] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const loadData = useCallback(async (start?: string, end?: string) => {
    setIsFetchingLogs(true);
    try {
      let url = "/api/teacher/students";
      const params = new URLSearchParams();
      if (start && end) {
        params.append("startDate", start);
        params.append("endDate", end);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStudents(data.data.students || []);
        setTodayClasses(data.data.todayClasses || []);
        setAttendanceRecords(data.data.attendance || []);
        setDateString(data.data.dateString || new Date().toISOString().split("T")[0]);
        setStartDate(data.data.startDate || data.data.dateString);
        setEndDate(data.data.endDate || data.data.dateString);
        setTodayDateString(data.data.todayDateString || new Date().toISOString().split("T")[0]);
        setTargetDayOrder(data.data.targetDayOrder || "III");
      }
    } catch (err) {
      console.error("Failed to load attendance logs:", err);
    } finally {
      setLoading(false);
      setIsFetchingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick preset filter handlers
  const handleSelectPreset = (preset: "today" | "yesterday" | "last7days" | "custom") => {
    setActivePreset(preset);
    const today = new Date();
    const formatYMD = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "today") {
      const t = formatYMD(today);
      setStartDate(t);
      setEndDate(t);
      loadData(t, t);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatYMD(y);
      setStartDate(yStr);
      setEndDate(yStr);
      loadData(yStr, yStr);
    } else if (preset === "last7days") {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 7);
      const startStr = formatYMD(past7);
      const endStr = formatYMD(today);
      setStartDate(startStr);
      setEndDate(endStr);
      loadData(startStr, endStr);
    }
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    if (startDate > endDate) {
      alert("Start date cannot be after end date.");
      return;
    }
    setActivePreset("custom");
    loadData(startDate, endDate);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (student.vmNo && student.vmNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.studentProfile?.rollNumber && student.studentProfile.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedPeriod !== "All") {
      const cls = todayClasses.find(c => c.period === selectedPeriod);
      return matchesSearch && cls && student.computedClassId === cls.classId;
    }
    return matchesSearch;
  });

  const handleToggleAttendance = async (studentId: string, status: string, classId: string, subjectCode: string, dayOrder: string | number) => {
    if (selectedPeriod === "All") return alert("Please select a specific period to mark attendance.");
    
    // For single date view, use the target date; for range view, default to startDate
    const targetDateForMarking = startDate === endDate ? startDate : dateString;

    try {
      const res = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          classId,
          dateString: targetDateForMarking,
          dayOrder: String(dayOrder || targetDayOrder),
          period: selectedPeriod,
          subjectCode,
          status
        })
      });
      const data = await res.json();
      if (data.success) {
        setAttendanceRecords(prev => {
          const filtered = prev.filter(a => !(a.studentId === studentId && a.period === selectedPeriod && a.dateString === targetDateForMarking));
          return [...filtered, data.data];
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeClassDetails = selectedPeriod !== "All" ? todayClasses.find(c => c.period === selectedPeriod) : null;
  const currentClassStudents = activeClassDetails ? students.filter(s => s.computedClassId === activeClassDetails.classId) : students;
  
  const isSingleDate = startDate === endDate;
  const isPastDate = isSingleDate && startDate !== todayDateString && todayDateString !== "";
  const isMultiDayRange = !isSingleDate;

  // Single date counts
  const presentCount = currentClassStudents.filter(s => {
    const rec = attendanceRecords.find(a => a.studentId === s.id && a.period === selectedPeriod && (!isSingleDate || a.dateString === startDate));
    return rec?.status === "PRESENT";
  }).length;

  const absentCount = currentClassStudents.filter(s => {
    const rec = attendanceRecords.find(a => a.studentId === s.id && a.period === selectedPeriod && (!isSingleDate || a.dateString === startDate));
    return rec?.status === "ABSENT";
  }).length;

  const handleBulkMarkAttendance = async (status: "PRESENT" | "ABSENT") => {
    if (selectedPeriod === "All") {
      alert("Please select a specific period from the dropdown filter above (e.g., Period 1) before using 'Mark All " + (status === "PRESENT" ? "Present" : "Absent") + "'.");
      return;
    }

    if (!activeClassDetails) {
      alert(`No class scheduled for Period ${selectedPeriod}.`);
      return;
    }

    const targetStudents = currentClassStudents.length > 0 ? currentClassStudents : filteredStudents;
    if (targetStudents.length === 0) {
      alert(`No students found for Period ${selectedPeriod} (${activeClassDetails.classId}).`);
      return;
    }

    const targetDateForMarking = startDate === endDate ? startDate : (dateString || todayDateString);
    const dayOrderToUse = String(activeClassDetails.dayOrder || targetDayOrder || "III");

    const confirmMessage = `Mark ALL ${targetStudents.length} students as ${status} for Period ${selectedPeriod} (${activeClassDetails.classId} - ${activeClassDetails.subjectCode}) on ${targetDateForMarking}?`;
    if (!window.confirm(confirmMessage)) return;

    setIsBulkMarking(true);
    setBulkMessage(null);

    try {
      const payload = {
        bulk: true,
        classId: activeClassDetails.classId,
        dateString: targetDateForMarking,
        dayOrder: dayOrderToUse,
        period: selectedPeriod,
        subjectCode: activeClassDetails.subjectCode,
        status,
        studentIds: targetStudents.map(s => s.id)
      };

      const res = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const updatedRecords = data.data;
        const targetIds = new Set(targetStudents.map(s => s.id));
        setAttendanceRecords(prev => {
          const remaining = prev.filter(a => !(targetIds.has(a.studentId) && a.period === selectedPeriod && a.dateString === targetDateForMarking));
          return [...remaining, ...updatedRecords];
        });
        setBulkMessage(`Successfully marked all ${targetStudents.length} students as ${status} for Period ${selectedPeriod} (${activeClassDetails.classId})`);
        setTimeout(() => setBulkMessage(null), 4500);
      } else {
        alert(data.error || "Failed to mark bulk attendance");
      }
    } catch (err: any) {
      console.error("Bulk marking error:", err);
      alert("Failed to mark bulk attendance: " + (err.message || "Network error"));
    } finally {
      setIsBulkMarking(false);
    }
  };

  return (
    <main className="student-main">
      <header className="student-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
            Student Attendance Management
          </h1>
          <p className="student-subtitle" style={{ marginTop: "0.25rem" }}>
            Official institutional attendance register with past date search &amp; semester archive
          </p>
        </div>
        <div className="student-course-info" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button 
            onClick={() => {
              if (selectedPeriod === "All") {
                alert("Please select a specific period from the dropdown filter before exporting attendance.");
                return;
              }
              setShowExportModal(true);
            }}
            style={{ 
              backgroundColor: "var(--royal-blue)", 
              color: "white", 
              padding: "0.6rem 1.2rem", 
              borderRadius: "8px", 
              border: "none", 
              fontWeight: "600", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: "0.5rem", 
              boxShadow: "0 4px 12px rgba(29, 78, 216, 0.3)" 
            }}
          >
            <FileText size={16} /> Export Attendance Report
          </button>
        </div>
      </header>

      {/* DATE RANGE FILTER TOOLBAR */}
      <div className="student-card premium-card" style={{ marginBottom: "1.75rem", padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <CalendarIcon size={18} className="text-blue-400" />
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
              Attendance Date &amp; Session Filter
            </h3>
            {isPastDate && (
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "9999px", backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <History size={12} /> Viewing Past Date
              </span>
            )}
            {isMultiDayRange && (
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "9999px", backgroundColor: "rgba(56, 189, 248, 0.15)", color: "var(--sky-blue)", fontWeight: "700" }}>
                Date Range View
              </span>
            )}
          </div>

          {/* Quick Presets */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>Quick Select:</span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7days", label: "Past 7 Days" },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id as any)}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: activePreset === p.id ? "var(--sky-blue)" : "var(--border-subtle)",
                  backgroundColor: activePreset === p.id ? "rgba(56, 189, 248, 0.15)" : "var(--bg-input)",
                  color: activePreset === p.id ? "var(--sky-blue)" : "var(--text-main)",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        <form onSubmit={handleApplyCustomRange} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>From:</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset("custom");
              }}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-main)",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>To:</label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset("custom");
              }}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-main)",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isFetchingLogs}
            style={{
              padding: "0.5rem 1.2rem",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "var(--royal-blue)",
              color: "white",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              opacity: isFetchingLogs ? 0.7 : 1
            }}
          >
            {isFetchingLogs ? <RefreshCw size={14} className="animate-spin" /> : <Filter size={14} />}
            Filter Attendance
          </button>

          {(isPastDate || isMultiDayRange) && (
            <button
              type="button"
              onClick={() => handleSelectPreset("today")}
              style={{
                padding: "0.5rem 0.9rem",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "transparent",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Reset to Today
            </button>
          )}

          {/* Active Filter Info Badge */}
          <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Active Date: <strong style={{ color: "var(--text-main)" }}>
              {isSingleDate ? startDate : `${startDate} to ${endDate}`}
            </strong> • Day Order: <strong style={{ color: "var(--sky-blue)" }}>Day {targetDayOrder}</strong>
          </div>
        </form>
      </div>

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
            <h3 style={{ fontSize: "1.8rem", fontWeight: "800", margin: 0, color: "var(--text-main)" }}>
              {selectedPeriod !== "All" && currentClassStudents.length > 0
                ? `${Math.round((presentCount / currentClassStudents.length) * 100)}%`
                : "94%"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>
              {selectedPeriod !== "All" ? `Period ${selectedPeriod} Attendance` : "Semester Avg Attendance"}
            </p>
          </div>
        </div>
        <div className="student-card premium-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "50px", height: "50px", borderRadius: "12px", backgroundColor: "rgba(168, 85, 247, 0.1)", color: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.8rem", fontWeight: "800", margin: 0, color: "var(--text-main)" }}>{todayClasses.length}</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>Scheduled Lectures</p>
          </div>
        </div>
      </div>

      {/* D3.js 6-Month Attendance Trends & Predictive Insights */}
      <div style={{ marginBottom: "2rem" }}>
        <AttendanceTrendChart classId={activeClassDetails?.classId || "II-CSE-A"} />
      </div>

      {/* Controls & Period Selector with Attendance View Mode Toggle Switch */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem", justifyContent: "space-between", alignItems: "center" }}>
        {/* Search */}
        <div style={{ display: "flex", flex: 1, minWidth: "260px", position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input 
            type="text" 
            placeholder="Search students by name, roll no, or VM ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "0.75rem 1rem 0.75rem 2.8rem", borderRadius: "10px", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-input)", color: "var(--text-main)", outline: "none", fontSize: "0.95rem" }}
          />
        </div>

        {/* Right side controls: Period selector + View Mode Toggle Switch */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value === "All" ? "All" : Number(e.target.value))}
            style={{ padding: "0.75rem 1.1rem", borderRadius: "10px", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-card)", color: "var(--text-main)", fontWeight: "600", cursor: "pointer", outline: "none", fontSize: "0.85rem" }}
          >
            <option value="All">All Periods (Select Period to View/Mark Attendance)</option>
            {todayClasses.map(c => (
              <option key={c.id} value={c.period}>Period {c.period} ({c.classId} - {c.subjectCode})</option>
            ))}
          </select>

          {/* TOGGLE SWITCH: Raw Status vs Calculated Attendance Percentage */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.5rem", 
              backgroundColor: "var(--bg-input)", 
              padding: "0.35rem 0.65rem", 
              borderRadius: "10px", 
              border: "1px solid var(--border-subtle)" 
            }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              View Mode:
            </span>

            <div 
              style={{ 
                display: "inline-flex", 
                alignItems: "center", 
                backgroundColor: "var(--bg-card)", 
                padding: "3px", 
                borderRadius: "8px", 
                border: "1px solid var(--border-subtle)" 
              }}
            >
              {/* Raw Status Button */}
              <button
                type="button"
                onClick={() => setAttendanceViewMode("raw")}
                aria-pressed={attendanceViewMode === "raw"}
                title="View raw attendance logs and marking controls"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: attendanceViewMode === "raw" ? "var(--royal-blue)" : "transparent",
                  color: attendanceViewMode === "raw" ? "#ffffff" : "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <CheckSquare size={13} />
                Raw Status
              </button>

              {/* Physical Sliding Switch Track & Thumb */}
              <div
                role="switch"
                aria-checked={attendanceViewMode === "percentage"}
                aria-label="Toggle between raw attendance status and calculated percentage"
                onClick={() => setAttendanceViewMode(prev => prev === "raw" ? "percentage" : "raw")}
                title="Click to toggle view mode"
                style={{
                  width: "36px",
                  height: "20px",
                  borderRadius: "10px",
                  backgroundColor: attendanceViewMode === "percentage" ? "var(--royal-blue)" : "var(--border-subtle)",
                  position: "relative",
                  cursor: "pointer",
                  margin: "0 0.35rem",
                  transition: "background-color 0.2s ease"
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    position: "absolute",
                    top: "2px",
                    left: attendanceViewMode === "percentage" ? "18px" : "2px",
                    transition: "left 0.2s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.25)"
                  }}
                />
              </div>

              {/* Calculated Percentage Button */}
              <button
                type="button"
                onClick={() => setAttendanceViewMode("percentage")}
                aria-pressed={attendanceViewMode === "percentage"}
                title="View calculated attendance percentage and Anna University compliance"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: attendanceViewMode === "percentage" ? "var(--royal-blue)" : "transparent",
                  color: attendanceViewMode === "percentage" ? "#ffffff" : "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <Percent size={13} />
                Calculated %
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="student-card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Mode Indicator Bar */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          flexWrap: "wrap",
          gap: "0.5rem",
          padding: "0.6rem 1.25rem", 
          backgroundColor: attendanceViewMode === "raw" ? "rgba(29, 78, 216, 0.05)" : "rgba(16, 185, 129, 0.06)", 
          borderBottom: "1px solid var(--border-subtle)", 
          fontSize: "0.8rem" 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
            {attendanceViewMode === "raw" ? (
              <>
                <CheckSquare size={14} color="var(--royal-blue)" />
                <span>Viewing <strong>Raw Attendance Logs</strong> for {isSingleDate ? `Date: ${startDate}` : `Range: ${startDate} to ${endDate}`}.</span>
                {selectedPeriod !== "All" && <span>• Period {selectedPeriod}</span>}
              </>
            ) : (
              <>
                <Percent size={14} color="#10b981" />
                <span>Viewing <strong>Calculated Attendance Percentage</strong> for {isSingleDate ? `Date: ${startDate}` : `Range: ${startDate} to ${endDate}`}.</span>
                <span style={{ color: "#10b981", fontWeight: "700" }}>• Anna Univ Compliance Bar: 75%</span>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem" }}>
            {attendanceViewMode === "raw" ? (
              <span style={{ color: "var(--text-muted)" }}>
                {isSingleDate ? "Use Present / Absent buttons to log attendance" : "Showing session-by-session raw logs"}
              </span>
            ) : (
              <>
                <span style={{ color: "#16a34a", fontWeight: "700" }}>≥75% Eligible</span>
                <span style={{ color: "#d97706", fontWeight: "700" }}>65-74% Condonation</span>
                <span style={{ color: "#dc2626", fontWeight: "700" }}>&lt;65% Detention Risk</span>
              </>
            )}
          </div>
        </div>

        {/* Bulk Action Notification */}
        {bulkMessage && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.25rem",
            backgroundColor: "rgba(34, 197, 94, 0.15)",
            borderBottom: "1px solid rgba(34, 197, 94, 0.3)",
            color: "#16a34a",
            fontSize: "0.85rem",
            fontWeight: "700"
          }}>
            <CheckCheck size={16} />
            <span>{bulkMessage}</span>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--bg-input)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ padding: "1rem 1.5rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>STUDENT</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>ROLL NO / VM NO</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>DEPARTMENT</th>
                <th style={{ padding: "0.75rem 1.5rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div>
                      <span>{attendanceViewMode === "raw" ? "RAW ATTENDANCE STATUS" : "CALCULATED ATTENDANCE %"}</span>
                      <span style={{ marginLeft: "0.4rem", opacity: 0.8, fontWeight: "500", fontSize: "0.75rem" }}>
                        {isSingleDate ? `(${startDate})` : `(${startDate} to ${endDate})`}
                      </span>
                    </div>

                    {/* Quick Bulk Attendance Marking Buttons for the selected period */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <button
                        type="button"
                        onClick={() => handleBulkMarkAttendance("PRESENT")}
                        disabled={isBulkMarking}
                        title={selectedPeriod === "All" ? "Select a specific period from the dropdown filter to enable bulk marking" : `Mark all students in Period ${selectedPeriod} as Present`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "6px",
                          border: "1px solid #16a34a",
                          backgroundColor: selectedPeriod === "All" ? "var(--bg-card)" : "rgba(34, 197, 94, 0.15)",
                          color: selectedPeriod === "All" ? "var(--text-muted)" : "#16a34a",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          cursor: isBulkMarking ? "not-allowed" : "pointer",
                          opacity: isBulkMarking ? 0.6 : selectedPeriod === "All" ? 0.75 : 1,
                          transition: "all 0.15s ease",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {isBulkMarking ? <RefreshCw size={12} className="animate-spin" /> : <CheckCheck size={14} />}
                        Mark All Present
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBulkMarkAttendance("ABSENT")}
                        disabled={isBulkMarking}
                        title={selectedPeriod === "All" ? "Select a specific period from the dropdown filter to enable bulk marking" : `Mark all students in Period ${selectedPeriod} as Absent`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "6px",
                          border: "1px solid #dc2626",
                          backgroundColor: selectedPeriod === "All" ? "var(--bg-card)" : "rgba(239, 68, 68, 0.15)",
                          color: selectedPeriod === "All" ? "var(--text-muted)" : "#dc2626",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          cursor: isBulkMarking ? "not-allowed" : "pointer",
                          opacity: isBulkMarking ? 0.6 : selectedPeriod === "All" ? 0.75 : 1,
                          transition: "all 0.15s ease",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {isBulkMarking ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={14} />}
                        Mark All Absent
                      </button>
                    </div>
                  </div>
                </th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading || isFetchingLogs ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      <RefreshCw size={16} className="animate-spin" />
                      Loading attendance records for {isSingleDate ? startDate : `${startDate} - ${endDate}`}...
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>No students found matching your criteria.</td>
                </tr>
              ) : (
                filteredStudents.map((student, i) => {
                  const currentClass = selectedPeriod !== "All" ? todayClasses.find(c => c.period === selectedPeriod) : null;
                  
                  // Filter relevant attendance records for this student and period filter
                  const studentRecords = attendanceRecords.filter(a => 
                    a.studentId === student.id && (selectedPeriod === "All" || a.period === selectedPeriod)
                  );

                  // Single date specific record
                  const attRecord = currentClass && isSingleDate 
                    ? studentRecords.find(a => a.period === selectedPeriod && a.dateString === startDate) 
                    : null;
                  const currentStatus = attRecord ? attRecord.status : null;

                  // Counts and percentage for multi-day range or single-date calculations
                  const rangePresents = studentRecords.filter(r => r.status === "PRESENT").length;
                  const rangeAbsents = studentRecords.filter(r => r.status === "ABSENT").length;
                  const rangeTotal = studentRecords.length;
                  const calculatedPct = rangeTotal > 0 ? Math.round((rangePresents / rangeTotal) * 100) : null;

                  return (
                    <tr 
                      key={student.id} 
                      style={{ borderBottom: i === filteredStudents.length - 1 ? "none" : "1px solid var(--border-subtle)", transition: "background-color 0.2s" }} 
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-input)"} 
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
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

                      {/* Dynamic Attendance Status / Percentage Column */}
                      <td style={{ padding: "1rem 1.5rem" }}>
                        {attendanceViewMode === "raw" ? (
                          /* RAW ATTENDANCE STATUS MODE */
                          selectedPeriod === "All" && isSingleDate ? (
                            studentRecords.length > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                                {studentRecords.map(r => (
                                  <span key={`${r.dateString}-${r.period}`} style={{
                                    fontSize: "0.75rem",
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: "6px",
                                    backgroundColor: r.status === "PRESENT" ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                                    color: r.status === "PRESENT" ? "#16a34a" : "#dc2626",
                                    fontWeight: "700",
                                    border: `1px solid ${r.status === "PRESENT" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                                  }}>
                                    Period {r.period}: {r.status}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Select Period from Dropdown</span>
                            )
                          ) : isSingleDate ? (
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <button 
                                onClick={() => currentClass && handleToggleAttendance(student.id, "PRESENT", currentClass.classId, currentClass.subjectCode, currentClass.dayOrder)}
                                style={{ 
                                  padding: "0.4rem 0.8rem", 
                                  borderRadius: "6px", 
                                  border: "1px solid", 
                                  backgroundColor: currentStatus === "PRESENT" ? "rgba(34, 197, 94, 0.15)" : "transparent", 
                                  borderColor: currentStatus === "PRESENT" ? "#22c55e" : "var(--border-subtle)", 
                                  color: currentStatus === "PRESENT" ? "#22c55e" : "var(--text-muted)", 
                                  cursor: "pointer", 
                                  fontWeight: "600", 
                                  fontSize: "0.8rem" 
                                }}
                              >
                                Present
                              </button>
                              <button 
                                onClick={() => currentClass && handleToggleAttendance(student.id, "ABSENT", currentClass.classId, currentClass.subjectCode, currentClass.dayOrder)}
                                style={{ 
                                  padding: "0.4rem 0.8rem", 
                                  borderRadius: "6px", 
                                  border: "1px solid", 
                                  backgroundColor: currentStatus === "ABSENT" ? "rgba(239, 68, 68, 0.15)" : "transparent", 
                                  borderColor: currentStatus === "ABSENT" ? "#ef4444" : "var(--border-subtle)", 
                                  color: currentStatus === "ABSENT" ? "#ef4444" : "var(--text-muted)", 
                                  cursor: "pointer", 
                                  fontWeight: "600", 
                                  fontSize: "0.8rem" 
                                }}
                              >
                                Absent
                              </button>
                              {!currentStatus && (
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                  Not marked for this date
                                </span>
                              )}
                            </div>
                          ) : (
                            /* Multi-day range raw logs */
                            rangeTotal > 0 ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                  <span style={{ 
                                    fontSize: "0.8rem", 
                                    fontWeight: "700", 
                                    color: "#16a34a", 
                                    backgroundColor: "rgba(34, 197, 94, 0.12)", 
                                    padding: "0.2rem 0.6rem", 
                                    borderRadius: "6px",
                                    border: "1px solid rgba(34, 197, 94, 0.25)"
                                  }}>
                                    ✓ {rangePresents} Present
                                  </span>
                                  <span style={{ 
                                    fontSize: "0.8rem", 
                                    fontWeight: "700", 
                                    color: "#dc2626", 
                                    backgroundColor: "rgba(239, 68, 68, 0.12)", 
                                    padding: "0.2rem 0.6rem", 
                                    borderRadius: "6px",
                                    border: "1px solid rgba(239, 68, 68, 0.25)"
                                  }}>
                                    ✗ {rangeAbsents} Absent
                                  </span>
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
                                    ({rangeTotal} raw entries)
                                  </span>
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                                  {studentRecords.slice(0, 6).map(r => (
                                    <span 
                                      key={`${r.dateString}-${r.period}`}
                                      title={`${r.dateString} P${r.period}: ${r.status}`}
                                      style={{
                                        fontSize: "0.7rem",
                                        padding: "0.1rem 0.4rem",
                                        borderRadius: "4px",
                                        backgroundColor: r.status === "PRESENT" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                        color: r.status === "PRESENT" ? "#16a34a" : "#dc2626",
                                        fontWeight: "700",
                                        border: `1px solid ${r.status === "PRESENT" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                                      }}
                                    >
                                      {r.dateString.slice(5)} P{r.period}:{r.status === "PRESENT" ? "P" : "A"}
                                    </span>
                                  ))}
                                  {studentRecords.length > 6 && (
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", alignSelf: "center" }}>
                                      +{studentRecords.length - 6} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                No raw logs recorded in this date range
                              </span>
                            )
                          )
                        ) : (
                          /* CALCULATED ATTENDANCE PERCENTAGE MODE */
                          rangeTotal > 0 && calculatedPct !== null ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", minWidth: "220px", maxWidth: "300px" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                                  <span style={{ 
                                    fontSize: "1.25rem", 
                                    fontWeight: "800", 
                                    color: calculatedPct >= 75 ? "#16a34a" : calculatedPct >= 65 ? "#d97706" : "#dc2626" 
                                  }}>
                                    {calculatedPct}%
                                  </span>
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
                                    ({rangePresents}/{rangeTotal} attended)
                                  </span>
                                </div>

                                <span style={{ 
                                  padding: "0.15rem 0.55rem", 
                                  borderRadius: "9999px", 
                                  fontSize: "0.7rem", 
                                  fontWeight: "800",
                                  backgroundColor: calculatedPct >= 75 ? "rgba(34, 197, 94, 0.15)" : calculatedPct >= 65 ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                  color: calculatedPct >= 75 ? "#16a34a" : calculatedPct >= 65 ? "#d97706" : "#dc2626",
                                  border: `1px solid ${calculatedPct >= 75 ? "rgba(34, 197, 94, 0.3)" : calculatedPct >= 65 ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                                }}>
                                  {calculatedPct >= 75 ? "Eligible" : calculatedPct >= 65 ? "Condonation" : "Detention Risk"}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div style={{ width: "100%", height: "6px", backgroundColor: "var(--border-subtle)", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ 
                                  width: `${Math.min(100, Math.max(0, calculatedPct))}%`, 
                                  height: "100%", 
                                  backgroundColor: calculatedPct >= 75 ? "#16a34a" : calculatedPct >= 65 ? "#f59e0b" : "#dc2626",
                                  borderRadius: "3px",
                                  transition: "width 0.3s ease" 
                                }} />
                              </div>
                            </div>
                          ) : isSingleDate && currentClass && !currentStatus ? (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                              Unmarked for Period {selectedPeriod} ({startDate})
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                              No logged sessions in selected range
                            </span>
                          )
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
                  (An Autonomous Institution | Approved by AICTE &amp; Affiliated to Anna University)
                </p>
                <h3 style={{ margin: "1rem 0 0.25rem 0", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
                  PERIOD-WISE ATTENDANCE REPORT (OFFICIAL RECORD)
                </h3>
              </div>

              {/* Meta Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                <div>
                  <p style={{ margin: "0 0 0.3rem 0" }}>
                    <strong>Date / Period:</strong> {isSingleDate ? startDate : `${startDate} to ${endDate}`}
                  </p>
                  <p style={{ margin: "0 0 0.3rem 0" }}>
                    <strong>Day Order:</strong> Day {targetDayOrder || activeClassDetails.dayOrder}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Period:</strong> Period {activeClassDetails.period} ({activeClassDetails.timeRange})
                  </p>
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
                            const rec = attendanceRecords.find(a => a.studentId === s.id && a.period === selectedPeriod && (!isSingleDate || a.dateString === startDate));
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
