"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth.store";
import {
  getStudentProfile,
  updateStudentBio,
  getStudentSkills,
  addStudentSkill,
  deleteStudentSkill,
} from "@/services/student.service";
import { Edit, X, Camera } from "lucide-react";

/* ================= TYPES ================= */

type Skill = {
  id: number;
  skill: string;
  created_at?: string;
};

type StudentUser = {
  name: string;
  enrollment_id?: string;
  student_email?: string;
  department?: string;
  division?: string;
  roll_no?: string;
  is_active?: boolean;
  role?: "STUDENT";
};

function isStudentUser(user: unknown): user is StudentUser {
  return (
    typeof user === "object" &&
    user !== null &&
    "role" in user &&
    (user as Record<string, unknown>).role === "STUDENT"
  );
}

/* ================= PAGE ================= */

export default function StudentProfilePage() {
  const { user } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [bio, setBio] = useState("");
  const [bioEdit, setBioEdit] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profile = await getStudentProfile();
        setBio(profile?.bio || "");
        setBioEdit(profile?.bio || "");

        const skillsList = await getStudentSkills();
        setSkills(skillsList);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  if (!user || !isStudentUser(user)) return null;

  const saveBio = async () => {
    if (!bioEdit.trim()) {
      alert("Bio cannot be empty");
      return;
    }

    setSaving(true);
    try {
      await updateStudentBio(bioEdit);
      setBio(bioEdit);
      setEditMode(false);
    } catch (error) {
      console.error("Failed to save bio:", error);
      alert("Failed to save bio");
    } finally {
      setSaving(false);
    }
  };

  const addSkill = async () => {
    if (!newSkill.trim()) return;

    if (skills.some((s) => s.skill.toLowerCase() === newSkill.toLowerCase())) {
      alert("Skill already exists");
      return;
    }

    setSaving(true);
    try {
      await addStudentSkill({ skill: newSkill });
      setNewSkill("");
      const updatedSkills = await getStudentSkills();
      setSkills(updatedSkills);
    } catch (error) {
      console.error("Failed to add skill:", error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteStudentSkill(deleteTarget.id);
      setSkills((p) => p.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete skill:", error);
    }
  };

  return (
    <>
      <main className="flex-1 p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* HEADER SECTION */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-6">
                {/* Profile Picture */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                    <Camera size={16} />
                  </button>
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    {user.name}
                  </h1>
                  <div className="flex flex-col gap-2">
                    <p className="text-lg text-gray-600">
                      <span className="font-semibold">{user.department || "N/A"}</span>
                      {user.division && ` • ${user.division}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          user.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Edit size={16} /> Edit Bio
                </button>
              )}
            </div>
          </div>

          {/* PROFILE DETAILS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Info label="Enrollment No" value={user.enrollment_id} />
            <Info label="Department" value={user.department} />
            <Info label="Division" value={user.division} />
            <Info label="Roll No" value={user.roll_no} />
            <Info label="Email" value={user.student_email} />
            <Info label="Status" value={user.is_active ? "Active" : "Inactive"} />
          </div>

          {/* BIO SECTION */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About Me</h2>

            {!editMode ? (
              <div className="text-gray-600 leading-relaxed min-h-24 p-4 bg-gray-50 rounded-lg">
                {bio ? (
                  <p>{bio}</p>
                ) : (
                  <p className="text-gray-400 italic">
                    No bio added yet. Click Edit Bio to add one!
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={bioEdit}
                  onChange={(e) => setBioEdit(e.target.value)}
                  placeholder="Write something about yourself..."
                  maxLength={500}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {bioEdit.length}/500
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setBioEdit(bio);
                        setEditMode(false);
                      }}
                      className="border border-gray-300 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveBio}
                      disabled={saving}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? "Saving..." : "Save Bio"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SKILLS SECTION */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Skills</h2>
              <p className="text-gray-600 text-sm">
                {skills.length > 0
                  ? `${skills.length} skill${skills.length > 1 ? "s" : ""} listed`
                  : "No skills added yet"}
              </p>
            </div>

            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-3 mb-6">
                {skills.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                  >
                    {s.skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 mb-6">
                <p className="text-gray-500">
                  No skills added yet. Add your first skill!
                </p>
              </div>
            )}

            {/* ADD SKILL */}
            <div className="flex gap-3">
              <input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add new skill (e.g., JavaScript, React, Python)"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addSkill}
                disabled={saving}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Adding..." : "Add Skill"}
              </button>
            </div>

            {/* DELETE BUTTONS */}
            {skills.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Delete skills:
                </p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setDeleteTarget(s)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      Remove {s.skill}
                      <X size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg space-y-4">
            <h2 className="text-lg font-semibold text-red-600">
              Delete Skill?
            </h2>
            <p className="text-gray-600">
              Are you sure you want to delete &quot;<strong>
                {deleteTarget.skill}
              </strong>&quot;?
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= HELPERS ================= */

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className="text-base font-medium text-gray-900 overflow-auto">
        {value ? String(value) : "—"}
      </p>
    </div>
  );
}
