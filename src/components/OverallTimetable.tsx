"use client";

import { useState } from "react";
import { Calendar, LayoutGrid, List } from "lucide-react";

export interface TimetableEntry {
  id?: string;
  classId?: string;
  dayOrder: string;
  period: number;
  timeRange: string;
  subjectCode: string;
  subjectName: string;
  facultyName?: string;
  roomNo: string;
  vmsNo?: string | null;
}

interface OverallTimetableProps {
  fullTimetable?: Record<string, TimetableEntry[]> | null;
  currentDayOrder?: string;
  title?: string;
  subtitle?: string;
  mode?: "student" | "teacher" | "hod" | "admin";
  classId?: string;
  facultyName?: string;
}

const PERIOD_LIST = [
  { period: 1, label: "Period 1", defaultTime: "08:00 - 08:50" },
  { period: 2, label: "Period 2", defaultTime: "08:50 - 09:40" },
  { period: 3, label: "Period 3", defaultTime: "09:55 - 10:45" },
  { period: 4, label: "Period 4", defaultTime: "10:45 - 11:35" },
  { period: 5, label: "Period 5", defaultTime: "12:15 - 01:05" },
  { period: 6, label: "Period 6", defaultTime: "01:05 - 01:55" },
  { period: 7, label: "Period 7", defaultTime: "02:05 - 02:55" },
  { period: 8, label: "Period 8", defaultTime: "02:55 - 03:45" },
];

const DAY_ORDERS = ["I", "II", "III", "IV", "V"];

export default function OverallTimetable({
  fullTimetable,
  currentDayOrder = "I",
  title = "Overall Timetable",
  subtitle,
  mode = "student",
  classId,
  facultyName
}: OverallTimetableProps) {
  const initialDayOrder = DAY_ORDERS.includes(currentDayOrder) ? currentDayOrder : "I";
  const [selectedDayOrder, setSelectedDayOrder] = useState<string>(initialDayOrder);
  const [viewMode, setViewMode] = useState<"matrix" | "tabs">("matrix");

  const timetableMap: Record<string, TimetableEntry[]> = fullTimetable || {
    "I": [], "II": [], "III": [], "IV": [], "V": []
  };

  const selectedEntries = timetableMap[selectedDayOrder] || [];

  return (
    <section className="student-card premium-card" style={{ marginTop: "2rem", padding: "1.25rem 1.5rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(29, 78, 216, 0.1)", color: "var(--royal-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Calendar size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-main)", margin: 0, letterSpacing: "-0.01em" }}>
              {title}
            </h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              {subtitle || (classId ? `Class: ${classId}` : facultyName ? `Faculty: ${facultyName}` : "Complete 5-Day Weekly Matrix")}
            </div>
          </div>
        </div>

        {/* View Switcher: Matrix (Default as in screenshot) vs Single Day View */}
        <div style={{ display: "inline-flex", padding: "3px", backgroundColor: "var(--bg-input)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => setViewMode("matrix")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: viewMode === "matrix" ? "var(--bg-card)" : "transparent",
              color: viewMode === "matrix" ? "var(--royal-blue)" : "var(--text-muted)",
              boxShadow: viewMode === "matrix" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            <LayoutGrid size={14} />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setViewMode("tabs")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: viewMode === "tabs" ? "var(--bg-card)" : "transparent",
              color: viewMode === "tabs" ? "var(--royal-blue)" : "var(--text-muted)",
              boxShadow: viewMode === "tabs" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            <List size={14} />
            <span>Day View</span>
          </button>
        </div>
      </div>

      {viewMode === "matrix" ? (
        /* ================= EXACT TABLE AS SHOWN IN SCREENSHOT ================= */
        <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--bg-card-header)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ padding: "1rem", textAlign: "left", width: "100px", fontWeight: "700", color: "var(--text-main)", borderRight: "1px solid var(--border-subtle)" }}>
                  Day
                </th>
                {PERIOD_LIST.map(p => (
                  <th key={p.period} style={{ padding: "0.85rem 0.75rem", textAlign: "left", fontWeight: "700", color: "var(--text-main)", borderRight: p.period < 8 ? "1px solid var(--border-subtle)" : "none", minWidth: "140px" }}>
                    <div>{p.label}</div>
                    <div style={{ fontSize: "0.68rem", fontWeight: "normal", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                      {p.defaultTime}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_ORDERS.map(doStr => {
                const isCurrent = currentDayOrder === doStr;
                const entries = timetableMap[doStr] || [];

                return (
                  <tr
                    key={doStr}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      backgroundColor: isCurrent ? "rgba(29, 78, 216, 0.04)" : "transparent",
                      transition: "background-color 0.15s ease"
                    }}
                  >
                    {/* Day Column (Day I, Day II, etc.) */}
                    <td style={{
                      padding: "1.25rem 1rem",
                      fontWeight: "800",
                      color: isCurrent ? "var(--royal-blue)" : "var(--text-main)",
                      borderRight: "1px solid var(--border-subtle)",
                      backgroundColor: isCurrent ? "rgba(29, 78, 216, 0.06)" : "var(--bg-card-header)",
                      verticalAlign: "top",
                      whiteSpace: "nowrap"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        <span style={{ fontSize: "0.95rem" }}>Day {doStr}</span>
                        {isCurrent && (
                          <span style={{
                            display: "inline-block",
                            width: "fit-content",
                            fontSize: "0.6rem",
                            padding: "0.1rem 0.35rem",
                            borderRadius: "4px",
                            backgroundColor: "#22c55e",
                            color: "#ffffff",
                            fontWeight: 800,
                            letterSpacing: "0.03em"
                          }}>
                            TODAY
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Period Columns 1 to 8 */}
                    {PERIOD_LIST.map(p => {
                      const entry = entries.find(e => e.period === p.period);
                      const hasClass = Boolean(entry && entry.subjectName);

                      return (
                        <td
                          key={p.period}
                          style={{
                            padding: "0.9rem 0.75rem",
                            borderRight: p.period < 8 ? "1px solid var(--border-subtle)" : "none",
                            verticalAlign: "top",
                            lineHeight: 1.35
                          }}
                        >
                          {hasClass ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                              {/* 1. Subject Name in vibrant Sky/Royal Blue */}
                              <div style={{
                                fontWeight: "700",
                                fontSize: "0.83rem",
                                color: "#0284c7",
                                wordBreak: "break-word"
                              }}>
                                {entry?.subjectName}
                              </div>

                              {/* 2. Faculty / Class handling info */}
                              <div style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                                wordBreak: "break-word"
                              }}>
                                {mode === "student" ? (
                                  entry?.facultyName || "Faculty"
                                ) : (
                                  <span>
                                    <strong style={{ color: "var(--text-main)" }}>{entry?.classId || classId}</strong>
                                    {entry?.facultyName ? ` • ${entry.facultyName}` : ""}
                                  </span>
                                )}
                              </div>

                              {/* 3. Room Number */}
                              {entry?.roomNo && (
                                <div style={{
                                  fontSize: "0.72rem",
                                  fontWeight: "600",
                                  color: "var(--text-muted)",
                                  opacity: 0.85
                                }}>
                                  {entry.roomNo}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ minHeight: "45px", display: "flex", alignItems: "center" }}>
                              <span style={{ color: "var(--text-muted)", opacity: 0.3, fontSize: "0.85rem" }}>—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ================= SINGLE DAY FOCUS VIEW ================= */
        <div>
          {/* Day Order Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
            {DAY_ORDERS.map(doStr => {
              const isSelected = selectedDayOrder === doStr;
              const isToday = currentDayOrder === doStr;
              const count = (timetableMap[doStr] || []).length;

              return (
                <button
                  key={doStr}
                  onClick={() => setSelectedDayOrder(doStr)}
                  style={{
                    padding: "0.6rem 1.1rem",
                    borderRadius: "10px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    whiteSpace: "nowrap",
                    border: isSelected ? "1px solid var(--royal-blue)" : "1px solid var(--border-subtle)",
                    backgroundColor: isSelected ? "var(--royal-blue)" : "var(--bg-input)",
                    color: isSelected ? "#ffffff" : "var(--text-main)",
                    boxShadow: isSelected ? "0 4px 12px rgba(29, 78, 216, 0.25)" : "none",
                    transition: "all 0.15s ease"
                  }}
                >
                  <span>Day Order {doStr}</span>
                  {isToday && (
                    <span style={{
                      fontSize: "0.65rem",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : "rgba(34, 197, 94, 0.15)",
                      color: isSelected ? "#ffffff" : "#22c55e",
                      fontWeight: 800
                    }}>
                      TODAY
                    </span>
                  )}
                  <span style={{ fontSize: "0.7rem", opacity: isSelected ? 0.85 : 0.6 }}>
                    ({count} classes)
                  </span>
                </button>
              );
            })}
          </div>

          {/* Period cards for selected day */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {PERIOD_LIST.map(({ period, label, defaultTime }) => {
              const entry = selectedEntries.find(e => e.period === period);
              const hasClass = Boolean(entry && entry.subjectName);

              return (
                <div
                  key={period}
                  style={{
                    borderRadius: "12px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: hasClass ? "var(--bg-card)" : "var(--bg-input)",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "125px"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "0.2rem 0.5rem", borderRadius: "6px", backgroundColor: "rgba(2, 132, 199, 0.1)", color: "#0284c7" }}>
                        {label.toUpperCase()}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {entry?.timeRange || defaultTime}
                      </span>
                    </div>

                    {hasClass ? (
                      <div>
                        <h4 style={{ margin: "0 0 0.35rem 0", fontSize: "0.92rem", fontWeight: "700", color: "#0284c7", lineHeight: 1.3 }}>
                          {entry?.subjectName}
                        </h4>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {mode === "student" ? entry?.facultyName : `Class: ${entry?.classId || classId}`}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: "0.75rem 0", color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                        Free Period
                      </div>
                    )}
                  </div>

                  {hasClass && entry?.roomNo && (
                    <div style={{ marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)" }}>
                      {entry.roomNo}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
