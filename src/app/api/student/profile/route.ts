import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hashPassword } from "@/lib/encryption";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const email = session.user.email;

    let user = await prisma.user.findUnique({
      where: { email },
      include: { studentProfile: true }
    });

    // Fallback: If not found in User OR studentProfile is missing, they might be in UserMode (from older schema)
    if (!user || !user.studentProfile) {
      const um = await prisma.userMode.findUnique({ where: { emailid: email }});
      if (um) {
        user = {
          name: user?.name || um.emailid.split("@")[0],
          vmNo: user?.vmNo || um.vmno,
          email: um.emailid,
          role: um.usermode.toUpperCase(),
          status: user?.status || "ACTIVE",
          studentProfile: {
             department: "CSE",
             semester: 5,
             section: "A",
             batch: "2023-2027",
             rollNumber: um.vmno
          }
        } as any;
      }
    }

    if (!user || !user.studentProfile) {
      return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });
    }

    // Determine year
    const sem = user.studentProfile.semester || 1;
    let year = "1st Year";
    if (sem === 3 || sem === 4) year = "2nd Year";
    if (sem === 5 || sem === 6) year = "3rd Year";
    if (sem === 7 || sem === 8) year = "4th Year";

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        vmNo: user.vmNo || user.studentProfile.rollNumber,
        status: user.status,
        profile: {
          department: user.studentProfile.department.startsWith("B.E") || user.studentProfile.department.startsWith("B.Tech") 
                      ? user.studentProfile.department 
                      : "B.E " + user.studentProfile.department,
          semester: user.studentProfile.semester,
          section: "A", // Default for now until schema update
          batch: user.studentProfile.batch || "2023-2027",
          year: year
        }
      }
    });

  } catch (error: any) {
    console.error("Profile API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const email = session.user.email;
    const body = await request.json();
    const { name, password, department, semester, batch } = body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;

    const umDataToUpdate: any = {};

    if (password && password.trim()) {
      const hashedPassword = await hashPassword(password.trim());
      dataToUpdate.password = hashedPassword;
      umDataToUpdate.password = hashedPassword;
    }

    const profileDataToUpdate: any = {};
    if (department) profileDataToUpdate.department = department;
    if (semester) profileDataToUpdate.semester = parseInt(semester, 10);
    if (batch) profileDataToUpdate.batch = batch;

    if (Object.keys(dataToUpdate).length === 0 && Object.keys(profileDataToUpdate).length === 0) {
       return NextResponse.json({ success: true, message: "Nothing to update" });
    }

    // Attempt to update User
    const user = await prisma.user.findUnique({ where: { email }, include: { studentProfile: true } });
    if (user) {
      if (Object.keys(dataToUpdate).length > 0) {
        await prisma.user.update({
          where: { email },
          data: dataToUpdate
        });
      }
      
      if (Object.keys(profileDataToUpdate).length > 0 && user.studentProfile) {
        await prisma.studentProfile.update({
          where: { userEmail: email },
          data: profileDataToUpdate
        });
      }
    }

    // Attempt to update UserMode
    const um = await prisma.userMode.findUnique({ where: { emailid: email } });
    if (um && Object.keys(umDataToUpdate).length > 0) {
      await prisma.userMode.update({
        where: { emailid: email },
        data: umDataToUpdate
      });
    }

    return NextResponse.json({ success: true, message: "Profile updated successfully" });
  } catch (error: any) {
    console.error("Profile API Update Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
