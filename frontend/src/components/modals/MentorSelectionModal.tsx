"use client";

import { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { X } from "lucide-react";

interface Mentor {
  employee_id: string;
  full_name: string;
  official_email: string;
  department: string;
  designation: string;
  contact_number: string;
  assigned_projects: number;
}

interface MentorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  onMentorAssigned: () => void;
}

export default function MentorSelectionModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  onMentorAssigned,
}: MentorSelectionModalProps) {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchMentors();
      setError("");
      setSuccess("");
      setSelectedMentor(null);
    }
  }, [isOpen]);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/mentor/admin/active");
      setMentors(response.data.data || []);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error Axios error shape
            err.response?.data?.message
          : null;
      setError(message || "Failed to fetch mentors");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMentor = async () => {
    if (!selectedMentor) {
      setError("Please select a mentor");
      return;
    }

    try {
      setAssigning(true);
      setError("");
      
      await axios.post("/project/admin/assign-mentor", {
        projectId,
        mentorEmployeeId: selectedMentor,
      });

      setSuccess(`Mentor assigned successfully to "${projectTitle}"`);
      
      setTimeout(() => {
        onMentorAssigned();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error Axios error shape
            err.response?.data?.message
          : null;
      setError(message || "Failed to assign mentor");
    } finally {
      setAssigning(false);
    }
  };

  if (!isOpen) return null;

  const selectedMentorData = mentors.find((m) => m.employee_id === selectedMentor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between border-b">
          <div>
            <h2 className="text-2xl font-bold text-white">Assign Mentor</h2>
            <p className="text-blue-100 text-sm mt-1">Project: {projectTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-8">
          {/* ERROR MESSAGE */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✅ {success}
            </div>
          )}

          {/* LOADING STATE */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-slate-600">Loading mentors...</p>
            </div>
          ) : mentors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-slate-600 text-lg">No active mentors available</p>
            </div>
          ) : (
            <>
              {/* MENTORS LIST */}
              <div className="space-y-3 mb-6">
                {mentors.map((mentor) => (
                  <div
                    key={mentor.employee_id}
                    onClick={() => setSelectedMentor(mentor.employee_id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedMentor === mentor.employee_id
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-lg">
                          {mentor.full_name}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {mentor.designation} • {mentor.department}
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                          📧 {mentor.official_email}
                        </p>
                        <p className="text-sm text-slate-500">
                          📱 {mentor.contact_number}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700">
                            Projects: {mentor.assigned_projects}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedMentor === mentor.employee_id
                              ? "border-blue-600 bg-blue-600"
                              : "border-slate-300"
                          }`}
                        >
                          {selectedMentor === mentor.employee_id && (
                            <span className="text-white text-sm">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* SELECTED MENTOR SUMMARY */}
              {selectedMentorData && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <p className="text-sm text-slate-600">Selected Mentor:</p>
                  <p className="font-semibold text-blue-900">
                    {selectedMentorData.full_name} ({selectedMentorData.employee_id})
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedMentorData.department} • {selectedMentorData.designation}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-slate-50 px-8 py-4 border-t flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold rounded-lg transition"
            disabled={assigning}
          >
            Cancel
          </button>
          <button
            onClick={handleAssignMentor}
            disabled={!selectedMentor || assigning || loading}
            className={`px-6 py-2 rounded-lg font-semibold transition text-white ${
              selectedMentor && !assigning && !loading
                ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                : "bg-slate-400 cursor-not-allowed"
            }`}
          >
            {assigning ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Assigning...
              </span>
            ) : (
              "Assign Mentor"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
