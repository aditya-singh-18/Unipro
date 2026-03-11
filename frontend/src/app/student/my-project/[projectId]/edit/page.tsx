'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

import Sidebar from '@/components/sidebar/StudentSidebar'
import Topbar from '@/components/dashboard/Topbar'
import UiverseButton from '@/components/ui/uiverse-button'

import { getProjectDetail, updateProject } from '@/services/project.service'

interface ProjectEditForm {
  title: string
  description: string
  track: string
  techStack: string
}

type ProjectDetails = {
  project_id: string
  title: string
  description: string
  track: string
  tech_stack: string[]
}

export default function ProjectEditPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<ProjectEditForm>()

  /* ================= FETCH PROJECT DETAIL ================= */
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true)
        const res = await getProjectDetail(projectId)
        setProject(res.project)
        reset({
          title: res.project.title,
          description: res.project.description,
          track: res.project.track,
          techStack: (res.project.tech_stack || []).join(', '),
        })
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
  }, [projectId, reset])

  /* ================= HANDLE SUBMIT ================= */
  const onSubmit = async (data: ProjectEditForm) => {
    try {
      setSubmitting(true)
      setError(null)

      const techStackArray = data.techStack
        .split(',')
        .map((tech) => tech.trim())
        .filter((tech) => tech !== '')

      if (techStackArray.length === 0) {
        setError('Please add at least one technology')
        setSubmitting(false)
        return
      }

      await updateProject(projectId, {
        title: data.title,
        description: data.description,
        track: data.track,
        techStack: techStackArray,
      })

      router.push(`/student/my-project/${projectId}`)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? // @ts-expect-error Axios error shape
            err.response?.data?.message
          : null
      setError(message || 'Failed to update project')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Topbar title="Edit Project" />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-lg">Loading...</p>
          </main>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Topbar title="Edit Project" />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Error</p>
              <p>{error || 'Project not found'}</p>
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

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Edit Project" />

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6">
          {/* Back Button */}
          <div className="mb-6">
            <UiverseButton
              variant="back"
              onClick={() => router.back()}
            >
              ← Back
            </UiverseButton>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* HEADER */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Edit Project Details</h1>
              <p className="text-slate-600">Update your project information before mentor approval</p>
              <p className="text-sm text-slate-500 mt-4">
                <span className="font-semibold">Note:</span> Once your project is approved by mentor, you won&apos;t be able to edit it.
              </p>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div className="bg-red-100 border border-red-300 rounded-2xl shadow-lg p-6 mb-8">
                <p className="text-red-700 font-semibold">{error}</p>
              </div>
            )}

            {/* EDIT FORM */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* PROJECT ID (READ-ONLY) */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Project ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectId}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 font-mono font-semibold cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-2">Project ID cannot be changed</p>
              </div>

              {/* TITLE */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., AI Attendance System"
                  {...register('title', {
                    required: 'Title is required',
                    minLength: { value: 5, message: 'Title must be at least 5 characters' },
                  })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-2">{errors.title.message}</p>
                )}
              </div>

              {/* DESCRIPTION */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Project Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Describe your project in detail..."
                  rows={6}
                  {...register('description', {
                    required: 'Description is required',
                    minLength: { value: 20, message: 'Description must be at least 20 characters' },
                  })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-2">{errors.description.message}</p>
                )}
              </div>

              {/* TRACK */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Project Track <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('track', { required: 'Track is required' })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                >
                  <option value="">Select a track</option>
                  <option value="AI/WEB">AI/WEB</option>
                  <option value="AI/Automation">AI/Automation</option>
                  <option value="WEB">WEB</option>
                  <option value="Mobile">Mobile</option>
                  <option value="IoT">IoT</option>
                  <option value="Blockchain">Blockchain</option>
                  <option value="Other">Other</option>
                </select>
                {errors.track && (
                  <p className="text-red-500 text-sm mt-2">{errors.track.message}</p>
                )}
              </div>

              {/* TECH STACK */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Technologies / Tech Stack <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., React, Node.js, MongoDB, OpenCV"
                  {...register('techStack', {
                    required: 'Please add at least one technology',
                  })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Separate multiple technologies with commas (,)
                </p>
                {errors.techStack && (
                  <p className="text-red-500 text-sm mt-2">{errors.techStack.message}</p>
                )}

                {/* PREVIEW */}
                {watch('techStack') && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600 mb-3 font-semibold">Preview:</p>
                    <div className="flex flex-wrap gap-2">
                      {watch('techStack')
                        .split(',')
                        .map((tech) => tech.trim())
                        .filter((tech) => tech !== '')
                        .map((tech, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold border border-blue-200"
                          >
                            {tech}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BUTTONS */}
              <div className="bg-white rounded-2xl shadow-lg p-8 flex gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-900 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
