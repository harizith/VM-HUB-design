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
          status: "ACTIVE",
          facultyProfile: {
             department: null,
             designation: null,
             vmNo: um.vmno
          }
        } as any;
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        vmNo: user.vmNo || (user.facultyProfile?.vmNo || ""),
        status: user.status,
        profile: {
          department: user.facultyProfile?.department || "",
          designation: user.facultyProfile?.designation || "",
          subjects: {
            subject1: user.facultyProfile?.subject1 || "",
            subject2: user.facultyProfile?.subject2 || "",
            lab1: user.facultyProfile?.lab1 || "",
            additional1: user.facultyProfile?.additional1 || "",
            additional2: user.facultyProfile?.additional2 || "",
          },
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
    const { name, password, department, designation } = body;

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
    if (designation) profileDataToUpdate.designation = designation;

    if (Object.keys(dataToUpdate).length === 0 && Object.keys(profileDataToUpdate).length === 0) {
       return NextResponse.json({ success: true, message: "Nothing to update" });
    }

    const user = await prisma.user.findUnique({ where: { email }, include: { facultyProfile: true } });
    if (user) {
      if (Object.keys(dataToUpdate).length > 0) {
        await prisma.user.update({
          where: { email },
          data: dataToUpdate
        });
      }
      
      if (Object.keys(profileDataToUpdate).length > 0 && user.facultyProfile) {
        // FacultyProfile relation is on vmNo, so we need vmNo from user
        if (user.vmNo) {
          await prisma.facultyProfile.update({
            where: { vmNo: user.vmNo },
            data: profileDataToUpdate
          });
        }
      }
    }

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
