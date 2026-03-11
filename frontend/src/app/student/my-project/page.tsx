'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Sidebar from '@/components/sidebar/StudentSidebar'
import Topbar from '@/components/dashboard/Topbar'
import UiverseButton from '@/components/ui/uiverse-button'

import { getMyProjects } from '@/services/project.service'
import { Project } from '@/types/project'

export default function MyProjectPage() {
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  /* ================= FETCH PROJECTS ================= */
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getMyProjects()
        setProjects(res.projects ?? [])
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
              onClick={() =>
                router.push('/student/my-project/create')
              }
            >
              + Create Project
            </UiverseButton>
          </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.project_id}
                  onClick={() =>
                    router.push(
                      `/student/my-project/${project.project_id}`
                    )
                  }
                  className="glass rounded-2xl p-5 category-hover flex flex-col gap-3 cursor-pointer transition-all hover:shadow-lg"
                >
                  {/* HEADER */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">
                        {project.title}
                      </h3>
                      <p className="text-xs text-slate-600 truncate">
                        Project ID: {project.project_id}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
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

                  {/* META */}
                  <div className="text-sm text-slate-700 space-y-1">
                    <p className="truncate">
                      <strong>Track:</strong>{' '}
                      {project.track || '—'}
                    </p>
                    <p className="truncate">
                      <strong>Mentor:</strong>{' '}
                      {project.mentor_employee_id || 'Not Assigned'}
                    </p>
                    <p className="truncate">
                      <strong>Created:</strong>{' '}
                      {new Date(
                        project.created_at
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  {/* TECH STACK */}
                  {project.tech_stack?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {project.tech_stack.map((t) => (
                        <span
                          key={t}
                          className="px-3 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800 truncate"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* ACTION */}
                  <div className="mt-auto pt-3">
                    <button
                      onClick={() =>
                        router.push(
                          `/student/my-project/${project.project_id}`
                        )
                      }
                      className="open-pill-btn w-full"
                    >
                      View Project →
                    </button>
                  </div>
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

        .category-hover {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .category-hover:hover {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.18);
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
