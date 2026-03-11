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
    // Split by emoji indicators or section markers
    const sections = [
      { emoji: '3️⃣', title: 'Problem Statement', key: 'problem' },
      { emoji: '4️⃣', title: 'Objective of the Project', key: 'objective' },
      { emoji: '5️⃣', title: 'Proposed Solution', key: 'solution' },
      { emoji: '6️⃣', title: 'Scope of the Project', key: 'scope' },
    ]

    const parsedSections: { title: string; content: string[] }[] = []

    sections.forEach((section, index) => {
      const startMarker = section.emoji
      const nextMarker = sections[index + 1]?.emoji || null

      const startIndex = description.indexOf(startMarker)
      if (startIndex === -1) return

      let endIndex = nextMarker ? description.indexOf(nextMarker) : description.length
      if (endIndex === -1) endIndex = description.length

      const content = description.substring(startIndex, endIndex)
        .replace(startMarker, '')
        .replace(section.title, '')
        .trim()

      // Split into paragraphs and bullet points
      const paragraphs = content
        .split(/\n\n|\r\n\r\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      if (paragraphs.length > 0) {
        parsedSections.push({ title: section.title, content: paragraphs })
      }
    })

    // If no sections found, treat as regular description
    if (parsedSections.length === 0) {
      const paragraphs = description
        .split(/\n\n|\r\n\r\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0)
      return { isStructured: false, paragraphs }
    }

    return { isStructured: true, sections: parsedSections }
  }

  const formattedDesc = formatDescription(proj.description)

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
      {/* ✅ SINGLE SIDEBAR */}
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Project Detail" />

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6">
          {/* Back Button & Edit Button */}
          <div className="flex items-center justify-between mb-8">
            <UiverseButton
              variant="back"
              onClick={() => router.back()}
            >
              ← Back
            </UiverseButton>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              {/* Resubmit Button - Only show if REJECTED */}
              {proj.status === 'REJECTED' && (
                <button
                  onClick={() => setResubmitModalOpen(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-orange-200"
                >
                  🔄 Resubmit Project
                </button>
              )}
              
              {/* Edit Button - Only show if not approved */}
              {proj.status !== 'APPROVED' && proj.status !== 'REJECTED' && (
                <button
                  onClick={() => router.push(`/student/my-project/${projectId}/edit`)}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-200"
                >
                  ✏️ Edit Project
                </button>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN - Project Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* PROJECT TITLE CARD */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-2xl shadow-lg p-10">
                {/* Project ID and Status */}
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-2">
                    <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-full tracking-wider">
                      📌 Project ID: {proj.project_id}
                    </span>
                  </div>
                  <span className={`px-5 py-2 rounded-full text-sm font-bold ${getStatusColor(proj.status)}`}>
                    {proj.status === 'APPROVED' && '✓ ' }
                    {proj.status === 'REJECTED' && '✗ '}
                    {proj.status === 'PENDING' && '⏳ '}
                    {proj.status === 'ASSIGNED_TO_MENTOR' && '👨‍🏫 '}
                    {proj.status === 'RESUBMITTED' && '🔄 '}
                    {proj.status}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-3">{proj.title}</h1>
                <p className="text-lg text-slate-600 font-medium">Project Track: <span className="text-indigo-700 font-bold">{proj.track}</span></p>
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
                    <div key={idx} className={`${theme.bg} border-2 ${theme.border} rounded-2xl shadow-lg p-8`}>
                      {/* Section Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 ${theme.iconBg} rounded-xl flex items-center justify-center text-2xl`}>
                          {theme.icon}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
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
                              <ul key={pIdx} className="space-y-3">
                                {items.map((item, iIdx) => (
                                  <li key={iIdx} className="flex items-start gap-3 text-slate-700 leading-relaxed">
                                    <span className={`${theme.iconText} font-bold mt-1`}>▸</span>
                                    <span className="flex-1">{item.replace(/^[\-\•\*]\s*/, '')}</span>
                                  </li>
                                ))}
                              </ul>
                            )
                          }
                          
                          return (
                            <p key={pIdx} className="text-slate-700 text-base leading-relaxed">
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
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Description</h2>
                  <div className="space-y-4">
                    {formattedDesc.paragraphs?.map((para, idx) => (
                      <p key={idx} className="text-slate-700 text-base leading-relaxed">
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* TECH STACK & TRACK CARD */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl shadow-lg p-8 space-y-6">
                {/* Tech Stack */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center text-xl">
                      ⚙️
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Tech Stack</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {proj.tech_stack && proj.tech_stack.length > 0 ? (
                      proj.tech_stack.map((tech) => (
                        <span
                          key={tech}
                          className="bg-white text-purple-700 px-4 py-2 rounded-full text-sm font-bold border-2 border-purple-300 hover:shadow-lg transition-all hover:scale-105"
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
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-blue-900 mb-4">💬 Mentor Feedback</h2>
                  <p className="text-slate-700 leading-relaxed text-lg">{proj.mentor_feedback}</p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN - Team & Timeline */}
            <div className="space-y-6">
              {/* TEAM INFO CARD */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-200 rounded-lg flex items-center justify-center text-xl">
                    👥
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Team</h2>
                </div>
                
                <div className="space-y-5">
                  <div className="bg-white rounded-lg p-3 border border-indigo-100">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Team Name</p>
                    <p className="text-lg font-bold text-indigo-700">{team.team_name || team.team_id}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-indigo-100">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Team ID</p>
                    <p className="text-sm font-semibold text-slate-900 break-all font-mono">{team.team_id}</p>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-indigo-100">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Department</p>
                    <p className="text-sm font-semibold text-slate-900">{team.department}</p>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-indigo-100">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Leader</p>
                    <p className="text-sm font-semibold text-slate-900">{team.leader_enrollment_id}</p>
                  </div>

                  <div className="pt-4 border-t border-indigo-200 mt-4">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Members ({team.members.length})</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {team.members.map((member, idx) => (
                        <div
                          key={member.enrollment_id}
                          className="bg-white rounded-lg p-3 border border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-slate-900">{member.enrollment_id}</p>
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
                <button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 shadow-lg">
                  View Progress
                </button>
              </div>

              {/* TIMELINE CARD */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center text-xl">
                    📅
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Timeline</h2>
                </div>
                <div className="space-y-4">
                  <div className="pb-4 border-b border-amber-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Created</p>
                    <p className="text-base font-semibold text-slate-900">
                      {new Date(proj.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="pb-4 border-b border-amber-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Submitted</p>
                    <p className="text-base font-semibold text-slate-900">
                      {new Date(proj.submitted_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Last Updated</p>
                    <p className="text-base font-semibold text-slate-900">
                      {new Date(proj.updated_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
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
