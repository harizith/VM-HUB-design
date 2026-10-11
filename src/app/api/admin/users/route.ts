import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

// GET /api/admin/users - Fetch all users with their profile relations from DB
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        vmNo: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        studentProfile: {
          select: {
            rollNumber: true,
            department: true,
            semester: true,
            batch: true,
          },
        },
        facultyProfile: {
          select: {
            vmNo: true,
            department: true,
            designation: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/users - Create new user
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password, role, vmNo } = body;

    if (!email || !name || !password || !role) {
      return NextResponse.json({ success: false, error: "Missing required fields (email, name, password, role)" }, { status: 400 });
    }

    if (role !== "ADMIN" && !vmNo) {
      return NextResponse.json({ success: false, error: "Missing required field (VM No/VMS No)" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const cleanVmNo = vmNo ? vmNo.trim() : null;
    // Encrypt the password symmetrically so it's protected in DB but reversible
    const storedPassword = encrypt(password);
    const validRole = ["STUDENT", "FACULTY", "HOD", "ADMIN"].includes(role) ? role : "STUDENT";

    // 1. Check if user already exists
    const existing: any[] = await prisma.$queryRaw`
      SELECT id FROM "User" WHERE email = ${cleanEmail} LIMIT 1
    `;

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: false, error: `User with email '${cleanEmail}' already exists.` }, { status: 400 });
    }

    // Check if vmNo already exists
    if (cleanVmNo) {
      const existingVm: any[] = await prisma.$queryRaw`
        SELECT id FROM "User" WHERE "vmNo" = ${cleanVmNo} LIMIT 1
      `;
      if (existingVm && existingVm.length > 0) {
        return NextResponse.json({ success: false, error: `User with VM No/VMS No '${cleanVmNo}' already exists.` }, { status: 400 });
      }
    }

    const newId = crypto.randomUUID();

    // 2. Insert user into PostgreSQL
    await prisma.$executeRaw`
      INSERT INTO "User" (id, email, name, password, role, status, "vmNo", "createdAt", "updatedAt")
      VALUES (
        ${newId},
        ${cleanEmail},
        ${cleanName},
        ${storedPassword},
        ${validRole}::"Role",
        'ACTIVE',
        ${cleanVmNo},
        NOW(),
        NOW()
      )
    `;

    // 3. Role-specific profile creation
    const dept = (body.department || "CSE").toUpperCase().trim();
    if (validRole === "STUDENT") {
      const year = body.year || "I";
      const sec = body.section || "A";
      const roll = cleanVmNo || newId.substring(0, 8);
      
      await prisma.$executeRaw`
        INSERT INTO "StudentProfile" ("userEmail", "rollNumber", "department", "semester", "batch", "year", "section", "createdAt")
        VALUES (
          ${cleanEmail},
          ${roll},
          ${dept},
          1,
          '2023-2027',
          ${year},
          ${sec},
          NOW()
        )
      `;
    } else if (validRole === "FACULTY" && cleanVmNo) {
      const designation = body.designation || "Assistant Professor";
      await prisma.$executeRaw`
        INSERT INTO "FacultyProfile" ("vmNo", "department", "designation", "createdAt")
        VALUES (
          ${cleanVmNo},
          ${dept},
          ${designation},
          NOW()
        )
      `;
    } else if (validRole === "HOD" && cleanVmNo) {
      const designation = body.designation || "Head of Department";
      await prisma.$executeRaw`
        INSERT INTO "HodProfile" ("vmNo", "department", "designation", "createdAt")
        VALUES (
          ${cleanVmNo},
          ${dept},
          ${designation},
          NOW()
        )
      `;
    }

    // 4. Sync UserMode for login compatibility
    if (cleanVmNo) {
      try {
        await prisma.userMode.upsert({
          where: { vmno: cleanVmNo },
          update: {
            emailid: cleanEmail,
            password: storedPassword,
            usermode: validRole,
          },
          create: {
            vmno: cleanVmNo,
            emailid: cleanEmail,
            password: storedPassword,
            usermode: validRole,
          },
        });
      } catch (err) {
        console.warn("Could not sync UserMode:", err);
      }
    }

    // 5. Log audit event
    try {
      await prisma.auditLog.create({
        data: {
          action: "CREATE_USER",
          details: `Created new ${validRole} account for '${cleanEmail}' (${cleanName})`,
          performedBy: "Admin",
          userId: newId,
        },
      });
    } catch (e) {
      console.warn("Could not create audit log:", e);
    }

    const newUser = { id: newId, email: cleanEmail, name: cleanName, role: validRole, status: "ACTIVE" };

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create user" }, { status: 500 });
  }
}

// DELETE /api/admin/users - Delete user
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, vmNo: true, role: true },
    });

    if (user?.vmNo) {
      await prisma.userMode.deleteMany({ where: { vmno: user.vmNo } });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    try {
      await prisma.auditLog.create({
        data: {
          action: "DELETE_USER",
          details: `Deleted ${user?.role || "user"} account '${user?.email || userId}' (${user?.name || ""})`,
          performedBy: "Admin",
        },
      });
    } catch (e) {
      // non-blocking
    }

    return NextResponse.json({ success: true, deletedId: userId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

