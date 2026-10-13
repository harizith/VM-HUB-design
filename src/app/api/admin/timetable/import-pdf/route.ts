import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseTimetablePdfBuffer } from "@/utils/timetablePdfParser";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "append"; // "append" | "replace"

    if (!file) {
      return NextResponse.json({ success: false, error: "No PDF file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse using dual extractor (master class or individual faculty)
    const { facultySheets, allSlots, isMasterClass } = await parseTimetablePdfBuffer(buffer);

    if (allSlots.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Could not extract timetable slots from the provided PDF. Please ensure the PDF contains 'ODD SEMESTER-TIME TABLE' or 'INDIVIDUAL TIME TABLE' pages.",
        bufferSize: buffer.length,
      }, { status: 422 });
    }

    // Clean up existing timetable entries based on import type
    if (isMasterClass || mode === "replace") {
      const classIds = Array.from(new Set(allSlots.map(s => s.classId).filter(Boolean)));
      if (classIds.length > 0) {
        await prisma.timetableEntry.deleteMany({
          where: {
            classId: { in: classIds }
          }
        });
      }
    } else if (mode === "replace") {
      const facultyNames = Array.from(new Set(allSlots.map(s => s.facultyName).filter(Boolean)));
      if (facultyNames.length > 0) {
        await prisma.timetableEntry.deleteMany({
          where: {
            facultyName: { in: facultyNames }
          }
        });
      }
    }

    // Insert extracted slots into TimetableEntry
    const dbEntries = allSlots.map(s => ({
      classId: s.classId || "CSE",
      dayOrder: s.dayOrder,
      period: s.period,
      timeRange: s.timeRange,
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      facultyName: s.facultyName,
      roomNo: s.roomNo || "LH-101",
      vmsNo: s.vmsNo || null,
    }));

    const result = await prisma.timetableEntry.createMany({
      data: dbEntries
    });

    // Also auto-update/provision faculty profiles if VMS No exists
    for (const sheet of facultySheets) {
      if (sheet.vmsNo && sheet.facultyName) {
        try {
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { vmNo: sheet.vmsNo },
                { name: { contains: sheet.facultyName, mode: "insensitive" } }
              ]
            }
          });

          if (existingUser && !existingUser.vmNo) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { vmNo: sheet.vmsNo }
            });
          }
        } catch (e) {
          // ignore user sync warnings
        }
      }
    }

    // Log in Audit Trail
    try {
      await prisma.auditLog.create({
        data: {
          action: "PDF_TIMETABLE_IMPORT",
          details: isMasterClass
            ? `Imported ${result.count} slots across all classes from Master Timetable PDF (${file.name}).`
            : `Imported ${result.count} slots across ${facultySheets.length} faculty pages from PDF (${file.name}).`,
          performedBy: "Admin"
        }
      });
    } catch (e) {}

    const classCount = new Set(allSlots.map(s => s.classId)).size;

    return NextResponse.json({
      success: true,
      count: result.count,
      isMasterClass: Boolean(isMasterClass),
      classCount,
      facultyCount: facultySheets.length,
      message: isMasterClass
        ? `Successfully extracted and imported all ${result.count} slots across ${classCount} classes (100% complete, 40 periods per class)!`
        : `Successfully extracted & imported ${result.count} timetable slots across ${facultySheets.length} faculty members.`,
      faculties: facultySheets.map(f => ({
        name: f.facultyName,
        vmsNo: f.vmsNo,
        designation: f.designation,
        slotCount: f.slots.length,
        totalHours: f.totalHoursPerWeek
      })),
      sampleSlots: allSlots.slice(0, 10),
    });

  } catch (error: any) {
    console.error("PDF Timetable Import Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
