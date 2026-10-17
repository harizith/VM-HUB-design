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

    let user = await prisma.user.findUnique({
      where: { email },
      include: { facultyProfile: true }
    });

    if (!user) {
      const um = await prisma.userMode.findUnique({ where: { emailid: email }});
      if (um) {
        user = {
          name: um.emailid.split("@")[0],
          vmNo: um.vmno,
          email: um.emailid,
          role: um.usermode.toUpperCase(),
          facultyProfile: {
             department: null,
             designation: null,
             vmNo: um.vmno
          }
        } as any;
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "No teacher profile found." }, { status: 404 });
    }

    let fullTimetable: any[] = [];
    const vmNo = user.vmNo || user.facultyProfile?.vmNo;
    const name = user.name || "";
    try {
      const orConditions: any[] = [];
      if (vmNo && vmNo.trim()) {
        orConditions.push({ vmsNo: { contains: vmNo.trim() } });
      }
      if (name && name.trim()) {
        orConditions.push({ facultyName: { contains: name.trim(), mode: "insensitive" } });
      }

      if (orConditions.length > 0) {
        fullTimetable = await prisma.timetableEntry.findMany({
          where: { OR: orConditions },
          orderBy: [{ dayOrder: "asc" }, { period: "asc" }]
        });
      }
    } catch (e) {
      console.error("Could not fetch timetable entries", e);
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
        teacherName: user.name,
        timetable: grouped
      }
    });

  } catch (error: any) {
    console.error("Calendar API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
