import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const email = session.user.email;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { studentProfile: true }
    });

    if (!user || !user.studentProfile) {
      return NextResponse.json({ success: false, error: "No student profile found." }, { status: 404 });
    }

    const yearStr = user.studentProfile.year?.trim() || "";
    const section = user.studentProfile.section?.trim() || "";
    const department = user.studentProfile.department?.trim() || "";
    const normalizedDept = department.replace(/^(B\.E\s+|B\.Tech\s+)/i, "").trim();
    const classId = yearStr && normalizedDept && section ? `${yearStr}-${normalizedDept}-${section}` : "";
    const possibleClasses = classId ? [classId] : [];

    let fullTimetable: any[] = [];
    try {
      if (possibleClasses.length) {
        fullTimetable = await prisma.timetableEntry.findMany({
          where: { classId: { in: possibleClasses } },
          orderBy: [{ dayOrder: "asc" }, { period: "asc" }],
        });
      }
    } catch (e) {
      console.error("Could not fetch timetable entries via prisma client", e);
    }

    // Group by Day Order
    const grouped: Record<string, any[]> = {
      "I": [], "II": [], "III": [], "IV": [], "V": [], UNASSIGNED: []
    };

    fullTimetable.forEach(entry => {
      const day = entry.dayOrder;
      (day && grouped[day] ? grouped[day] : grouped.UNASSIGNED).push(entry);
    });

    return NextResponse.json({
      success: true,
      data: {
        classId,
        timetable: grouped
      }
    });

  } catch (error: any) {
    console.error("Calendar API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
