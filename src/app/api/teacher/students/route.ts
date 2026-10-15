import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDayOrderInfo, getDayOrderForDate } from "@/utils/dayOrder";

export const dynamic = "force-dynamic";

function computeStudentClassId(studentProfile: any): string {
  if (!studentProfile) return "";
  const semester = studentProfile.semester || 3; 
  let yearStr = "I";
  if (semester === 3 || semester === 4) yearStr = "II";
  if (semester === 5 || semester === 6) yearStr = "III";
  if (semester === 7 || semester === 8) yearStr = "IV";

  let rawDept = studentProfile.department || "CSE";
  let department = rawDept;
  let section = "A";

  const secMatch = rawDept.match(/\(Sec\s+([A-Z])\)/i);
  if (secMatch) {
    section = secMatch[1].toUpperCase();
    department = rawDept.replace(/\s*\(Sec\s+[A-Z]\)\s*/i, "").trim();
  }
  
  const normalizedDept = department.replace(/^(B\.E\s+|B\.Tech\s+)/i, "").trim();
  return `${yearStr}-${normalizedDept}-${section}`;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const email = session.user.email;

    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      const um = await prisma.userMode.findUnique({ where: { emailid: email } });
      if (um) {
        user = { name: um.emailid.split("@")[0] } as any;
      }
    }

    const searchStr = user?.name?.trim() || "";

    const { currentDayOrder } = await getDayOrderInfo();
    const todayString = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Parse query params for date filtering
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    let effectiveStartDate = todayString;
    let effectiveEndDate = todayString;

    if (dateParam) {
      effectiveStartDate = dateParam;
      effectiveEndDate = dateParam;
    } else if (startDateParam && endDateParam) {
      effectiveStartDate = startDateParam;
      effectiveEndDate = endDateParam;
    } else if (startDateParam) {
      effectiveStartDate = startDateParam;
      effectiveEndDate = startDateParam;
    }

    // Determine target day order for the selected date
    let targetDayOrder = currentDayOrder;
    if (effectiveStartDate === effectiveEndDate && effectiveStartDate !== todayString) {
      try {
        targetDayOrder = await getDayOrderForDate(new Date(effectiveStartDate + "T00:00:00"));
      } catch {
        targetDayOrder = currentDayOrder;
      }
    }

    // Fetch the teacher's full timetable (to know which classes/students they teach)
    const teacherTimetable = await prisma.timetableEntry.findMany({
      where: {
        facultyName: {
          contains: searchStr,
          mode: "insensitive"
        }
      }
    });

    // Classes for the target day order (if Leave or none, fallback to full timetable)
    let activeClasses = teacherTimetable.filter(t => t.dayOrder === targetDayOrder);
    if (activeClasses.length === 0) {
      activeClasses = teacherTimetable.filter(t => t.dayOrder === currentDayOrder);
    }
    if (activeClasses.length === 0 && teacherTimetable.length > 0) {
      activeClasses = teacherTimetable;
    }
    activeClasses.sort((a, b) => a.period - b.period);

    const teacherClasses = new Set(teacherTimetable.map(t => t.classId));

    // Fetch all users with role STUDENT
    const allStudents = await prisma.user.findMany({
      where: {
        role: "STUDENT"
      },
      include: {
        studentProfile: true
      },
      orderBy: {
        name: "asc"
      }
    });

    // Filter students to only include those in the teacher's classes
    const students = allStudents
      .map(student => ({
         ...student,
         computedClassId: computeStudentClassId(student.studentProfile)
      }))
      .filter(student => teacherClasses.has(student.computedClassId));

    // Query attendance records for the specified date range
    const attendanceFilter: any = {};
    if (effectiveStartDate === effectiveEndDate) {
      attendanceFilter.dateString = effectiveStartDate;
    } else {
      attendanceFilter.dateString = {
        gte: effectiveStartDate,
        lte: effectiveEndDate
      };
    }

    if (teacherClasses.size > 0) {
      attendanceFilter.classId = { in: Array.from(teacherClasses) };
    }

    const attendance = await prisma.attendance.findMany({
      where: attendanceFilter,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      success: true,
      data: {
        students,
        todayClasses: activeClasses,
        allTeacherClasses: teacherTimetable,
        attendance,
        dateString: effectiveStartDate,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        targetDayOrder,
        todayDateString: todayString
      }
    });

  } catch (error: any) {
    console.error("Teacher Students API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
