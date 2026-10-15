import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { studentId, classId, dateString, dayOrder, period, subjectCode, status } = await request.json();

    if (!studentId || !classId || !dateString || !period || !subjectCode) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const email = session.user.email;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const um = await prisma.userMode.findUnique({ where: { emailid: email } });
      if (um) user = { name: um.emailid.split("@")[0] } as any;
    }
    const facultyName = user?.name?.trim() || "Unknown";

    // Upsert attendance record
    const record = await prisma.attendance.upsert({
      where: {
        studentId_dateString_period: {
          studentId,
          dateString,
          period
        }
      },
      update: {
        status
      },
      create: {
        studentId,
        classId,
        dateString,
        dayOrder: dayOrder || "Unknown",
        period,
        subjectCode,
        facultyName,
        status
      }
    });

    return NextResponse.json({ success: true, data: record });

  } catch (error: any) {
    console.error("Attendance POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
