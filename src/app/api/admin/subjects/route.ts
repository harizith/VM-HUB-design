import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/admin/subjects
export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { code: "asc" }
    });

    // Also fetch timetable mappings to know who takes/handles this
    let timetableEntries: any[] = [];
    try {
      timetableEntries = await prisma.timetableEntry.findMany({
        select: { subjectCode: true, classId: true, facultyName: true }
      });
    } catch (e) {
      console.error(e);
    }

    const enhancedSubjects = subjects.map(sub => {
      const related = timetableEntries.filter(t => t.subjectCode === sub.code);
      const classesTaking = Array.from(new Set(related.map(t => t.classId).filter(Boolean)));
      const facultiesHandling = Array.from(new Set(related.map(t => t.facultyName).filter(Boolean)));
      
      return {
        ...sub,
        classesTaking,
        facultiesHandling
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
