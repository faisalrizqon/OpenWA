import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active || !user.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    // Provider khusus portal customer: login dengan No. HP + password
    Credentials({
      id: "customer",
      name: "Customer Portal",
      credentials: { phone: {}, password: {} },
      async authorize(credentials) {
        const phone = String(credentials?.phone ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!phone || !password) return null;
        const customer = await prisma.customer.findUnique({ where: { phone } });
        if (!customer || !customer.passwordHash) return null;
        const ok = await bcrypt.compare(password, customer.passwordHash);
        if (!ok) return null;
        return {
          id: `customer-${customer.id}`,
          name: customer.name,
          email: null,
          role: "customer",
          customerId: String(customer.id),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // user hanya ada saat sign-in; persist id + role ke token
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "mitra";
        if (user.customerId) token.customerId = user.customerId;
      }
      return token;
    },
    async session({ session, token }) {
      // jwt strategy: baca dari token (bukan DB user record)
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = token.role ?? "mitra";
        session.user.customerId = token.customerId ?? null;
      }
      return session;
    },
  },
});
