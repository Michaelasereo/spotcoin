import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || user.deletedAt) {
          return null;
        }

        const isPasswordValid = await compare(password, user.passwordHash);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workspaceId: user.workspaceId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.workspaceId = user.workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as "EMPLOYEE" | "MANAGER" | "ADMIN";
        session.user.workspaceId = token.workspaceId as string;
      }
      return session;
    },
  },
});

type RouteContext = {
  params?: Record<string, string>;
};

type NextRouteContext = {
  params?: Promise<Record<string, string>> | Record<string, string>;
};

type RouteHandler = (
  request: Request,
  context: RouteContext,
  session: Session,
) => Promise<Response>;

export function requireAuth(handler: RouteHandler) {
  return async (request: Request, context: NextRouteContext) => {
    const session = await auth();
    if (!session?.user?.id || !session.user.workspaceId) {
      throw new AppError("Authentication required", "UNAUTHORIZED", 401);
    }
    const params = await Promise.resolve(context?.params ?? {});
    return handler(request, { params }, session);
  };
}

export function requireAdmin(handler: RouteHandler) {
  return async (request: Request, context: NextRouteContext) => {
    const session = await auth();
    if (!session?.user?.id || !session.user.workspaceId) {
      throw new AppError("Authentication required", "UNAUTHORIZED", 401);
    }
    if (session.user.role !== "ADMIN") {
      throw new AppError("Admin access required", "FORBIDDEN", 403);
    }
    const params = await Promise.resolve(context?.params ?? {});
    return handler(request, { params }, session);
  };
}
