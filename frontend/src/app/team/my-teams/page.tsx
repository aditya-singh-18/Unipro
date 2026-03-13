"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyTeamsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/team?panel=teams");
  }, [router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#cad6e6] text-slate-700">
      Redirecting to My Teams...
    </div>
  );
}
