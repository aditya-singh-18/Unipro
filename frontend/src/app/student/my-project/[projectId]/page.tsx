'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import Sidebar from '@/components/sidebar/StudentSidebar'
import Topbar from '@/components/dashboard/Topbar'
import UiverseButton from '@/components/ui/uiverse-button'
import ResubmitProjectModal from '@/components/modals/ResubmitProjectModal'

import { getProjectDetail } from '@/services/project.service'

interface ProjectDetail {
  project: {
    project_id: string
    title: string
    description: string
    track: string
    tech_stack: string[]
    status: string
    submitted_at: string
    mentor_feedback?: string
    created_at: string
    updated_at: string
  }
  team: {
    team_id: string
    team_name?: string | null
    department: string
    leader_enrollment_id: string
    members: Array<{
      enrollment_id: string
      name: string
      email: string
    }>
  }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false)

  /* ================= FETCH PROJECT DETAIL ================= */
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true)
        const res = await getProjectDetail(projectId)
        setProject(res)
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'response' in err
            ? // @ts-expect-error Axios error shape
              err.response?.data?.message
            : null
        setError(message || 'Failed to fetch project')
      } finally {
        setLoading(false)
      }
    }
    if (projectId) fetchProject()
  }, [projectId])

  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-slate-300 text-[#1f2a44]">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Topbar title="Project Detail" />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-lg">Loading...</p>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-slate-300 text-[#1f2a44]">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Topbar title="Project Detail" />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
            <UiverseButton
              variant="back"
              onClick={() => router.back()}
              className="mt-4"
            >
              ← Back
            </UiverseButton>
          </main>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-slate-300 text-[#1f2a44]">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Topbar title="Project Detail" />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-lg">Project not found</p>
          </main>
        </div>
      </div>
    )
  }

  const { project: proj, team } = project

  const formatDateSafe = (value?: string) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700'
      case 'REJECTED':
        return 'bg-red-100 text-red-700'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  /* ================= FORMAT DESCRIPTION ================= */
  const formatDescription = (description: string) => {
    const normalized = String(description || '').replace(/\r\n/g, '\n').trim()
    if (!normalized) {
      return { isStructured: false, paragraphs: [] as string[] }
    }

    const headingMap: Array<{ title: string; keys: string[] }> = [
      { title: 'Problem Statement', keys: ['problem statement'] },
      { title: 'Objective of the Project', keys: ['objective of the project', 'objective'] },
      { title: 'Proposed Solution', keys: ['proposed solution', 'what your team provides'] },
      { title: 'Scope of the Project', keys: ['scope of the project', 'scope', 'real-world use', 'real world use'] },
    ]

    const findHeading = (line: string) => {
      const clean = line
        .toLowerCase()
        .replace(/^\d+\s*[.)-]?\s*/, '')
        .replace(/[0-9]\uFE0F?\u20E3/g, '')
        .replace(/[:\-\s]+$/g, '')
        .trim()

      return headingMap.find((h) => h.keys.includes(clean))
    }

    const lines = normalized.split('\n')
    const parsedSections: { title: string; content: string[] }[] = []
    let activeTitle: string | null = null
    let buffer: string[] = []

    const flush = () => {
      if (!activeTitle) return
      const content = buffer
        .join('\n')
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)

      if (content.length > 0) {
        parsedSections.push({ title: activeTitle, content })
      }
      buffer = []
    }

    lines.forEach((line) => {
      const heading = findHeading(line.trim())
      if (heading) {
        flush()
        activeTitle = heading.title
        return
      }
      buffer.push(line)
    })

    flush()

    if (parsedSections.length === 0) {
      const paragraphs = normalized
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
      return { isStructured: false, paragraphs }
    }

    return { isStructured: true, sections: parsedSections }
  }

  const formattedDesc = formatDescription(proj.description)

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-linear-to-br from-slate-100 to-slate-200">
      {/* ✅ SINGLE SIDEBAR */}
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Project Detail" />

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 md:py-5">
          {/* Back Button & Edit Button */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <UiverseButton
              variant="back"
              onClick={() => router.back()}
            >
              ← Back
            </UiverseButton>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Resubmit Button - Only show if REJECTED */}
              {proj.status === 'REJECTED' && (
                <button
                  onClick={() => setResubmitModalOpen(true)}
                  className="rounded-lg bg-linear-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
                >
                  🔄 Resubmit Project
                </button>
              )}
              
              {/* Edit Button - Only show if not approved */}
              {proj.status !== 'APPROVED' && proj.status !== 'REJECTED' && (
                <button
                  onClick={() => router.push(`/student/my-project/${projectId}/edit`)}
                  className="rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-blue-600 hover:to-blue-700"
                >
                  ✏️ Edit Project
                </button>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* LEFT COLUMN - Project Details */}
            <div className="space-y-4 lg:col-span-2">
              {/* PROJECT TITLE CARD */}
              <div className="rounded-2xl border-2 border-slate-300 bg-linear-to-br from-slate-50 to-slate-100 p-5 shadow-lg md:p-7">
                {/* Project ID and Status */}
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <span className="inline-block rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-700">
                      📌 Project ID: {proj.project_id}
                    </span>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusColor(proj.status)}`}>
                    {proj.status === 'APPROVED' && '✓ ' }
                    {proj.status === 'REJECTED' && '✗ '}
                    {proj.status === 'PENDING' && '⏳ '}
                    {proj.status === 'ASSIGNED_TO_MENTOR' && '👨‍🏫 '}
                    {proj.status === 'RESUBMITTED' && '🔄 '}
                    {proj.status}
                  </span>
                </div>

                {/* Title */}
                <h1 className="mb-3 wrap-break-word text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl lg:text-[1.75rem]">{proj.title}</h1>
                <p className="text-sm font-medium text-slate-600 md:text-base">Project Track: <span className="font-bold text-indigo-700">{proj.track}</span></p>
              </div>

              {/* DESCRIPTION SECTIONS - SEPARATE CARDS */}
              {formattedDesc.isStructured ? (
                // Structured description - Each section in separate card
                formattedDesc.sections?.map((section, idx) => {
                  // Color themes for each section
                  const themes = [
                    { bg: 'bg-gradient-to-br from-red-50 to-orange-50', border: 'border-red-200', icon: '🔍', iconBg: 'bg-red-100', iconText: 'text-red-600' },
                    { bg: 'bg-gradient-to-br from-blue-50 to-indigo-50', border: 'border-blue-200', icon: '🎯', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
                    { bg: 'bg-gradient-to-br from-green-50 to-emerald-50', border: 'border-green-200', icon: '💡', iconBg: 'bg-green-100', iconText: 'text-green-600' },
                    { bg: 'bg-gradient-to-br from-purple-50 to-pink-50', border: 'border-purple-200', icon: '📋', iconBg: 'bg-purple-100', iconText: 'text-purple-600' },
                  ]
                  const theme = themes[idx] || themes[0]

                  return (
                    <div key={idx} className={`${theme.bg} border-2 ${theme.border} rounded-2xl p-5 shadow-lg md:p-6`}>
                      {/* Section Header */}
                      <div className="mb-4 flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${theme.iconBg}`}>
                          {theme.icon}
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 md:text-xl">{section.title}</h2>
                      </div>

                      {/* Section Content */}
                      <div className="space-y-4">
                        {section.content.map((para, pIdx) => {
                          // Check if it's a list item
                          const isList = para.includes('\n') || para.match(/^[\-\•\*]/m)
                          
                          if (isList) {
                            const items = para.split('\n')
                              .map(item => item.trim())
                              .filter(item => item.length > 0)
                            
                            return (
                              <ul key={pIdx} className="space-y-2">
                                {items.map((item, iIdx) => (
                                  <li key={iIdx} className="flex items-start gap-2 text-sm leading-6 text-slate-700 md:text-[15px]">
                                    <span className={`${theme.iconText} font-bold mt-1`}>▸</span>
                                    <span className="flex-1">{item.replace(/^[\-\•\*]\s*/, '')}</span>
                                  </li>
                                ))}
                              </ul>
                            )
                          }
                          
                          return (
                            <p key={pIdx} className="text-sm leading-6 text-slate-700 md:text-[15px]">
                              {para}
                            </p>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              ) : (
                // Regular description - Single card
                <div className="rounded-2xl bg-white p-5 shadow-lg md:p-6">
                  <h2 className="mb-3 text-xl font-bold text-slate-900">Description</h2>
                  <div className="space-y-4">
                    {formattedDesc.paragraphs?.map((para, idx) => (
                      <p key={idx} className="text-sm leading-6 text-slate-700 md:text-[15px]">
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* TECH STACK & TRACK CARD */}
              <div className="space-y-5 rounded-2xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-pink-50 p-5 shadow-lg md:p-6">
                {/* Tech Stack */}
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-200 text-lg">
                      ⚙️
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Tech Stack</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {proj.tech_stack && proj.tech_stack.length > 0 ? (
                      proj.tech_stack.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-full border-2 border-purple-300 bg-white px-3 py-1 text-xs font-semibold text-purple-700 md:text-sm"
                        >
                          {tech}
                        </span>
                      ))
                    ) : (
                      <p className="text-slate-500">No tech stack specified</p>
                    )}
                  </div>
                </div>
              </div>

              {/* MENTOR FEEDBACK CARD */}
              {proj.mentor_feedback && (
                <div className="rounded-2xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50 p-5 shadow-lg md:p-6">
                  <h2 className="mb-3 text-xl font-bold text-blue-900">💬 Mentor Feedback</h2>
                  <p className="text-sm leading-6 text-slate-700 md:text-[15px]">{proj.mentor_feedback}</p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN - Team & Timeline */}
            <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              {/* TEAM INFO CARD */}
              <div className="rounded-2xl border-2 border-indigo-200 bg-linear-to-br from-indigo-50 to-blue-50 p-4 shadow-lg md:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-200 text-base">
                    👥
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Team</h2>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-2 border border-indigo-100">
                    <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Team Name</p>
                    <p className="wrap-break-word text-sm font-bold text-indigo-700">{team.team_name || team.team_id}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-2 border border-indigo-100">
                    <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Team ID</p>
                    <p className="break-all font-mono text-xs font-semibold text-slate-900">{team.team_id}</p>
                  </div>

                  <div className="bg-white rounded-lg p-2 border border-indigo-100">
                    <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Department</p>
                    <p className="text-xs font-semibold text-slate-900">{team.department}</p>
                  </div>

                  <div className="bg-white rounded-lg p-2 border border-indigo-100">
                    <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Leader</p>
                    <p className="text-xs font-semibold text-slate-900">{team.leader_enrollment_id}</p>
                  </div>

                  <div className="mt-3 border-t border-indigo-200 pt-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Members ({team.members.length})</p>
                    <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                      {team.members.map((member, idx) => (
                        <div
                          key={member.enrollment_id}
                          className="bg-white rounded-lg p-2 border border-indigo-200 hover:border-indigo-400 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-400 text-[10px] font-bold text-white">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900">{member.enrollment_id}</p>
                              {member.email && (
                                <p className="text-xs text-slate-500 truncate">{member.email}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* View Progress Button */}
                <button className="mt-3 w-full rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-4 py-2 text-xs font-semibold text-white transition-all hover:from-blue-700 hover:to-blue-800">
                  View Progress
                </button>
              </div>

              {/* TIMELINE CARD */}
              <div className="rounded-2xl border-2 border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-5 shadow-lg md:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-200 text-lg">
                    📅
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Timeline</h2>
                </div>
                <div className="space-y-4">
                  <div className="pb-4 border-b border-amber-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Created</p>
                    <p className="text-sm font-semibold text-slate-900">{formatDateSafe(proj.created_at)}</p>
                  </div>
                  <div className="pb-4 border-b border-amber-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Submitted</p>
                    <p className="text-sm font-semibold text-slate-900">{formatDateSafe(proj.submitted_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Last Updated</p>
                    <p className="text-sm font-semibold text-slate-900">{formatDateSafe(proj.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* RESUBMIT PROJECT MODAL */}
      <ResubmitProjectModal
        project={proj ? {
          project_id: proj.project_id,
          title: proj.title,
          description: proj.description,
          tech_stack: proj.tech_stack,
          track: proj.track,
          status: proj.status,
          mentor_feedback: proj.mentor_feedback,
        } : null}
        isOpen={resubmitModalOpen}
        onClose={() => setResubmitModalOpen(false)}
        onResubmitSuccess={() => {
          // Refresh project data
          const fetchProject = async () => {
            try {
              const res = await getProjectDetail(projectId)
              setProject(res)
            } catch (err: unknown) {
              console.error('Failed to refresh project:', err)
            }
          }
          fetchProject()
        }}
      />
    </div>
  )
}
