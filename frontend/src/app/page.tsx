// "use client";

// import Image from "next/image";
// import { useEffect } from "react";
// import { useTeamStore } from "../store/team.store";

// export default function Home() {
//   // ✅ JS LOGIC (return se pehle)
//   const { team, loading, fetchMyTeam } = useTeamStore();

//   useEffect(() => {
//     fetchMyTeam();
//   }, [fetchMyTeam]);

//   console.log("TEAM DATA:", team);

//   // ✅ JSX (return ke andar)
//   return (
//     <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
//       <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={100}
//           height={20}
//           priority
//         />

//         <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
//           <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
//             Team Store Test
//           </h1>

//           <p className="text-sm text-zinc-600 dark:text-zinc-400">
//             {loading && "Loading team..."}
//             {!loading && team === null && "No team found"}
//             {!loading && team && `Team Name: ${team.team_name}`}
//           </p>
//         </div>
//       </main>
//     </div>
//   );
// }
"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-6">
        <div className="text-2xl font-bold text-blue-600">
          University Portal
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-white font-semibold hover:bg-blue-700 transition"
        >
          Login
        </Link>
      </header>

      {/* Hero */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center px-10 py-24">
        <div>
          <h1 className="text-5xl font-bold leading-tight">
            Smart University Project Management,
            <span className="text-blue-600"> Powered by AI</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            Manage academic projects, collaborate with your team, track progress,
            and receive intelligent AI guidance—all in one powerful platform.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-7 py-3 text-white font-semibold hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
            <a
              href="#about"
              className="rounded-xl border border-slate-300 px-7 py-3 font-semibold hover:bg-slate-100 transition"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Placeholder for product mockup */}
        <div className="w-full h-[360px] rounded-2xl bg-white shadow-xl flex items-center justify-center text-slate-400">
          App Preview Here
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-10 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold">About the Platform</h2>
          <p className="mt-4 text-slate-600 text-lg">
            The University Portal is a smart web application designed for students,
            mentors, and institutions to manage academic projects efficiently.
            From idea selection to final submission, everything is centralized in
            one intuitive workspace.
          </p>
          <p className="mt-4 text-slate-600 text-lg">
            Our AI engine analyzes project health, predicts risks, and suggests
            next best actions—helping students work smarter and mentors guide better.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-10 py-20 bg-slate-50">
        <h2 className="text-3xl font-bold text-center mb-12">
          What You Can Do
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {[
            "🤖 AI-powered project insights & risk prediction",
            "📊 Real-time progress & milestone tracking",
            "👥 Team collaboration & task assignment",
            "📅 Meetings, reminders & scheduling",
            "📝 Mentor feedback & rubric evaluation",
            "💡 Explore curated project ideas",
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white p-6 shadow-md hover:shadow-lg transition"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/login"
            className="inline-block rounded-xl bg-blue-600 px-8 py-3 text-white font-semibold hover:bg-blue-700 transition"
          >
            Enter the Portal
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-slate-500">
        © {new Date().getFullYear()} University Portal. All rights reserved.
      </footer>
    </main>
  );
}
