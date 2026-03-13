"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  GraduationCap,
  Lightbulb,
  Briefcase,
  Settings,
} from "lucide-react";
import { loginUser } from "../../../services/auth.service";
import { useAuth } from "../../../store/auth.store";
import { getPublicSystemAccess, type PublicSystemAccess } from "@/services/systemSettings.service";

type UiRole = "Student" | "Mentor" | "Faculty" | "Admin" | null;
type ApiRole = "STUDENT" | "MENTOR" | "ADMIN" | null;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [uiRole, setUiRole] = useState<UiRole>(null);
  const [apiRole, setApiRole] = useState<ApiRole>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [access, setAccess] = useState<PublicSystemAccess>({
    allow_student_login: true,
    allow_mentor_login: true,
    allow_team_creation: true,
    allow_project_creation: true,
    enable_weekly_submissions: true,
    team_leader_required: true,
    allow_leader_change: false,
    allow_member_removal: true,
    min_team_size: 1,
    max_team_size: 5,
    allow_solo_projects: false,
  });

  useEffect(() => {
    void (async () => {
      try {
        setAccess(await getPublicSystemAccess());
      } catch {
        // Keep permissive fallback if access endpoint is unavailable.
      }
    })();
  }, []);

  const handleLogin = async () => {
    setError("");

    if (!identifier || !password) {
      setError("Identifier and password are required");
      return;
    }

    if (!apiRole) {
      setError("Please select a role to continue");
      return;
    }

    try {
      setLoading(true);
      console.log('🔑 [Login] Attempting login with', { identifier, role: apiRole });

      const res = await loginUser({
        identifier,
        password,
        role: apiRole,
      });

      console.log('✅ [Login] API response:', { token: res.token, user: res.user });

      await login(res.token);
      console.log('✅ [Login] Auth context updated, redirecting...');

      if (res.user?.enrollment_id) {
        localStorage.setItem("enrollmentId", res.user.enrollment_id);
      }

      const role = res.user.role;

      if (role === "STUDENT") {
        console.log('➡️ [Login] Redirecting to /dashboard');
        router.replace("/dashboard");
      } else if (role === "ADMIN") {
        console.log('➡️ [Login] Redirecting to /admin/dashboard');
        router.replace("/admin/dashboard");
      } else if (role === "MENTOR") {
        console.log('➡️ [Login] Redirecting to /mentor/dashboard');
        router.replace("/mentor/dashboard");
      } else {
        console.warn('⚠️ [Login] Unknown role:', role);
        router.replace("/login");
      }
    } catch (err) {
      console.error('❌ [Login] Error:', err);
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(message || "Invalid credentials");
      } else {
        setError("Invalid credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#2c3e73] to-[#1f2b4d]">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#2c3e73] flex items-center justify-center gap-2">
            <span className="text-3xl">PU</span> UNIVERSITY PORTAL
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Smart Project Management System
          </p>
        </div>

        <h2 className="text-xl font-semibold text-center text-gray-800 mb-5">
          Login
        </h2>

        <div className="relative mb-4">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            placeholder="Enrollment No / Email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-xl border border-gray-300 pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#2c3e73]"
          />
        </div>

        <div className="relative mb-5">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-300 pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#2c3e73]"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center mb-3">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-[#2c3e73] text-white py-3 rounded-xl font-semibold hover:bg-[#081b4f] transition disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>

        <div className="flex justify-between text-sm text-gray-500 mt-4">
          <Link href="/forgot-password">Forgot password?</Link>
          <Link href="/register" className="text-[#2c3e73] font-semibold">
            Register
          </Link>
        </div>

        <div className="text-center my-5 text-sm text-gray-500">
          — ROLE SELECT —
        </div>

        <div className="grid grid-cols-4 gap-3 text-center">
          <Role
            icon={<GraduationCap />}
            label="Student"
            selected={uiRole === "Student"}
            disabled={!access.allow_student_login}
            onClick={() => {
              setUiRole("Student");
              setApiRole("STUDENT");
            }}
          />

          <Role
            icon={<Lightbulb />}
            label="Mentor"
            selected={uiRole === "Mentor"}
            disabled={!access.allow_mentor_login}
            onClick={() => {
              setUiRole("Mentor");
              setApiRole("MENTOR");
            }}
          />

          <Role
            icon={<Briefcase />}
            label="Faculty"
            selected={uiRole === "Faculty"}
            disabled={!access.allow_mentor_login}
            onClick={() => {
              setUiRole("Faculty");
              setApiRole("MENTOR"); // Faculty backend me Mentor hi hoga
            }}
          />

          <Role
            icon={<Settings />}
            label="Admin"
            selected={uiRole === "Admin"}
            onClick={() => {
              setUiRole("Admin");
              setApiRole("ADMIN");
            }}
          />
        </div>
      </div>
    </div>
  );
}

type RoleProps = {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function Role({ icon, label, selected, disabled = false, onClick }: RoleProps) {
  return (
    <div
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={`cursor-pointer rounded-xl p-3 border transition ${
        disabled
          ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
          :
        selected
          ? "border-[#2c3e73] bg-[#eef2ff] shadow-md"
          : "border-gray-200 bg-white hover:shadow"
      }`}
    >
      <div className={`flex justify-center mb-1 ${selected ? "text-[#2c3e73]" : "text-gray-500"}`}>
        {icon}
      </div>
      <p className={`text-xs font-medium ${selected ? "text-[#2c3e73]" : "text-gray-700"}`}>
        {label}
      </p>
    </div>
  );
}
// "use client";

// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { loginUser } from "@/services/auth.service";
// import { useAuth } from "@/store/auth.store";
// import { useRouter } from "next/navigation";

// export default function LoginPage() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   const { login } = useAuth();
//   const router = useRouter();

//   const handleSubmit = async () => {
//     try {
//       setLoading(true);
//       const res = await loginUser({ email, password });
//       login(res.token);
//       router.push("/dashboard");
//     } catch (err) {
//       alert("Invalid credentials");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="h-screen flex items-center justify-center">
//       <div className="w-[350px] space-y-4">
//         <h1 className="text-xl font-semibold">Student Login</h1>

//         <Input
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//         />

//         <Input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//         />

//         <Button
//           className="w-full"
//           onClick={handleSubmit}
//           disabled={loading}
//         >
//           {loading ? "Logging in..." : "Login"}
//         </Button>
//       </div>
//     </div>
//   );
// }

// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import {
//   Mail,
//   Lock,
//   GraduationCap,
//   Lightbulb,
//   Briefcase,
//   Settings,
// } from "lucide-react";
// import { loginUser } from "../../services/auth.service"; // ✅ relative
// import { useAuth } from "../../store/auth.store"; // ✅ relative

// export default function LoginPage() {
//   const router = useRouter();
//   const { login } = useAuth();

//   const [identifier, setIdentifier] = useState("");
//   const [password, setPassword] = useState("");
//   const [selectedRole, setSelectedRole] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const handleLogin = async () => {
//     setError("");

//     if (!identifier || !password) {
//       setError("Identifier and password are required");
//       return;
//     }

//     if (!selectedRole) {
//       setError("Please select a role to continue");
//       return;
//     }

//     try {
//       setLoading(true);

//       const res = await loginUser({
//         identifier,
//         password,
//         role: selectedRole.toUpperCase() as "STUDENT" | "ADMIN" | "MENTOR",
//       });

//       await login(res.token);

//       // role-based redirect
//       if (res.user.role === "ADMIN") {
//         router.replace("/admin/dashboard");
//       } else if (res.user.role === "MENTOR") {
//         router.replace("/mentor/dashboard");
//       } else {
//         router.replace("/student/dashboard");
//       }

//     } catch (err) {
//       console.error(err);
//       setError("Invalid credentials");
//     } finally {
//       setLoading(false);
//     }
//   };


//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2c3e73] to-[#1f2b4d]">
//       <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">
//         {/* Header */}
//         <div className="text-center mb-6">
//           <h1 className="text-2xl font-bold text-[#2c3e73] flex items-center justify-center gap-2">
//             <span className="text-3xl">PU</span> UNIVERSITY PORTAL
//           </h1>
//           <p className="text-sm text-gray-500 mt-1">
//             Smart Project Management System
//           </p>
//         </div>

//         <h2 className="text-xl font-semibold text-center text-gray-800 mb-5">
//           Login
//         </h2>

//         {/* Identifier */}
//         <div className="relative mb-4">
//           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
//           <input
//             placeholder="Enrollment No / Email"
//             value={identifier}
//             onChange={(e) => setIdentifier(e.target.value)}
//             className="w-full rounded-xl border border-gray-300 pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#2c3e73]"
//           />
//         </div>

//         {/* Password */}
//         <div className="relative mb-5">
//           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
//           <input
//             type="password"
//             placeholder="Password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="w-full rounded-xl border border-gray-300 pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#2c3e73]"
//           />
//         </div>

//         {error && (
//           <p className="text-sm text-red-500 text-center mb-3">
//             {error}
//           </p>
//         )}

//         <button
//           onClick={handleLogin}
//           disabled={loading}
//           className="w-full bg-[#2c3e73] text-white py-3 rounded-xl font-semibold hover:bg-[#081b4f] transition disabled:opacity-60"
//         >
//           {loading ? "Logging in..." : "Log In"}
//         </button>

//         <div className="flex justify-between text-sm text-gray-500 mt-4">
//           <Link href="/forgot-password">Forgot password?</Link>
//           <Link href="/register" className="text-[#2c3e73] font-semibold">
//             Register
//           </Link>
//         </div>

//         <div className="text-center my-5 text-sm text-gray-500">
//           — ROLE SELECT —
//         </div>

//         <div className="grid grid-cols-4 gap-3 text-center">
//           <Role icon={<GraduationCap />} label="Student" selected={selectedRole === "Student"} onClick={() => setSelectedRole("Student")} />
//           <Role icon={<Lightbulb />} label="Mentor" selected={selectedRole === "Mentor"} onClick={() => setSelectedRole("Mentor")} />
//           <Role icon={<Briefcase />} label="Faculty" selected={selectedRole === "Faculty"} onClick={() => setSelectedRole("Faculty")} />
//           <Role icon={<Settings />} label="Admin" selected={selectedRole === "Admin"} onClick={() => setSelectedRole("Admin")} />
//         </div>
//       </div>
//     </div>
//   );
// }

// function Role({ icon, label, selected, onClick }: any) {
//   return (
//     <div
//       onClick={onClick}
//       className={`cursor-pointer rounded-xl p-3 border transition ${
//         selected
//           ? "border-[#2c3e73] bg-[#eef2ff] shadow-md"
//           : "border-gray-200 bg-white hover:shadow"
//       }`}
//     >
//       <div className={`flex justify-center mb-1 ${selected ? "text-[#2c3e73]" : "text-gray-500"}`}>
//         {icon}
//       </div>
//       <p className={`text-xs font-medium ${selected ? "text-[#2c3e73]" : "text-gray-700"}`}>
//         {label}
//       </p>
//     </div>
//   );
// }
