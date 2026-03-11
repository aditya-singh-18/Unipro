import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Management | Admin Dashboard",
  description: "Register and manage system users",
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
