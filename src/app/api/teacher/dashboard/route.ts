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
    let user = await prisma.user.findUnique({
      where: { email },
      include: { facultyProfile: true }
    });

    // Fallback: If not found in User, they might be in UserMode (from older schema)
    if (!user) {
      const um = await prisma.userMode.findUnique({ where: { emailid: email }});
      if (um) {
        user = {
          name: um.emailid.split("@")[0],
          vmNo: um.vmno,
          email: um.emailid,
          role: um.usermode.toUpperCase(),
          facultyProfile: {
             department: "CSE",
             designation: "Assistant Professor",
             vmNo: um.vmno
          }
        } as any;
      }
    }

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: "No teacher profile found in the database. Please create one in the Admin mode." 
      }, { status: 404 });
    }

    // 3. Compute Day Order dynamically
    const { currentDayOrder, tomorrowDayOrder } = await getDayOrderInfo();

    // 4. Fetch the timetable for the teacher (all classes they teach today)
    // We use a smart string match to find their classes even if they have "Mr." or "Dr." in the timetable.
    // We use the exact name from the profile to match within the timetable string.
    // If the user includes their initial (e.g. "Karthick V"), it won't match "Karthick P".
    let timetable: any[] = [];
    try {
      const searchStr = user.name.trim();
      
      timetable = await prisma.timetableEntry.findMany({
        where: {
          dayOrder: currentDayOrder,
          OR: [
            { vmsNo: user.vmNo || user.facultyProfile?.vmNo || "unknown" },
            { facultyName: { contains: searchStr, mode: "insensitive" } }
          ]
        },
        orderBy: {
          period: "asc"
        }
      });
    } catch (e) {
      console.error("Could not fetch timetable entries", e);
    }

    let notices: any[] = [];
    try {
      notices = await prisma.notice.findMany({
        where: {
          OR: [
            { audience: 'ALL' },
            { audience: 'FACULTY' }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 3
      });
    } catch (e) {
      console.error("Could not fetch notices", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          name: user.name,
          vmNo: user.vmNo || user.facultyProfile?.vmNo,
          department: user.facultyProfile?.department || "CSE",
          designation: user.facultyProfile?.designation || "Faculty"
        },
        currentDayOrder,
        tomorrowDayOrder,
        timetable,
        notices
      }
    });

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
