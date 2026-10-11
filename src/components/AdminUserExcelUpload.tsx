"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  UploadCloud, 
  UserPlus, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Trash2,
  Users,
  ShieldCheck,
  GraduationCap,
  Briefcase
} from "lucide-react";

interface UserPreviewRow {
  name: string;
  email: string;
  role: "STUDENT" | "FACULTY" | "HOD" | "ADMIN";
  vmNo?: string;
  password?: string;
  department?: string;
  rollNumber?: string;
  year?: string;
  section?: string;
  semester?: number;
  batch?: string;
  designation?: string;
}

export default function AdminUserExcelUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<UserPreviewRow[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ 
    success: boolean; 
    created?: number; 
    updated?: number; 
    message?: string 
  } | null>(null);
  const [showFormatGuide, setShowFormatGuide] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample data template definition covering Students, Faculty, and HOD profiles
  const SAMPLE_ROWS = [
    {
      "Full Name": "Aarav Sharma",
      "Email Address": "aarav.cse@veltech.edu.in",
      "User Role": "STUDENT",
      "VM No": "17433",
      "Password": "Welcome@123",
      "Department": "CSE",
      "Roll Number": "23CS101",
      "Year": "II",
      "Section": "A",
      "Semester": 3,
      "Batch": "2023-2027",
      "Designation": ""
    },
    {
      "Full Name": "Sneha Patel",
      "Email Address": "sneha.cse@veltech.edu.in",
      "User Role": "STUDENT",
      "VM No": "17434",
      "Password": "Welcome@123",
      "Department": "CSE",
      "Roll Number": "23CS102",
      "Year": "II",
      "Section": "A",
      "Semester": 3,
      "Batch": "2023-2027",
      "Designation": ""
    },
    {
      "Full Name": "Dr. R. Saravanan",
      "Email Address": "saravanan.r@veltech.edu.in",
      "User Role": "HOD",
      "VM No": "1944",
      "Password": "Welcome@123",
      "Department": "CSE",
      "Roll Number": "",
      "Year": "",
      "Section": "",
      "Semester": "",
      "Batch": "",
      "Designation": "Head of Department"
    },
    {
      "Full Name": "Ms. V. Vijayashanthi",
      "Email Address": "vijayashanthi@veltech.edu.in",
      "User Role": "FACULTY",
      "VM No": "2045",
      "Password": "Welcome@123",
      "Department": "CSE",
      "Roll Number": "",
      "Year": "",
      "Section": "",
      "Semester": "",
      "Batch": "",
      "Designation": "Assistant Professor"
    }
  ];

  const handleDownloadTemplate = (format: "xlsx" | "csv") => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users_Template");
    if (format === "xlsx") {
      XLSX.writeFile(wb, "Bulk_User_Onboarding_Template.xlsx");
    } else {
      XLSX.writeFile(wb, "Bulk_User_Onboarding_Template.csv");
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

        const mapped: UserPreviewRow[] = json.map((r: any) => {
          const rawRole = (r["User Role"] || r["Role"] || r.role || "STUDENT").toString().trim().toUpperCase();
          let role: "STUDENT" | "FACULTY" | "HOD" | "ADMIN" = "STUDENT";
          if (rawRole.includes("HOD") || rawRole.includes("HEAD")) role = "HOD";
          else if (rawRole.includes("FACULTY") || rawRole.includes("TEACHER") || rawRole.includes("STAFF") || rawRole.includes("PROF")) role = "FACULTY";
          else if (rawRole.includes("ADMIN")) role = "ADMIN";

          return {
            name: (r["Full Name"] || r["Name"] || r.name || "").toString().trim(),
            email: (r["Email Address"] || r["Email"] || r["Email ID"] || r.email || "").toString().toLowerCase().trim(),
            role,
            vmNo: (r["VM No"] || r["VMNo"] || r.vmNo || r.vmno || "").toString().trim(),
            password: (r["Password"] || r.password || "Welcome@123").toString().trim(),
            department: (r["Department"] || r["Dept"] || r.department || r.dept || "CSE").toString().toUpperCase().trim(),
            rollNumber: (r["Roll Number"] || r["Roll No"] || r.rollNumber || r.rollNo || "").toString().trim(),
            year: (r["Year"] || r.year || "I").toString().trim(),
            section: (r["Section"] || r.section || "A").toString().trim(),
            semester: parseInt(r["Semester"] || r.semester || "1", 10) || 1,
            batch: (r["Batch"] || r.batch || "2023-2027").toString().trim(),
            designation: (r["Designation"] || r.designation || (role === "HOD" ? "Head of Department" : "Assistant Professor")).toString().trim(),
          };
        }).filter(r => r.name && r.email);

        if (mapped.length === 0) {
          setParsingError("No valid user records with Name and Email found in the sheet.");
          setParsedRows([]);
        } else {
          setParsedRows(mapped);
        }
      } catch (err: any) {
        console.error("User Excel parse error:", err);
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
      const res = await fetch("/api/admin/users/import-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: parsedRows,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUploadResult({
          success: true,
          created: data.createdCount,
          updated: data.updatedCount,
          message: `Successfully processed ${parsedRows.length} users! Created: ${data.createdCount}, Updated: ${data.updatedCount}`,
        });
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setUploadResult({
          success: false,
          message: data.error || "Failed to commit user profiles to database.",
        });
      }
    } catch (e: any) {
      setUploadResult({
        success: false,
        message: e.message || "Network error occurred while uploading users.",
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

  const studentCount = parsedRows.filter(r => r.role === "STUDENT").length;
  const facultyCount = parsedRows.filter(r => r.role === "FACULTY").length;
  const hodCount = parsedRows.filter(r => r.role === "HOD").length;
  const adminCount = parsedRows.filter(r => r.role === "ADMIN").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header Card */}
      <div className="student-card premium-card" style={{ padding: "1.75rem", borderLeft: "4px solid #22c55e" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span style={{ backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#22c55e", padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700" }}>
                BULK ONBOARDING & PROFILE CUSTOMIZER
              </span>
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "800", margin: 0, color: "var(--text-main)" }}>
              Upload User Data & Customized Profiles (.xlsx / .csv)
            </h2>
            <p style={{ margin: "0.4rem 0 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Batch creates user logins (encrypted passwords) and automatically configures role-tailored profiles for Students, Faculty, and HODs.
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
              <Download size={15} color="#22c55e" /> Download .xlsx Template
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
            <Info size={18} color="#22c55e" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0, color: "var(--text-main)" }}>
              File Format & Profile Arrangement Guide
            </h3>
          </div>
          <span style={{ fontSize: "0.85rem", color: "#22c55e", fontWeight: "600" }}>
            {showFormatGuide ? "Hide Column Details ▲" : "Show Column Details ▼"}
          </span>
        </div>

        {showFormatGuide && (
          <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Each row creates a User in the database and automatically populates their linked profile (StudentProfile, FacultyProfile, or HodProfile):
            </p>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-input)", borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>COLUMN HEADER</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>APPLIES TO</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>STATUS</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>SAMPLE VALUE</th>
                    <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>PROFILE FIELD POPULATED</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { col: "Full Name", target: "All Roles", req: "Required", sample: "Aarav Sharma", desc: "User.name" },
                    { col: "Email Address", target: "All Roles", req: "Required", sample: "aarav@veltech.edu.in", desc: "User.email (Primary Login Key)" },
                    { col: "User Role", target: "All Roles", req: "Required", sample: "STUDENT, FACULTY, HOD, ADMIN", desc: "User.role" },
                    { col: "VM No", target: "All Roles", req: "Recommended", sample: "17433, 1944", desc: "User.vmNo & Profile primary key" },
                    { col: "Password", target: "All Roles", req: "Optional", sample: "Welcome@123", desc: "Encrypted into User.password (default Welcome@123)" },
                    { col: "Department", target: "Student, Faculty, HOD", req: "Required", sample: "CSE, ECE, AIDS, MECH", desc: "Linked Department & Profile.department" },
                    { col: "Roll Number", target: "Student Profile", req: "Optional", sample: "23CS101", desc: "StudentProfile.rollNumber (defaults to VM No)" },
                    { col: "Year", target: "Student Profile", req: "Optional", sample: "I, II, III, IV", desc: "StudentProfile.year" },
                    { col: "Section", target: "Student Profile", req: "Optional", sample: "A, B, C", desc: "StudentProfile.section" },
                    { col: "Semester", target: "Student Profile", req: "Optional", sample: "1, 2, 3 ... 8", desc: "StudentProfile.semester" },
                    { col: "Batch", target: "Student Profile", req: "Optional", sample: "2023-2027", desc: "StudentProfile.batch" },
                    { col: "Designation", target: "Faculty & HOD", req: "Optional", sample: "Assistant Professor, HOD", desc: "FacultyProfile.designation / HodProfile" },
                  ].map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.6rem 0.75rem", fontWeight: "700", color: "var(--text-main)" }}><code>{item.col}</code></td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "var(--sky-blue)", fontWeight: "600" }}>{item.target}</td>
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
                      <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-main)", fontFamily: "monospace" }}>{item.sample}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>{item.desc}</td>
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
            backgroundColor: file ? "rgba(34, 197, 94, 0.04)" : "var(--bg-input)",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#22c55e"}
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
            <div style={{ width: "56px", height: "56px", borderRadius: "14px", backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserPlus size={28} />
            </div>

            <div>
              <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>
                {file ? file.name : "Click to select or drag & drop Users & Profile Excel file"}
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
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Total Users: </span>
                <strong style={{ color: "#22c55e", fontSize: "1rem" }}>{parsedRows.length}</strong>
              </div>

              {studentCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "6px", backgroundColor: "rgba(56, 189, 248, 0.1)", color: "var(--sky-blue)", fontWeight: "700" }}>
                  <GraduationCap size={14} /> Students: {studentCount}
                </div>
              )}

              {facultyCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "6px", backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22c55e", fontWeight: "700" }}>
                  <Briefcase size={14} /> Faculty: {facultyCount}
                </div>
              )}

              {hodCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "6px", backgroundColor: "rgba(168, 85, 247, 0.1)", color: "#a855f7", fontWeight: "700" }}>
                  <Users size={14} /> HODs: {hodCount}
                </div>
              )}

              {adminCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "6px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", fontWeight: "700" }}>
                  <ShieldCheck size={14} /> Admins: {adminCount}
                </div>
              )}
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
                  backgroundColor: "#22c55e",
                  color: "#fff",
                  fontSize: "0.9rem",
                  fontWeight: "700",
                  cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.7 : 1,
                  boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)"
                }}
              >
                {uploading ? (
                  <>
                    <RefreshCw size={16} className="loading-spinner" /> Creating Users in DB...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Save Users & Profiles ({parsedRows.length})
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
              Data Preview (Showing first 10 of {parsedRows.length} parsed users)
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Customized profile values to be written to DB
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-input)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>#</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>NAME</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>EMAIL</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>ROLE</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>VM NO</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>DEPT</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>PROFILE SPECIFICS</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 10).map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-muted)" }}>{i + 1}</td>
                    <td style={{ padding: "0.55rem 0.75rem", fontWeight: "700", color: "var(--text-main)" }}>{row.name}</td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "var(--sky-blue)" }}>{row.email}</td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>
                      <span style={{
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: "700",
                        backgroundColor: 
                          row.role === "STUDENT" ? "rgba(56, 189, 248, 0.15)" :
                          row.role === "FACULTY" ? "rgba(34, 197, 94, 0.15)" :
                          row.role === "HOD" ? "rgba(168, 85, 247, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color:
                          row.role === "STUDENT" ? "var(--sky-blue)" :
                          row.role === "FACULTY" ? "#22c55e" :
                          row.role === "HOD" ? "#a855f7" : "#ef4444"
                      }}>
                        {row.role}
                      </span>
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem", fontFamily: "monospace" }}>{row.vmNo || "—"}</td>
                    <td style={{ padding: "0.55rem 0.75rem", fontWeight: "700" }}>{row.department || "CSE"}</td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "var(--text-muted)" }}>
                      {row.role === "STUDENT" ? (
                        <span>Year: {row.year} • Sec: {row.section} • Roll: {row.rollNumber || row.vmNo || "N/A"} • Sem: {row.semester}</span>
                      ) : (
                        <span>Designation: {row.designation || "Staff"}</span>
                      )}
                    </td>
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
