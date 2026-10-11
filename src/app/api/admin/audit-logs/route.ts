import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
