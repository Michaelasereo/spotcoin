"use client";

import { createContext, useContext } from "react";

export type DashboardRole = "EMPLOYEE" | "MANAGER" | "ADMIN";

const DashboardRoleContext = createContext<DashboardRole>("EMPLOYEE");

export function DashboardRoleProvider({
  role,
  children,
}: {
  role: DashboardRole;
  children: React.ReactNode;
}) {
  return <DashboardRoleContext.Provider value={role}>{children}</DashboardRoleContext.Provider>;
}

export function useDashboardRole() {
  return useContext(DashboardRoleContext);
}

export function useCanCreatePollsOrEvents() {
  const role = useDashboardRole();
  return role === "ADMIN" || role === "MANAGER";
}
