"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/store/auth.store";
import {
  updateSocialLinks,
  deleteSocialLink,
} from "@/services/profile.service";
import {
  updateStudentBio,
  getStudentProfile,
} from "@/services/student.service";
import {
  Github,
  Linkedin,
  Globe,
  Edit,
  Camera,
  X,
} from "lucide-react";
import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";

/* ================= TYPES ================= */

type SocialLink = {
  platform: string;
  link: string;
};

const PLATFORMS = [
  "github",
  "linkedin",
  "portfolio",
  "twitter",
  "instagram",
  "leetcode",
  "hackerrank",
  "codechef",
  "codeforces",
  "gmail",
];

const MAX_LINKS = 10;

/* ================= IMAGE CROP + RESIZE ================= */

function cropAndResizeImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => (img.src = reader.result as string);

    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;

      ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);

      canvas.toBlob((blob) => {
        if (!blob) return;
        resolve(URL.createObjectURL(blob));
      }, "image/jpeg");
    };

    reader.readAsDataURL(file);
  });
}

/* ================= PAGE ================= */

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [bioEditMode, setBioEditMode] = useState(false);
  const [bio, setBio] = useState("");
  const [bioEdit, setBioEdit] = useState("");
  const [bioSaving, setBioSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [duplicatePlatform, setDuplicatePlatform] =
    useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<string | null>(null);

  /* ===== UNDO ===== */
  const [undoItem, setUndoItem] = useState<SocialLink | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* ===== AVATAR ===== */
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] =
    useState<string | null>(null);

  const profileImage =
    user && typeof user === "object"
      ? (user as { profileImage?: string }).profileImage
      : undefined;

  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (user?.socialLinks && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setLinks(user.socialLinks);
    }
  }, [user?.socialLinks]);

  // Fetch bio from API on mount
  useEffect(() => {
    const fetchBio = async () => {
      try {
        const profile = await getStudentProfile();
        if (profile) {
          // Always set bio state, even if empty
          setBio(profile.bio || '');
          setBioEdit(profile.bio || '');
        }
      } catch (error) {
        console.error("Failed to fetch bio:", error);
      }
    };
    fetchBio();
  }, []);

  if (!user) return null;

  /* ================= AVATAR ================= */

  const onAvatarClick = () => fileRef.current?.click();

  const onAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const cropped = await cropAndResizeImage(file);
    setAvatarPreview(cropped);
  };

  const resetAvatar = () => {
    setAvatarPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ================= SOCIAL ================= */

  const addLink = () => {
    if (links.length >= MAX_LINKS) return;
    setLinks((p) => [...p, { platform: "", link: "" }]);
  };

  const updateLink = (
    index: number,
    field: keyof SocialLink,
    value: string
  ) => {
    setLinks((prev) => {
      const copy = [...prev];

      if (
        field === "platform" &&
        value &&
        copy.some(
          (l, i) => l.platform === value && i !== index
        )
      ) {
        setDuplicatePlatform(value);
        return prev;
      }

      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  /* ===== DELETE FLOW (UNCHANGED + UNDO ADDED) ===== */

  const removeLink = (platform: string) => {
    setDeleteTarget(platform);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const deleted = links.find(
      (l) => l.platform === deleteTarget
    );
    if (!deleted) return;

    await deleteSocialLink(deleteTarget);

    setLinks((p) =>
      p.filter((l) => l.platform !== deleteTarget)
    );

    setUndoItem(deleted);
    setShowUndo(true);

    if (undoTimerRef.current)
      clearTimeout(undoTimerRef.current);

    undoTimerRef.current = setTimeout(() => {
      setShowUndo(false);
      setUndoItem(null);
    }, 6000);

    await refreshUser();
    setDeleteTarget(null);
  };

  const undoDelete = async () => {
    if (!undoItem) return;

    await fetch(
      `/api/profile/me/social-links/${undoItem.platform}/undo`,
      { method: "POST" }
    );

    setLinks((p) => [...p, undoItem]);
    setUndoItem(null);
    setShowUndo(false);

    if (undoTimerRef.current)
      clearTimeout(undoTimerRef.current);
  };

  const saveLinks = async () => {
    if (links.some((l) => !l.platform || !l.link)) {
      alert("Fill all links properly");
      return;
    }

    setSaving(true);
    await updateSocialLinks(links);
    await refreshUser();
    setEditMode(false);
    setSaving(false);
  };

  const saveBio = async () => {
    if (!bioEdit.trim()) {
      alert("Bio cannot be empty");
      return;
    }

    setBioSaving(true);
    try {
      await updateStudentBio(bioEdit);
      setBio(bioEdit);
      setBioEditMode(false);
      
      // Fetch fresh bio from API to ensure sync
      const profile = await getStudentProfile();
      if (profile) {
        setBio(profile.bio || '');
      }
      
      await refreshUser();
    } catch (error) {
      console.error("Failed to save bio:", error);
      alert("Failed to save bio");
    } finally {
      setBioSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-blue-50 to-purple-50 flex">
      {/* FIXED SIDEBAR */}
      <div className="fixed left-0 top-0 h-screen border-r border-slate-200 z-40 shadow-xl">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      {/* MAIN CONTENT AREA */}
      <div
        className={`flex-1 ${sidebarCollapsed ? "ml-15" : "ml-54"} flex flex-col transition-all duration-300`}
      >
        <Topbar title="Student Profile" />

        <main className="flex-1 p-6 md:p-8 bg-linear-to-br from-slate-100 via-blue-50 to-purple-50 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* OVERVIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* AVATAR & NAME CARD */}
              <div className="bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl shadow-xl border-2 border-blue-200/60 p-6 md:p-8 flex flex-col items-center text-center gap-4 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <p className="text-xs font-bold text-indigo-700 bg-linear-to-r from-indigo-100 to-blue-100 px-4 py-1.5 rounded-full border border-indigo-200">My Profile</p>

                {/* AVATAR */}
                <div className="relative w-32 h-32 md:w-36 md:h-36 group">
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-2xl bg-linear-to-br from-blue-400 via-indigo-400 to-purple-400 flex items-center justify-center text-4xl font-bold text-white ring-4 ring-blue-200/50">
                    {avatarPreview || profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(avatarPreview as string) || profileImage || ""}
                        alt={user.name || "avatar"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (user.name || "?").charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="absolute inset-0 rounded-full bg-linear-to-br from-blue-600/80 to-purple-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 text-white backdrop-blur-sm">
                    <button onClick={onAvatarClick} aria-label="Upload avatar" className="hover:bg-white/30 p-3 rounded-full transition-all duration-200 hover:scale-110">
                      <Camera size={24} />
                    </button>
                    {avatarPreview && (
                      <button onClick={resetAvatar} aria-label="Remove avatar" className="hover:bg-white/30 p-3 rounded-full transition-all duration-200 hover:scale-110">
                        <X size={24} />
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarChange}
                  />
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">{user.name}</h1>
                  <p className="text-xs text-slate-700 font-semibold">
                    {user.department || "N/A"} • Year {user.year || "—"}
                  </p>
                  <p className="inline-block mt-2 bg-linear-to-r from-green-400 to-emerald-400 text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-md">
                    ✓ {user.status || "ACTIVE"}
                  </p>
                </div>
              </div>

              {/* INFO CARD */}
              <div className="bg-linear-to-br from-white to-slate-50 rounded-2xl shadow-xl border-2 border-slate-200/60 p-6 md:p-8 lg:col-span-2 hover:shadow-2xl transition-all duration-300">
                <div className="space-y-2 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-2xl">👤</span> Personal Information
                  </h3>
                  <div className="h-1 w-20 bg-linear-to-r from-indigo-400 via-blue-400 to-purple-400 rounded-full"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Info label="Enrollment No" value={user.enrollmentId} color="indigo" />
                  <Info label="Department" value={user.department} color="blue" />
                  <Info label="Roll No" value={user.rollNumber} color="purple" />
                  <Info label="Division" value={user.division} color="slate" />
                  <Info label="Email" value={user.email} color="orange" />
                  <Info label="Contact" value={user.contactNumber} color="green" />
                </div>
              </div>
            </div>

            {/* BIO SECTION */}
            <div className="bg-linear-to-br from-white to-amber-50/30 rounded-2xl shadow-lg border border-amber-200/50 p-6 md:p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-2xl">✨</span> About Me
                  </h3>
                  <div className="h-1 w-16 bg-linear-to-r from-amber-400 via-orange-400 to-amber-400 rounded-full"></div>
                </div>
                {!bioEditMode && (
                  <button
                    onClick={() => setBioEditMode(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold border-2 border-amber-300 bg-linear-to-r from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 hover:border-amber-400 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <Edit size={16} /> Edit Bio
                  </button>
                )}
              </div>

              {!bioEditMode ? (
                <div className="bg-linear-to-br from-amber-50/50 to-orange-50/50 border-2 border-amber-200/60 rounded-xl p-6 min-h-32 backdrop-blur-sm">
                  {bio ? (
                    <p className="text-slate-800 leading-relaxed text-base font-medium">
                      {bio}
                    </p>
                  ) : (
                    <p className="text-slate-400 italic text-sm flex items-center gap-2">
                      <span className="text-xl">💭</span> No bio added yet. Click &quot;Edit Bio&quot; to share something about yourself!
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4 bg-linear-to-br from-slate-50 to-amber-50/30 p-6 rounded-xl border-2 border-amber-200/60">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">
                      Write your bio <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={bioEdit}
                      onChange={(e) => setBioEdit(e.target.value)}
                      placeholder="Share your interests, achievements, goals, and what makes you unique..."
                      maxLength={500}
                      rows={6}
                      className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-amber-200 focus:border-amber-400 resize-none transition-all duration-200"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{bioEdit.length}/500 characters</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setBioEdit(bio);
                          setBioEditMode(false);
                        }}
                        className="border-2 border-slate-300 px-6 py-2.5 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveBio}
                        disabled={bioSaving || !bioEdit.trim()}
                        className="bg-linear-to-r from-amber-500 via-orange-500 to-amber-500 text-white px-8 py-2.5 rounded-xl font-bold hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        {bioSaving ? "Saving..." : "💾 Save Bio"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SOCIAL LINKS */}
            <div className="bg-linear-to-br from-white to-purple-50/30 rounded-2xl shadow-lg border-2 border-purple-200/50 p-6 md:p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-2xl">🔗</span> Social Links
                  </h3>
                  <div className="h-1 w-16 bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 rounded-full"></div>
                </div>
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold border-2 border-purple-300 bg-linear-to-r from-purple-50 to-pink-50 text-purple-700 rounded-xl hover:from-purple-100 hover:to-pink-100 hover:border-purple-400 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <Edit size={16} /> Manage
                  </button>
                )}
              </div>

              {!editMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {links.length === 0 ? (
                    <div className="md:col-span-2 text-center py-16 bg-linear-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200/60">
                      <p className="text-2xl mb-3">🌐</p>
                      <p className="text-slate-600 font-semibold mb-3">No social links added yet</p>
                      <button
                        onClick={() => setEditMode(true)}
                        className="text-purple-600 font-bold hover:underline text-base"
                      >
                        ➕ Add your first link
                      </button>
                    </div>
                  ) : (
                    links.map((s, i) => (
                      <div
                        key={`${s.platform}-${i}`}
                        className="border-2 border-purple-200/60 rounded-2xl p-4 flex items-center justify-between bg-linear-to-br from-white to-purple-50/50 hover:shadow-lg hover:border-purple-400 transition-all duration-300 transform hover:scale-105"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-3 rounded-xl bg-linear-to-br from-purple-100 to-pink-100 border-2 border-purple-200">
                            <Icon platform={s.platform} />
                          </div>
                          <div className="min-w-0">
                            <p className="capitalize font-bold text-slate-900">{s.platform}</p>
                            <p className="text-[11px] text-slate-500 truncate max-w-56">{s.link}</p>
                          </div>
                        </div>

                        <a
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border-2 border-purple-300 rounded-xl text-xs bg-linear-to-r from-purple-50 to-pink-50 text-purple-700 hover:from-purple-100 hover:to-pink-100 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
                        >
                          Open →
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}

              {editMode && (
                <div className="space-y-4 bg-linear-to-br from-slate-50 to-purple-50/30 p-6 rounded-xl border-2 border-purple-200/60">
                  {links.map((s, i) => (
                    <div key={i} className="flex flex-col md:flex-row gap-3 p-4 bg-white rounded-xl border-2 border-purple-200/60 hover:border-purple-300 transition-all duration-200">
                      <select
                        value={s.platform}
                        onChange={(e) =>
                          updateLink(
                            i,
                            "platform",
                            e.target.value
                          )
                        }
                        className="border-2 border-purple-300 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all duration-200"
                      >
                        <option value="">Select platform</option>
                        {PLATFORMS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>

                      <input
                        value={s.link}
                        onChange={(e) =>
                          updateLink(
                            i,
                            "link",
                            e.target.value
                          )
                        }
                        className="flex-1 border-2 border-purple-300 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all duration-200"
                        placeholder="https://example.com/profile"
                      />

                      <button
                        onClick={() => removeLink(s.platform)}
                        className="text-red-600 hover:text-white hover:bg-red-500 font-bold p-3 rounded-xl transition-all duration-200 border-2 border-red-300 hover:border-red-500"
                        title="Delete this link"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-purple-300">
                    <button
                      onClick={addLink}
                      className="border-2 border-purple-300 px-6 py-2.5 rounded-xl text-xs font-bold text-purple-700 hover:bg-purple-100 transition-all duration-200 flex items-center gap-2"
                    >
                      ➕ Add Link
                    </button>
                    <button
                      onClick={saveLinks}
                      disabled={saving}
                      className="bg-linear-to-r from-green-500 via-emerald-500 to-green-500 text-white px-8 py-2.5 rounded-xl text-xs font-bold hover:from-green-600 hover:via-emerald-600 hover:to-green-600 disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      {saving ? "Saving..." : "💾 Save Links"}
                    </button>
                    <button
                      onClick={() => {
                        if (user?.socialLinks) {
                          setLinks(user.socialLinks);
                        }
                        setEditMode(false);
                      }}
                      className="border-2 border-slate-300 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* CONFIRM DELETE */}
      {deleteTarget && (
        <DeleteConfirmModal
          platform={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {/* DUPLICATE PLATFORM */}
      {duplicatePlatform && (
        <DuplicatePlatformModal
          platform={duplicatePlatform}
          onClose={() => setDuplicatePlatform(null)}
        />
      )}

      {/* UNDO SNACKBAR */}
      {showUndo && undoItem && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-linear-to-r from-slate-900 to-slate-800 text-white px-6 py-4 rounded-xl flex items-center gap-4 shadow-2xl border border-slate-700">
            <span className="text-sm font-medium">
              {undoItem.platform} link deleted
            </span>
            <button
              onClick={undoDelete}
              className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors underline"
            >
              UNDO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= HELPERS ================= */

function Icon({ platform }: { platform: string }) {
  if (platform === "github") return <Github size={18} />;
  if (platform === "linkedin") return <Linkedin size={18} />;
  if (platform === "leetcode") return <b>LC</b>;
  if (platform === "hackerrank") return <b>HR</b>;
  if (platform === "codechef") return <b>CC</b>;
  if (platform === "codeforces") return <b>CF</b>;
  if (platform === "gmail") return <b>GM</b>;
  return <Globe size={18} />;
}

function Info({ label, value, color = "slate" }: { label: string; value?: string; color?: string }) {
  const colorClasses = {
    indigo: "border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-800",
    blue: "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800",
    purple: "border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-800",
    slate: "border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800",
    orange: "border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 text-orange-800",
    green: "border-green-200 bg-gradient-to-br from-green-50 to-green-100 text-green-800",
  };

  const bgClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.slate;

  return (
    <div className={`border-2 rounded-xl p-4 ${bgClass} hover:shadow-lg transition-all duration-300 transform hover:scale-105`}>
      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-bold text-sm mt-1 truncate">{value || "-"}</p>
    </div>
  );
}

function DuplicatePlatformModal({
  platform,
  onClose,
}: {
  platform: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-100 text-center">
        <h2 className="text-red-600 text-sm font-semibold">
          Duplicate Platform
        </h2>
        <p className="mt-3 text-gray-600 text-sm">
          {platform} can be added only once.
        </p>
        <button
          onClick={onClose}
          className="mt-5 px-4 py-2 bg-red-100 text-red-700 rounded"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  platform,
  onCancel,
  onConfirm,
}: {
  platform: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-95 text-center">
        <h2 className="text-base font-semibold text-red-600">
          Delete {platform}?
        </h2>
        <p className="mt-3 text-gray-600 text-sm">
          Are you sure you want to delete this link?
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}
