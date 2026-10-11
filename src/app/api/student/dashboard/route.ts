import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDayOrderInfo } from "@/utils/dayOrder";


export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const email = session.user.email;

    // 1. Fetch the logged in user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { studentProfile: true }
    });

    if (!user || !user.studentProfile) {
      return NextResponse.json({ 
        success: false, 
        error: "No student profile found in the database. Please create one in the Admin mode." 
      }, { status: 404 });
    }

    const semester = user.studentProfile.semester || 3; 
    let yearStr = (user.studentProfile as any).year || "I";
    let section = (user.studentProfile as any).section || "A";
    let rawDept = user.studentProfile.department || "CSE";
    let department = rawDept;

    const secMatch = rawDept.match(/\(Sec\s+([A-Z])\)/i);
    if (secMatch) {
      if (!(user.studentProfile as any).section) {
        section = secMatch[1].toUpperCase();
      }
      department = rawDept.replace(/\s*\(Sec\s+[A-Z]\)\s*/i, "").trim();
    }
    
    // Strip "B.E " or "B.Tech " from department string for matching the timetable classId
    const normalizedDept = department.replace(/^(B\.E\s+|B\.Tech\s+)/i, "").trim();
    const classId = `${yearStr}-${normalizedDept}-${section}`; // e.g. "II-CSE-C"
    
    // Ensure the department string has "B.E " for the UI display
    if (!department.startsWith("B.E") && !department.startsWith("B.Tech")) {
      department = "B.E " + department;
    }

    // 3. Compute Day Order dynamically
    const { currentDayOrder, tomorrowDayOrder } = await getDayOrderInfo();

    // 4. Fetch the timetable for the student's class and current day order
    let timetable: any[] = [];
    let fullTimetable: Record<string, any[]> = { "I": [], "II": [], "III": [], "IV": [], "V": [] };
    try {
      const allEntries = await prisma.timetableEntry.findMany({
        where: {
          classId
        },
        orderBy: [
          { dayOrder: 'asc' },
          { period: 'asc' }
        ]
      });

      allEntries.forEach((entry: any) => {
        if (fullTimetable[entry.dayOrder]) {
          fullTimetable[entry.dayOrder].push(entry);
        }
        if (entry.dayOrder === currentDayOrder) {
          timetable.push(entry);
        }
      });
      // Sort today's timetable by period
      timetable.sort((a, b) => a.period - b.period);
    } catch (e) {
      console.error("Could not fetch timetable entries via prisma client", e);
    }

    let notices: any[] = [];
    try {
      notices = await prisma.notice.findMany({
        where: {
          OR: [
            { audience: 'ALL' },
            { audience: 'STUDENT' }
          ]
        } as any,
        orderBy: { createdAt: 'desc' },
        take: 3
      });
    } catch (e) {
      console.error("Could not fetch notices", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        student: {
          name: user.name,
          vmNo: user.vmNo || user.studentProfile.rollNumber,
          department: department,
          semester: semester,
          section: section,
          classId: classId
        },
        currentDayOrder,
        tomorrowDayOrder,
        timetable,
        fullTimetable,
        notices
      }
    });

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
