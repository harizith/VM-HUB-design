import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_TIMINGS: Record<number, string> = {
  1: "08:05 - 08:55",
  2: "08:55 - 09:45",
  3: "10:00 - 10:50",
  4: "10:50 - 11:40",
  5: "12:20 - 01:05",
  6: "01:05 - 01:50",
  7: "02:00 - 02:45",
  8: "02:45 - 03:30",
};

function normalizeDayOrder(val: any): string {
  if (!val) return "I";
  const s = String(val).trim().toUpperCase();
  if (s === "1" || s === "I" || s.endsWith(" 1") || s.endsWith(" I")) return "I";
  if (s === "2" || s === "II" || s.endsWith(" 2") || s.endsWith(" II")) return "II";
  if (s === "3" || s === "III" || s.endsWith(" 3") || s.endsWith(" III")) return "III";
  if (s === "4" || s === "IV" || s.endsWith(" 4") || s.endsWith(" IV")) return "IV";
  if (s === "5" || s === "V" || s.endsWith(" 5") || s.endsWith(" V")) return "V";
  return ["I", "II", "III", "IV", "V"].includes(s) ? s : "I";
}

function normalizePeriod(val: any): number {
  if (typeof val === "number" && val >= 1 && val <= 8) return val;
  const str = String(val || "").replace(/\D/g, "");
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 8) return num;
  return 1;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entries, mode } = body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, error: "No timetable entries provided" },
        { status: 400 }
      );
    }

    const validEntries: any[] = [];
    const errors: string[] = [];

    entries.forEach((row: any, idx: number) => {
      const rowNum = idx + 2; // Accounting for 1-based index and header
      const classId = (row.classId || row.class_id || row.class || row["Class ID"] || row["Class"] || "").toString().trim();
      const rawDayOrder = row.dayOrder || row.day_order || row.day || row["Day Order"] || row["Day"] || "";
      const rawPeriod = row.period || row["Period"] || row.slot || row["Slot"] || 1;
      const subjectCode = (row.subjectCode || row.subject_code || row.code || row["Subject Code"] || row["SubjectCode"] || "").toString().trim();
      const subjectName = (row.subjectName || row.subject_name || row.subject || row["Subject Name"] || row["Subject"] || "").toString().trim();
      const facultyName = (row.facultyName || row.faculty_name || row.faculty || row["Faculty Name"] || row["Faculty"] || "").toString().trim();
      const roomNo = (row.roomNo || row.room_no || row.room || row["Room No"] || row["Room"] || "").toString().trim() || "LH-101";
      const vmsNo = (row.vmsNo || row.vms_no || row.vmNo || row.vmno || row["VMS No"] || row["VM No"] || "").toString().trim() || null;
      const rawTimeRange = (row.timeRange || row.time_range || row.time || row["Time Range"] || row["Time"] || "").toString().trim();

      if (!classId) {
        errors.push(`Row ${rowNum}: Missing Class ID`);
        return;
      }
      if (!subjectName && !subjectCode) {
        errors.push(`Row ${rowNum}: Missing Subject Name or Code`);
        return;
      }

      const dayOrder = normalizeDayOrder(rawDayOrder);
      const period = normalizePeriod(rawPeriod);
      const timeRange = rawTimeRange || DEFAULT_TIMINGS[period] || `Period ${period}`;

      validEntries.push({
        classId,
        dayOrder,
        period,
        timeRange,
        subjectCode: subjectCode || "SUB",
        subjectName: subjectName || subjectCode,
        facultyName: facultyName || "Staff",
        roomNo,
        vmsNo: vmsNo || null,
      });
    });

    if (validEntries.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid rows found in uploaded file", details: errors },
        { status: 400 }
      );
    }

    // If mode === "replace", delete entries matching the classes present in this upload
    if (mode === "replace") {
      const distinctClasses = Array.from(new Set(validEntries.map((e) => e.classId)));
      await prisma.timetableEntry.deleteMany({
        where: {
          classId: { in: distinctClasses },
        },
      });
    }

    // Insert all entries
    const result = await prisma.timetableEntry.createMany({
      data: validEntries,
    });

    // Create Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          action: "EXCEL_TIMETABLE_IMPORT",
          details: `Imported ${result.count} timetable entries via Excel. Classes: ${Array.from(new Set(validEntries.map((e) => e.classId))).join(", ")}`,
          performedBy: "Admin",
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      totalProcessed: entries.length,
      warningCount: errors.length,
      warnings: errors.slice(0, 5),
    });
  } catch (error: any) {
    console.error("Timetable Excel Import Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
