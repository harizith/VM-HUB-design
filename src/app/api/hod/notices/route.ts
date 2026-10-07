import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== "HOD") {
       return NextResponse.json({ success: false, error: "Only HOD can post notices" }, { status: 403 });
    }

    const { title, content, audience, category } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const newNotice = await prisma.notice.create({
      data: {
        title,
        content,
        audience: audience || "ALL",
        category: category || "GENERAL",
        postedBy: user.name || "HOD"
      }
    });

    return NextResponse.json({ success: true, data: newNotice });
  } catch (error: any) {
    console.error("Error creating notice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
