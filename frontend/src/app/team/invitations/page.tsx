'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";

import {
  getMyInvitations,
  respondToInvite,
} from "@/services/team/invitation.service";

type TeamInvitation = {
  id: number;
  team_id: string;
  invited_by_enrollment_id: string;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export default function TeamInvitationsPage() {
  const router = useRouter();

  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const res = await getMyInvitations();
      setInvitations(res.invitations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (
    inviteId: number,
    action: "ACCEPT" | "REJECT"
  ) => {
    setErrorMsg(null);

    try {
      await respondToInvite(inviteId, action);

      // remove invite from list
      setInvitations((prev) =>
        prev.filter((i) => i.id !== inviteId)
      );
    } catch (err: unknown) {
      const apiErr = err as ApiError;

      const message =
        apiErr?.response?.data?.message ||
        "Something went wrong. Please try again.";

      if (message.toLowerCase().includes("maximum allowed teams")) {
        setLimitReached(true);
      }

      setErrorMsg(message);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-300 text-[#1f2a44]">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Team Invitations" />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold">Team Invitations</h1>

              <button
                onClick={() => router.push("/team")}
                className="
                  inline-flex items-center gap-2
                  px-4 py-2 rounded-xl
                  border border-red-900 text-slate-900
                  bg-transparent
                  transition-all duration-300 ease-out
                  hover:bg-red-600 hover:text-white hover:border-red-800
                  hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(220,38,38,0.45)]
                  active:translate-y-0 active:shadow-[0_6px_16px_rgba(220,38,38,0.35)]
                "
              >
                ← Back 
              </button>
            </div>

            {errorMsg && (
              <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                <strong>Action blocked:</strong> {errorMsg}
                {limitReached && (
                  <p className="mt-2 text-xs text-red-600">
                    You must leave an existing team before accepting a new invitation.
                  </p>
                )}
              </div>
            )}

            {loading ? (
              <div className="rounded-2xl bg-white p-10 text-center">
                Loading invitations...
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
                You don’t have any team invitations right now.
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border bg-white p-5"
                  >
                    <div>
                      <p className="font-medium text-lg">
                        Team{" "}
                        <span className="text-indigo-600">
                          {invite.team_id}
                        </span>
                      </p>
                      <p className="text-sm text-slate-500">
                        Invited by enrollment ID{" "}
                        <span className="font-medium">
                          {invite.invited_by_enrollment_id}
                        </span>
                      </p>

                      <span className="inline-block mt-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        Pending Invitation
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        disabled={limitReached}
                        onClick={() =>
                          handleRespond(invite.id, "ACCEPT")
                        }
                        className={`rounded-lg px-4 py-2 text-sm text-white ${
                          limitReached
                            ? "cursor-not-allowed bg-gray-400"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        Accept
                      </button>

                      <button
                        onClick={() =>
                          handleRespond(invite.id, "REJECT")
                        }
                        className="rounded-lg bg-slate-200 px-4 py-2 text-sm hover:bg-slate-300"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
