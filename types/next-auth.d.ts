import NextAuth from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role: "EMPLOYEE" | "MANAGER" | "ADMIN";
    workspaceId: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "EMPLOYEE" | "MANAGER" | "ADMIN";
      workspaceId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "EMPLOYEE" | "MANAGER" | "ADMIN";
    workspaceId: string;
  }
}
