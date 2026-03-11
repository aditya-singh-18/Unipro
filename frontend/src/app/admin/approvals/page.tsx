"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import MentorSelectionModal from "@/components/modals/MentorSelectionModal";
import { getAdminComplianceBoard, type AdminComplianceItem } from "@/services/tracker.service";

type PendingProject = {
  project_id: string;
  title: string;
  description: string;
  tech_stack: string[];
  created_at?: string;
};

export default function AdminApprovalsPage() {
  const router = useRouter();
  const [pendingProjects, setPendingProjects] = useState<PendingProject[]>([]);
  const [complianceMap, setComplianceMap] = useState<Record<string, AdminComplianceItem>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<PendingProject | null>(null);

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return pendingProjects;

    return pendingProjects.filter((project) => {
      const hay = [
        project.project_id,
        project.title,
        project.description,
        ...(project.tech_stack || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [pendingProjects, query]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [pendingRes, complianceRes] = await Promise.allSettled([
        axios.get("/project/admin/pending"),
        getAdminComplianceBoard({ page: 1, pageSize: 200 }),
      ]);

      if (pendingRes.status === "fulfilled") {
        setPendingProjects(pendingRes.value.data.projects || []);
      } else {
        setPendingProjects([]);
      }

      if (complianceRes.status === "fulfilled") {
        const map = Object.fromEntries(
          complianceRes.value.items.map((item) => [String(item.project_id), item])
        );
        setComplianceMap(map);
      } else {
        setComplianceMap({});
      }
    } catch {
      setError("Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleMentorAssigned = () => {
    void fetchData();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
            <p className="mt-1 text-sm text-slate-500">Assign mentors to pending projects and move them into tracker flow.</p>
          </div>
          <div className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-700">
            Pending: {pendingProjects.length}
          </div>
        </div>

        <div className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by project id, title, tech stack..."
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </section>

      {error && <div className="rounded-xl bg-rose-100 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading pending approvals...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 text-center text-slate-500">No pending projects found.</div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project) => {
              const compliance = complianceMap[String(project.project_id)];
              return (
                <div key={project.project_id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{project.title}</h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{project.project_id}</span>
                        {compliance ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              compliance.compliance_status === "critical"
                                ? "bg-rose-100 text-rose-700"
                                : compliance.compliance_status === "warning"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            tracker: {compliance.compliance_status}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-slate-600">{project.description}</p>

                      {project.tech_stack?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {project.tech_stack.map((tech) => (
                            <span key={`${project.project_id}-${tech}`} className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                              {tech}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-3 text-xs text-slate-500">
                        Created: {project.created_at ? new Date(project.created_at).toLocaleString() : "-"}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => router.push(`/admin/projects?projectId=${encodeURIComponent(String(project.project_id))}`)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Open Oversight
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProject(project);
                          setModalOpen(true);
                        }}
                        className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Assign Mentor
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <MentorSelectionModal
        isOpen={modalOpen && !!selectedProject}
        onClose={() => setModalOpen(false)}
        projectId={String(selectedProject?.project_id || "")}
        projectTitle={String(selectedProject?.title || "")}
        onMentorAssigned={handleMentorAssigned}
      />
    </div>
  );
}
