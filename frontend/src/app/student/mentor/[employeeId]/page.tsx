'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  ArrowLeft,
} from 'lucide-react';

import Sidebar from '@/components/sidebar/StudentSidebar';
import Topbar from '@/components/dashboard/Topbar';
import { getStudentViewMentorProfile, type MentorProfile, type MentorSkill } from '@/services/mentor.service';

const trackLabel = (value: string | null | undefined) => value || 'Not set';

function InfoCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-900 wrap-break-word">{value}</p>
    </div>
  );
}

function StatMini({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-slate-500">{icon}</div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function StudentMentorProfilePage() {
  const params = useParams<{ employeeId: string }>();
  const router = useRouter();
  const employeeId = Array.isArray(params?.employeeId) ? params.employeeId[0] : params?.employeeId;

  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!employeeId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getStudentViewMentorProfile(employeeId);
        setProfile(data);
      } catch {
        setError('Unable to load mentor profile');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [employeeId]);

  const skills = useMemo(() => profile?.skills || [], [profile]);
  const advancedSkills = useMemo(
    () => skills.filter((skill) => skill.proficiency_level === 'ADVANCED').length,
    [skills]
  );

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-300 text-slate-900">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Mentor Profile" />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          {loading && <div className="glass rounded-2xl p-8 text-slate-600">Loading mentor profile...</div>}

          {!loading && error && <div className="glass rounded-2xl p-8 text-rose-700">{error}</div>}

          {!loading && profile && (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="rounded-2xl bg-[#2c4c7c]/10 p-4 text-[#2c4c7c]">
                      <UserCircle2 className="h-12 w-12" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="truncate text-2xl font-bold text-slate-900">{profile.full_name}</h1>
                      <p className="truncate text-sm text-slate-600">{profile.employee_id} • {profile.official_email}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      profile.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    <ShieldCheck className="mr-1 h-4 w-4" />
                    {profile.is_active ? 'Active Mentor' : 'Inactive Mentor'}
                  </span>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatMini title="Total Skills" value={String(skills.length)} icon={<Sparkles className="h-5 w-5" />} />
                <StatMini title="Advanced Skills" value={String(advancedSkills)} icon={<Briefcase className="h-5 w-5" />} />
                <StatMini title="Primary Track" value={trackLabel(profile.primary_track)} icon={<ShieldCheck className="h-5 w-5" />} />
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <InfoCard label="Official Email" value={profile.official_email || '-'} icon={<Mail className="h-4 w-4" />} />
                <InfoCard label="Contact Number" value={profile.contact_number || '-'} icon={<Phone className="h-4 w-4" />} />
                <InfoCard label="Department" value={profile.department || '-'} icon={<Briefcase className="h-4 w-4" />} />
                <InfoCard label="Designation" value={profile.designation || '-'} icon={<ShieldCheck className="h-4 w-4" />} />
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Track Preferences</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Primary Track</p>
                    <p className="mt-1 text-sm text-slate-900">{trackLabel(profile.primary_track)}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-600">Secondary Tracks</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(profile.secondary_tracks || []).length > 0 ? (
                        profile.secondary_tracks.map((track) => (
                          <span key={track} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {track}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No secondary tracks added.</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Skill Matrix</h2>

                {skills.length === 0 ? (
                  <p className="text-sm text-slate-500">No skills added yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {skills.map((skill: MentorSkill) => (
                      <div key={skill.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-base font-semibold text-slate-900">{skill.tech_stack}</p>
                        <p className="mt-1 text-sm text-slate-600">{skill.track}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {skill.skill_type}
                          </span>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            {skill.proficiency_level}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      <style jsx global>{`
        .glass {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
        }
      `}</style>
    </div>
  );
}