"use client";

import Link from "next/link";
import {
  Bot,
  Users,
  BarChart2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  Layers,
  ArrowRight,
  BookOpen,
  Star,
  TrendingUp,
  ClipboardList,
  GraduationCap,
  Building2,
  Cpu,
} from "lucide-react";

/* ─────────────────────────── MINI PREVIEW CARD ─────────────────────────── */
function AppPreviewCard() {
  return (
    <div
      className="
        w-full rounded-2xl bg-white shadow-2xl border border-slate-100
        p-5 select-none
        hover:shadow-blue-200/60 hover:-translate-y-1
        transition-all duration-500
        animate-float
      "
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">U</div>
          <span className="text-xs font-bold text-slate-800">Platform Dashboard</span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Total Projects", value: "48", color: "bg-blue-50 text-blue-600", icon: "📁" },
          { label: "Active Teams", value: "12", color: "bg-emerald-50 text-emerald-600", icon: "👥" },
          { label: "Tasks Done", value: "134", color: "bg-violet-50 text-violet-600", icon: "✅" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-2.5 ${s.color}`}>
            <div className="text-[10px] font-medium opacity-70">{s.label}</div>
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-xs">{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span className="font-semibold">Project Completion</span>
          <span className="font-bold text-blue-600">72%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-1000"
            style={{ width: "72%" }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {[
          { label: "UI Design", done: true },
          { label: "Backend Development", done: false },
          { label: "AI Integration", done: false },
        ].map((t) => (
          <div key={t.label} className="flex items-center gap-2 text-[11px]">
            {t.done ? (
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            ) : (
              <Clock size={13} className="text-amber-400 shrink-0" />
            )}
            <span className={t.done ? "line-through text-slate-400" : "text-slate-700 font-medium"}>
              {t.label}
            </span>
          </div>
        ))}
      </div>

      {/* Footer bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>Last updated: just now</span>
        <span className="text-emerald-500 font-semibold flex items-center gap-1"><TrendingUp size={10} /> On Track</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── ROLE DASHBOARD CARDS ─────────────────────────── */
function RoleDashboardCard({
  role,
  icon: Icon,
  color,
  stats,
  activities,
}: {
  role: string;
  icon: React.ElementType;
  color: string;
  stats: { label: string; value: string }[];
  activities: string[];
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold mb-4 ${color}`}>
        <Icon size={15} />
        {role}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-slate-50 rounded-xl p-2.5">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="text-lg font-bold text-slate-800">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {activities.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
            {a}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── MAIN PAGE ─────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}</style>

      <main className="min-h-screen bg-white text-slate-800 overflow-x-hidden">

        {/* ══════════════════════ NAVBAR ══════════════════════ */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">U</div>
              <span className="text-lg font-bold text-slate-900">UniPro</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
              <a href="#preview" className="hover:text-blue-600 transition-colors">Preview</a>
              <a href="#benefits" className="hover:text-blue-600 transition-colors">Benefits</a>
            </nav>
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
            >
              Login →
            </Link>
          </div>
        </header>

        {/* ══════════════════════ HERO ══════════════════════ */}
        <section className="relative bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] left-[30%] w-150 h-150 bg-blue-600/20 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[10%] w-100 h-100 bg-violet-600/20 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 py-28 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 text-sm text-blue-300 font-medium">
                <Star size={14} className="text-yellow-400" />
                AI-Powered Academic Collaboration System
              </div>

              <h1 className="text-5xl xl:text-6xl font-extrabold leading-tight tracking-tight">
                Smart University
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
                  Project Management
                </span>
                <br />
                Platform
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
                Manage academic projects, collaborate with mentors, track progress, and receive
                AI guidance — all in one powerful platform built for universities.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-white font-semibold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/50"
                >
                  Get Started <ArrowRight size={16} />
                </Link>
                <a
                  href="#preview"
                  className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur px-7 py-3.5 font-semibold hover:bg-white/10 transition-all"
                >
                  View Demo
                </a>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-6 pt-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> Free for universities</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> No setup required</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> Secure & fast</span>
              </div>
            </div>

            {/* Right – Live App Preview */}
            <div className="w-full max-w-md mx-auto lg:mx-0">
              <AppPreviewCard />
            </div>
          </div>
        </section>

        {/* ══════════════════════ FEATURES ══════════════════════ */}
        <section id="features" className="bg-slate-50 py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Capabilities</p>
              <h2 className="text-4xl font-extrabold text-slate-900">Platform Features</h2>
              <p className="mt-4 text-slate-500 text-lg max-w-xl mx-auto">
                Everything a university needs to manage academic projects from idea to evaluation.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Bot,
                  title: "AI Project Guidance",
                  desc: "Smart suggestions, risk detection, and AI-generated project insights to help students make better decisions.",
                  color: "bg-blue-50 text-blue-600",
                },
                {
                  icon: Users,
                  title: "Team Collaboration",
                  desc: "Assign roles, manage tasks, share files, and collaborate in real time with your project team.",
                  color: "bg-violet-50 text-violet-600",
                },
                {
                  icon: BarChart2,
                  title: "Progress Tracking",
                  desc: "Visual dashboards, milestone tracking, and deadline alerts keep every project on schedule.",
                  color: "bg-emerald-50 text-emerald-600",
                },
                {
                  icon: ShieldCheck,
                  title: "Faculty Monitoring",
                  desc: "Admins and faculty get full visibility into project health, team activity, and evaluation results.",
                  color: "bg-amber-50 text-amber-600",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`inline-flex p-3 rounded-xl mb-4 ${f.color}`}>
                    <f.icon size={22} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
        <section id="how-it-works" className="bg-white py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Process</p>
              <h2 className="text-4xl font-extrabold text-slate-900">How It Works</h2>
              <p className="mt-4 text-slate-500 text-lg max-w-xl mx-auto">
                A clear, structured workflow from project creation to final approval.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {/* Connector line (desktop) */}
              <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-200 via-violet-200 to-emerald-200 z-0" />

              {[
                { step: "01", icon: GraduationCap, title: "Student Creates Project", desc: "Student submits a project proposal with title, description, and team members.", color: "bg-blue-600 text-white" },
                { step: "02", icon: BookOpen, title: "Mentor Reviews Proposal", desc: "Assigned mentor reviews, provides feedback, and approves or requests revisions.", color: "bg-violet-600 text-white" },
                { step: "03", icon: Layers, title: "Team Collaborates", desc: "Team works on milestones, updates progress, and communicates through the platform.", color: "bg-amber-500 text-white" },
                { step: "04", icon: UserCheck, title: "Faculty Evaluates", desc: "Faculty reviews final submission, grades the project, and marks it complete.", color: "bg-emerald-600 text-white" },
              ].map((s) => (
                <div key={s.step} className="relative z-10 bg-white rounded-2xl p-6 shadow-md border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-md ${s.color}`}>
                    <s.icon size={22} />
                  </div>
                  <div className="text-xs font-bold text-slate-400 tracking-widest mb-1">STEP {s.step}</div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════ ROLE DASHBOARD PREVIEW ══════════════════════ */}
        <section id="preview" className="bg-slate-50 py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Dashboards</p>
              <h2 className="text-4xl font-extrabold text-slate-900">Built For Every Role</h2>
              <p className="mt-4 text-slate-500 text-lg max-w-xl mx-auto">
                Dedicated, role-specific dashboards for students, mentors, faculty, and admins.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <RoleDashboardCard
                role="Student"
                icon={GraduationCap}
                color="bg-blue-50 text-blue-700"
                stats={[
                  { label: "My Projects", value: "3" },
                  { label: "Tasks Due", value: "7" },
                  { label: "Completed", value: "18" },
                  { label: "Team Score", value: "92%" },
                ]}
                activities={["Project proposal submitted", "Mentor feedback received", "Milestone 2 due in 3 days"]}
              />
              <RoleDashboardCard
                role="Mentor"
                icon={BookOpen}
                color="bg-violet-50 text-violet-700"
                stats={[
                  { label: "Assigned Teams", value: "6" },
                  { label: "Reviews Pending", value: "4" },
                  { label: "Sessions", value: "12" },
                  { label: "Avg Score", value: "87%" },
                ]}
                activities={["Team Alpha needs feedback", "Review submission due today", "Meeting scheduled: 3 PM"]}
              />
              <RoleDashboardCard
                role="Faculty"
                icon={ClipboardList}
                color="bg-amber-50 text-amber-700"
                stats={[
                  { label: "Active Projects", value: "24" },
                  { label: "Evaluations", value: "9" },
                  { label: "Approved", value: "15" },
                  { label: "Dept Score", value: "89%" },
                ]}
                activities={["3 projects awaiting approval", "Evaluation report ready", "Semester end deadline in 7 days"]}
              />
              <RoleDashboardCard
                role="Admin"
                icon={Building2}
                color="bg-emerald-50 text-emerald-700"
                stats={[
                  { label: "Total Users", value: "248" },
                  { label: "Departments", value: "8" },
                  { label: "Teams", value: "42" },
                  { label: "System Health", value: "100%" },
                ]}
                activities={["5 new user registrations", "System backup completed", "All services running"]}
              />
            </div>
          </div>
        </section>

        {/* ══════════════════════ BENEFITS ══════════════════════ */}
        <section id="benefits" className="bg-white py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Benefits</p>
                <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Why Use This Platform?</h2>
                <p className="text-slate-500 text-lg leading-relaxed mb-10">
                  Designed specifically for academic institutions, UniPro brings structure,
                  transparency, and intelligence to every project lifecycle.
                </p>

                <div className="space-y-5">
                  {[
                    { icon: Layers, title: "Centralized Project Management", desc: "All projects, teams, and documents in one place — no scattered tools." },
                    { icon: Cpu, title: "AI-Powered Assistance", desc: "Smart recommendations, risk prediction, and automated progress insights." },
                    { icon: Users, title: "Real-Time Collaboration", desc: "Students and mentors work together seamlessly, regardless of location." },
                    { icon: ShieldCheck, title: "Transparent Academic Evaluation", desc: "Clear rubrics, structured feedback, and fair, traceable evaluations." },
                  ].map((b) => (
                    <div key={b.title} className="flex items-start gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <b.icon size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm mb-0.5">{b.title}</div>
                        <div className="text-sm text-slate-500">{b.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right side visual */}
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-600 to-violet-700 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200">
                  <div className="text-sm font-semibold opacity-70 mb-6 uppercase tracking-widest">Live Statistics</div>
                  {[
                    { label: "Student Satisfaction", pct: 96 },
                    { label: "Projects Completed On Time", pct: 88 },
                    { label: "Mentor Response Rate", pct: 94 },
                    { label: "AI Accuracy Score", pct: 91 },
                  ].map((s) => (
                    <div key={s.label} className="mb-5">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span>{s.label}</span>
                        <span className="font-bold">{s.pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-white/80"
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-5 -right-4 bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3 border border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Avg Improvement</div>
                    <div className="text-lg font-extrabold text-slate-900">+42%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════ CTA ══════════════════════ */}
        <section className="bg-gradient-to-r from-blue-600 via-blue-700 to-violet-700 py-24">
          <div className="max-w-4xl mx-auto px-6 text-center text-white">
            <h2 className="text-4xl xl:text-5xl font-extrabold mb-6 leading-tight">
              Start Managing Your Academic
              <br />Projects Smarter
            </h2>
            <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto">
              Join universities already using UniPro to streamline project management, improve collaboration, and drive better outcomes.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 rounded-2xl bg-white text-blue-700 px-10 py-4 text-base font-extrabold hover:bg-blue-50 transition-all shadow-2xl shadow-blue-900/30"
            >
              Get Started Now <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* ══════════════════════ FOOTER ══════════════════════ */}
        <footer className="bg-slate-950 text-slate-400 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">U</div>
                  <span className="text-white font-bold text-base">UniPro</span>
                </div>
                <p className="text-sm leading-relaxed">
                  Smart University Project Management Platform — built for academics, powered by AI.
                </p>
              </div>
              <div>
                <div className="text-white font-semibold mb-4 text-sm">Platform</div>
                <ul className="space-y-2 text-sm">
                  <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="#preview" className="hover:text-white transition-colors">Previews</a></li>
                  <li><a href="#benefits" className="hover:text-white transition-colors">Benefits</a></li>
                </ul>
              </div>
              <div>
                <div className="text-white font-semibold mb-4 text-sm">Roles</div>
                <ul className="space-y-2 text-sm">
                  <li>Students</li>
                  <li>Mentors</li>
                  <li>Faculty</li>
                  <li>Administrators</li>
                </ul>
              </div>
              <div>
                <div className="text-white font-semibold mb-4 text-sm">Contact</div>
                <ul className="space-y-2 text-sm">
                  <li>support@unipro.edu</li>
                  <li>admin@unipro.edu</li>
                  <li className="pt-2"><Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Login to Portal →</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
              <span>© {new Date().getFullYear()} UniPro — University Project Management Platform. All rights reserved.</span>
              <span className="text-slate-600">Built with Next.js · Tailwind CSS · PostgreSQL</span>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
