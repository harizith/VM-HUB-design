import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json({ success: false, error: 'classId is required' }, { status: 400 });
    }

    let timetable: any[] = [];
    try {
      timetable = await prisma.$queryRaw`
        SELECT * FROM "TimetableEntry"
        WHERE "classId" = ${classId}
        ORDER BY "dayOrder" ASC, "period" ASC
      `;
    } catch (e) {
      console.error(e);
      // fallback in case of issues
    }

    return NextResponse.json({ success: true, timetable });
  } catch (error: any) {
    console.error('Failed to fetch timetable:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { classId, entries } = body;

    if (!classId || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ success: false, error: 'classId and entries array are required' }, { status: 400 });
    }

    // Replace the entire timetable for the class
    if ((prisma as any).timetableEntry) {
      await (prisma as any).timetableEntry.deleteMany({
        where: { classId }
      });

      const inserted = await (prisma as any).timetableEntry.createMany({
        data: entries.map((entry: any) => ({
          classId,
          dayOrder: entry.dayOrder,
          period: entry.period,
          timeRange: entry.timeRange || `Period ${entry.period}`,
          subjectCode: entry.subjectCode,
          subjectName: entry.subjectName,
          facultyName: entry.facultyName,
          roomNo: entry.roomNo,
          vmsNo: typeof entry.vmsNo === 'string' ? entry.vmsNo.trim() || null : null
        }))
      });

      return NextResponse.json({ success: true, count: inserted.count });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Prisma client needs to be regenerated. Please restart your pnpm dev server.' 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Failed to update timetable:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
