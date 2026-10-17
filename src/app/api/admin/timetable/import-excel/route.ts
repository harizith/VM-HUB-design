import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function normalizeDayOrder(value: unknown): string | null {
  const text = String(value ?? "").trim().toUpperCase().replace(/^DAY\s+/, "");
  if (!text) return null;
  const roman: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V" };
  const normalized = roman[text] || text;
  return ["I", "II", "III", "IV", "V"].includes(normalized) ? normalized : null;
}

function normalizePeriod(value: unknown): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const match = text.match(/\d+/);
  if (!match) return null;
  const period = Number.parseInt(match[0], 10);
  return period >= 1 && period <= 8 ? period : null;
}

function cell(row: Record<string, unknown>, ...names: string[]) {
  const aliases = new Set(names.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, "")));
  const key = Object.keys(row).find((name) => aliases.has(name.toLowerCase().replace(/[^a-z0-9]/g, "")));
  return key === undefined ? "" : String(row[key] ?? "").trim();
}

function optionalText(value: string) {
  return value || null;
}

export async function POST(req: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return NextResponse.json({ success: false, error: authorization.error }, { status: authorization.status });
  }

  try {
    const { entries, mode } = await req.json();
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ success: false, error: "No timetable entries provided" }, { status: 400 });
    }

    const validEntries: any[] = [];
    const warnings: string[] = [];

    entries.forEach((raw: Record<string, unknown>, index: number) => {
      const rowNum = index + 2;
      const classId = cell(raw, "classId", "class_id", "class", "Class ID");
      const rawDayOrder = cell(raw, "dayOrder", "day_order", "day", "Day Order");
      const rawPeriod = cell(raw, "period", "slot", "Period");
      const subjectCode = cell(raw, "subjectCode", "subject_code", "code", "Subject Code");
      const subjectName = cell(raw, "subjectName", "subject_name", "subject", "Subject Name");
      const facultyName = cell(raw, "facultyName", "faculty_name", "faculty", "teacher", "Faculty Name");
      const roomNo = cell(raw, "roomNo", "room_no", "room", "Room No");
      const vmsNo = cell(raw, "vmsNo", "vms_no", "vmNo", "vmno", "VMS No", "VM No");
      const rawTimeRange = cell(raw, "timeRange", "time_range", "time", "Time Range");
      const category = cell(raw, "category", "slotCategory", "subjectCategory", "Subject Category");

      const hasValue = [classId, rawDayOrder, rawPeriod, subjectCode, subjectName, facultyName, roomNo, vmsNo, rawTimeRange, category]
        .some((value) => value !== "");
      if (!hasValue) {
        warnings.push(`Row ${rowNum}: ignored because it contains no timetable data`);
        return;
      }

      const dayOrder = normalizeDayOrder(rawDayOrder);
      if (rawDayOrder && !dayOrder) warnings.push(`Row ${rowNum}: unrecognized day order stored as entered`);
      const period = normalizePeriod(rawPeriod);
      if (rawPeriod && period === null) warnings.push(`Row ${rowNum}: invalid period kept unset`);

      validEntries.push({
        classId: optionalText(classId),
        dayOrder: dayOrder || optionalText(rawDayOrder),
        period,
        timeRange: optionalText(rawTimeRange),
        subjectCode: optionalText(subjectCode),
        subjectName: optionalText(subjectName),
        facultyName: optionalText(facultyName),
        roomNo: optionalText(roomNo),
        vmsNo: optionalText(vmsNo),
        category: optionalText(category.toLowerCase()),
      });
    });

    if (validEntries.length === 0) {
      return NextResponse.json(
        { success: false, error: "The file has no non-empty timetable rows", warnings },
        { status: 400 }
      );
    }

    if (mode === "replace") {
      const classIds = [...new Set(validEntries.map((entry) => entry.classId).filter(Boolean))];
      const facultyNames = [...new Set(validEntries.map((entry) => entry.facultyName).filter(Boolean))];
      const vmsNumbers = [...new Set(validEntries.map((entry) => entry.vmsNo).filter(Boolean))];
      const targets: any[] = [];
      if (classIds.length) targets.push({ classId: { in: classIds } });
      if (facultyNames.length) targets.push({ facultyName: { in: facultyNames } });
      if (vmsNumbers.length) targets.push({ vmsNo: { in: vmsNumbers } });
      if (targets.length) await prisma.timetableEntry.deleteMany({ where: { OR: targets } });
    }

    const result = await prisma.timetableEntry.createMany({ data: validEntries });

    try {
      await prisma.auditLog.create({
        data: {
          action: "EXCEL_TIMETABLE_IMPORT",
          details: `Imported ${result.count} timetable rows via Excel.`,
          performedBy: authorization.email,
        },
      });
    } catch (error) {
      console.warn("Audit log creation skipped:", error);
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      totalProcessed: entries.length,
      warningCount: warnings.length,
      warnings: warnings.slice(0, 10),
    });
  } catch (error: any) {
    console.error("Timetable Excel Import Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
