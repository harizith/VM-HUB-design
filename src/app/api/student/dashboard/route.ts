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

    const semester = user.studentProfile.semester;
    const yearStr = user.studentProfile.year?.trim() || "";
    const section = user.studentProfile.section?.trim() || "";
    const department = user.studentProfile.department?.trim() || "";
    const normalizedDept = department.replace(/^(B\.E\s+|B\.Tech\s+)/i, "").trim();
    const classId = yearStr && normalizedDept && section ? `${yearStr}-${normalizedDept}-${section}` : "";

    // 3. Compute Day Order dynamically
    const { currentDayOrder, tomorrowDayOrder } = await getDayOrderInfo();

    // 4. Fetch the timetable for the student's class and current day order
    let timetable: any[] = [];
    let fullTimetable: Record<string, any[]> = { "I": [], "II": [], "III": [], "IV": [], "V": [], UNASSIGNED: [] };
    try {
      const allEntries = classId ? await prisma.timetableEntry.findMany({
        where: { classId },
        orderBy: [{ dayOrder: "asc" }, { period: "asc" }],
      }) : [];

      allEntries.forEach((entry: any) => {
        const day = entry.dayOrder;
        (day && fullTimetable[day] ? fullTimetable[day] : fullTimetable.UNASSIGNED).push(entry);
        if (entry.dayOrder === currentDayOrder) timetable.push(entry);
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
          vmNo: user.vmNo || "",
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
