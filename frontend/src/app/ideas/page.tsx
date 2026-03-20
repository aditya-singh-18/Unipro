"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenText,
  Building2,
  Clipboard,
  Filter,
  Lightbulb,
  Rocket,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";
import { useAuth } from "@/store/auth.store";
import { sihProblemStatements } from "@/data/sihProblemStatements";
import { Track } from "@/constants/track-tech";

const byLabel = (a: string, b: string) => a.localeCompare(b);

const TRACK_BY_BUCKET: Array<{ matcher: RegExp; tracks: Track[] }> = [
  { matcher: /education/i, tracks: ["AI", "WEB", "APP"] },
  { matcher: /automation/i, tracks: ["AUTOMATION_RPA", "AI", "WEB"] },
  { matcher: /cyber|blockchain/i, tracks: ["CYBER", "BLOCKCHAIN", "WEB"] },
  { matcher: /resource|energy|green/i, tracks: ["IOT", "DATA_SCIENCE", "WEB"] },
  { matcher: /transport|logistics/i, tracks: ["DATA_SCIENCE", "WEB", "APP"] },
  { matcher: /disaster/i, tracks: ["AI", "IOT", "APP"] },
  { matcher: /medtech|health/i, tracks: ["AI", "DATA_SCIENCE", "APP"] },
  { matcher: /space/i, tracks: ["AI", "ML", "DATA_SCIENCE"] },
  { matcher: /robotics/i, tracks: ["ROBOTICS", "IOT", "AI"] },
  { matcher: /tourism|culture/i, tracks: ["WEB", "APP", "UI_UX"] },
  { matcher: /smart vehicles/i, tracks: ["IOT", "APP", "AI"] },
  { matcher: /agriculture|foodtech|rural/i, tracks: ["IOT", "DATA_SCIENCE", "APP"] },
];

function getSuggestedTracks(bucketValue: string, categoryValue: "Software" | "Hardware") {
  const mapping = TRACK_BY_BUCKET.find(({ matcher }) => matcher.test(bucketValue));
  if (mapping) return mapping.tracks;
  return categoryValue === "Software" ? (["WEB", "APP", "AI"] as Track[]) : (["IOT", "ROBOTICS", "AI"] as Track[]);
}

export default function ProjectIdeasPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [bucket, setBucket] = useState("All");
  const [organization, setOrganization] = useState("All");
  const [hackathon, setHackathon] = useState("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || user?.role !== "STUDENT") {
      router.replace("/login");
    }
  }, [token, user?.role, router]);

  const categoryOptions = useMemo(() => {
    const set = new Set(sihProblemStatements.map((item) => item.category));
    return ["All", ...Array.from(set).sort(byLabel)];
  }, []);

  const bucketOptions = useMemo(() => {
    const set = new Set(sihProblemStatements.map((item) => item.technologyBucket));
    return ["All", ...Array.from(set).sort(byLabel)];
  }, []);

  const organizationOptions = useMemo(() => {
    const set = new Set(sihProblemStatements.map((item) => item.organization));
    return ["All", ...Array.from(set).sort(byLabel)];
  }, []);

  const hackathonOptions = useMemo(() => {
    const set = new Set(
      sihProblemStatements
        .map((item) => item.sourceHackathon)
        .filter((value): value is string => Boolean(value))
    );
    return ["All", ...Array.from(set).sort(byLabel)];
  }, []);

  const filteredIdeas = useMemo(() => {
    const q = query.trim().toLowerCase();

    return sihProblemStatements.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const matchesBucket = bucket === "All" || item.technologyBucket === bucket;
      const matchesOrganization =
        organization === "All" || item.organization === organization;
      const matchesHackathon =
        hackathon === "All" || item.sourceHackathon === hackathon;

      if (!matchesCategory || !matchesBucket || !matchesOrganization || !matchesHackathon) {
        return false;
      }

      if (!q) return true;

      const haystack = [
        item.statementId,
        item.title,
        item.description,
        item.technologyBucket,
        item.department,
        item.organization,
        item.sourceHackathon || "",
        item.category,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [query, category, bucket, organization, hackathon]);

  const quickStats = useMemo(() => {
    const total = sihProblemStatements.length;
    const software = sihProblemStatements.filter((idea) => idea.category === "Software").length;
    const hardware = total - software;
    return { total, software, hardware };
  }, []);

  const copyIdea = async (statementId: string, title: string) => {
    const payload = `${statementId} - ${title}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopiedId(statementId);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  };

  const startProjectFromIdea = (idea: (typeof sihProblemStatements)[number]) => {
    const tracks = getSuggestedTracks(idea.technologyBucket, idea.category);
    const params = new URLSearchParams({
      ideaId: idea.statementId,
      ideaTitle: idea.title,
      ideaDescription: `${idea.description}\n\nProblem Statement ID: ${idea.statementId}\nSource: ${idea.sourceHackathon || "Open Innovation"}\nTechnology Bucket: ${idea.technologyBucket}`,
      ideaTracks: tracks.join(","),
      ideaTech: idea.tags.join(","),
    });

    router.push(`/student/my-project/create?${params.toString()}`);
  };

  if (!token || user?.role !== "STUDENT") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading project ideas...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#cad4e3] text-slate-900">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Project Ideas" />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6">
          <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-linear-to-br from-[#f8fbff] via-[#e9f1ff] to-[#f1f7ff] p-6 md:p-8 shadow-[0_18px_50px_rgba(55,94,161,0.15)]">
            <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-blue-300/25 blur-2xl" />
            <div className="absolute -left-12 -bottom-14 h-48 w-48 rounded-full bg-cyan-300/25 blur-2xl" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-center">
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                  <Sparkles size={14} />
                  Smart India Hackathon Inspired Bank
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
                  Pick a problem statement and start building your next project
                </h2>
                <p className="text-sm md:text-base text-slate-600 max-w-3xl">
                  Curated SIH-style ideas are added so students can shortlist topics quickly, align with their skills,
                  and move straight into execution.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MetricCard label="Total Ideas" value={String(quickStats.total)} tone="blue" />
                <MetricCard label="Software" value={String(quickStats.software)} tone="emerald" />
                <MetricCard label="Hardware" value={String(quickStats.hardware)} tone="amber" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 md:p-5 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_repeat(4,minmax(0,1fr))] gap-3">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3">
                <Search size={16} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title, statement id, tag, organization"
                  className="w-full h-11 bg-transparent text-sm outline-none"
                />
              </label>

              <FilterSelect
                icon={<Filter size={16} className="text-slate-500" />}
                value={category}
                onChange={setCategory}
                options={categoryOptions}
              />

              <FilterSelect
                icon={<Tag size={16} className="text-slate-500" />}
                value={bucket}
                onChange={setBucket}
                options={bucketOptions}
              />

              <FilterSelect
                icon={<Building2 size={16} className="text-slate-500" />}
                value={organization}
                onChange={setOrganization}
                options={organizationOptions}
              />

              <FilterSelect
                icon={<Sparkles size={16} className="text-slate-500" />}
                value={hackathon}
                onChange={setHackathon}
                options={hackathonOptions}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
              <p>
                Showing <span className="font-semibold text-slate-800">{filteredIdeas.length}</span> ideas
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                  setBucket("All");
                  setOrganization("All");
                  setHackathon("All");
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200"
              >
                Reset Filters
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-2">
            {filteredIdeas.map((idea) => (
              <article
                key={idea.statementId}
                className="group rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {idea.statementId}
                  </span>
                  {idea.sourceHackathon && (
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                      {idea.sourceHackathon}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      idea.category === "Software"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {idea.category}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {idea.difficulty}
                  </span>
                </div>

                <h3 className="text-base md:text-lg font-semibold text-slate-800 leading-snug mb-2 group-hover:text-blue-700 transition-colors">
                  {idea.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed mb-4">{idea.description}</p>

                <div className="space-y-2 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <BookOpenText size={14} className="text-slate-500" />
                    <span className="font-semibold text-slate-700">Bucket:</span> {idea.technologyBucket}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Department:</span> {idea.department}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Organization:</span> {idea.organization}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Hackathon:</span>{" "}
                    {idea.sourceHackathon || "Open Innovation"}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {idea.tags.slice(0, 4).map((tag) => (
                    <span
                      key={`${idea.statementId}-${tag}`}
                      className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => copyIdea(idea.statementId, idea.title)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Clipboard size={14} />
                    {copiedId === idea.statementId ? "Copied" : "Copy Idea"}
                  </button>
                  <button
                    onClick={() => startProjectFromIdea(idea)}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <Rocket size={14} />
                    Start Project
                  </button>
                </div>
              </article>
            ))}
          </section>

          {filteredIdeas.length === 0 && (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center">
              <Lightbulb size={20} className="mx-auto text-slate-500 mb-2" />
              <h3 className="text-lg font-semibold text-slate-800">No ideas found</h3>
              <p className="text-sm text-slate-600 mt-1">
                Try removing some filters or searching with broader keywords.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterSelect({
  icon,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (next: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
      {icon}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 bg-transparent text-sm outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "emerald" | "amber";
}) {
  const toneClass: Record<typeof tone, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div className={`rounded-xl border p-3 ${toneClass[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold leading-tight">{value}</p>
    </div>
  );
}
