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

    const body = await request.json();

    const email = session.user.email;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const um = await prisma.userMode.findUnique({ where: { emailid: email } });
      if (um) user = { name: um.emailid.split("@")[0] } as any;
    }
    const facultyName = user?.name?.trim() || "Unknown";

    // Handle Bulk Attendance Marking
    if (body.bulk) {
      const recordsToProcess = Array.isArray(body.records)
        ? body.records
        : (Array.isArray(body.studentIds)
          ? body.studentIds.map((sId: string) => ({
              studentId: sId,
              classId: body.classId,
              dateString: body.dateString,
              dayOrder: body.dayOrder || "Unknown",
              period: body.period,
              subjectCode: body.subjectCode,
              status: body.status
            }))
          : []);

      if (recordsToProcess.length === 0) {
        return NextResponse.json({ success: false, error: "No student records provided for bulk marking" }, { status: 400 });
      }

      const savedRecords = [];
      for (const item of recordsToProcess) {
        if (!item.studentId || !item.classId || !item.dateString || !item.period || !item.subjectCode) {
          continue;
        }

        const rec = await prisma.attendance.upsert({
          where: {
            studentId_dateString_period: {
              studentId: item.studentId,
              dateString: item.dateString,
              period: item.period
            }
          },
          update: {
            status: item.status
          },
          create: {
            studentId: item.studentId,
            classId: item.classId,
            dateString: item.dateString,
            dayOrder: item.dayOrder || "Unknown",
            period: item.period,
            subjectCode: item.subjectCode,
            facultyName,
            status: item.status
          }
        });
        savedRecords.push(rec);
      }

      return NextResponse.json({ success: true, count: savedRecords.length, data: savedRecords });
    }

    // Handle Single Attendance Record
    const { studentId, classId, dateString, dayOrder, period, subjectCode, status } = body;

    if (!studentId || !classId || !dateString || !period || !subjectCode) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

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
