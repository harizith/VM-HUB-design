import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as xlsx from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    let totalInserted = 0;
    let skippedCount = 0;
    const conflicts: any[] = [];
    const errors: string[] = [];

    // Process page by page (sheet by sheet)
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data: any[] = xlsx.utils.sheet_to_json(sheet);
      
      if (!data || data.length === 0) continue;

      const classId = sheetName; 

      for (const row of data) {
        try {
          const getVal = (r: any, keys: string[]) => {
            const rKeys = Object.keys(r);
            for (const k of keys) {
              const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              const match = rKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanK);
              if (match) return String(r[match]);
            }
            return "";
          };

          const dayOrder = getVal(row, ['dayorder', 'day']).trim();
          const periodStr = getVal(row, ['period']).trim();
          const period = parseInt(periodStr, 10);
          
          if (!dayOrder || isNaN(period)) continue;

          const subjectCode = getVal(row, ['subjectcode', 'subcode']).trim();
          const subjectName = getVal(row, ['subjectname', 'subject', 'subname', 'course']).trim();
          const facultyName = getVal(row, ['facultyname', 'faculty', 'staff', 'teacher', 'instructor']).trim();
          const vmsNo = getVal(row, ['vtmt no/vmno', 'vmsno', 'vtmtno', 'vmno', 'facultyvmsno', 'facultyvmno']).trim() || null;
          const roomNo = getVal(row, ['roomno', 'room', 'hall']).trim();
          const timeRange = getVal(row, ['timerange', 'time', 'timing']).trim() || `Period ${period}`;
          const currentClassId = getVal(row, ['classid', 'class']).trim() || classId;

          // 1. Upsert Subject
          if (subjectCode && subjectName) {
            await prisma.subject.upsert({
              where: { code: subjectCode },
              update: { name: subjectName },
              create: {
                code: subjectCode,
                name: subjectName,
                credits: 3,
                semester: currentClassId.includes('I') ? 1 : 3,
                departmentCode: currentClassId.split('-')[1] || "CSE"
              }
            });
          }

          // 2. Ensure Department exists
          let deptCode = "CSE";
          if (currentClassId.includes('-')) {
            deptCode = currentClassId.split('-')[1] || "CSE";
            await prisma.department.upsert({
              where: { code: deptCode },
              update: {},
              create: {
                code: deptCode,
                name: deptCode + " Department",
                hodName: "TBD"
              }
            });
          }

          // 3. Create dummy Faculty User & Profile if facultyName provided
          if (facultyName && facultyName.length > 2) {
            const existingFaculty = await prisma.user.findFirst({
              where: { name: facultyName, role: 'FACULTY' }
            });
            if (!existingFaculty) {
              const dummyVmNo = "EMP-" + deptCode + "-" + Math.floor(Math.random() * 10000);
              const email = facultyName.replace(/\s+/g, '').toLowerCase() + "@veltechmultitech.org";
              
              const newUser = await prisma.user.create({
                data: {
                  vmNo: dummyVmNo,
                  email: email,
                  name: facultyName,
                  password: "password123",
                  role: "FACULTY",
                  status: "ACTIVE",
                }
              });
              
              await prisma.facultyProfile.create({
                data: {
                  vmNo: dummyVmNo,
                  department: deptCode,
                  designation: "Assistant Professor"
                }
              });
            }
          }

          // 4. Duplicate & Conflict Detection
          const existingTt = await prisma.timetableEntry.findFirst({
            where: {
              classId: currentClassId,
              dayOrder: dayOrder,
              period: period
            }
          });

          if (existingTt) {
            const isExactMatch = 
              existingTt.subjectCode === subjectCode &&
              existingTt.subjectName === subjectName &&
              existingTt.facultyName === facultyName &&
              existingTt.roomNo === roomNo &&
              existingTt.timeRange === timeRange &&
              (!vmsNo || !existingTt.vmsNo || existingTt.vmsNo === vmsNo);

            if (isExactMatch) {
              if (vmsNo && !existingTt.vmsNo) {
                await prisma.timetableEntry.update({
                  where: { id: existingTt.id },
                  data: { vmsNo }
                });
              }
              skippedCount++;
            } else {
              conflicts.push({
                id: existingTt.id,
                classId: currentClassId,
                dayOrder,
                period,
                oldData: {
                  subjectCode: existingTt.subjectCode,
                  subjectName: existingTt.subjectName,
                  facultyName: existingTt.facultyName,
                  roomNo: existingTt.roomNo,
                  timeRange: existingTt.timeRange,
                  vmsNo: existingTt.vmsNo
                },
                newData: {
                  subjectCode,
                  subjectName,
                  facultyName,
                  roomNo,
                  timeRange,
                  vmsNo
                }
              });
            }
          } else {
            // New record, insert immediately
            await prisma.timetableEntry.create({
              data: {
                classId: currentClassId,
                dayOrder,
                period,
                subjectCode,
                subjectName,
                facultyName,
                roomNo,
                timeRange,
                vmsNo
              }
            });
            totalInserted++;
          }
        } catch (rowError: any) {
          console.error("Row Error:", rowError);
          errors.push(`Error on sheet ${sheetName}: ${rowError.message}`);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: totalInserted,
      skippedCount,
      conflicts,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
