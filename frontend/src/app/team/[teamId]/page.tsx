"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TeamDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.teamId as string | undefined;

  useEffect(() => {
    if (!teamId) {
      router.replace("/team");
      return;
    }

    router.replace(`/team?teamId=${teamId}`);
  }, [router, teamId]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#cad6e6] text-slate-700">
      Redirecting to team workspace...
    </div>
  );
}
