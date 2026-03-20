"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";
import { getMyProjects } from "@/services/project.service";
import DailyLogForm from "@/components/protrack/DailyLogForm";
import DailyLogsView from "@/components/protrack/DailyLogsView";
import ProgressScoreCard from "@/components/protrack/ProgressScoreCard";
import MentorFeedbackPanel from "@/components/protrack/MentorFeedbackPanel";
import GithubCommitsTimeline from "@/components/protrack/GithubCommitsTimeline";
import { useAuth } from "@/store/auth.store";

type StudentProject = {
  project_id: string;
  title?: string;
  status?: string;
};

export default function ProTrackPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const res = await getMyProjects();
        const list = (res.projects || []) as StudentProject[];
        setProjects(list);

        if (list.length > 0) {
          setSelectedProjectId(String(list[0].project_id));
        }
      } catch {
        setError("Failed to load your projects");
      } finally {
        setLoading(false);
      }
    };

    void loadProjects();
  }, []);

  const handleLogCreated = () => {
    // Refresh the logs view
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#d6e3f2] text-slate-900">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="ProTrack Enhancement" />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Header Section */}
          <section className="rounded-3xl border border-sky-100/80 bg-linear-to-br from-white via-sky-50/40 to-blue-100/30 p-4 md:p-5 shadow-[0_14px_34px_rgba(44,78,130,0.12)]">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  ProTrack Enhancement
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Daily logs, progress scores, feedback, and commit tracking
                </p>
              </div>

              <div className="w-full md:w-96">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Select Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-xl border border-sky-200 bg-white/95 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  disabled={loading}
                >
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.title || project.project_id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-sm">
              {error}
            </div>
          )}

          {!selectedProjectId && !loading ? (
            <div className="bg-white/88 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-[0_14px_30px_rgba(42,74,128,0.12)] p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-4">
                <span className="text-3xl">📁</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">No projects found</p>
              <p className="text-xs text-slate-500 mt-1">Please join a project to start tracking</p>
            </div>
          ) : (
            <>
              {/* Top Row: Daily Log Form + Progress Score */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <DailyLogForm projectId={selectedProjectId} onLogCreated={handleLogCreated} />
                </div>
                <div className="lg:col-span-1">
                  {user?.user_key && (
                    <ProgressScoreCard
                      projectId={selectedProjectId}
                      studentUserKey={user.user_key}
                    />
                  )}
                </div>
              </div>

              {/* Middle Row: Daily Logs View */}
              <div>
                <DailyLogsView projectId={selectedProjectId} refreshTrigger={refreshTrigger} />
              </div>

              {/* Bottom Row: Mentor Feedback + GitHub Commits */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MentorFeedbackPanel projectId={selectedProjectId} isStudent={true} />
                <GithubCommitsTimeline projectId={selectedProjectId} />
              </div>

              {/* Info Banner */}
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-3xl">💡</div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">ProTrack Tips</h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• <strong>Daily Logs:</strong> Track your progress every day for better insights</li>
                      <li>• <strong>Progress Scores:</strong> Calculated weekly by your mentor (Git 30pts, Tasks 35pts, Submissions 25pts, Logs 10pts)</li>
                      <li>• <strong>Mentor Feedback:</strong> Read and reply to mentor messages promptly</li>
                      <li>• <strong>Commits:</strong> Your GitHub activity is automatically tracked</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <style jsx global>{`
        .tracker-progress-shell {
          background: radial-gradient(
            circle at 8% -12%,
            rgba(77, 144, 255, 0.22) 0%,
            rgba(214, 227, 242, 0.6) 38%,
            rgba(214, 227, 242, 0.95) 100%
          );
        }
      `}</style>
    </div>
  );
}
