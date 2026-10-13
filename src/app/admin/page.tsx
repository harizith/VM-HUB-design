"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Building2, BookOpen, Megaphone, Calendar, Sun, Moon, Globe, GraduationCap, Briefcase, UserCircle, Shield, Save, Edit, ArrowRight, Trash2, FileSpreadsheet, UserPlus, FileText, X } from "lucide-react";
import AdminAgentChat from "@/components/AdminAgentChat";
import AdminTimetablePdfUpload from "@/components/AdminTimetablePdfUpload";
import AdminTimetableExcelUpload from "@/components/AdminTimetableExcelUpload";
import AdminUserExcelUpload from "@/components/AdminUserExcelUpload";
import CourseCatalog from "@/components/CourseCatalog";
import OverallTimetable from "@/components/OverallTimetable";

interface UserItem {
  id: string;
  vmNo?: string | null;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
  studentProfile?: {
    rollNumber: string;
    department: string;
    semester: number;
    batch: string;
    year?: string;
    section?: string;
  } | null;
  facultyProfile?: {
    vmNo: string;
    department: string;
    designation: string;
  } | null;
}
interface DeptItem { id: string; code: string; name: string; hodName?: string; }
interface SubjectItem { id: string; code: string; name: string; credits: number; semester: number; departmentCode: string; classesTaking?: string[]; facultiesHandling?: string[]; }
interface NoticeItem { id: string; title: string; content: string; category: string; postedBy: string; createdAt: string; }
interface AuditLogItem {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
}
interface TimetableEntry {
  id?: string;
  classId?: string;
  dayOrder: string;
  period: number;
  timeRange: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  roomNo: string;
  vmsNo?: string | null;
}


export default function AdminPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeTab, setActiveTab] = useState<"users" | "depts" | "subjects" | "notices" | "timetable" | "audit" | "upload-timetable" | "upload-users">("users");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Role Subdivision Filter State
  const [userRoleSubdivision, setUserRoleSubdivision] = useState<"ALL" | "STUDENT" | "FACULTY" | "HOD" | "ADMIN">("ALL");

  // Selected User & Selected Subject for Side Drawers
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);

  // State loaded from DB
  const [users, setUsers] = useState<UserItem[]>([]);
  const [depts, setDepts] = useState<DeptItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Timetable State
  const [timetableMode, setTimetableMode] = useState<"faculty" | "class">("faculty");
  const [selectedDept, setSelectedDept] = useState("CSE");
  const [selectedYear, setSelectedYear] = useState("II");
  const [selectedSection, setSelectedSection] = useState("A");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [availableFaculty, setAvailableFaculty] = useState<{ name: string; vmsNo: string | null }[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  // Day Order Override State
  const [currentDayOrderIndex, setCurrentDayOrderIndex] = useState("0");
  const [updatingDayOrder, setUpdatingDayOrder] = useState(false);

  // Leave Management State
  const [todayStatus, setTodayStatus] = useState("REGULAR");
  const [tomorrowStatus, setTomorrowStatus] = useState("REGULAR");
  const [todayDateStr, setTodayDateStr] = useState("");
  const [tomorrowDateStr, setTomorrowDateStr] = useState("");
  const [updatingLeave, setUpdatingLeave] = useState(false);

  // Modals State
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  // User Timetable Modal State
  const [userTimetableModalUser, setUserTimetableModalUser] = useState<UserItem | null>(null);
  const [userTimetableMap, setUserTimetableMap] = useState<Record<string, TimetableEntry[]> | null>(null);
  const [loadingUserTimetable, setLoadingUserTimetable] = useState(false);
  const [userTimetableError, setUserTimetableError] = useState<string | null>(null);
  const [userTimetableClassId, setUserTimetableClassId] = useState<string>("");
  const [userTimetableFacultyName, setUserTimetableFacultyName] = useState<string>("");
  const [userTimetableRaw, setUserTimetableRaw] = useState<TimetableEntry[]>([]);
  const [modalSelectedClass, setModalSelectedClass] = useState<string>("");
  const [modalSelectedFaculty, setModalSelectedFaculty] = useState<string>("");

  // Helper to compute standard student class ID from profile
  const computeClassId = (profile?: UserItem["studentProfile"]): string => {
    if (!profile) return "II-CSE-A";
    let yr = profile.year;
    if (!yr && profile.semester) {
      if (profile.semester <= 2) yr = "I";
      else if (profile.semester <= 4) yr = "II";
      else if (profile.semester <= 6) yr = "III";
      else yr = "IV";
    }
    if (!yr) yr = "II";
    if (yr === "1") yr = "I";
    if (yr === "2") yr = "II";
    if (yr === "3") yr = "III";
    if (yr === "4") yr = "IV";

    let dept = (profile.department || "CSE").toUpperCase();
    if (dept.includes("COMPUTER SCIENCE") || dept.includes("CSE")) dept = "CSE";
    else if (dept.includes("INFORMATION") || dept.includes("IT")) dept = "IT";
    else if (dept.includes("ELECTRONICS") || dept.includes("ECE")) dept = "ECE";
    else if (dept.includes("MECHANICAL") || dept.includes("MECH")) dept = "MECH";
    else if (dept.includes("AI") || dept.includes("AIDS")) dept = "AIDS";
    else dept = dept.replace(/^B\.E\s+/i, "").replace(/[^A-Z]/g, "") || "CSE";

    const sec = (profile.section || "A").toUpperCase();
    return `${yr}-${dept}-${sec}`;
  };

  const transformToTimetableMap = (entries: TimetableEntry[]): Record<string, TimetableEntry[]> => {
    const map: Record<string, TimetableEntry[]> = {
      "I": [], "II": [], "III": [], "IV": [], "V": []
    };
    entries.forEach((e) => {
      const d = (e.dayOrder || "").toUpperCase().trim();
      if (map[d]) {
        map[d].push(e);
      }
    });
    Object.keys(map).forEach((d) => {
      map[d].sort((a, b) => a.period - b.period);
    });
    return map;
  };

  const openUserTimetable = async (u: UserItem) => {
    setUserTimetableModalUser(u);
    setLoadingUserTimetable(true);
    setUserTimetableError(null);
    setUserTimetableMap(null);
    setUserTimetableRaw([]);

    try {
      if (u.role === "STUDENT") {
        const classId = computeClassId(u.studentProfile);
        setUserTimetableClassId(classId);
        setModalSelectedClass(classId);
        setUserTimetableFacultyName("");

        const res = await fetch(`/api/admin/timetable?classId=${encodeURIComponent(classId)}`).then(r => r.json());
        if (res.success) {
          const list = res.timetable || [];
          setUserTimetableRaw(list);
          setUserTimetableMap(transformToTimetableMap(list));
          if (list.length === 0) {
            setUserTimetableError(`No schedule records found in master timetable for class ${classId}.`);
          }
        } else {
          setUserTimetableError(res.error || "Failed to load class timetable.");
        }
      } else if (u.role === "FACULTY" || u.role === "HOD") {
        const vmNo = u.facultyProfile?.vmNo || u.vmNo;
        let queryTarget = vmNo || u.name;

        // Check if there is a match in availableFaculty
        if (availableFaculty && availableFaculty.length > 0) {
          const vmMatch = vmNo ? availableFaculty.find(f => f.vmsNo && f.vmsNo.trim() === vmNo.trim()) : null;
          if (vmMatch) {
            queryTarget = vmMatch.name;
          } else {
            const cleanUName = u.name.replace(/^(Dr\.?|Mr\.?|Ms\.?|Mrs\.?|Prof\.?)\s+/i, '').toLowerCase().trim();
            const nameMatch = availableFaculty.find(f => {
              const cleanFName = f.name.replace(/^(Dr\.?|Mr\.?|Ms\.?|Mrs\.?|Prof\.?)\s+/i, '').toLowerCase().trim();
              return cleanFName.includes(cleanUName) || cleanUName.includes(cleanFName);
            });
            if (nameMatch) {
              queryTarget = nameMatch.name;
            }
          }
        }

        setUserTimetableFacultyName(queryTarget);
        setModalSelectedFaculty(queryTarget);
        setUserTimetableClassId("");

        const res = await fetch(`/api/admin/timetable?facultyName=${encodeURIComponent(queryTarget)}`).then(r => r.json());
        if (res.success && res.timetable && res.timetable.length > 0) {
          setUserTimetableRaw(res.timetable);
          setUserTimetableMap(transformToTimetableMap(res.timetable));
        } else {
          // If 0 entries found with name, try fallback with vmNo
          if (vmNo && queryTarget !== vmNo) {
            const fallbackRes = await fetch(`/api/admin/timetable?facultyName=${encodeURIComponent(vmNo)}`).then(r => r.json());
            if (fallbackRes.success && fallbackRes.timetable && fallbackRes.timetable.length > 0) {
              setUserTimetableRaw(fallbackRes.timetable);
              setUserTimetableMap(transformToTimetableMap(fallbackRes.timetable));
              setUserTimetableFacultyName(`${u.name} (VMS: ${vmNo})`);
              setLoadingUserTimetable(false);
              return;
            }
          }
          setUserTimetableRaw([]);
          setUserTimetableMap(transformToTimetableMap([]));
          setUserTimetableError(`No teaching schedule found for faculty "${queryTarget}".`);
        }
      } else {
        setUserTimetableError("ADMIN_ROLE");
      }
    } catch (err: any) {
      setUserTimetableError(err.message || "Network error loading user timetable.");
    } finally {
      setLoadingUserTimetable(false);
    }
  };

  const handleModalClassChange = async (newClassId: string) => {
    setModalSelectedClass(newClassId);
    setUserTimetableClassId(newClassId);
    setLoadingUserTimetable(true);
    setUserTimetableError(null);
    try {
      const res = await fetch(`/api/admin/timetable?classId=${encodeURIComponent(newClassId)}`).then(r => r.json());
      if (res.success) {
        const list = res.timetable || [];
        setUserTimetableRaw(list);
        setUserTimetableMap(transformToTimetableMap(list));
        if (list.length === 0) {
          setUserTimetableError(`No schedule records found for class ${newClassId}.`);
        }
      } else {
        setUserTimetableError(res.error || "Failed to load class timetable.");
      }
    } catch (err: any) {
      setUserTimetableError(err.message || "Failed to fetch class timetable.");
    } finally {
      setLoadingUserTimetable(false);
    }
  };

  const handleModalFacultyChange = async (newFacultyName: string) => {
    setModalSelectedFaculty(newFacultyName);
    setUserTimetableFacultyName(newFacultyName);
    setLoadingUserTimetable(true);
    setUserTimetableError(null);
    try {
      const res = await fetch(`/api/admin/timetable?facultyName=${encodeURIComponent(newFacultyName)}`).then(r => r.json());
      if (res.success) {
        const list = res.timetable || [];
        setUserTimetableRaw(list);
        setUserTimetableMap(transformToTimetableMap(list));
        if (list.length === 0) {
          setUserTimetableError(`No schedule records found for faculty "${newFacultyName}".`);
        }
      } else {
        setUserTimetableError(res.error || "Failed to load faculty schedule.");
      }
    } catch (err: any) {
      setUserTimetableError(err.message || "Failed to fetch faculty schedule.");
    } finally {
      setLoadingUserTimetable(false);
    }
  };

  const jumpToTimetableTab = (targetType: "class" | "faculty", value: string) => {
    setUserTimetableModalUser(null);
    setActiveTab("timetable");
    if (targetType === "class") {
      setTimetableMode("class");
      const parts = value.split("-");
      if (parts.length >= 3) {
        setSelectedYear(parts[0]);
        setSelectedDept(parts[1]);
        setSelectedSection(parts[2]);
      }
      setTimeout(() => {
        fetch(`/api/admin/timetable?classId=${encodeURIComponent(value)}`)
          .then(r => r.json())
          .then(res => {
            if (res.success && res.timetable) setTimetable(res.timetable);
          });
      }, 100);
    } else {
      setTimetableMode("faculty");
      setSelectedFaculty(value);
      setTimeout(() => {
        fetch(`/api/admin/timetable?facultyName=${encodeURIComponent(value)}`)
          .then(r => r.json())
          .then(res => {
            if (res.success && res.timetable) setTimetable(res.timetable);
          });
      }, 100);
    }
  };

  // User Form
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserRole, setNewUserRole] = useState("STUDENT");
  const [newUserVmNo, setNewUserVmNo] = useState("");
  const [newUserDept, setNewUserDept] = useState("CSE");
  const [newUserYear, setNewUserYear] = useState("I");
  const [newUserSection, setNewUserSection] = useState("A");
  const [newUserDesignation, setNewUserDesignation] = useState("Assistant Professor");

  // Dept Form
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptHod, setNewDeptHod] = useState("");

  // Subject Form
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubCredits, setNewSubCredits] = useState("3");
  const [newSubSem, setNewSubSem] = useState("5");
  const [newSubDept, setNewSubDept] = useState("CSE");

  // Notice Form
  const [newNoticeTitle, setNewNoticeTitle] = useState("");
  const [newNoticeContent, setNewNoticeContent] = useState("");
  const [newNoticeCategory, setNewNoticeCategory] = useState("GENERAL");

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, dRes, sRes, nRes, doRes, lRes, aRes] = await Promise.all([
        fetch("/api/admin/users").then((r) => r.json()),
        fetch("/api/admin/departments").then((r) => r.json()),
        fetch("/api/admin/subjects").then((r) => r.json()),
        fetch("/api/admin/notices").then((r) => r.json()),
        fetch("/api/admin/day-order").then((r) => r.json()),
        fetch("/api/admin/leaves").then((r) => r.json()),
        fetch("/api/admin/audit-logs").then((r) => r.json()),
      ]);

      if (uRes.success) setUsers(uRes.users);
      if (dRes.success) setDepts(dRes.departments);
      if (sRes.success) setSubjects(sRes.subjects);
      if (nRes.success) setNotices(nRes.notices);
      if (aRes.success && aRes.logs) setAuditLogs(aRes.logs);
      if (doRes.success && doRes.data) setCurrentDayOrderIndex(doRes.data.baseIndex.toString());
      if (lRes.success && lRes.data) {
        setTodayStatus(lRes.data.today);
        setTomorrowStatus(lRes.data.tomorrow);
        setTodayDateStr(lRes.data.todayDate);
        setTomorrowDateStr(lRes.data.tomorrowDate);
      }
      // Fetch timetable options (available classes & faculty)
      try {
        const ttOpt = await fetch("/api/admin/timetable?list=options").then((r) => r.json());
        if (ttOpt.success && ttOpt.options) {
          setAvailableFaculty(ttOpt.options.faculty || []);
          if (ttOpt.options.faculty?.length > 0 && !selectedFaculty) {
            setSelectedFaculty(ttOpt.options.faculty[0].name);
          }
        }
      } catch (e) {
        console.error("Error fetching timetable options:", e);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Filter users by active subdivision
  const filteredUsers = users.filter((u) => {
    if (userRoleSubdivision === "ALL") return true;
    return u.role === userRoleSubdivision;
  });

  // Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newUserEmail,
        name: newUserName,
        password: newUserPass,
        role: newUserRole,
        vmNo: newUserVmNo,
        department: newUserDept,
        year: newUserYear,
        section: newUserSection,
        designation: newUserDesignation,
      }),
    }).then((r) => r.json());

    if (res.success) {
      setShowUserModal(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPass("");
      setNewUserVmNo("");
      setNewUserDesignation("Assistant Professor");
      fetchData();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" }).then((r) => r.json());
    if (res.success) {
      if (selectedUser?.id === id) setSelectedUser(null);
      fetchData();
    } else alert("Error: " + res.error);
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newDeptCode, name: newDeptName, hodName: newDeptHod }),
    }).then((r) => r.json());

    if (res.success) { setShowDeptModal(false); setNewDeptCode(""); setNewDeptName(""); setNewDeptHod(""); fetchData(); }
    else alert("Error: " + res.error);
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm("Delete department?")) return;
    const res = await fetch(`/api/admin/departments?id=${id}`, { method: "DELETE" }).then((r) => r.json());
    if (res.success) fetchData(); else alert("Error: " + res.error);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newSubCode, name: newSubName, credits: newSubCredits, semester: newSubSem, departmentCode: newSubDept }),
    }).then((r) => r.json());

    if (res.success) { setShowSubjectModal(false); setNewSubCode(""); setNewSubName(""); fetchData(); }
    else alert("Error: " + res.error);
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Delete subject?")) return;
    const res = await fetch(`/api/admin/subjects?id=${id}`, { method: "DELETE" }).then((r) => r.json());
    if (res.success) fetchData(); else alert("Error: " + res.error);
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newNoticeTitle, content: newNoticeContent, category: newNoticeCategory }),
    }).then((r) => r.json());

    if (res.success) { setShowNoticeModal(false); setNewNoticeTitle(""); setNewNoticeContent(""); fetchData(); }
    else alert("Error: " + res.error);
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Delete notice?")) return;
    const res = await fetch(`/api/admin/notices?id=${id}`, { method: "DELETE" }).then((r) => r.json());
    if (res.success) fetchData(); else alert("Error: " + res.error);
  };

  const handleUpdateDayOrder = async () => {
    setUpdatingDayOrder(true);
    const res = await fetch("/api/admin/day-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: parseInt(currentDayOrderIndex, 10) })
    }).then(r => r.json());

    if (res.success) {
      alert("Day order updated successfully for today.");
      fetchData();
    } else {
      alert("Error updating day order: " + res.error);
    }
    setUpdatingDayOrder(false);
  };

  const handleUpdateLeave = async (target: 'today' | 'tomorrow', status: string) => {
    setUpdatingLeave(true);
    const res = await fetch("/api/admin/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, status })
    }).then(r => r.json());

    if (res.success) {
      fetchData();
    } else {
      alert("Error updating status: " + res.error);
    }
    setUpdatingLeave(false);
  };




  return (
    <div className="admin-layout">
      {/* MOBILE SIDEBAR OVERLAY */}
      <div className={`admin-sidebar-overlay ${isMobileSidebarOpen ? 'open' : ''}`} onClick={() => setIsMobileSidebarOpen(false)} />

      {/* LEFT SIDEBAR */}
      <aside className={`admin-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border-subtle)", marginBottom: "1.5rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, var(--royal-blue) 0%, var(--sky-blue) 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "1.1rem", color: "white", boxShadow: "0 4px 12px rgba(29, 78, 216, 0.3)" }}>
              VM
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0, fontFamily: "var(--font-serif, serif)" }}>VM-HUB</h2>
              <span style={{ fontSize: "0.75rem", color: "var(--sky-blue)", fontWeight: "600" }}>Admin Portal</span>
            </div>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {[
              { id: "users", label: "User Accounts", Icon: Users, count: users.length },
              { id: "depts", label: "Departments", Icon: Building2, count: depts.length },
              { id: "subjects", label: "Course Catalog", Icon: BookOpen, count: subjects.length },
              { id: "notices", label: "Announcements", Icon: Megaphone, count: notices.length },
              { id: "timetable", label: "Timetables", Icon: Calendar, count: 0 },
              { id: "upload-timetable", label: "Upload Timetable PDF", Icon: FileText, count: 0 },
              { id: "upload-users", label: "Bulk User Onboarding", Icon: UserPlus, count: 0 },
              { id: "audit", label: "Audit Trail", Icon: Shield, count: auditLogs.length },
            ].map((nav) => (
              <button key={nav.id} onClick={() => { setActiveTab(nav.id as any); setSelectedUser(null); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0.7rem 0.9rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem", backgroundColor: activeTab === nav.id ? "var(--royal-blue)" : "transparent", color: activeTab === nav.id ? "#ffffff" : "var(--text-muted)", transition: "all 0.2s ease" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><nav.Icon size={16} /> {nav.label}</span>
                <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: activeTab === nav.id ? "rgba(255,255,255,0.2)" : "var(--border-subtle)", color: activeTab === nav.id ? "#ffffff" : "var(--text-muted)" }}>{nav.count}</span>
              </button>
            ))}
          </nav>
        </div>

        <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* User Profile Sidebar Card */}
          <div
            onClick={() => {
              // Find or create current admin user profile to display in drawer
              const currentAdmin = users.find((u) => u.role === "ADMIN") || {
                id: "admin-self",
                email: "admin@veltech.edu.in",
                name: "Administrator ( You )",
                role: "ADMIN",
                status: "ACTIVE",
                createdAt: new Date().toISOString(),
              };
              setSelectedUser(currentAdmin);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.6rem 0.75rem",
              borderRadius: "10px",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
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
              background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              color: "white",
              fontSize: "0.95rem"
            }}>
              A
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: "700", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                Admin Profile
              </div>
              <div style={{ fontSize: "0.725rem", color: "var(--sky-blue)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                admin@veltech.edu.in
              </div>
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>➔</span>
          </div>

          <button onClick={toggleTheme} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", backgroundColor: "var(--bg-input)", color: "var(--text-main)", border: "1px solid var(--border-subtle)", padding: "0.6rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}>
            {theme === "dark" ? <><Sun size={16} /> Light Mode</> : <><Moon size={16} /> Dark Mode</>}
          </button>
          <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", color: "#ef4444", fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(239, 68, 68, 0.3)", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "0.6rem", borderRadius: "8px", fontWeight: "600" }}>
            Sign Out
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-main">
        <header className="admin-header-container">
          <div className="admin-header-top">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button className="hamburger-btn" onClick={() => setIsMobileSidebarOpen(true)}>
                ☰
              </button>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0, fontFamily: "var(--font-serif, serif)" }}>
                  {activeTab === "users" && "User Directory & Role Subdivisions"}
                  {activeTab === "depts" && "Academic Departments"}
                  {activeTab === "subjects" && "Course & Subject Catalog"}
                  {activeTab === "notices" && "System Announcements & Broadcasts"}
                  {activeTab === "timetable" && "Class Timetable Management"}
                  {activeTab === "upload-timetable" && "Excel Timetable Import"}
                  {activeTab === "upload-users" && "Bulk User Creation & Profile Setup"}
                  {activeTab === "audit" && "System Audit Trail & Security Logs"}
                </h1>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>Vel Tech Multi Tech Autonomous ERP System</p>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Loading database records...</div>
        ) : (
          <>
            {/* USERS TABLE WITH CLICKABLE ROWS */}
            {activeTab === "users" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>Registered Accounts</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Click any user row to open their full profile drawer</p>
                  </div>
                  <button onClick={() => setShowUserModal(true)} className="btn-royal">+ Add New User</button>
                </div>

                {/* ROLE SUBDIVISION PILLS */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", backgroundColor: "var(--bg-card)", padding: "0.5rem", borderRadius: "10px", border: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
                  {[
                    { id: "ALL", label: "All Accounts", Icon: Globe, count: users.length },
                    { id: "STUDENT", label: "Students", Icon: GraduationCap, count: users.filter((u) => u.role === "STUDENT").length },
                    { id: "FACULTY", label: "Teachers / Faculty", Icon: Briefcase, count: users.filter((u) => u.role === "FACULTY").length },
                    { id: "HOD", label: "HODs", Icon: UserCircle, count: users.filter((u) => u.role === "HOD").length },
                    { id: "ADMIN", label: "Administrators", Icon: Shield, count: users.filter((u) => u.role === "ADMIN").length },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => { setUserRoleSubdivision(sub.id as any); setSelectedUser(null); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        backgroundColor: userRoleSubdivision === sub.id ? "var(--sky-blue)" : "transparent",
                        color: userRoleSubdivision === sub.id ? "#0f172a" : "var(--text-muted)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><sub.Icon size={16} /> {sub.label}</span>
                      <span style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", borderRadius: "9999px", backgroundColor: userRoleSubdivision === sub.id ? "rgba(15, 23, 42, 0.15)" : "var(--border-subtle)" }}>
                        {sub.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="responsive-table-wrapper">
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem", minWidth: "600px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-card-header)", color: "var(--text-muted)" }}>
                        <th style={{ padding: "0.85rem 1rem" }}>User Name</th><th style={{ padding: "0.85rem 1rem" }}>Email Address</th><th style={{ padding: "0.85rem 1rem" }}>Subdivision Role</th><th style={{ padding: "0.85rem 1rem" }}>Status</th><th style={{ padding: "0.85rem 1rem" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No accounts found in this role subdivision.</td></tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            style={{
                              borderBottom: "1px solid var(--border-subtle)",
                              cursor: "pointer",
                              backgroundColor: selectedUser?.id === u.id ? "rgba(56, 189, 248, 0.08)" : "transparent",
                              transition: "background-color 0.2s ease"
                            }}
                          >
                            <td style={{ padding: "0.85rem 1rem", fontWeight: "600" }}>{u.name}</td>
                            <td style={{ padding: "0.85rem 1rem", color: "var(--sky-blue)", fontWeight: "500" }}>{u.email}</td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <span style={{ padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700", backgroundColor: u.role === "ADMIN" ? "rgba(239,68,68,0.15)" : u.role === "HOD" ? "rgba(245,158,11,0.15)" : u.role === "FACULTY" ? "rgba(16,185,129,0.15)" : "rgba(29,78,216,0.15)", color: u.role === "ADMIN" ? "#ef4444" : u.role === "HOD" ? "#d97706" : u.role === "FACULTY" ? "#059669" : "var(--royal-blue)" }}>
                                {u.role === "FACULTY" ? "TEACHER" : u.role}
                              </span>
                            </td>
                            <td style={{ padding: "0.85rem 1rem", color: "#10b981", fontWeight: "600" }}>● {u.status}</td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}
                                  style={{
                                    backgroundColor: "rgba(56, 189, 248, 0.15)",
                                    color: "var(--sky-blue)",
                                    border: "1px solid rgba(56, 189, 248, 0.3)",
                                    padding: "0.3rem 0.75rem",
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap"
                                  }}
                                >
                                  View Profile →
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openUserTimetable(u); }}
                                  title={`View timetable for ${u.name}`}
                                  style={{
                                    backgroundColor: "rgba(29, 78, 216, 0.15)",
                                    color: "var(--sky-blue)",
                                    border: "1px solid rgba(29, 78, 216, 0.4)",
                                    padding: "0.3rem 0.75rem",
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    whiteSpace: "nowrap",
                                    transition: "all 0.15s ease"
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "var(--royal-blue)";
                                    e.currentTarget.style.color = "#ffffff";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "rgba(29, 78, 216, 0.15)";
                                    e.currentTarget.style.color = "var(--sky-blue)";
                                  }}
                                >
                                  <Calendar size={13} /> Timetable
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DEPARTMENTS */}
            {activeTab === "depts" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <div><h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>Academic Departments</h3><p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Configured divisions and HODs</p></div>
                  <button onClick={() => setShowDeptModal(true)} className="btn-sky">+ Create Department</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                  {depts.map((d, idx) => (
                    <div key={d.id || d.code || `dept-${idx}`} style={{ backgroundColor: "var(--bg-card)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--sky-blue)", fontWeight: "800", letterSpacing: "0.05em" }}>{d.code}</div>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: "600", margin: "0.25rem 0 0.5rem 0" }}>{d.name}</h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>HOD: {d.hodName || "Not Assigned"}</p>
                      </div>
                      <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={() => handleDeleteDept(d.id)} style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}>Delete Department</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBJECTS & COURSE CATALOG */}
            {activeTab === "subjects" && (
              <CourseCatalog
                mode="admin"
                departments={depts}
                onCourseUpdated={fetchData}
              />
            )}

            {/* NOTICES */}
            {activeTab === "notices" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <div><h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>System Announcements</h3><p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Broadcast official notices across student & faculty views</p></div>
                  <button onClick={() => setShowNoticeModal(true)} className="btn-sky">+ Create Notice</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
                  {notices.map((n) => (
                    <div key={n.id} style={{ backgroundColor: "var(--bg-card)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: "700", backgroundColor: n.category === "URGENT" ? "rgba(239,68,68,0.2)" : n.category === "EXAM" ? "rgba(245,158,11,0.2)" : "rgba(59,130,246,0.2)", color: n.category === "URGENT" ? "#ef4444" : n.category === "EXAM" ? "#d97706" : "var(--royal-blue)" }}>{n.category}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>{n.title}</h3>
                        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: "1.5" }}>{n.content}</p>
                      </div>
                      <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={() => handleDeleteNotice(n.id)} style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}>Delete Notice</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TIMETABLE */}
            {activeTab === "timetable" && (
              <div>
                {/* Day Order Override Section */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", backgroundColor: "var(--bg-card)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>Set Today's Day Order</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                      Override the auto-calculated day order for today. This recalculates future day orders.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <select 
                      value={currentDayOrderIndex} 
                      onChange={(e) => setCurrentDayOrderIndex(e.target.value)} 
                      className="premium-input"
                    >
                      <option value="0">Day Order I</option>
                      <option value="1">Day Order II</option>
                      <option value="2">Day Order III</option>
                      <option value="3">Day Order IV</option>
                      <option value="4">Day Order V</option>
                    </select>
                    <button 
                      onClick={handleUpdateDayOrder} 
                      className="btn-sky"
                      disabled={updatingDayOrder}
                    >
                      {updatingDayOrder ? "Updating..." : "Update Day Order"}
                    </button>
                  </div>
                </div>

                {/* Leave and Working Day Management Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem", backgroundColor: "var(--bg-card)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>Leave & Working Day Management</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                      Mark today or tomorrow as a leave to pause the day order, or as a working day to force it to advance.
                    </p>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
                    {/* Today */}
                    <div style={{ padding: "1rem", border: "1px solid var(--border-subtle)", borderRadius: "8px", backgroundColor: "var(--bg-input)" }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Today ({todayDateStr})</div>
                      <select 
                        value={todayStatus} 
                        onChange={(e) => handleUpdateLeave('today', e.target.value)} 
                        className="premium-input"
                        disabled={updatingLeave}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px" }}
                      >
                        <option value="REGULAR">Regular (Auto)</option>
                        <option value="LEAVE">Leave / Holiday</option>
                        <option value="WORKING_DAY">Working Day (Make-up)</option>
                      </select>
                    </div>
                    {/* Tomorrow */}
                    <div style={{ padding: "1rem", border: "1px solid var(--border-subtle)", borderRadius: "8px", backgroundColor: "var(--bg-input)" }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Tomorrow ({tomorrowDateStr})</div>
                      <select 
                        value={tomorrowStatus} 
                        onChange={(e) => handleUpdateLeave('tomorrow', e.target.value)} 
                        className="premium-input"
                        disabled={updatingLeave}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px" }}
                      >
                        <option value="REGULAR">Regular (Auto)</option>
                        <option value="LEAVE">Leave / Holiday</option>
                        <option value="WORKING_DAY">Working Day (Make-up)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>Timetable Schedule Management</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                      View, verify, and modify weekly schedules by Faculty or by Student Class
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <div style={{ display: "flex", backgroundColor: "var(--bg-card-header)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                      <button
                        onClick={() => {
                          setTimetableMode("faculty");
                          setTimetable([]);
                          setIsEditingTimetable(false);
                        }}
                        style={{
                          padding: "0.4rem 0.85rem",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: timetableMode === "faculty" ? "var(--sky-blue)" : "transparent",
                          color: timetableMode === "faculty" ? "#000" : "var(--text-muted)",
                          transition: "all 0.2s"
                        }}
                      >
                        👥 By Faculty
                      </button>
                      <button
                        onClick={() => {
                          setTimetableMode("class");
                          setTimetable([]);
                          setIsEditingTimetable(false);
                        }}
                        style={{
                          padding: "0.4rem 0.85rem",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: timetableMode === "class" ? "var(--sky-blue)" : "transparent",
                          color: timetableMode === "class" ? "#000" : "var(--text-muted)",
                          transition: "all 0.2s"
                        }}
                      >
                        🏫 By Class
                      </button>
                    </div>

                    {timetable.length > 0 && timetableMode === "class" && (
                      <button onClick={async () => {
                        if (isEditingTimetable) {
                          setLoadingTimetable(true);
                          const classId = `${selectedYear}-${selectedDept}-${selectedSection}`;
                          const res = await fetch("/api/admin/timetable", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ classId, entries: timetable })
                          }).then(r => r.json());
                          if(res.success) { alert("Timetable updated!"); setIsEditingTimetable(false); }
                          else { alert("Failed to update: " + res.error); }
                          setLoadingTimetable(false);
                        } else {
                          setIsEditingTimetable(true);
                        }
                      }} className={isEditingTimetable ? "btn-royal" : "btn-sky"}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {isEditingTimetable ? <><Save size={16} /> Save Changes</> : <><Edit size={16} /> Edit Timetable</>}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", backgroundColor: "var(--bg-card)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-subtle)", flexWrap: "wrap", alignItems: "center" }}>
                  {timetableMode === "faculty" ? (
                    <>
                      <div style={{ flex: 2, minWidth: "240px" }}>
                        <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Select Faculty Member</label>
                        <select
                          value={selectedFaculty}
                          onChange={(e) => setSelectedFaculty(e.target.value)}
                          className="premium-input"
                          style={{ width: "100%" }}
                        >
                          {availableFaculty.length > 0 ? (
                            availableFaculty.map((f) => (
                              <option key={f.name} value={f.name}>
                                {f.name} {f.vmsNo ? `(MTS/VMS: ${f.vmsNo})` : ""}
                              </option>
                            ))
                          ) : (
                            <option value="">No faculty loaded</option>
                          )}
                        </select>
                      </div>

                      <button
                        onClick={async () => {
                          if (!selectedFaculty) return;
                          setLoadingTimetable(true);
                          setIsEditingTimetable(false);
                          try {
                            const res = await fetch(`/api/admin/timetable?facultyName=${encodeURIComponent(selectedFaculty)}`).then(r => r.json());
                            if (res.success) {
                              setTimetable(res.timetable);
                            } else {
                              alert("Error: " + res.error);
                            }
                          } catch (e: any) {
                            alert("Fetch failed: " + e.message);
                          } finally {
                            setLoadingTimetable(false);
                          }
                        }}
                        className="btn-royal"
                        style={{ minWidth: "150px", alignSelf: "flex-end", height: "42px" }}
                      >
                        Fetch Schedule
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1, minWidth: "140px" }}>
                        <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Department</label>
                        <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="premium-input" style={{ width: "100%" }}>
                          <option value="CSE">CSE</option>
                          <option value="IT">IT</option>
                          <option value="ECE">ECE</option>
                          <option value="MECH">MECH</option>
                        </select>
                      </div>

                      <div style={{ flex: 1, minWidth: "140px" }}>
                        <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Year</label>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="premium-input" style={{ width: "100%" }}>
                          <option value="I">Year I</option>
                          <option value="II">Year II</option>
                          <option value="III">Year III</option>
                          <option value="IV">Year IV</option>
                        </select>
                      </div>

                      <div style={{ flex: 1, minWidth: "120px" }}>
                        <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Section</label>
                        <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="premium-input" style={{ width: "100%" }}>
                          <option value="A">Section A</option>
                          <option value="B">Section B</option>
                          <option value="C">Section C</option>
                        </select>
                      </div>

                      <button onClick={async () => {
                        setLoadingTimetable(true);
                        setIsEditingTimetable(false);
                        const classId = `${selectedYear}-${selectedDept}-${selectedSection}`;
                        const res = await fetch(`/api/admin/timetable?classId=${encodeURIComponent(classId)}`).then(r => r.json());
                        if (res.success) {
                          setTimetable(res.timetable);
                        } else {
                          alert("Error: " + res.error);
                        }
                        setLoadingTimetable(false);
                      }} className="btn-royal" style={{ minWidth: "140px", alignSelf: "flex-end", height: "42px" }}>
                        Fetch Timetable
                      </button>

                      <button onClick={async () => {
                        const classId = `${selectedYear}-${selectedDept}-${selectedSection}`;
                        if (!confirm(`Are you sure you want to permanently delete the entire timetable for class ${classId}?`)) return;
                        setLoadingTimetable(true);
                        try {
                          const res = await fetch(`/api/admin/timetable?classId=${encodeURIComponent(classId)}`, { method: "DELETE" }).then(r => r.json());
                          if (res.success) {
                            setTimetable([]);
                            alert(`Successfully deleted timetable for ${classId} (${res.count} periods removed)`);
                          } else {
                            alert("Error deleting timetable: " + res.error);
                          }
                        } catch (e: any) {
                          alert("Failed to delete: " + e.message);
                        } finally {
                          setLoadingTimetable(false);
                        }
                      }} style={{
                        minWidth: "140px",
                        alignSelf: "flex-end",
                        height: "42px",
                        backgroundColor: "rgba(239, 68, 68, 0.12)",
                        color: "#ef4444",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        padding: "0.6rem 1rem",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem"
                      }}>
                        <Trash2 size={16} /> Delete Timetable
                      </button>
                    </>
                  )}
                </div>

                {loadingTimetable ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Loading timetable...</div>
                ) : timetable.length > 0 ? (
                  <div className="responsive-table-wrapper">
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem", minWidth: "900px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-card-header)", color: "var(--text-muted)" }}>
                          <th style={{ padding: "0.85rem", width: "80px" }}>Day</th>
                          {[1,2,3,4,5,6,7,8].map(p => <th key={p} style={{ padding: "0.85rem", minWidth: "120px" }}>Period {p}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {["I", "II", "III", "IV", "V"].map(day => (
                          <tr key={day} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <td style={{ padding: "0.85rem", fontWeight: "700", borderRight: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-card-header)" }}>Day {day}</td>
                            {[1,2,3,4,5,6,7,8].map(period => {
                              const matchingEntries = timetable.filter(t => t.dayOrder === day && t.period === period);
                              const primaryEntry = matchingEntries[0] || null;
                              return (
                                <td key={period} style={{ padding: "0.5rem", borderRight: "1px solid var(--border-subtle)", verticalAlign: "top" }}>
                                  {isEditingTimetable ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                      <input type="text" placeholder="Subject Name" value={primaryEntry?.subjectName || ""} onChange={(e) => {
                                        const newTt = [...timetable];
                                        const entryIdx = newTt.findIndex(t => t.dayOrder === day && t.period === period);
                                        if (entryIdx !== -1) newTt[entryIdx].subjectName = e.target.value;
                                        else newTt.push({ dayOrder: day, period, subjectName: e.target.value, subjectCode: "", facultyName: "", roomNo: "", timeRange: `Period ${period}` });
                                        setTimetable(newTt);
                                      }} style={{ width: "100%", padding: "0.25rem", fontSize: "0.8rem", borderRadius: "4px", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-input)", color: "var(--text-main)" }} />
                                      <input type="text" placeholder="Faculty" value={primaryEntry?.facultyName || ""} onChange={(e) => {
                                        const newTt = [...timetable];
                                        const entryIdx = newTt.findIndex(t => t.dayOrder === day && t.period === period);
                                        if (entryIdx !== -1) newTt[entryIdx].facultyName = e.target.value;
                                        setTimetable(newTt);
                                      }} style={{ width: "100%", padding: "0.25rem", fontSize: "0.8rem", borderRadius: "4px", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-input)", color: "var(--text-main)" }} />
                                      <input type="text" placeholder="Faculty VM No" value={primaryEntry?.vmsNo || ""} onChange={(e) => {
                                        const newTt = [...timetable];
                                        const entryIdx = newTt.findIndex(t => t.dayOrder === day && t.period === period);
                                        if (entryIdx !== -1) newTt[entryIdx].vmsNo = e.target.value;
                                        setTimetable(newTt);
                                      }} style={{ width: "100%", padding: "0.25rem", fontSize: "0.8rem", borderRadius: "4px", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-input)", color: "var(--text-main)" }} />
                                      <input type="text" placeholder="Room No" value={primaryEntry?.roomNo || ""} onChange={(e) => {
                                        const newTt = [...timetable];
                                        const entryIdx = newTt.findIndex(t => t.dayOrder === day && t.period === period);
                                        if (entryIdx !== -1) newTt[entryIdx].roomNo = e.target.value;
                                        setTimetable(newTt);
                                      }} style={{ width: "100%", padding: "0.25rem", fontSize: "0.8rem", borderRadius: "4px", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-input)", color: "var(--text-main)" }} />
                                    </div>
                                  ) : matchingEntries.length > 0 ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                                      {matchingEntries.map((entry, eIdx) => (
                                        <div key={eIdx} style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "0.15rem",
                                          padding: matchingEntries.length > 1 ? "0.3rem 0.4rem" : "0",
                                          backgroundColor: matchingEntries.length > 1 ? "rgba(56, 189, 248, 0.06)" : "transparent",
                                          borderRadius: "6px",
                                          borderLeft: matchingEntries.length > 1 ? "2px solid var(--sky-blue)" : "none"
                                        }}>
                                          <strong style={{ color: "var(--sky-blue)", lineHeight: "1.2", fontSize: "0.85rem" }}>
                                            {entry.subjectName || "-"}
                                          </strong>
                                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                            {timetableMode === "faculty" ? `Class: ${entry.classId || "-"}` : `Faculty: ${entry.facultyName || "-"}`}
                                          </span>
                                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", backgroundColor: "rgba(255,255,255,0.05)", padding: "0.1rem 0.3rem", borderRadius: "4px", alignSelf: "flex-start" }}>
                                            {entry.roomNo || "LH-101"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ color: "var(--text-muted)", opacity: 0.4, fontSize: "0.85rem", textAlign: "center", padding: "0.5rem 0" }}>-</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                    No timetable found for this class. Select criteria and click Fetch.
                  </div>
                )}
              </div>
            )}

            {/* AUDIT LOGS TAB */}
            {activeTab === "audit" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>System Audit Trail</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Real-time logs of administrative actions, user modifications, and security events</p>
                  </div>
                  <button onClick={fetchData} className="btn-sky" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                    🔄 Refresh Logs
                  </button>
                </div>

                {auditLogs.length > 0 ? (
                  <div className="responsive-table-wrapper">
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem", minWidth: "700px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                          <th style={{ padding: "0.75rem 1rem" }}>Timestamp</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Action</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Details & Scope</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Target User</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Actor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => {
                          const isCreate = log.action.includes("CREATE");
                          const isDelete = log.action.includes("DELETE");
                          const badgeBg = isCreate ? "rgba(16, 185, 129, 0.15)" : isDelete ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 189, 248, 0.15)";
                          const badgeColor = isCreate ? "#10b981" : isDelete ? "#ef4444" : "var(--sky-blue)";

                          return (
                            <tr
                              key={log.id}
                              style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background-color 0.2s ease" }}
                            >
                              <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                {new Date(log.createdAt).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit"
                                })}
                              </td>
                              <td style={{ padding: "0.85rem 1rem" }}>
                                <span style={{
                                  display: "inline-block",
                                  padding: "0.2rem 0.6rem",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  backgroundColor: badgeBg,
                                  color: badgeColor,
                                  letterSpacing: "0.03em"
                                }}>
                                  {log.action}
                                </span>
                              </td>
                              <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                                {log.details}
                              </td>
                              <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem" }}>
                                {log.user ? (
                                  <div>
                                    <strong style={{ color: "var(--sky-blue)", display: "block" }}>{log.user.name}</strong>
                                    <span style={{ color: "var(--text-muted)" }}>{log.user.email}</span>
                                  </div>
                                ) : (
                                  <span style={{ color: "var(--text-muted)" }}>-</span>
                                )}
                              </td>
                              <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)" }}>
                                {log.performedBy}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                    No audit records logged yet. System operations will automatically appear here.
                  </div>
                )}
              </div>
            )}

            {/* PDF TIMETABLE UPLOAD */}
            {activeTab === "upload-timetable" && (
              <AdminTimetablePdfUpload
                onUploadSuccess={() => {
                  fetch("/api/admin/audit-logs").then((r) => r.json()).then((res) => {
                    if (res.success) setAuditLogs(res.logs);
                  });
                  fetchData();
                }}
              />
            )}

            {/* BULK USER & PROFILE ONBOARDING */}
            {activeTab === "upload-users" && (
              <AdminUserExcelUpload
                onUploadSuccess={() => {
                  fetch("/api/admin/users").then((r) => r.json()).then((res) => {
                    if (res.success) setUsers(res.users);
                  });
                  fetch("/api/admin/audit-logs").then((r) => r.json()).then((res) => {
                    if (res.success) setAuditLogs(res.logs);
                  });
                }}
              />
            )}
          </>
        )}
      </main>

      {/* USER PROFILE SIDE DRAWER / SLIDE-OVER SIDEBAR */}
      {selectedUser && (
        <div className="admin-drawer-container" onClick={() => setSelectedUser(null)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="admin-drawer"
          >
            <div>
              {/* Drawer Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid var(--border-subtle)", marginBottom: "1.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "var(--sky-blue)", letterSpacing: "0.05em" }}>
                  ACCOUNT PROFILE DETAILS
                </span>
                <button onClick={() => setSelectedUser(null)} style={{ backgroundColor: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer" }}>
                  ✕
                </button>
              </div>

              {/* User Avatar & Name */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  background: selectedUser.role === "ADMIN"
                    ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                    : selectedUser.role === "HOD"
                    ? "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)"
                    : selectedUser.role === "FACULTY"
                    ? "linear-gradient(135deg, #10b981 0%, #047857 100%)"
                    : "linear-gradient(135deg, var(--royal-blue) 0%, var(--sky-blue) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "1.5rem",
                  fontWeight: "700"
                }}>
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>{selectedUser.name}</h3>
                  <span style={{
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    backgroundColor: selectedUser.role === "ADMIN" ? "rgba(239,68,68,0.15)" : selectedUser.role === "HOD" ? "rgba(245,158,11,0.15)" : selectedUser.role === "FACULTY" ? "rgba(16,185,129,0.15)" : "rgba(29,78,216,0.15)",
                    color: selectedUser.role === "ADMIN" ? "#ef4444" : selectedUser.role === "HOD" ? "#d97706" : selectedUser.role === "FACULTY" ? "#059669" : "var(--royal-blue)"
                  }}>
                    {selectedUser.role === "FACULTY" ? "TEACHER / FACULTY" : selectedUser.role}
                  </span>
                </div>
              </div>

              {/* Dynamic Usermode Role Profile Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "var(--bg-page)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border-subtle)", marginBottom: "1.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>VM NO (Institutional Number)</span>
                  <strong style={{ fontSize: "0.95rem", color: "var(--sky-blue)" }}>{selectedUser.vmNo || "N/A"}</strong>
                </div>

                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Email Address</span>
                  <strong style={{ fontSize: "0.95rem", color: "var(--sky-blue)" }}>{selectedUser.email}</strong>
                </div>

                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Account Status</span>
                  <strong style={{ fontSize: "0.95rem", color: "#10b981" }}>● {selectedUser.status}</strong>
                </div>

                {/* Role Specific Details fetched from Database */}
                {selectedUser.role === "STUDENT" && (
                  <>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Roll Number / Register ID</span>
                      <strong style={{ fontSize: "0.95rem" }}>{selectedUser.studentProfile?.rollNumber || "Not Set in DB"}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Department & Batch</span>
                      <strong style={{ fontSize: "0.95rem" }}>
                        {selectedUser.studentProfile ? `${selectedUser.studentProfile.department} • Semester ${selectedUser.studentProfile.semester} (${selectedUser.studentProfile.batch})` : "Not Set in DB"}
                      </strong>
                    </div>
                  </>
                )}

                {selectedUser.role === "FACULTY" && (
                  <>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Faculty Staff VM NO</span>
                      <strong style={{ fontSize: "0.95rem" }}>{selectedUser.facultyProfile?.vmNo || selectedUser.vmNo || "Not Set in DB"}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Designation & Dept</span>
                      <strong style={{ fontSize: "0.95rem" }}>
                        {selectedUser.facultyProfile ? `${selectedUser.facultyProfile.designation} • ${selectedUser.facultyProfile.department}` : "Not Set in DB"}
                      </strong>
                    </div>
                  </>
                )}

                {selectedUser.role === "HOD" && (
                  <>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Executive Office</span>
                      <strong style={{ fontSize: "0.95rem" }}>Head of Department (CSE)</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Department Jurisdiction</span>
                      <strong style={{ fontSize: "0.95rem" }}>Computer Science and Engineering Division</strong>
                    </div>
                  </>
                )}

                {selectedUser.role === "ADMIN" && (
                  <>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Permission Level</span>
                      <strong style={{ fontSize: "0.95rem", color: "#ef4444" }}>Super Administrator (Full System Controls)</strong>
                    </div>
                  </>
                )}

                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Account Created</span>
                  <strong style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{new Date(selectedUser.createdAt).toLocaleDateString()}</strong>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
              <button
                onClick={() => openUserTimetable(selectedUser)}
                style={{
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  color: "var(--sky-blue)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--royal-blue)";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(56, 189, 248, 0.15)";
                  e.currentTarget.style.color = "var(--sky-blue)";
                }}
              >
                <Calendar size={16} /> View {selectedUser.name}&apos;s Timetable
              </button>

              <button
                onClick={() => alert(`Password reset link generated for ${selectedUser.email}`)}
                style={{
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-subtle)",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                Reset User Password
              </button>

              <button
                onClick={() => handleDeleteUser(selectedUser.id)}
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                Delete Account
              </button>
            </div>
          </aside>
        </div>
      )}



      {/* MODALS */}
      {showUserModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Create New User Account</h3>
            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="text" placeholder="Full Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required className="premium-input" />
              <input type="email" placeholder="Email Address" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required className="premium-input" />
              <input type="password" placeholder="Password" value={newUserPass} onChange={(e) => setNewUserPass(e.target.value)} required className="premium-input" />
              <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="premium-input">
                <option value="STUDENT">STUDENT</option><option value="FACULTY">TEACHER / FACULTY</option><option value="HOD">HOD</option><option value="ADMIN">ADMIN</option>
              </select>
              {newUserRole !== "ADMIN" && (
                <input 
                  type="text" 
                  placeholder={newUserRole === "STUDENT" ? "VM No (e.g. 17433)" : "VMS No (e.g. EMP-CSE-001)"} 
                  value={newUserVmNo} 
                  onChange={(e) => setNewUserVmNo(e.target.value)} 
                  required 
                  className="premium-input" 
                />
              )}
              {newUserRole === "STUDENT" && (
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <select value={newUserDept} onChange={(e) => setNewUserDept(e.target.value)} className="premium-input" style={{ flex: 1 }}>
                    {depts.length > 0 ? (
                      depts.map((d) => (
                        <option key={d.code} value={d.code}>{d.code}</option>
                      ))
                    ) : (
                      <option value="CSE">CSE</option>
                    )}
                  </select>
                  <select value={newUserYear} onChange={(e) => setNewUserYear(e.target.value)} className="premium-input" style={{ flex: 1 }}>
                    <option value="I">Year I</option>
                    <option value="II">Year II</option>
                    <option value="III">Year III</option>
                    <option value="IV">Year IV</option>
                  </select>
                  <select value={newUserSection} onChange={(e) => setNewUserSection(e.target.value)} className="premium-input" style={{ flex: 1 }}>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
              )}

              {(newUserRole === "FACULTY" || newUserRole === "HOD") && (
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <select value={newUserDept} onChange={(e) => setNewUserDept(e.target.value)} className="premium-input" style={{ flex: 1 }}>
                    {depts.length > 0 ? (
                      depts.map((d) => (
                        <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
                      ))
                    ) : (
                      <option value="CSE">CSE</option>
                    )}
                  </select>
                  <input
                    type="text"
                    placeholder={newUserRole === "HOD" ? "Designation (e.g. Head of Department)" : "Designation (e.g. Assistant Professor)"}
                    value={newUserDesignation}
                    onChange={(e) => setNewUserDesignation(e.target.value)}
                    className="premium-input"
                    style={{ flex: 1 }}
                  />
                </div>
              )}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="submit" className="btn-royal" style={{ flex: 1 }}>Create User</button>
                <button type="button" onClick={() => setShowUserModal(false)} style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "var(--text-main)", padding: "0.75rem 1rem", borderRadius: "8px", border: "none" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeptModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Create New Department</h3>
            <form onSubmit={handleCreateDept} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="text" placeholder="Dept Code (e.g. AI-DS)" value={newDeptCode} onChange={(e) => setNewDeptCode(e.target.value)} required className="premium-input" />
              <input type="text" placeholder="Full Department Name" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} required className="premium-input" />
              <input type="text" placeholder="HOD Name (Optional)" value={newDeptHod} onChange={(e) => setNewDeptHod(e.target.value)} className="premium-input" />
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="submit" className="btn-sky" style={{ flex: 1 }}>Create Department</button>
                <button type="button" onClick={() => setShowDeptModal(false)} style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "var(--text-main)", padding: "0.75rem 1rem", borderRadius: "8px", border: "none" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}



      {showNoticeModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: "500px" }}>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Create System Announcement</h3>
            <form onSubmit={handleCreateNotice} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="text" placeholder="Notice Title" value={newNoticeTitle} onChange={(e) => setNewNoticeTitle(e.target.value)} required className="premium-input" />
              <textarea placeholder="Notice Body & Details" value={newNoticeContent} onChange={(e) => setNewNoticeContent(e.target.value)} required className="premium-input" style={{ height: "100px", resize: "none" }} />
              <select value={newNoticeCategory} onChange={(e) => setNewNoticeCategory(e.target.value)} className="premium-input">
                <option value="GENERAL">GENERAL</option>
                <option value="EXAM">EXAM</option>
                <option value="URGENT">URGENT</option>
              </select>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="submit" className="btn-sky" style={{ flex: 1 }}>Broadcast Notice</button>
                <button type="button" onClick={() => setShowNoticeModal(false)} style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "var(--text-main)", padding: "0.75rem 1rem", borderRadius: "8px", border: "none" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER TIMETABLE MODAL */}
      {userTimetableModalUser && (
        <div 
          className="admin-modal-overlay" 
          onClick={() => setUserTimetableModalUser(null)}
          style={{ zIndex: 1100 }}
        >
          <div 
            className="admin-modal" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: "1200px", 
              width: "95vw", 
              maxHeight: "92vh", 
              overflowY: "auto", 
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: userTimetableModalUser.role === "STUDENT" ? "rgba(29, 78, 216, 0.15)" : userTimetableModalUser.role === "ADMIN" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                  color: userTimetableModalUser.role === "STUDENT" ? "var(--royal-blue)" : userTimetableModalUser.role === "ADMIN" ? "#ef4444" : "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "800",
                  fontSize: "1.25rem"
                }}>
                  <Calendar size={24} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: "800", margin: 0, color: "var(--text-main)" }}>
                      {userTimetableModalUser.name}
                    </h2>
                    <span style={{ 
                      padding: "0.2rem 0.6rem", 
                      borderRadius: "4px", 
                      fontSize: "0.75rem", 
                      fontWeight: "700", 
                      backgroundColor: userTimetableModalUser.role === "ADMIN" ? "rgba(239,68,68,0.15)" : userTimetableModalUser.role === "HOD" ? "rgba(245,158,11,0.15)" : userTimetableModalUser.role === "FACULTY" ? "rgba(16,185,129,0.15)" : "rgba(29,78,216,0.15)", 
                      color: userTimetableModalUser.role === "ADMIN" ? "#ef4444" : userTimetableModalUser.role === "HOD" ? "#d97706" : userTimetableModalUser.role === "FACULTY" ? "#059669" : "var(--royal-blue)" 
                    }}>
                      {userTimetableModalUser.role === "FACULTY" ? "TEACHER" : userTimetableModalUser.role}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    {userTimetableModalUser.email}
                    {userTimetableModalUser.vmNo ? ` • VM: ${userTimetableModalUser.vmNo}` : ""}
                    {userTimetableModalUser.studentProfile?.rollNumber ? ` • Roll: ${userTimetableModalUser.studentProfile.rollNumber}` : ""}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                {userTimetableClassId && (
                  <button
                    onClick={() => jumpToTimetableTab("class", modalSelectedClass || userTimetableClassId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "8px",
                      backgroundColor: "rgba(56, 189, 248, 0.15)",
                      color: "var(--sky-blue)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    <ArrowRight size={14} /> Open in Timetable Manager
                  </button>
                )}
                {userTimetableFacultyName && (
                  <button
                    onClick={() => jumpToTimetableTab("faculty", modalSelectedFaculty || userTimetableFacultyName)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "8px",
                      backgroundColor: "rgba(56, 189, 248, 0.15)",
                      color: "var(--sky-blue)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    <ArrowRight size={14} /> Open in Timetable Manager
                  </button>
                )}
                <button
                  onClick={() => setUserTimetableModalUser(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "0.4rem",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  title="Close Timetable"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Class / Faculty switcher bar */}
            {userTimetableModalUser.role === "STUDENT" && (
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", backgroundColor: "var(--bg-card-header)", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-main)" }}>
                  Current Assigned Class: <strong style={{ color: "var(--sky-blue)" }}>{userTimetableClassId}</strong>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>View Other Class:</label>
                  <select 
                    value={modalSelectedClass} 
                    onChange={(e) => handleModalClassChange(e.target.value)}
                    className="premium-input"
                    style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", width: "auto" }}
                  >
                    {["II-CSE-A", "II-CSE-B", "II-CSE-C", "III-CSE-A", "III-CSE-B", "III-CSE-C", "IV-CSE-A", "IV-CSE-B", "IV-CSE-C"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {(userTimetableModalUser.role === "FACULTY" || userTimetableModalUser.role === "HOD") && (
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", backgroundColor: "var(--bg-card-header)", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-main)" }}>
                  Faculty Schedule: <strong style={{ color: "var(--sky-blue)" }}>{userTimetableFacultyName}</strong>
                </span>
                {availableFaculty.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Switch Faculty:</label>
                    <select
                      value={modalSelectedFaculty}
                      onChange={(e) => handleModalFacultyChange(e.target.value)}
                      className="premium-input"
                      style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", width: "auto" }}
                    >
                      {availableFaculty.map((f) => (
                        <option key={f.name} value={f.name}>{f.name} {f.vmsNo ? `(${f.vmsNo})` : ""}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Content / Loading / Error */}
            {loadingUserTimetable ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--sky-blue)", marginBottom: "0.5rem" }}>
                  Loading Timetable Schedule...
                </div>
                <p style={{ fontSize: "0.85rem", margin: 0 }}>Querying slots from college master timetable</p>
              </div>
            ) : userTimetableError === "ADMIN_ROLE" ? (
              <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", backgroundColor: "rgba(239, 68, 68, 0.05)", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                <Shield size={36} color="#ef4444" style={{ margin: "0 auto 1rem auto" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>
                  Administrator Account
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "450px", margin: "0 auto 1.5rem auto" }}>
                  Admin accounts do not have an individual class or faculty teaching schedule. You can view, verify, and modify all institution schedules directly in the Timetables tab.
                </p>
                <button
                  onClick={() => {
                    setUserTimetableModalUser(null);
                    setActiveTab("timetable");
                  }}
                  className="btn-royal"
                >
                  Go to Timetable Manager
                </button>
              </div>
            ) : userTimetableMap && userTimetableRaw.length > 0 ? (
              <div style={{ marginTop: "-1rem" }}>
                <OverallTimetable
                  fullTimetable={userTimetableMap}
                  currentDayOrder={["I", "II", "III", "IV", "V"][parseInt(currentDayOrderIndex, 10) || 0] || "I"}
                  title={`${userTimetableModalUser.name}'s Timetable`}
                  subtitle={userTimetableModalUser.role === "STUDENT" ? `Class: ${userTimetableClassId} • Total ${userTimetableRaw.length} Slots` : `Teaching Schedule: ${userTimetableFacultyName} • Total ${userTimetableRaw.length} Slots`}
                  mode={userTimetableModalUser.role === "STUDENT" ? "student" : "teacher"}
                  classId={userTimetableClassId}
                  facultyName={userTimetableFacultyName}
                  userDetails={{
                    name: userTimetableModalUser.name,
                    vmNo: userTimetableModalUser.vmNo || userTimetableModalUser.facultyProfile?.vmNo,
                    rollNumber: userTimetableModalUser.studentProfile?.rollNumber || userTimetableModalUser.vmNo,
                    department: userTimetableModalUser.studentProfile?.department || userTimetableModalUser.facultyProfile?.department,
                    designation: userTimetableModalUser.facultyProfile?.designation || (userTimetableModalUser.role === "STUDENT" ? "Student" : "Faculty"),
                    classId: userTimetableClassId,
                    semester: userTimetableModalUser.studentProfile?.semester,
                    section: userTimetableModalUser.studentProfile?.section,
                  }}
                />
              </div>
            ) : (
              <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", backgroundColor: "var(--bg-card-header)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                <Calendar size={36} color="var(--sky-blue)" style={{ margin: "0 auto 1rem auto" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>
                  No Timetable Slots Found
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "480px", margin: "0 auto 1.5rem auto" }}>
                  {userTimetableError || `No timetable slots were recorded in the database for ${userTimetableClassId || userTimetableFacultyName || userTimetableModalUser.name}.`}
                </p>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                  <button
                    onClick={() => {
                      setUserTimetableModalUser(null);
                      setActiveTab("upload-timetable");
                    }}
                    className="btn-sky"
                    style={{ fontSize: "0.85rem" }}
                  >
                    Upload Timetable PDF
                  </button>
                  <button
                    onClick={() => {
                      setUserTimetableModalUser(null);
                      setActiveTab("timetable");
                    }}
                    className="btn-royal"
                    style={{ fontSize: "0.85rem" }}
                  >
                    Manage Timetables
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <AdminAgentChat onTimetableUpdated={fetchData} />
    </div>
  );
}
