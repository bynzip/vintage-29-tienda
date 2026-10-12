"use client";

import { createContext, useContext } from "react";

const AdminUserContext = createContext<string | null>(null);

export function AdminClientProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  return <AdminUserContext.Provider value={userId}>{children}</AdminUserContext.Provider>;
}

export function useAdminUserId() {
  const userId = useContext(AdminUserContext);
  if (!userId) throw new Error("La sesión de administración no está disponible.");
  return userId;
}
