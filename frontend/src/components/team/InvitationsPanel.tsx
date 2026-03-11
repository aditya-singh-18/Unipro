"use client";

import {
  respondToInvite,
} from "@/services/team/invitation.service";
import { useTeamStore } from "@/store/team.store";

export default function InvitationsPanel() {
  const { invitations, fetchMyTeam, fetchInvitations } = useTeamStore();

  const handleAccept = async (invitationId: number) => {
    await respondToInvite(invitationId, "ACCEPT");
    await fetchMyTeam();       // team updated
    await fetchInvitations(); // invitations refreshed
  };

  const handleReject = async (invitationId: number) => {
    await respondToInvite(invitationId, "REJECT");
    await fetchInvitations();
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Team Invitations</h2>

      {invitations.length === 0 && (
        <p className="text-sm text-slate-500">
          No pending invitations
        </p>
      )}

      <div className="space-y-4">
        {invitations.map((invite) => (
          <div
            key={invite.invitation_id}
            className="flex items-center justify-between border rounded-lg p-3"
          >
            <div>
              <p className="font-medium text-slate-800">
                {invite.team_name}
              </p>
              <p className="text-xs text-slate-500">
                Invited by {invite.invited_by}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(invite.invitation_id)}
                className="px-3 py-1 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                Accept
              </button>
              <button
                onClick={() => handleReject(invite.invitation_id)}
                className="px-3 py-1 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
