"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Trash2,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";

interface TimetablePreviewRow {
  classId: string;
  dayOrder: string;
  period: number;
  timeRange: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  vmsNo?: string;
  roomNo: string;
}

export default function AdminTimetableExcelUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<TimetablePreviewRow[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; count?: number; message?: string } | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("replace");
  const [showFormatGuide, setShowFormatGuide] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample data template definition
  const SAMPLE_ROWS = [
    {
      "Class ID": "II-CSE-A",
      "Day Order": "I",
      "Period": 1,
      "Subject Code": "CS3351",
      "Subject Name": "Digital Principles & System Design",
      "Faculty Name": "Dr. R. Saravanan",
      "VMS No": "1944",
      "Room No": "LH-201",
      "Time Range": "08:05 - 08:55"
    },
    {
      "Class ID": "II-CSE-A",
      "Day Order": "I",
      "Period": 2,
      "Subject Code": "CS3352",
      "Subject Name": "Foundations of Data Science",
      "Faculty Name": "Ms. V. Vijayashanthi",
      "VMS No": "17433",
      "Room No": "LH-201",
      "Time Range": "08:55 - 09:45"
    },
    {
      "Class ID": "II-CSE-A",
      "Day Order": "I",
      "Period": 3,
      "Subject Code": "CS3391",
      "Subject Name": "Object Oriented Programming",
      "Faculty Name": "Mr. N. Insozhan",
      "VMS No": "1069",
      "Room No": "LH-201",
      "Time Range": "10:00 - 10:50"
    },
    {
      "Class ID": "IV-CSE-B",
      "Day Order": "II",
      "Period": 1,
      "Subject Code": "CS3701",
      "Subject Name": "Cloud Computing & DevOps",
      "Faculty Name": "Dr. E. Mercy Beulah",
      "VMS No": "2103",
      "Room No": "N-203",
      "Time Range": "08:05 - 08:55"
    }
  ];

  const handleDownloadTemplate = (format: "xlsx" | "csv") => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timetable_Template");
    if (format === "xlsx") {
      XLSX.writeFile(wb, "Timetable_Import_Template.xlsx");
    } else {
      XLSX.writeFile(wb, "Timetable_Import_Template.csv");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (f: File) => {
    setFile(f);
    setParsingError(null);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!json || json.length === 0) {
          setParsingError("The selected file is empty or could not be parsed.");
          setParsedRows([]);
          return;
        }

        const mapped: TimetablePreviewRow[] = json.map((r: any) => ({
          classId: (r["Class ID"] || r["Class"] || r.classId || r.class_id || "").toString().trim(),
          dayOrder: (r["Day Order"] || r["Day"] || r.dayOrder || r.day_order || "I").toString().trim(),
          period: parseInt(r["Period"] || r.period || r.slot || "1", 10) || 1,
          timeRange: (r["Time Range"] || r.timeRange || r.time_range || r.time || "").toString().trim(),
          subjectCode: (r["Subject Code"] || r["SubjectCode"] || r.subjectCode || r.subject_code || "").toString().trim(),
          subjectName: (r["Subject Name"] || r["Subject"] || r.subjectName || r.subject_name || "").toString().trim(),
          facultyName: (r["Faculty Name"] || r["Faculty"] || r.facultyName || r.faculty_name || "").toString().trim(),
          vmsNo: (r["VMS No"] || r["VM No"] || r.vmsNo || r.vmNo || "").toString().trim(),
          roomNo: (r["Room No"] || r["Room"] || r.roomNo || r.room_no || "LH-101").toString().trim(),
        })).filter(r => r.classId && (r.subjectName || r.subjectCode));

        if (mapped.length === 0) {
          setParsingError("No valid rows matched the timetable format. Check column headers in the guide below.");
          setParsedRows([]);
        } else {
          setParsedRows(mapped);
        }
      } catch (err: any) {
        console.error("Excel parse error:", err);
        setParsingError(`Failed to read file: ${err.message}`);
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleUploadToDb = async () => {
    if (parsedRows.length === 0) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const res = await fetch("/api/admin/timetable/import-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: parsedRows,
          mode: importMode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUploadResult({
          success: true,
          count: data.count,
          message: `Successfully uploaded ${data.count} timetable slots to database!`,
        });
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setUploadResult({
          success: false,
          message: data.error || "Failed to commit entries to database.",
        });
      }
    } catch (e: any) {
      setUploadResult({
        success: false,
        message: e.message || "Network error occurred while uploading.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedRows([]);
    setParsingError(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const distinctClasses = Array.from(new Set(parsedRows.map(r => r.classId)));
  const distinctFaculty = Array.from(new Set(parsedRows.map(r => r.facultyName).filter(Boolean)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header Card */}
      <div className="student-card premium-card" style={{ padding: "1.75rem", borderLeft: "4px solid var(--royal-blue)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span style={{ backgroundColor: "rgba(56, 189, 248, 0.15)", color: "var(--sky-blue)", padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700" }}>
                EXCEL TIMETABLE IMPORT
              </span>
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "800", margin: 0, color: "var(--text-main)" }}>
              Upload Individual & Class Timetables (.xlsx / .csv)
            </h2>
            <p style={{ margin: "0.4rem 0 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Upload full semester schedules or individual faculty timetables. Supports multiple classes, Day Orders (I - V), and periods (1 - 8).
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => handleDownloadTemplate("xlsx")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.55rem 1rem",
                borderRadius: "8px",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-main)",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              <Download size={15} color="var(--sky-blue)" /> Download .xlsx Template
            </button>
            <button
              onClick={() => handleDownloadTemplate("csv")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.55rem 1rem",
                borderRadius: "8px",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-main)",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              <Download size={15} color="var(--royal-blue)" /> Download .csv Template
            </button>
          </div>
        </div>
      </div>

      {/* Format Arrangement Specification Card */}
      <div className="student-card premium-card" style={{ padding: "1.5rem" }}>
        <div 
          onClick={() => setShowFormatGuide(!showFormatGuide)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Info size={18} color="var(--sky-blue)" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0, color: "var(--text-main)" }}>
              File Format & Column Arrangement Guide
            </h3>
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--sky-blue)", fontWeight: "600" }}>
            {showFormatGuide ? "Hide Column Details ▲" : "Show Column Details ▼"}
          </span>
        </div>

        {showFormatGuide && (
          <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Ensure your Excel sheet has the following exact column names in the first row. The parser accepts both capitalized headers and standard camelCase names:
            </p>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-input)", borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>COLUMN HEADER</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>STATUS</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>DATA TYPE / FORMAT</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>SAMPLE VALUE</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>EXPLANATION</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { col: "Class ID", req: "Required", type: "Text", sample: "II-CSE-A, IV-CSE-B", note: "Target class identifier matching students/department" },
                    { col: "Day Order", req: "Required", type: "Roman or Number", sample: "I, II, III, IV, V (or 1-5)", note: "Academic rotation day order" },
                    { col: "Period", req: "Required", type: "Integer (1 to 8)", sample: "1, 2, 3 ... 8", note: "Period slot of the lecture" },
                    { col: "Subject Code", req: "Required", type: "Text", sample: "CS3351, 19CS501", note: "Official course code" },
                    { col: "Subject Name", req: "Required", type: "Text", sample: "Compiler Design", note: "Full name of the course" },
                    { col: "Faculty Name", req: "Recommended", type: "Text", sample: "Dr. R. Saravanan", note: "Lecturer / professor name" },
                    { col: "VMS No", req: "Optional", type: "Text", sample: "1944, 17433", note: "Faculty employee number (enables auto-sync to Teacher mode)" },
                    { col: "Room No", req: "Optional", type: "Text", sample: "LH-201, CS-LAB-1", note: "Lecture hall or lab room number (defaults to LH-101)" },
                    { col: "Time Range", req: "Optional", type: "Text", sample: "08:05 - 08:55", note: "Custom timing (auto-fills from college bell timing if blank)" },
                  ].map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.6rem 0.75rem", fontWeight: "700", color: "var(--text-main)" }}><code>{item.col}</code></td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <span style={{ 
                          padding: "0.15rem 0.45rem", 
                          borderRadius: "4px", 
                          fontSize: "0.7rem", 
                          fontWeight: "700",
                          backgroundColor: item.req === "Required" ? "rgba(239, 68, 68, 0.15)" : item.req === "Recommended" ? "rgba(245, 158, 11, 0.15)" : "rgba(100, 116, 139, 0.15)",
                          color: item.req === "Required" ? "#ef4444" : item.req === "Recommended" ? "#f59e0b" : "var(--text-muted)"
                        }}>
                          {item.req}
                        </span>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>{item.type}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "var(--sky-blue)", fontFamily: "monospace" }}>{item.sample}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Drag & Drop Upload Card */}
      <div className="student-card premium-card" style={{ padding: "1.75rem" }}>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed var(--border-subtle)",
            borderRadius: "12px",
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: file ? "rgba(29, 78, 216, 0.04)" : "var(--bg-input)",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--royal-blue)"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-subtle)"}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "14px", backgroundColor: "rgba(56, 189, 248, 0.1)", color: "var(--sky-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileSpreadsheet size={28} />
            </div>

            <div>
              <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>
                {file ? file.name : "Click to select or drag & drop Timetable Excel file"}
              </h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
              </p>
            </div>

            {file && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", padding: "0.3rem 0.75rem", borderRadius: "6px", backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22c55e", fontSize: "0.8rem", fontWeight: "700" }}>
                <CheckCircle2 size={14} /> File loaded ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
        </div>

        {parsingError && (
          <div style={{ marginTop: "1rem", padding: "0.85rem 1rem", borderRadius: "8px", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={16} /> {parsingError}
          </div>
        )}

        {uploadResult && (
          <div style={{ 
            marginTop: "1rem", 
            padding: "0.85rem 1rem", 
            borderRadius: "8px", 
            backgroundColor: uploadResult.success ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)", 
            border: `1px solid ${uploadResult.success ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`, 
            color: uploadResult.success ? "#22c55e" : "#ef4444", 
            fontSize: "0.85rem", 
            display: "flex", 
            alignItems: "center", 
            gap: "0.5rem" 
          }}>
            {uploadResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {uploadResult.message}
          </div>
        )}

        {/* Action Bar when rows are parsed */}
        {parsedRows.length > 0 && (
          <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Parsed Slots: </span>
                <strong style={{ color: "var(--sky-blue)", fontSize: "1rem" }}>{parsedRows.length}</strong>
              </div>
              <div style={{ fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Classes: </span>
                <strong style={{ color: "var(--text-main)" }}>{distinctClasses.length} ({distinctClasses.slice(0, 3).join(", ")}{distinctClasses.length > 3 ? "..." : ""})</strong>
              </div>
              <div style={{ fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Faculty Members: </span>
                <strong style={{ color: "var(--text-main)" }}>{distinctFaculty.length}</strong>
              </div>

              {/* Mode Toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "var(--bg-input)", padding: "0.3rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <button
                  onClick={() => setImportMode("replace")}
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: importMode === "replace" ? "var(--royal-blue)" : "transparent",
                    color: importMode === "replace" ? "#fff" : "var(--text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  Replace Target Classes
                </button>
                <button
                  onClick={() => setImportMode("append")}
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: importMode === "append" ? "var(--royal-blue)" : "transparent",
                    color: importMode === "append" ? "#fff" : "var(--text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  Append / Merge
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={handleClear}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "transparent",
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                <Trash2 size={15} /> Clear
              </button>

              <button
                onClick={handleUploadToDb}
                disabled={uploading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1.4rem",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "var(--royal-blue)",
                  color: "#fff",
                  fontSize: "0.9rem",
                  fontWeight: "700",
                  cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.7 : 1,
                  boxShadow: "0 4px 12px rgba(29, 78, 216, 0.3)"
                }}
              >
                {uploading ? (
                  <>
                    <RefreshCw size={16} className="loading-spinner" /> Uploading to DB...
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} /> Save to Database ({parsedRows.length} Slots)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Table Preview of Parsed Data */}
      {parsedRows.length > 0 && (
        <div className="student-card premium-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0, color: "var(--text-main)" }}>
              Data Preview (Showing first 10 of {parsedRows.length} parsed records)
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Review parsed columns before confirming database upload
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-input)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>#</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>CLASS</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>DAY</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>PERIOD</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>TIME RANGE</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>SUBJECT CODE</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>SUBJECT NAME</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>FACULTY</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>VMS NO</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>ROOM</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 10).map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-muted)" }}>{i + 1}</td>
                    <td style={{ padding: "0.55rem 0.75rem", fontWeight: "700", color: "var(--sky-blue)" }}>{row.classId}</td>
                    <td style={{ padding: "0.55rem 0.75rem", fontWeight: "700", color: "var(--text-main)" }}>Day {row.dayOrder}</td>
                    <td style={{ padding: "0.55rem 0.75rem", fontWeight: "700" }}>P{row.period}</td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-muted)" }}>{row.timeRange || "08:05 - 08:55"}</td>
                    <td style={{ padding: "0.55rem 0.75rem", fontFamily: "monospace" }}>{row.subjectCode}</td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-main)" }}>{row.subjectName}</td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-muted)" }}>{row.facultyName || "—"}</td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "var(--sky-blue)" }}>{row.vmsNo || "—"}</td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-muted)" }}>{row.roomNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
