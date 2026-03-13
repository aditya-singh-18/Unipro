"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Users, BookOpen, Award, Loader, Search, Eye, UserCheck, UserX, X, Pencil } from "lucide-react";
import UserRegistrationModal from "../../../components/modals/UserRegistrationModal";
import api from "../../../lib/axios";

interface UserStatistics {
  total_users: number;
  total_students: number;
  total_mentors: number;
  total_admins: number;
}

interface User {
  user_key: string;
  email: string;
  role: string;
  is_active?: boolean;
  full_name?: string;
  department?: string;
  created_at?: string;
  enrollment_id?: string;
  employee_id?: string;
  student_email?: string;
  official_email?: string;
  year?: string;
  division?: string;
  designation?: string;
}

interface UserDetail {
  user_key: string;
  role: string;
  email: string;
  is_active: boolean;
  created_at?: string;
  profile: Record<string, unknown>;
}

interface EditableUserForm {
  email: string;
  full_name: string;
  department: string;
  year: string;
  division: string;
  roll_number: string;
  designation: string;
  contact_number: string;
  status: string;
  bio: string;
}

export default function UserManagementPage() {
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "students" | "mentors">("all");
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusLoadingKey, setStatusLoadingKey] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditableUserForm>({
    email: "",
    full_name: "",
    department: "",
    year: "",
    division: "",
    roll_number: "",
    designation: "",
    contact_number: "",
    status: "",
    bio: "",
  });
  const limit = 10;

  const toSafeString = (value: unknown) =>
    value === undefined || value === null ? "" : String(value);

  const buildEditFormFromUserDetail = (detail: UserDetail): EditableUserForm => ({
    email: toSafeString(detail.email),
    full_name: toSafeString(detail.profile?.full_name),
    department: toSafeString(detail.profile?.department),
    year: toSafeString(detail.profile?.year),
    division: toSafeString(detail.profile?.division),
    roll_number: toSafeString(detail.profile?.roll_number),
    designation: toSafeString(detail.profile?.designation),
    contact_number: toSafeString(detail.profile?.contact_number),
    status: toSafeString(detail.profile?.status),
    bio: toSafeString(detail.profile?.bio),
  });

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await api.get("/admin/users/statistics");
      if (response.data?.data) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  }, []);

  // Fetch all users
  const fetchAllUsers = useCallback(async (page: number, query = searchQuery) => {
    try {
      const response = await api.get(
        `/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(query)}`
      );
      if (response.data?.data) {
        setAllUsers(response.data.data.users);
        setTotalPages(Math.ceil(response.data.data.total / limit));
      }
    } catch (error) {
      console.error("Error fetching all users:", error);
    }
  }, [limit, searchQuery]);

  // Fetch students
  const fetchStudents = useCallback(async (page: number, query = searchQuery) => {
    try {
      const response = await api.get(
        `/admin/users/students?page=${page}&limit=${limit}&search=${encodeURIComponent(query)}`
      );
      if (response.data?.data) {
        setStudents(response.data.data.students);
        setTotalPages(Math.ceil(response.data.data.total / limit));
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  }, [limit, searchQuery]);

  // Fetch mentors
  const fetchMentors = useCallback(async (page: number, query = searchQuery) => {
    try {
      const response = await api.get(
        `/admin/users/mentors?page=${page}&limit=${limit}&search=${encodeURIComponent(query)}`
      );
      if (response.data?.data) {
        setMentors(response.data.data.mentors);
        setTotalPages(Math.ceil(response.data.data.total / limit));
      }
    } catch (error) {
      console.error("Error fetching mentors:", error);
    }
  }, [limit, searchQuery]);

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchStatistics();
      await fetchAllUsers(1, "");
      setLoading(false);
    };
    loadData();
  }, [fetchStatistics, fetchAllUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch when tab changes
  useEffect(() => {
    const loadTabData = async () => {
      setLoading(true);
      setCurrentPage(1);
      if (activeTab === "all") {
        await fetchAllUsers(1, searchQuery);
      } else if (activeTab === "students") {
        await fetchStudents(1, searchQuery);
      } else if (activeTab === "mentors") {
        await fetchMentors(1, searchQuery);
      }
      setLoading(false);
    };
    loadTabData();
  }, [activeTab, searchQuery, fetchAllUsers, fetchStudents, fetchMentors]);

  // Handle page change
  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
    setLoading(true);
    if (activeTab === "all") {
      await fetchAllUsers(newPage, searchQuery);
    } else if (activeTab === "students") {
      await fetchStudents(newPage, searchQuery);
    } else if (activeTab === "mentors") {
      await fetchMentors(newPage, searchQuery);
    }
    setLoading(false);
  };

  const handleUserRegistered = () => {
    // Refresh data after registration
    fetchStatistics();
    if (activeTab === "all") {
      fetchAllUsers(currentPage, searchQuery);
    } else if (activeTab === "students") {
      fetchStudents(currentPage, searchQuery);
    } else if (activeTab === "mentors") {
      fetchMentors(currentPage, searchQuery);
    }
  };

  const refreshCurrentTab = async () => {
    if (activeTab === "all") {
      await fetchAllUsers(currentPage, searchQuery);
    } else if (activeTab === "students") {
      await fetchStudents(currentPage, searchQuery);
    } else if (activeTab === "mentors") {
      await fetchMentors(currentPage, searchQuery);
    }
  };

  const openUserDetails = async (userKey: string, startEdit = false) => {
    try {
      setDetailsLoading(true);
      setIsEditMode(startEdit);
      const response = await api.get(`/admin/users/${encodeURIComponent(userKey)}`);
      if (response.data?.data) {
        const userDetail: UserDetail = response.data.data;
        setSelectedUser(userDetail);
        setEditForm(buildEditFormFromUserDetail(userDetail));
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      alert("Failed to load user details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    const nextStatus = !(user.is_active ?? true);
    const actionLabel = nextStatus ? "activate" : "block";
    const confirmed = window.confirm(`Are you sure you want to ${actionLabel} user ${user.user_key}?`);
    if (!confirmed) return;

    try {
      setStatusLoadingKey(user.user_key);
      await api.patch(`/admin/users/${encodeURIComponent(user.user_key)}/status`, {
        is_active: nextStatus,
      });

      await fetchStatistics();
      await refreshCurrentTab();

      if (selectedUser?.user_key === user.user_key) {
        setSelectedUser({ ...selectedUser, is_active: nextStatus });
      }
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "response" in error
          ? // @ts-expect-error Axios response shape
            error.response?.data?.message
          : null;
      alert(message || "Failed to update user status");
    } finally {
      setStatusLoadingKey(null);
    }
  };

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!selectedUser) return;

    try {
      setEditSaving(true);

      const payload: Record<string, unknown> = {
        email: editForm.email.trim().toLowerCase(),
        full_name: editForm.full_name.trim(),
        department: editForm.department.trim(),
        contact_number: editForm.contact_number.trim(),
      };

      if (selectedUser.role === "STUDENT") {
        payload.year = editForm.year.trim();
        payload.division = editForm.division.trim();
        payload.roll_number = editForm.roll_number.trim();
        payload.status = editForm.status.trim();
        payload.bio = editForm.bio.trim();
      }

      if (selectedUser.role === "MENTOR" || selectedUser.role === "ADMIN") {
        payload.designation = editForm.designation.trim();
      }

      const response = await api.patch(
        `/admin/users/${encodeURIComponent(selectedUser.user_key)}/profile`,
        payload
      );

      if (response.data?.data) {
        const userDetail: UserDetail = response.data.data;
        setSelectedUser(userDetail);
        setEditForm(buildEditFormFromUserDetail(userDetail));
      }

      setIsEditMode(false);
      await refreshCurrentTab();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "response" in error
          ? // @ts-expect-error Axios response shape
            error.response?.data?.message
          : null;
      alert(message || "Failed to update user profile");
    } finally {
      setEditSaving(false);
    }
  };

  const getCurrentData = () => {
    if (activeTab === "all") return allUsers;
    if (activeTab === "students") return students;
    if (activeTab === "mentors") return mentors;
    return [];
  };

  const currentData = getCurrentData();

  return (
    <div className="space-y-6">
      {/* HEADER — gradient stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',    value: stats?.total_users    || 0, icon: <Users size={22} />,    g: 'from-blue-400 to-blue-600' },
          { label: 'Total Students', value: stats?.total_students || 0, icon: <BookOpen size={22} />, g: 'from-emerald-400 to-emerald-600' },
          { label: 'Total Mentors',  value: stats?.total_mentors  || 0, icon: <Award size={22} />,    g: 'from-purple-400 to-purple-600' },
          { label: 'Total Admins',   value: stats?.total_admins   || 0, icon: <Users size={22} />,    g: 'from-orange-400 to-orange-600' },
        ].map((c) => (
          <div
            key={c.label}
            className={`cursor-default rounded-2xl p-5 text-white bg-linear-to-r ${c.g} category-hover truncate shadow-md`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold opacity-90 truncate">{c.label}</p>
              <div className="bg-white/20 p-2 rounded-xl">{c.icon}</div>
            </div>
            <p className="text-4xl font-bold truncate">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-3xl">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Search ${activeTab} by ID, name, email, role, department...`}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setRegistrationModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-blue-500 to-blue-700 text-white rounded-xl font-semibold category-hover shadow-lg"
          >
            <Plus size={20} />
            Add User
          </button>
        </div>
      </div>

      {/* USER LIST */}
      <div className="glass rounded-2xl p-6 category-hover">
        {/* TABS */}
        <div className="flex gap-4 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 font-semibold transition-all ${
              activeTab === "all"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Users ({stats?.total_users || 0})
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2 font-semibold transition-all ${
              activeTab === "students"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Students ({stats?.total_students || 0})
          </button>
          <button
            onClick={() => setActiveTab("mentors")}
            className={`px-4 py-2 font-semibold transition-all ${
              activeTab === "mentors"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mentors ({stats?.total_mentors || 0})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-600" size={32} />
            <span className="ml-2 text-slate-600">Loading data...</span>
          </div>
        ) : currentData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No users found</p>
            <p className="text-slate-400 text-sm mt-2">
              Click &quot;Add User&quot; to register your first user
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">
                      User ID
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">
                      Email
                    </th>
                    {activeTab === "all" && (
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">
                        Role
                      </th>
                    )}
                    {activeTab === "students" && (
                      <>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900">
                          Department
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900">
                          Year
                        </th>
                      </>
                    )}
                    {activeTab === "mentors" && (
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">
                        Designation
                      </th>
                    )}
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">
                      Registered
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((user, idx) => (
                    <tr
                      key={user.user_key || idx}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {user.user_key}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {user.full_name || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {user.email || user.student_email || user.official_email}
                      </td>
                      {activeTab === "all" && (
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              user.role === "STUDENT"
                                ? "bg-blue-100 text-blue-700"
                                : user.role === "MENTOR"
                                ? "bg-purple-100 text-purple-700"
                                : user.role === "ADMIN"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                      )}
                      {activeTab === "students" && (
                        <>
                          <td className="py-3 px-4 text-slate-700">
                            {user.department || "N/A"}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {user.year || "N/A"}
                          </td>
                        </>
                      )}
                      {activeTab === "mentors" && (
                        <td className="py-3 px-4 text-slate-700">
                          {user.designation || "N/A"}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            (user.is_active ?? true)
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {(user.is_active ?? true) ? "ACTIVE" : "BLOCKED"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openUserDetails(user.user_key)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            onClick={() => openUserDetails(user.user_key, true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user)}
                            disabled={statusLoadingKey === user.user_key}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
                              (user.is_active ?? true)
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                          >
                            {(user.is_active ?? true) ? <UserX size={14} /> : <UserCheck size={14} />}
                            {statusLoadingKey === user.user_key
                              ? "Saving..."
                              : (user.is_active ?? true)
                              ? "Block"
                              : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="flex items-center justify-between mt-6">
              <span className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* USER REGISTRATION MODAL */}
      <UserRegistrationModal
        isOpen={registrationModalOpen}
        onClose={() => setRegistrationModalOpen(false)}
        onUserRegistered={handleUserRegistered}
      />

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">User Details</h3>
                <p className="text-sm text-slate-600">Complete access for profile management</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="p-8 flex items-center justify-center text-slate-600">
                <Loader size={20} className="animate-spin mr-2" /> Loading user details...
              </div>
            ) : (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">User ID</p>
                    <p className="font-semibold text-slate-900">{selectedUser.user_key}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Role</p>
                    <p className="font-semibold text-slate-900">{selectedUser.role}</p>
                  </div>
                </div>

                {isEditMode ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                        <input
                          name="email"
                          type="email"
                          value={editForm.email}
                          onChange={handleEditInputChange}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                        <input
                          name="full_name"
                          value={editForm.full_name}
                          onChange={handleEditInputChange}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                        <input
                          name="department"
                          value={editForm.department}
                          onChange={handleEditInputChange}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Contact Number</label>
                        <input
                          name="contact_number"
                          value={editForm.contact_number}
                          onChange={handleEditInputChange}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      {selectedUser.role === "STUDENT" && (
                        <>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Year</label>
                            <input
                              name="year"
                              value={editForm.year}
                              onChange={handleEditInputChange}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Division</label>
                            <input
                              name="division"
                              value={editForm.division}
                              onChange={handleEditInputChange}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Roll Number</label>
                            <input
                              name="roll_number"
                              value={editForm.roll_number}
                              onChange={handleEditInputChange}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                            <input
                              name="status"
                              value={editForm.status}
                              onChange={handleEditInputChange}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-slate-700">Bio</label>
                            <textarea
                              name="bio"
                              rows={3}
                              value={editForm.bio}
                              onChange={handleEditInputChange}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </>
                      )}

                      {(selectedUser.role === "MENTOR" || selectedUser.role === "ADMIN") && (
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Designation</label>
                          <input
                            name="designation"
                            value={editForm.designation}
                            onChange={handleEditInputChange}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 font-semibold text-slate-900">Profile Information</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">email</p>
                        <p className="text-sm font-medium text-slate-800 wrap-break-word">{selectedUser.email || "N/A"}</p>
                      </div>
                      {Object.entries(selectedUser.profile || {}).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-slate-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">{key.replaceAll("_", " ")}</p>
                          <p className="text-sm font-medium text-slate-800 wrap-break-word">{String(value ?? "N/A")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setSelectedUser(null);
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>

                  {!isEditMode ? (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (selectedUser) {
                            setEditForm(buildEditFormFromUserDetail(selectedUser));
                          }
                          setIsEditMode(false);
                        }}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancel Edit
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={editSaving}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {editSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() =>
                      toggleUserStatus({
                        user_key: selectedUser.user_key,
                        role: selectedUser.role,
                        email: selectedUser.email,
                        is_active: selectedUser.is_active,
                      } as User)
                    }
                    disabled={statusLoadingKey === selectedUser.user_key}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                      selectedUser.is_active
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {statusLoadingKey === selectedUser.user_key
                      ? "Saving..."
                      : selectedUser.is_active
                      ? "Block User"
                      : "Activate User"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .glass {
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
        }
        .category-hover {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .category-hover:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 28px 55px rgba(0, 0, 0, 0.16);
        }
      `}</style>
    </div>
  );
}
