// import api from "../../lib/axios";

// /* ================= GET MY TEAM ================= */
// export const getMyTeam = async () => {
//   try {
//     const res = await api.get("/api/team/my");
//     return res.data;
//   } catch (err: any) {
//     // User has no team yet
//     if (err.response?.status === 404) {
//       return null;
//     }
//     throw err;
//   }
// };

// /* ================= GET MY INVITATIONS ================= */
// export const getMyInvitations = async () => {
//   const res = await api.get("/api/team/invitations");
//   return res.data;
// };

// /* ================= CREATE TEAM ================= */
// export const createTeam = async (data: {
//   team_name: string;
//   department: string;
//   max_team_size: number;
// }) => {
//   const res = await api.post("/api/team/create", data);
//   return res.data;
// };

// /* ================= INVITE MEMBER ================= */
// export const inviteMember = async (data: {
//   team_id: string;
//   invitee_enrollment_id: string;
// }) => {
//   const res = await api.post("/api/team/invite", data);
//   return res.data;
// };

// /* ================= ACCEPT INVITATION ================= */
// export const acceptInvitation = async (invitationId: number) => {
//   const res = await api.post(
//     `/api/team/invitations/${invitationId}/accept`
//   );
//   return res.data;
// };

// /* ================= REJECT INVITATION ================= */
// export const rejectInvitation = async (invitationId: number) => {
//   const res = await api.post(
//     `/api/team/invitations/${invitationId}/reject`
//   );
//   return res.data;
// };


// // export const createTeam = async (data: {
// //   team_name: string;
// //   max_members: number;
// // }) => {
// //   const res = await api.post("/api/team/create", data);
// //   return res.data;
// // };

// // export const deleteTeam = async () => {
// //   const res = await api.delete("/api/team/delete");
// //   return res.data;
// // };

// // /* =========================
// //    TEAM MEMBERS
// // ========================= */

// // export const inviteTeamMember = async (inviteeEnrollmentId: string) => {
// //   const res = await api.post("/api/team/invite", {
// //     invitee_enrollment_id: inviteeEnrollmentId,
// //   });
// //   return res.data;
// // };

// // export const removeTeamMember = async (enrollmentId: string) => {
// //   const res = await api.delete(`/api/team/member/${enrollmentId}`);
// //   return res.data;
// // };

// // export const leaveTeam = async () => {
// //   const res = await api.post("/api/team/leave");
// //   return res.data;
// // };

// // /* =========================
// //    INVITATIONS
// // ========================= */

// // export const getMyInvitations = async () => {
// //   const res = await api.get("/api/team/invitations");
// //   return res.data;
// // };

// // export const acceptInvitation = async (invitationId: number) => {
// //   const res = await api.post(
// //     `/api/team/invitations/${invitationId}/accept`
// //   );
// //   return res.data;
// // };

// // export const rejectInvitation = async (invitationId: number) => {
// //   const res = await api.post(
// //     `/api/team/invitations/${invitationId}/reject`
// //   );
// //   return res.data;
// // };
