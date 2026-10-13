import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/admin/subjects
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentFilter = searchParams.get("department");
    const semesterFilter = searchParams.get("semester");

    const whereClause: any = {};
    if (departmentFilter && departmentFilter !== "ALL") {
      whereClause.departmentCode = departmentFilter.toUpperCase().trim();
    }
    if (semesterFilter && semesterFilter !== "ALL") {
      const semNum = parseInt(semesterFilter);
      if (!isNaN(semNum)) whereClause.semester = semNum;
    }

    const subjects = await prisma.subject.findMany({
      where: whereClause,
      orderBy: [{ departmentCode: "asc" }, { semester: "asc" }, { code: "asc" }]
    });

    // Also fetch timetable mappings to know who takes/handles this and room allocations
    let timetableEntries: any[] = [];
    try {
      timetableEntries = await prisma.timetableEntry.findMany({
        select: {
          subjectCode: true,
          classId: true,
          facultyName: true,
          roomNo: true,
          dayOrder: true,
          period: true,
          timeRange: true
        }
      });
    } catch (e) {
      console.error(e);
    }

    const enhancedSubjects = subjects.map(sub => {
      const related = timetableEntries.filter(t => t.subjectCode.toUpperCase() === sub.code.toUpperCase());
      const classesTaking = Array.from(new Set(related.map(t => t.classId).filter(Boolean)));
      const facultiesHandling = Array.from(new Set(related.map(t => t.facultyName).filter(Boolean)));
      const rooms = Array.from(new Set(related.map(t => t.roomNo).filter(Boolean)));
      const weeklyHours = related.length;
      
      const scheduleSlots = related.map(r => ({
        dayOrder: r.dayOrder,
        period: r.period,
        classId: r.classId,
        facultyName: r.facultyName,
        roomNo: r.roomNo,
        timeRange: r.timeRange
      }));

      return {
        ...sub,
        classesTaking,
        facultiesHandling,
        rooms,
        weeklyHours,
        scheduleSlots
      };
    });

    return NextResponse.json({ success: true, subjects: enhancedSubjects });
  } catch (error: any) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/subjects
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, name, credits, semester, departmentCode } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: "Subject Code and Name are required" }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();
    const cleanName = name.trim();
    const numCredits = parseInt(credits) || 3;
    const numSem = parseInt(semester) || 1;
    const dept = (departmentCode || "CSE").toUpperCase().trim();

    // Ensure department exists
    const deptRecord = await prisma.department.findUnique({
      where: { code: dept }
    });
    if (!deptRecord) {
      // Create department if it doesn't exist
      await prisma.department.create({
        data: {
          code: dept,
          name: `${dept} Department`
        }
      });
    }

    // Check duplicate
    const existing = await prisma.subject.findUnique({
      where: { code: cleanCode }
    });

    if (existing) {
      return NextResponse.json({ success: false, error: `Subject code '${cleanCode}' already exists.` }, { status: 400 });
    }

    const newSubject = await prisma.subject.create({
      data: {
        code: cleanCode,
        name: cleanName,
        credits: numCredits,
        semester: numSem,
        departmentCode: dept
      }
    });

    return NextResponse.json({ 
      success: true, 
      subject: newSubject 
    });
  } catch (error: any) {
    console.error("Error creating subject:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/subjects (Update subject)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, code, name, credits, semester, departmentCode } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Subject ID is required" }, { status: 400 });
    }

    const cleanCode = code ? code.toUpperCase().trim() : undefined;
    const cleanName = name ? name.trim() : undefined;
    const numCredits = credits !== undefined ? parseInt(credits) : undefined;
    const numSem = semester !== undefined ? parseInt(semester) : undefined;
    const dept = departmentCode ? departmentCode.toUpperCase().trim() : undefined;

    if (dept) {
      const deptRecord = await prisma.department.findUnique({
        where: { code: dept }
      });
      if (!deptRecord) {
        await prisma.department.create({
          data: {
            code: dept,
            name: `${dept} Department`
          }
        });
      }
    }

    // Check if code is being updated to an existing code belonging to another subject
    if (cleanCode) {
      const existing = await prisma.subject.findFirst({
        where: {
          code: cleanCode,
          NOT: { id: id }
        }
      });
      if (existing) {
        return NextResponse.json({ success: false, error: `Subject code '${cleanCode}' is already used by another course.` }, { status: 400 });
      }
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(cleanCode ? { code: cleanCode } : {}),
        ...(cleanName ? { name: cleanName } : {}),
        ...(numCredits !== undefined ? { credits: numCredits } : {}),
        ...(numSem !== undefined ? { semester: numSem } : {}),
        ...(dept ? { departmentCode: dept } : {})
      }
    });

    return NextResponse.json({ success: true, subject: updated });
  } catch (error: any) {
    console.error("Error updating subject:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/subjects
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); 
    
    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    await prisma.subject.delete({
      where: { id: id }
    });
    
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("Error deleting subject:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
