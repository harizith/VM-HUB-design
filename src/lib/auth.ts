import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import { verifyPassword } from "@/lib/encryption"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const inputEmail = credentials.email.toLowerCase().trim();
        const inputPassword = credentials.password.trim();

        try {
          console.log("[Auth] Attempting login for:", inputEmail);
          let record = await prisma.userMode.findUnique({
            where: { emailid: inputEmail },
          });

          if (!record) {
            record = await prisma.userMode.findFirst({
              where: { emailid: { equals: inputEmail, mode: "insensitive" } },
            });
          }

          if (record && record.password) {
            const isPasswordValid = await verifyPassword(inputPassword, record.password);
            console.log("[Auth] Password match result:", isPasswordValid);
            if (isPasswordValid) {
              return {
                id: record.vmno,
                name: record.emailid.split("@")[0],
                email: record.emailid,
                role: record.usermode.toUpperCase(),
              };
            }
          }

          const userRec = await prisma.user.findFirst({
            where: { email: { equals: inputEmail, mode: "insensitive" } },
          });

          if (userRec && userRec.password) {
            const isValid = await verifyPassword(inputPassword, userRec.password);
            if (isValid) {
              return {
                id: userRec.id,
                name: userRec.name,
                email: userRec.email,
                role: userRec.role,
              };
            }
          }
        } catch (dbErr) {
          console.error("[Auth Error] Failed fetching user from database tables:", dbErr);
        }

        return null;
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET || "my-super-secret-key-change-me",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role as string;
      }
      return session;
    }
  }
}
