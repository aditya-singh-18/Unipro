'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Sidebar from '@/components/sidebar/StudentSidebar'
import Topbar from '@/components/dashboard/Topbar'
import UiverseButton from '@/components/ui/uiverse-button'

import { getMyProjects } from '@/services/project.service'
import { getPublicSystemAccess } from '@/services/systemSettings.service'
import { Project } from '@/types/project'

export default function MyProjectPage() {
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [projectCreationAllowed, setProjectCreationAllowed] = useState(true)

  /* ================= FETCH PROJECTS ================= */
  useEffect(() => {
    const fetch = async () => {
      try {
        const [res, access] = await Promise.all([
          getMyProjects(),
          getPublicSystemAccess(),
        ])
        setProjects(res.projects ?? [])
        setProjectCreationAllowed(Boolean(access.allow_project_creation))
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-300 text-[#1f2a44]">
      {/* ✅ SINGLE SIDEBAR */}
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="My Project" />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
          {/* ================= HEADER ACTIONS ================= */}
          <div className="flex items-center justify-between">
            <UiverseButton
              variant="back"
              onClick={() => router.back()}
            >
              ← Back
            </UiverseButton>

            <UiverseButton
              variant="create"
              disabled={!projectCreationAllowed}
              onClick={() =>
                router.push('/student/my-project/create')
              }
            >
              + Create Project
            </UiverseButton>
          </div>

          {!projectCreationAllowed && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Project creation is currently disabled by admin settings.
            </div>
          )}

          {/* ================= LOADING ================= */}
          {loading && (
            <div className="text-slate-600">
              Loading projects…
            </div>
          )}

          {/* ================= NO PROJECT ================= */}
          {!loading && projects.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-slate-700">
                You have not created any project yet.
              </p>
            </div>
          )}

          {/* ================= PROJECT LIST ================= */}
          {!loading && projects.length > 0 && (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.project_id}
                  className="glass rounded-2xl p-4 md:p-5 row-hover"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-5">
                    <div className="min-w-0 xl:w-[28%]">
                      <p className="text-lg font-semibold text-slate-900 truncate">
                        {project.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 truncate">
                        Project ID: {project.project_id}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 xl:w-[52%] text-sm text-slate-700">
                      <div className="rounded-xl bg-white/70 px-3 py-2 border border-slate-200">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Status</p>
                        <span
                          className={`mt-1 inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            project.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : project.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-700'
                              : project.status === 'REJECTED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>

                      <div className="rounded-xl bg-white/70 px-3 py-2 border border-slate-200 min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Track</p>
                        <p className="mt-1 font-medium truncate">{project.track || '—'}</p>
                      </div>

                      <div className="rounded-xl bg-white/70 px-3 py-2 border border-slate-200 min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Mentor</p>
                        <p className="mt-1 font-medium truncate">{project.mentor_name || 'Not Assigned'}</p>
                      </div>

                      <div className="rounded-xl bg-white/70 px-3 py-2 border border-slate-200">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Created</p>
                        <p className="mt-1 font-medium">
                          {new Date(project.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="xl:w-[20%] xl:pl-2">
                      <button
                        onClick={() =>
                          router.push(`/student/my-project/${project.project_id}`)
                        }
                        className="open-pill-btn w-full"
                      >
                        View Project →
                      </button>
                    </div>
                  </div>

                  {project.tech_stack?.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {project.tech_stack.map((t) => (
                        <span
                          key={t}
                          className="px-3 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ================= STYLES ================= */}
      <style jsx global>{`
        .glass {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
        }

        .row-hover {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .row-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 24px 44px rgba(0, 0, 0, 0.14);
        }

        .open-pill-btn {
          padding: 0.75em 1.6em;
          border-radius: 999px;
          border: 2px solid #2563eb;
          font-size: 13px;
          letter-spacing: 1px;
          font-weight: 500;
          background: #ffffff;
          color: #1e40af;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .open-pill-btn:hover {
          background-color: #2563eb;
          color: #fff;
          transform: translateY(-4px);
          box-shadow: 0px 14px 26px rgba(37, 99, 235, 0.45);
        }
      `}</style>
    </div>
  )
}
