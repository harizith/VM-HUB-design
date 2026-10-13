"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Calendar,
  Users,
  Award,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  Check,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface FacultyExtractedSummary {
  name: string;
  vmsNo: string;
  designation: string;
  slotCount: number;
  totalHours?: number;
}

interface SampleSlot {
  classId: string;
  dayOrder: string;
  period: number;
  timeRange: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  roomNo: string;
}

export default function AdminTimetablePdfUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importMode, setImportMode] = useState<"append" | "replace">("replace");
  const [showGuide, setShowGuide] = useState(true);
  const [expandedFaculties, setExpandedFaculties] = useState(false);

  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    count?: number;
    facultyCount?: number;
    faculties?: FacultyExtractedSummary[];
    sampleSlots?: SampleSlot[];
    message?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Please upload a valid PDF document (.pdf)");
      return;
    }
    setFile(selectedFile);
    setErrorMessage(null);
    setUploadResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExtractAndImport = async () => {
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", importMode);

    try {
      const res = await fetch("/api/admin/timetable/import-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setUploadResult({
          success: true,
          count: data.count,
          facultyCount: data.facultyCount,
          faculties: data.faculties,
          sampleSlots: data.sampleSlots,
          message: `Successfully extracted & imported ${data.count} timetable slots across ${data.facultyCount} faculty members into the database!`,
        });
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setErrorMessage(data.error || "Failed to parse and import timetable PDF.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected network error occurred.");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Banner */}
      <div className="student-card premium-card" style={{ padding: "1.75rem", borderLeft: "4px solid var(--royal-blue)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span style={{
                backgroundColor: "rgba(56, 189, 248, 0.15)",
                color: "var(--sky-blue)",
                padding: "0.2rem 0.6rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem"
              }}>
                <Sparkles size={12} /> AUTOMATED PDF TIMETABLE EXTRACTION
              </span>
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "800", margin: 0, color: "var(--text-main)" }}>
              Upload Individual Faculty Timetables (.pdf)
            </h2>
            <p style={{ margin: "0.4rem 0 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Upload official college PDFs containing multi-page <strong>&quot;INDIVIDUAL TIME TABLE&quot;</strong> documents. Our smart algorithmic parser automatically maps periods (1 - 8), Day Orders (I - V), course codes, and faculty VMS numbers.
            </p>
          </div>

          <button
            onClick={() => setShowGuide(!showGuide)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 0.9rem",
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-muted)",
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            <Info size={14} /> {showGuide ? "Hide PDF Guide" : "View PDF Guide"}
          </button>
        </div>

        {/* Algorithm & Format Guide */}
        {showGuide && (
          <div style={{
            marginTop: "1.25rem",
            padding: "1.1rem 1.25rem",
            backgroundColor: "var(--bg-input)",
            borderRadius: "10px",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem"
          }}>
            <div>
              <strong style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                📄 Multi-Page PDF Support
              </strong>
              Each page of your PDF represents an individual faculty member (e.g., <em>Dr. R. Saravanan</em>, <em>Dr. M. Victor Jose</em>, etc.). The algorithm loops through every page automatically.
            </div>

            <div>
              <strong style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                ⚡ Auto-Extracted Metadata
              </strong>
              Reads <strong>Name</strong>, <strong>MTS / VMS No</strong>, <strong>Designation</strong>, <strong>Hours/Week</strong>, and bottom subject mapping details (Semester / Section, Branch).
            </div>

            <div>
              <strong style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                🎯 Slot & Period Resolution
              </strong>
              Maps Day Orders (<strong>I</strong> through <strong>V</strong>), Periods (<strong>1</strong> through <strong>8</strong>), lab blocks, and lunch hours directly into the college database.
            </div>
          </div>
        )}
      </div>

      {/* Upload Box */}
      <div className="student-card premium-card" style={{ padding: "2rem" }}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: isDragging ? "2px dashed var(--sky-blue)" : "2px dashed var(--border-subtle)",
            backgroundColor: isDragging ? "rgba(56, 189, 248, 0.08)" : "var(--bg-input)",
            borderRadius: "12px",
            padding: "3rem 2rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem"
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
            accept=".pdf,application/pdf"
            style={{ display: "none" }}
          />

          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, var(--royal-blue) 0%, var(--sky-blue) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            boxShadow: "0 4px 14px rgba(29, 78, 216, 0.3)"
          }}>
            <FileText size={28} />
          </div>

          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", margin: "0 0 0.3rem 0", color: "var(--text-main)" }}>
              {file ? file.name : "Choose or drag & drop Timetable PDF"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for automated extraction`
                : "Vel Tech Multi Tech Individual Time Table PDF format"}
            </p>
          </div>
        </div>

        {/* Import Mode Options */}
        <div style={{
          marginTop: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid var(--border-subtle)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>
              Import Mode:
            </span>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "var(--text-muted)", cursor: "pointer" }}>
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
              />
              <span><strong>Replace / Update</strong> (Update schedules of uploaded faculty)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "var(--text-muted)", cursor: "pointer" }}>
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === "append"}
                onChange={() => setImportMode("append")}
              />
              <span><strong>Append</strong> (Add alongside existing records)</span>
            </label>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            {file && (
              <button
                type="button"
                onClick={handleReset}
                disabled={uploading}
                style={{
                  padding: "0.65rem 1.1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-main)",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={handleExtractAndImport}
              disabled={!file || uploading}
              style={{
                padding: "0.65rem 1.4rem",
                borderRadius: "8px",
                border: "none",
                background: !file || uploading
                  ? "var(--border-subtle)"
                  : "linear-gradient(135deg, var(--royal-blue) 0%, var(--sky-blue) 100%)",
                color: "white",
                fontSize: "0.85rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: !file || uploading ? "not-allowed" : "pointer",
                boxShadow: !file || uploading ? "none" : "0 4px 14px rgba(29, 78, 216, 0.3)"
              }}
            >
              {uploading ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  Extracting PDF with Algorithm...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Run Extraction & Import to Database
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div style={{
            marginTop: "1.5rem",
            padding: "1rem 1.25rem",
            borderRadius: "10px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem"
          }}>
            <AlertCircle size={18} />
            <div>
              <strong>Extraction Error:</strong> {errorMessage}
            </div>
          </div>
        )}

        {/* Success Results Card */}
        {uploadResult && uploadResult.success && (
          <div style={{
            marginTop: "1.5rem",
            padding: "1.5rem",
            borderRadius: "12px",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#10b981", marginBottom: "0.75rem" }}>
              <CheckCircle2 size={22} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>
                Extraction & Database Import Successful!
              </h3>
            </div>
            <p style={{ margin: "0 0 1.25rem 0", color: "var(--text-main)", fontSize: "0.9rem" }}>
              {uploadResult.message}
            </p>

            {/* Metrics */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem"
            }}>
              <div style={{ backgroundColor: "var(--bg-card)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Faculty Extracted</span>
                <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--sky-blue)", marginTop: "0.2rem" }}>
                  {uploadResult.facultyCount}
                </div>
              </div>

              <div style={{ backgroundColor: "var(--bg-card)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Slots Created</span>
                <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#10b981", marginTop: "0.2rem" }}>
                  {uploadResult.count}
                </div>
              </div>

              <div style={{ backgroundColor: "var(--bg-card)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Target Days</span>
                <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#a855f7", marginTop: "0.2rem" }}>
                  Day I - V
                </div>
              </div>
            </div>

            {/* Extracted Faculty Roster */}
            {uploadResult.faculties && uploadResult.faculties.length > 0 && (
              <div style={{ backgroundColor: "var(--bg-card)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div
                  onClick={() => setExpandedFaculties(!expandedFaculties)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                >
                  <strong style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                    👥 Processed Faculty Sheets ({uploadResult.faculties.length})
                  </strong>
                  <span style={{ color: "var(--sky-blue)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    {expandedFaculties ? "Collapse" : "View All"} {expandedFaculties ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </div>

                {expandedFaculties && (
                  <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.6rem" }}>
                    {uploadResult.faculties.map((f, idx) => (
                      <div key={idx} style={{
                        padding: "0.6rem 0.8rem",
                        backgroundColor: "var(--bg-input)",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div>
                          <strong>{f.name}</strong>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                            {f.vmsNo ? `MTS: ${f.vmsNo} • ` : ""}{f.designation}
                          </div>
                        </div>
                        <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", backgroundColor: "rgba(56, 189, 248, 0.15)", color: "var(--sky-blue)", fontWeight: "700", fontSize: "0.75rem" }}>
                          {f.slotCount} slots
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sample Extracted Slots Table */}
            {uploadResult.sampleSlots && uploadResult.sampleSlots.length > 0 && (
              <div style={{ marginTop: "1.25rem" }}>
                <strong style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.6rem", color: "var(--text-main)" }}>
                  📋 Sample Extracted Database Slots:
                </strong>
                <div className="responsive-table-wrapper" style={{ maxHeight: "220px", overflowY: "auto", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--bg-card-header)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Class</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Day Order</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Period</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Timing</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Subject</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Faculty</th>
                        <th style={{ padding: "0.5rem 0.6rem" }}>Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.sampleSlots.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.45rem 0.6rem", fontWeight: "700", color: "#a855f7" }}>{s.classId}</td>
                          <td style={{ padding: "0.45rem 0.6rem", fontWeight: "700" }}>Day {s.dayOrder}</td>
                          <td style={{ padding: "0.45rem 0.6rem" }}>P{s.period}</td>
                          <td style={{ padding: "0.45rem 0.6rem", color: "var(--text-muted)" }}>{s.timeRange}</td>
                          <td style={{ padding: "0.45rem 0.6rem", fontWeight: "600", color: "var(--sky-blue)" }}>{s.subjectName} ({s.subjectCode})</td>
                          <td style={{ padding: "0.45rem 0.6rem" }}>{s.facultyName}</td>
                          <td style={{ padding: "0.45rem 0.6rem" }}>{s.roomNo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
