"use client";

import { useState } from "react";
import axios from "@/lib/axios";
import { X } from "lucide-react";

interface UserRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserRegistered: (user: Record<string, unknown>) => void;
}

export default function UserRegistrationModal({
  isOpen,
  onClose,
  onUserRegistered,
}: UserRegistrationModalProps) {
  const [step, setStep] = useState<"role" | "form">("role");
  const [selectedRole, setSelectedRole] = useState<"STUDENT" | "MENTOR" | "ADMIN" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    user_key: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    department: "",
    designation: "",
    contact_number: "",
    // Student specific
    year: "",
    division: "",
    roll_number: "",
    student_email: "",
  });

  const handleRoleSelect = (role: "STUDENT" | "MENTOR" | "ADMIN") => {
    setSelectedRole(role);
    setStep("form");
    setError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.user_key || !formData.email || !formData.password || !formData.full_name) {
      setError("Please fill all required fields");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    if (selectedRole === "STUDENT") {
      if (!formData.roll_number || !formData.year || !formData.division) {
        setError("Please fill all student-specific fields");
        return false;
      }
    }

    if (selectedRole === "MENTOR" || selectedRole === "ADMIN") {
      if (!formData.department || !formData.designation) {
        setError("Please fill all required fields");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        user_key: formData.user_key,
        role: selectedRole,
        email: formData.email,
        password: formData.password,
        profile: {
          full_name: formData.full_name,
          ...(selectedRole === "STUDENT" && {
            department: formData.department,
            year: formData.year,
            division: formData.division,
            roll_number: formData.roll_number,
          }),
          ...(selectedRole === "MENTOR" && {
            department: formData.department,
            designation: formData.designation,
            contact_number: formData.contact_number,
          }),
          ...(selectedRole === "ADMIN" && {
            department: formData.department,
            designation: formData.designation,
            contact_number: formData.contact_number,
          }),
        },
      };

      const response = await axios.post("/admin/register-user", payload);

      setSuccess(`${selectedRole} registered successfully!`);
      onUserRegistered({
        ...response.data.data,
        email: formData.email,
        profile: payload.profile,
      });

      setTimeout(() => {
        resetForm();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error Axios error shape
            err.response?.data?.message
          : null;
      setError(message || "Failed to register user");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("role");
    setSelectedRole(null);
    setFormData({
      user_key: "",
      email: "",
      password: "",
      confirmPassword: "",
      full_name: "",
      department: "",
      designation: "",
      contact_number: "",
      year: "",
      division: "",
      roll_number: "",
      student_email: "",
    });
    setError("");
    setSuccess("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between border-b">
          <div>
            <h2 className="text-2xl font-bold text-white">Register New User</h2>
            <p className="text-blue-100 text-sm mt-1">Add a new student, mentor, or admin to the system</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
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
              ❌ {error}
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✅ {success}
            </div>
          )}

          {/* STEP 1: ROLE SELECTION */}
          {step === "role" && (
            <div className="space-y-4">
              <p className="text-slate-700 font-medium mb-6">Select the role for the new user:</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* STUDENT OPTION */}
                <button
                  onClick={() => handleRoleSelect("STUDENT")}
                  className="p-6 border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="text-4xl mb-3">👨‍🎓</div>
                  <h3 className="font-bold text-slate-900 text-lg">Student</h3>
                  <p className="text-sm text-slate-600 mt-2">Enroll a new student in the system</p>
                </button>

                {/* MENTOR OPTION */}
                <button
                  onClick={() => handleRoleSelect("MENTOR")}
                  className="p-6 border-2 border-slate-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
                >
                  <div className="text-4xl mb-3">🎓</div>
                  <h3 className="font-bold text-slate-900 text-lg">Mentor</h3>
                  <p className="text-sm text-slate-600 mt-2">Add a mentor to guide projects</p>
                </button>

                {/* ADMIN OPTION */}
                <button
                  onClick={() => handleRoleSelect("ADMIN")}
                  className="p-6 border-2 border-slate-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
                >
                  <div className="text-4xl mb-3">👨‍💼</div>
                  <h3 className="font-bold text-slate-900 text-lg">Admin</h3>
                  <p className="text-sm text-slate-600 mt-2">Create a new system administrator</p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: REGISTRATION FORM */}
          {step === "form" && selectedRole && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* NON-EDITABLE USER ID */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  User ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="user_key"
                  value={formData.user_key}
                  onChange={handleInputChange}
                  placeholder={selectedRole === "STUDENT" ? "ENR2024001" : "EMP2024001"}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                  required
                />
                <p className="text-xs text-slate-500">
                  {selectedRole === "STUDENT" ? "Enrollment ID" : "Employee ID"} - Generated automatically
                </p>
              </div>

              {/* EMAIL */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="user@university.edu"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* FULL NAME */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* STUDENT-SPECIFIC FIELDS */}
              {selectedRole === "STUDENT" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Roll Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="roll_number"
                        value={formData.roll_number}
                        onChange={handleInputChange}
                        placeholder="2024001"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Year <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      >
                        <option value="">Select Year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Division <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="division"
                        value={formData.division}
                        onChange={handleInputChange}
                        placeholder="A / B / C"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Computer Science & Engineering">Computer Science & Engineering (CSE)</option>
                      <option value="Mechanical Engineering">Mechanical Engineering (ME)</option>
                      <option value="Electrical Engineering">Electrical Engineering (EE)</option>
                      <option value="Civil Engineering">Civil Engineering (CE)</option>
                      <option value="Electronics & Communication">Electronics & Communication (ECE)</option>
                      <option value="Chemical Engineering">Chemical Engineering (CHE)</option>
                      <option value="Biotechnology">Biotechnology (BT)</option>
                      <option value="Information Technology">Information Technology (IT)</option>
                      <option value="Aeronautical Engineering">Aeronautical Engineering (AE)</option>
                    </select>
                  </div>
                </>
              )}

              {/* MENTOR & ADMIN FIELDS */}
              {(selectedRole === "MENTOR" || selectedRole === "ADMIN") && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      >
                        <option value="">Select Department</option>
                        <option value="Computer Science & Engineering">Computer Science & Engineering (CSE)</option>
                        <option value="Mechanical Engineering">Mechanical Engineering (ME)</option>
                        <option value="Electrical Engineering">Electrical Engineering (EE)</option>
                        <option value="Civil Engineering">Civil Engineering (CE)</option>
                        <option value="Electronics & Communication">Electronics & Communication (ECE)</option>
                        <option value="Chemical Engineering">Chemical Engineering (CHE)</option>
                        <option value="Biotechnology">Biotechnology (BT)</option>
                        <option value="Information Technology">Information Technology (IT)</option>
                        <option value="Aeronautical Engineering">Aeronautical Engineering (AE)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      >
                        <option value="">Select Designation</option>
                        <option value="Professor">Professor</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Lecturer">Lecturer</option>
                        <option value="Senior Instructor">Senior Instructor</option>
                        <option value="Instructor">Instructor</option>
                        <option value="Lab Assistant">Lab Assistant</option>
                        <option value="Department Head">Department Head</option>
                        <option value="Faculty Coordinator">Faculty Coordinator</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={handleInputChange}
                      placeholder="9876543210"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {/* SUBMIT BUTTONS */}
              <div className="flex gap-4 justify-end pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep("role")}
                  className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold rounded-lg transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg font-semibold transition text-white ${
                    loading
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  }`}
                >
                  {loading ? "Registering..." : "Register User"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
