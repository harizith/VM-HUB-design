import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function normalizeRole(val: any): "STUDENT" | "FACULTY" | "HOD" | "ADMIN" {
  if (!val) return "STUDENT";
  const s = String(val).trim().toUpperCase();
  if (s === "HOD" || s.includes("HEAD")) return "HOD";
  if (s === "FACULTY" || s === "TEACHER" || s === "STAFF" || s.includes("PROF")) return "FACULTY";
  if (s === "ADMIN" || s.includes("ADMINISTRATOR")) return "ADMIN";
  return "STUDENT";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { users: rows } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No user rows provided in request" },
        { status: 400 }
      );
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const rawEmail = row.email || row.Email || row["Email ID"] || row["Email Address"] || row.emailid || "";
      const email = String(rawEmail).toLowerCase().trim();

      const name = (row.name || row.Name || row["Full Name"] || row["User Name"] || "").toString().trim();
      const rawRole = row.role || row.Role || row["User Role"] || row.usermode || "STUDENT";
      const role = normalizeRole(rawRole);
      
      const rawVmNo = row.vmNo || row.vmno || row["VM No"] || row["VMNo"] || row["VMS No"] || row["Roll No"] || row.rollNumber || "";
      const vmNo = String(rawVmNo).trim() || null;

      const plainPassword = (row.password || row.Password || row["Pass"] || "").toString().trim() || "Welcome@123";
      const storedPassword = encrypt(plainPassword);

      if (!email) {
        errors.push(`Row ${rowNum}: Skipped because Email is missing`);
        continue;
      }
      if (!name) {
        errors.push(`Row ${rowNum}: Skipped because Name is missing for ${email}`);
        continue;
      }

      const department = (row.department || row.Department || row.dept || row.Dept || "CSE").toString().toUpperCase().trim();
      
      // Ensure department exists in Department table to satisfy foreign keys
      try {
        await prisma.department.upsert({
          where: { code: department },
          update: {},
          create: {
            code: department,
            name: `${department} Department`,
          },
        });
      } catch (deptErr) {
        console.warn(`Dept upsert warning for ${department}:`, deptErr);
      }

      // Check if user already exists
      let existingUser = await prisma.user.findUnique({
        where: { email },
      });

      let userId = existingUser?.id;

      if (!existingUser) {
        // Create new user
        userId = crypto.randomUUID();
        const effectiveVmNo = vmNo || (role === "STUDENT" ? `STU-${userId.substring(0, 6)}` : `FAC-${userId.substring(0, 6)}`);
        
        await prisma.user.create({
          data: {
            id: userId,
            email,
            name,
            password: storedPassword,
            role,
            status: "ACTIVE",
            vmNo: effectiveVmNo,
          },
        });
        createdCount++;
      } else {
        // Update user
        await prisma.user.update({
          where: { email },
          data: {
            name,
            role,
            ...(vmNo ? { vmNo } : {}),
            ...(plainPassword !== "Welcome@123" ? { password: storedPassword } : {}),
          },
        });
        updatedCount++;
      }

      const activeUser = await prisma.user.findUnique({ where: { email } });
      const effectiveVmNo = activeUser?.vmNo || vmNo;

      // Profile Customization
      if (role === "STUDENT") {
        const rollNumber = (row.rollNumber || row.rollNo || row["Roll Number"] || row["Roll No"] || effectiveVmNo || email.split("@")[0]).toString().trim();
        const year = (row.year || row.Year || "I").toString().trim();
        const section = (row.section || row.Section || row.sec || "A").toString().trim();
        const semester = parseInt(row.semester || row.Semester || "1", 10) || 1;
        const batch = (row.batch || row.Batch || "2023-2027").toString().trim();

        await prisma.studentProfile.upsert({
          where: { userEmail: email },
          update: {
            rollNumber,
            department,
            year,
            section,
            semester,
            batch,
          },
          create: {
            userEmail: email,
            rollNumber,
            department,
            year,
            section,
            semester,
            batch,
          },
        });
      } else if (role === "FACULTY" && effectiveVmNo) {
        const designation = (row.designation || row.Designation || "Assistant Professor").toString().trim();
        await prisma.facultyProfile.upsert({
          where: { vmNo: effectiveVmNo },
          update: {
            department,
            designation,
          },
          create: {
            vmNo: effectiveVmNo,
            department,
            designation,
          },
        });
      } else if (role === "HOD" && effectiveVmNo) {
        const designation = (row.designation || row.Designation || "Head of Department").toString().trim();
        await prisma.hodProfile.upsert({
          where: { vmNo: effectiveVmNo },
          update: {
            department,
            designation,
          },
          create: {
            vmNo: effectiveVmNo,
            department,
            designation,
          },
        });
      }

      // Legacy UserMode sync for backward compatibility
      if (effectiveVmNo) {
        try {
          await prisma.userMode.upsert({
            where: { vmno: effectiveVmNo },
            update: {
              emailid: email,
              password: storedPassword,
              usermode: role,
            },
            create: {
              vmno: effectiveVmNo,
              emailid: email,
              password: storedPassword,
              usermode: role,
            },
          });
        } catch (umErr) {
          console.warn("UserMode sync warning:", umErr);
        }
      }
    }

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          action: "EXCEL_BULK_USER_IMPORT",
          details: `Imported users from Excel. Created: ${createdCount}, Updated: ${updatedCount}`,
          performedBy: "Admin",
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      totalProcessed: rows.length,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error("Bulk User Import Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
