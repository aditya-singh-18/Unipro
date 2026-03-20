"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMentorSkill,
  deleteMentorSkill,
  getMentorProfile,
  getMentorSkills,
  type MentorProfile,
  type MentorSkill,
  updateMentorProfile,
} from "@/services/mentor.service";
import {
  Briefcase,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Trash2,
  Plus,
  Save,
  UserCircle2,
  Edit,
  X,
  Code2,
  Smartphone,
  Brain,
  Database,
  Lock,
  Blocks,
  Cloud,
  GitBranch,
  Cpu,
  Boxes,
  Zap,
  Gauge,
  Server,
} from "lucide-react";
import {
  TRACK_OPTIONS as SHARED_TRACK_OPTIONS,
  TRACK_TECH_STACK as SHARED_TRACK_TECH_STACK,
} from "@/constants/track-tech";

type SkillForm = {
  track: string;
  tech_stack: string;
  proficiency_level: string;
};

const TRACK_TECH_STACKS = SHARED_TRACK_TECH_STACK as unknown as Record<string, string[]>;
const TRACK_OPTIONS = SHARED_TRACK_OPTIONS;
const TRACK_OPTION_VALUES: string[] = [...TRACK_OPTIONS];
const PROFICIENCY_OPTIONS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const CUSTOM_OPTION = "__CUSTOM__";

const normalizeSkillValue = (value: string) => value.trim().toLowerCase();

// Tech stack icon mapper
const getTechStackIcon = (track: string) => {
  const trackUpper = track.toUpperCase();
  if (trackUpper.includes('WEB') || trackUpper.includes('DEVELOPMENT')) return <Code2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('MOBILE')) return <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('AI') || trackUpper.includes('ARTIFICIAL')) return <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('MACHINE') || trackUpper.includes('ML')) return <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('DATA')) return <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('CYBER') || trackUpper.includes('SECURITY')) return <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('BLOCKCHAIN')) return <Blocks className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('CLOUD')) return <Cloud className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('DEVOPS')) return <GitBranch className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('IOT')) return <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('EMBEDDED')) return <Cpu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('AR') || trackUpper.includes('VR')) return <Boxes className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('GAME')) return <Boxes className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  if (trackUpper.includes('DATABASE')) return <Server className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
    const iconClass = "h-4 w-4 sm:h-5 sm:w-5";
    return <Code2 className={iconClass} />; // default
};

export default function MentorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSkill, setSavingSkill] = useState(false);
  const [error, setError] = useState("");
  const [duplicateSkillToast, setDuplicateSkillToast] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<number | null>(null);

  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [skills, setSkills] = useState<MentorSkill[]>([]);

  const [profileForm, setProfileForm] = useState({
    department: "",
    designation: "",
    contact_number: "",
    primary_track: "",
    secondary_tracks: [] as string[],
  });
  const [customPrimaryTrack, setCustomPrimaryTrack] = useState("");

  const [skillForm, setSkillForm] = useState<SkillForm>({
    track: TRACK_OPTIONS[0],
    tech_stack: "",
    proficiency_level: "INTERMEDIATE",
  });
  const [customSkillTrack, setCustomSkillTrack] = useState("");
  const [customTechStack, setCustomTechStack] = useState("");

  const totalSkills = skills.length;
  const advancedSkills = useMemo(
    () => skills.filter((s) => s.proficiency_level === "ADVANCED").length,
    [skills]
  );

  const availableTechStacks = useMemo(() => {
    if (skillForm.track === CUSTOM_OPTION) return [];
    return TRACK_TECH_STACKS[skillForm.track] || [];
  }, [skillForm.track]);

  const hydrate = async () => {
    setLoading(true);
    setError("");
    try {
      const [profileData, skillsData] = await Promise.all([
        getMentorProfile(),
        getMentorSkills(),
      ]);

      setProfile(profileData);
      setSkills(skillsData);

      const currentPrimaryTrack = profileData.primary_track || "";
      const isKnownPrimaryTrack = TRACK_OPTION_VALUES.includes(currentPrimaryTrack);

      setProfileForm({
        department: profileData.department || "",
        designation: profileData.designation || "",
        contact_number: profileData.contact_number || "",
        primary_track: isKnownPrimaryTrack
          ? currentPrimaryTrack
          : currentPrimaryTrack
          ? CUSTOM_OPTION
          : "",
        secondary_tracks: profileData.secondary_tracks || [],
      });

      if (currentPrimaryTrack && !isKnownPrimaryTrack) {
        setCustomPrimaryTrack(currentPrimaryTrack);
      }
    } catch {
      setError("Failed to load mentor profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!duplicateSkillToast) return;

    const timeoutId = window.setTimeout(() => {
      setDuplicateSkillToast("");
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [duplicateSkillToast]);

  const onSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    setError("");

    try {
      const resolvedPrimaryTrack =
        profileForm.primary_track === CUSTOM_OPTION
          ? customPrimaryTrack.trim()
          : profileForm.primary_track;

      const updated = await updateMentorProfile({
        department: profileForm.department || undefined,
        designation: profileForm.designation || undefined,
        contact_number: profileForm.contact_number || undefined,
        primary_track: resolvedPrimaryTrack || undefined,
        secondary_tracks: profileForm.secondary_tracks,
      });

      setProfile(updated);
      setIsEditingProfile(false);
    } catch {
      setError("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onCancelEdit = () => {
    if (!profile) return;
    
    // Reset form to current profile values
    const currentPrimaryTrack = profile.primary_track || "";
    const isKnownPrimaryTrack = TRACK_OPTION_VALUES.includes(currentPrimaryTrack);

    setProfileForm({
      department: profile.department || "",
      designation: profile.designation || "",
      contact_number: profile.contact_number || "",
      primary_track: isKnownPrimaryTrack
        ? currentPrimaryTrack
        : currentPrimaryTrack
        ? CUSTOM_OPTION
        : "",
      secondary_tracks: profile.secondary_tracks || [],
    });

    if (currentPrimaryTrack && !isKnownPrimaryTrack) {
      setCustomPrimaryTrack(currentPrimaryTrack);
    } else {
      setCustomPrimaryTrack("");
    }

    setIsEditingProfile(false);
    setError("");
  };

  const onToggleSecondaryTrack = (track: string) => {
    if (!isEditingProfile) return; // Only allow toggle when editing
    
    setProfileForm((prev) => {
      const exists = prev.secondary_tracks.includes(track);
      return {
        ...prev,
        secondary_tracks: exists
          ? prev.secondary_tracks.filter((t) => t !== track)
          : [...prev.secondary_tracks, track],
      };
    });
  };

  const onAddSkill = async () => {
    const resolvedTrack =
      skillForm.track === CUSTOM_OPTION ? customSkillTrack.trim() : skillForm.track;

    const resolvedTechStack =
      skillForm.tech_stack === CUSTOM_OPTION
        ? customTechStack.trim()
        : skillForm.tech_stack.trim();

    if (!resolvedTrack || !resolvedTechStack) return;

    const duplicateSkillExists = skills.some(
      (skill) =>
        normalizeSkillValue(skill.track) === normalizeSkillValue(resolvedTrack) &&
        normalizeSkillValue(skill.tech_stack) === normalizeSkillValue(resolvedTechStack)
    );

    if (duplicateSkillExists) {
      setError("");
      setDuplicateSkillToast("Duplicate skills cannot be added.");
      return;
    }

    setSavingSkill(true);
    setError("");
    try {
      await addMentorSkill({
        tech_stack: resolvedTechStack,
        track: resolvedTrack,
        skill_type:
          skillForm.track === CUSTOM_OPTION || skillForm.tech_stack === CUSTOM_OPTION
            ? "CUSTOM"
            : "PREDEFINED",
        proficiency_level: skillForm.proficiency_level,
      });

      setSkillForm({
        track: TRACK_OPTIONS[0],
        tech_stack: "",
        proficiency_level: "INTERMEDIATE",
      });
      setCustomSkillTrack("");
      setCustomTechStack("");

      const refreshed = await getMentorSkills();
      setSkills(refreshed);
    } catch (error: unknown) {
      let message = "Failed to add skill.";

      if (typeof error === "object" && error !== null && "response" in error) {
        const responseMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        if (typeof responseMessage === "string" && responseMessage.trim()) {
          message = responseMessage;
        }
      }

      if (message === "This tech stack is already added for the selected track.") {
        setError("");
        setDuplicateSkillToast("Duplicate skills cannot be added.");
        return;
      }

      setError(message);
    } finally {
      setSavingSkill(false);
    }
  };

  const confirmDeleteSkill = async () => {
    if (!skillToDelete) return;
    
    setError("");
    try {
      await deleteMentorSkill(skillToDelete);
      setSkills((prev) => prev.filter((s) => s.id !== skillToDelete));
      setSkillToDelete(null);
    } catch {
      setError("Failed to delete skill.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-[#2c4c7c]" />
      </div>
    );
  }

  if (!profile) {
    return <div className="p-6 text-red-600">Mentor profile not found.</div>;
  }

  return (
    <main className="min-h-full overflow-x-hidden bg-gradient-to-br from-slate-100 via-[#eef3fb] to-slate-100 p-2 sm:p-4 lg:p-6">
      {duplicateSkillToast && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 px-3 sm:px-4">
          <div className="rounded-full border border-amber-200 bg-white/95 px-4 py-2 text-[11px] font-medium text-amber-700 shadow-lg backdrop-blur sm:text-xs">
            {duplicateSkillToast}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-3 sm:space-y-4 lg:space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5">
          <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="rounded-xl bg-[#2c4c7c] p-2 sm:p-2.5 text-white">
                <UserCircle2 className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0">
                <h1
                  className="truncate text-base sm:text-lg lg:text-xl font-bold text-slate-900"
                  title={profile.full_name}
                >
                  {profile.full_name}
                </h1>
                <p className="truncate text-xs sm:text-sm text-slate-600" title={`${profile.employee_id} • ${profile.official_email}`}>
                  {profile.employee_id} • {profile.official_email}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold ${
                profile.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              <ShieldCheck className="mr-0.5 sm:mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{profile.is_active ? "Active Mentor" : "Inactive Mentor"}</span>
              <span className="sm:hidden">{profile.is_active ? "Active" : "Inactive"}</span>
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
          <StatCard title="Total Skills" value={String(totalSkills)} icon={<Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />} />
          <StatCard title="Advanced Skills" value={String(advancedSkills)} icon={<Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />} />
          <StatCard title="Primary Track" value={profile.primary_track || "Not set"} icon={<ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />} />
        </section>

        <section className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5">
            <div className="mb-3 sm:mb-4 flex items-center justify-between">
              <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900">Profile Details</h2>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#2c4c7c] px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-[#2c4c7c] transition hover:bg-[#2c4c7c] hover:text-white"
                >
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
              <InfoRow label="Official Email" value={profile.official_email} icon={<Mail className="h-3 w-3 sm:h-4 sm:w-4" />} />

              <label className="text-xs sm:text-sm text-slate-700">
                Department
                <input
                  value={profileForm.department}
                  onChange={(e) => setProfileForm((p) => ({ ...p, department: e.target.value }))}
                  disabled={!isEditingProfile}
                  className={`mt-1 w-full rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-[#2c4c7c] focus:outline-none ${
                    isEditingProfile
                      ? "border-slate-300 bg-white"
                      : "border-slate-200 bg-slate-50 cursor-not-allowed text-slate-600"
                  }`}
                />
              </label>

              <label className="text-xs sm:text-sm text-slate-700">
                Designation
                <input
                  value={profileForm.designation}
                  onChange={(e) => setProfileForm((p) => ({ ...p, designation: e.target.value }))}
                  disabled={!isEditingProfile}
                  className={`mt-1 w-full rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-[#2c4c7c] focus:outline-none ${
                    isEditingProfile
                      ? "border-slate-300 bg-white"
                      : "border-slate-200 bg-slate-50 cursor-not-allowed text-slate-600"
                  }`}
                />
              </label>

              <label className="text-xs sm:text-sm text-slate-700">
                Contact Number
                <div className="relative mt-1">
                  <Phone className="pointer-events-none absolute left-2.5 sm:left-3 top-2 sm:top-2.5 h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                  <input
                    value={profileForm.contact_number}
                    onChange={(e) => setProfileForm((p) => ({ ...p, contact_number: e.target.value }))}
                    disabled={!isEditingProfile}
                    className={`w-full rounded-lg border py-1.5 sm:py-2 pl-8 sm:pl-9 pr-2.5 sm:pr-3 text-xs sm:text-sm focus:border-[#2c4c7c] focus:outline-none ${
                      isEditingProfile
                        ? "border-slate-300 bg-white"
                        : "border-slate-200 bg-slate-50 cursor-not-allowed text-slate-600"
                    }`}
                  />
                </div>
              </label>

              {isEditingProfile && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={onSaveProfile}
                    disabled={savingProfile}
                    className="flex-1 inline-flex items-center justify-center rounded-lg bg-[#2c4c7c] px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-[#223d66] disabled:opacity-60"
                  >
                    <Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {savingProfile ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={onCancelEdit}
                    disabled={savingProfile}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    <X className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5">
            <h2 className="mb-3 sm:mb-4 text-sm sm:text-base lg:text-lg font-semibold text-slate-900">Track Preferences</h2>

            <label className="block text-xs sm:text-sm text-slate-700">
              Primary Track
              <select
                value={profileForm.primary_track}
                onChange={(e) => setProfileForm((p) => ({ ...p, primary_track: e.target.value }))}
                disabled={!isEditingProfile}
                className={`mt-1 w-full rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-[#2c4c7c] focus:outline-none ${
                  isEditingProfile
                    ? "border-slate-300 bg-white"
                    : "border-slate-200 bg-slate-50 cursor-not-allowed text-slate-600"
                }`}
              >
                <option value="">Select track</option>
                {TRACK_OPTIONS.map((track) => (
                  <option key={track} value={track}>
                    {track}
                  </option>
                ))}
                <option value={CUSTOM_OPTION}>Custom (create your own)</option>
              </select>
            </label>

            {profileForm.primary_track === CUSTOM_OPTION && (
              <label className="mt-2 sm:mt-3 block text-xs sm:text-sm text-slate-700">
                Custom Primary Track
                <input
                  value={customPrimaryTrack}
                  onChange={(e) => setCustomPrimaryTrack(e.target.value)}
                  disabled={!isEditingProfile}
                  placeholder="e.g. QUANT_COMPUTING"
                  className={`mt-1 w-full rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-[#2c4c7c] focus:outline-none ${
                    isEditingProfile
                      ? "border-slate-300 bg-white"
                      : "border-slate-200 bg-slate-50 cursor-not-allowed text-slate-600"
                  }`}
                />
              </label>
            )}

            <div className="mt-3 sm:mt-4">
              <p className="mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium text-slate-700">Secondary Tracks</p>
              {!isEditingProfile && (
                <p className="mb-2 sm:mb-3 text-[10px] sm:text-xs text-slate-500">
                  Click &quot;Edit&quot; to modify your track selections
                </p>
              )}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
                {TRACK_OPTIONS.map((track) => {
                  const selected = profileForm.secondary_tracks.includes(track);
                  return (
                    <button
                      type="button"
                      key={track}
                      onClick={() => onToggleSecondaryTrack(track)}
                      disabled={!isEditingProfile}
                      className={`min-w-0 truncate rounded-md border px-1.5 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-xs font-medium transition ${
                        selected
                          ? isEditingProfile
                            ? "border-[#2c4c7c] bg-[#2c4c7c] text-white hover:bg-[#223d66]"
                            : "border-[#2c4c7c] bg-[#2c4c7c] text-white cursor-not-allowed"
                          : isEditingProfile
                          ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          : "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                      }`}
                      title={track}
                    >
                      {track}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5">
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900">Skill Matrix</h2>
            {!isEditingSkills && (
              <button
                onClick={() => setIsEditingSkills(true)}
                className="inline-flex items-center rounded-lg bg-[#2c4c7c] px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-[#1e3250]"
              >
                <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>

          {!isEditingSkills ? (
            /* VIEW MODE - Show skills as cards with icons */
            <div>
              {skills.length === 0 ? (
                <p className="text-center py-6 sm:py-8 text-xs sm:text-sm text-slate-500">
                  No skills added yet. Click Edit to add skills.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:gap-2.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-2.5 sm:p-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-2 sm:gap-2.5">
                        <div className="rounded-md bg-[#2c4c7c]/10 p-1.5 sm:p-2 text-[#2c4c7c]">
                          {getTechStackIcon(skill.track)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 text-xs sm:text-sm truncate" title={skill.tech_stack}>
                            {skill.tech_stack}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-slate-600 truncate" title={skill.track}>
                            {skill.track}
                          </p>
                          <div className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-emerald-700">
                            {skill.proficiency_level}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* EDIT MODE - Show form and table */
            <div>
              <div className="grid grid-cols-1 gap-2 sm:gap-2.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <select
              value={skillForm.track}
              onChange={(e) => {
                setSkillForm((p) => ({ ...p, track: e.target.value, tech_stack: "" }));
                setCustomSkillTrack("");
                setCustomTechStack("");
              }}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-[#2c4c7c] focus:outline-none"
            >
              {TRACK_OPTIONS.map((track) => (
                <option key={track} value={track}>
                  {track}
                </option>
              ))}
              <option value={CUSTOM_OPTION}>Custom Track</option>
            </select>

            {skillForm.track === CUSTOM_OPTION ? (
              <input
                value={customSkillTrack}
                onChange={(e) => setCustomSkillTrack(e.target.value)}
                placeholder="Enter custom track"
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-[#2c4c7c] focus:outline-none"
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-slate-500">
                Predefined track selected
              </div>
            )}

            {skillForm.track === CUSTOM_OPTION ? (
              <input
                value={customTechStack}
                onChange={(e) => setCustomTechStack(e.target.value)}
                placeholder="Enter custom tech stack"
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-[#2c4c7c] focus:outline-none"
              />
            ) : (
              <select
                value={skillForm.tech_stack}
                onChange={(e) => setSkillForm((p) => ({ ...p, tech_stack: e.target.value }))}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-[#2c4c7c] focus:outline-none"
              >
                <option value="">Select tech stack</option>
                {availableTechStacks.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
                <option value={CUSTOM_OPTION}>Custom Tech Stack</option>
              </select>
            )}

            {skillForm.tech_stack === CUSTOM_OPTION && skillForm.track !== CUSTOM_OPTION ? (
              <input
                value={customTechStack}
                onChange={(e) => setCustomTechStack(e.target.value)}
                placeholder="Enter custom tech stack"
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-[#2c4c7c] focus:outline-none"
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-slate-500">
                {skillForm.track === CUSTOM_OPTION ? "Using custom tech" : "Predefined tech"}
              </div>
            )}

            <select
              value={skillForm.proficiency_level}
              onChange={(e) =>
                setSkillForm((p) => ({ ...p, proficiency_level: e.target.value }))
              }
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-[#2c4c7c] focus:outline-none"
            >
              {PROFICIENCY_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>

            <button
              onClick={onAddSkill}
              disabled={savingSkill}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{savingSkill ? "Adding..." : "Add Skill"}</span>
              <span className="sm:hidden">{savingSkill ? "Add..." : "Add"}</span>
            </button>
          </div>

          <p className="mt-2 text-[10px] sm:text-xs text-slate-500">
            Choose predefined track + tech stack for faster setup, or select custom to add your own stack.
          </p>

          <div className="mt-3 sm:mt-4 overflow-x-auto rounded-lg sm:rounded-xl border border-slate-100">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[10px] sm:text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 sm:py-3 px-2 sm:px-0">Tech Stack</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-0">Track</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-0 hidden md:table-cell">Type</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-0">Level</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-0">Action</th>
                </tr>
              </thead>
              <tbody>
                {skills.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 sm:py-6 text-center text-xs sm:text-sm text-slate-500">
                      No skills added yet.
                    </td>
                  </tr>
                )}
                {skills.map((skill) => (
                  <tr key={skill.id} className="border-b border-slate-100 text-xs sm:text-sm text-slate-700">
                    <td className="py-2 sm:py-3 pr-2 px-2 sm:px-0 font-medium text-slate-900 wrap-break-word max-w-30 sm:max-w-none truncate" title={skill.tech_stack}>{skill.tech_stack}</td>
                    <td className="py-2 sm:py-3 pr-2 px-2 sm:px-0 wrap-break-word max-w-25 sm:max-w-none truncate" title={skill.track}>{skill.track}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-0 hidden md:table-cell">{skill.skill_type}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-0 text-[10px] sm:text-xs">{skill.proficiency_level}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-0">
                      <button
                          onClick={() => setSkillToDelete(skill.id)}
                        className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="mr-0.5 sm:mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                        <span className="sm:hidden">Del</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

                <div className="mt-3 sm:mt-4 flex justify-end gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setIsEditingSkills(false);
                      setSkillToDelete(null);
                    }}
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <X className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                    Cancel
                  </button>
                  <button
                    onClick={() => setIsEditingSkills(false)}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <Save className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </button>
                </div>
              </div>
            )}
        </section>
      </div>

        {/* Confirmation Dialog for Skill Deletion */}
        {skillToDelete !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-4 sm:p-6 shadow-2xl">
              <div className="mb-3 sm:mb-4 flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2 sm:p-2.5 text-red-600">
                  <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">Remove Skill</h3>
              </div>
              <p className="mb-4 sm:mb-6 text-xs sm:text-sm text-slate-600">
                Are you sure you want to remove this skill? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setSkillToDelete(null)}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSkill}
                  className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <Trash2 className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
      <div className="mb-2 inline-flex rounded-lg bg-slate-100 p-1.5 sm:p-2 text-slate-700">{icon}</div>
      <p className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-0.5 sm:mt-1 truncate text-lg sm:text-xl lg:text-2xl font-bold text-slate-900" title={value}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-2.5">
      <p className="mb-0.5 sm:mb-1 text-[10px] sm:text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium text-slate-800 truncate">
        {icon}
        <span className="truncate">{value || "-"}</span>
      </p>
    </div>
  );
}
