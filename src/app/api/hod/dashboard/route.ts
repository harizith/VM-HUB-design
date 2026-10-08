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

    // 1. Fetch the logged in user with hodProfile
    let user: any = await prisma.user.findUnique({
      where: { email },
      include: { hodProfile: true, facultyProfile: true } as any
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
          hodProfile: {
             department: "CSE",
             designation: "Head of Department",
             vmNo: um.vmno
          }
        } as any;
      }
    }

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: "No HOD profile found in the database." 
      }, { status: 404 });
    }

    // 3. Compute Day Order dynamically
    const { currentDayOrder, tomorrowDayOrder } = await getDayOrderInfo();

    // 4. Fetch today's timetable by the HOD's VM number stored on each entry.
    const vmNo = user.vmNo || user.hodProfile?.vmNo || user.facultyProfile?.vmNo;
    let timetable: any[] = [];
    try {
      if (vmNo) {
        timetable = await prisma.timetableEntry.findMany({
          where: { dayOrder: currentDayOrder, vmsNo: vmNo.trim() },
          orderBy: { period: "asc" }
        });
      }
    } catch (e) {
      console.error("Could not fetch timetable entries", e);
    }

    let notices: any[] = [];
    try {
      notices = await prisma.notice.findMany({
        where: {
          OR: [
            { audience: 'ALL' },
            { audience: 'FACULTY' },
            { audience: 'HOD' }
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
        hod: {
          name: user.name,
          vmNo,
          department: user.hodProfile?.department || user.facultyProfile?.department || "CSE",
          designation: user.hodProfile?.designation || "Head of Department"
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
