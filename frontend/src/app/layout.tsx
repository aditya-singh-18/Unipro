"use client";

import "./globals.css";
import { AuthProvider } from "../store/auth.store";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={6000}
        />
      </body>
    </html>
  );
}
