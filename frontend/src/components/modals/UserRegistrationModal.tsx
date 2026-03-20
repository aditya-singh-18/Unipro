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
  const NAME_REGEX = /^[A-Za-z .'-]{2,100}$/;
  const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

  const getPasswordRuleErrors = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 10) errors.push("Must be at least 10 characters");
    if (!/[A-Z]/.test(password)) errors.push("Must contain at least one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("Must contain at least one lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("Must contain at least one digit");
    if (!SPECIAL_CHAR_REGEX.test(password)) errors.push("Must contain at least one special character");

    return errors;
  };

  const getPasswordStrength = (password: string) => {
    const errors = getPasswordRuleErrors(password);
    const passed = 5 - errors.length;

    if (passed <= 1) return { label: "Weak", color: "bg-red-500", passed, errors };
    if (passed <= 3) return { label: "Fair", color: "bg-orange-500", passed, errors };
    if (passed === 4) return { label: "Strong", color: "bg-yellow-500", passed, errors };
    return { label: "Very Strong", color: "bg-green-500", passed, errors };
  };

  const [step, setStep] = useState<"role" | "form">("role");
  const [selectedRole, setSelectedRole] = useState<"STUDENT" | "MENTOR" | "ADMIN" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
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

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordsMatch =
    formData.confirmPassword.length === 0 || formData.password === formData.confirmPassword;

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
    const normalizedEmail = formData.email.trim().toLowerCase();
    const normalizedName = formData.full_name.trim();
    const normalizedDepartment = formData.department.trim();
    const normalizedDivision = formData.division.trim();
    const normalizedDesignation = formData.designation.trim();
    const normalizedRollNo = formData.roll_number.trim();
    const normalizedContact = formData.contact_number.trim();

    if (!normalizedEmail || !formData.password || !normalizedName) {
      setError("Please fill all required fields");
      return false;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!NAME_REGEX.test(normalizedName)) {
      setError("Full name should be 2-100 characters and only letters/spaces");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    const passwordErrors = getPasswordRuleErrors(formData.password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join(". "));
      return false;
    }

    if (!normalizedDepartment) {
      setError("Department is required");
      return false;
    }

    if (normalizedContact && !PHONE_REGEX.test(normalizedContact)) {
      setError("Contact number must be 10-15 digits");
      return false;
    }

    if (selectedRole === "STUDENT") {
      if (!normalizedRollNo || !formData.year || !normalizedDivision) {
        setError("Please fill all student-specific fields");
        return false;
      }

      const year = Number(formData.year);
      if (!Number.isInteger(year) || year < 1 || year > 6) {
        setError("Year must be between 1 and 6");
        return false;
      }
    }

    if (selectedRole === "MENTOR" || selectedRole === "ADMIN") {
      if (!normalizedDesignation) {
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
        role: selectedRole,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        profile: {
          full_name: formData.full_name.trim(),
          ...(selectedRole === "STUDENT" && {
            department: formData.department.trim(),
            year: formData.year,
            division: formData.division.trim(),
            roll_number: formData.roll_number.trim(),
            contact_number: formData.contact_number.trim() || undefined,
          }),
          ...(selectedRole === "MENTOR" && {
            department: formData.department.trim(),
            designation: formData.designation.trim(),
            contact_number: formData.contact_number.trim() || undefined,
          }),
          ...(selectedRole === "ADMIN" && {
            department: formData.department.trim(),
            designation: formData.designation.trim(),
            contact_number: formData.contact_number.trim() || undefined,
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
        <div className="sticky top-0 bg-linear-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between border-b">
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
                  maxLength={120}
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
                    minLength={10}
                    required
                  />
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.passed / 5) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs font-medium text-slate-600">Strength: {passwordStrength.label}</p>
                    {passwordStrength.errors.length > 0 && (
                      <div className="space-y-1">
                        {passwordStrength.errors.map((rule) => (
                          <p key={rule} className="text-xs text-red-600">{rule}</p>
                        ))}
                      </div>
                    )}
                  </div>
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
                    minLength={10}
                    required
                  />
                  {!passwordsMatch && (
                    <p className="text-xs text-red-600">Passwords do not match</p>
                  )}
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
                  maxLength={100}
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
                        maxLength={40}
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
                        maxLength={10}
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
                      pattern="\+?[0-9]{10,15}"
                      maxLength={15}
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
                  disabled={loading || !passwordsMatch || !["Strong", "Very Strong"].includes(passwordStrength.label)}
                  className={`px-6 py-2 rounded-lg font-semibold transition text-white ${
                    loading || !passwordsMatch || !["Strong", "Very Strong"].includes(passwordStrength.label)
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
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
