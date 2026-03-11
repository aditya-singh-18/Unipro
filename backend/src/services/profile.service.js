import {
  getProfileByRole,
  getStudentSocialLinks,
  updateStudentSocialLinks,
  deleteStudentSocialLink
} from '../repositories/profile.repo.js';

/* =========================
   GET MY PROFILE
========================= */
export const getMyProfileService = async ({ userKey, role }) => {
  const profile = await getProfileByRole(userKey, role);

  if (!profile) {
    throw new Error('Profile not found');
  }

  // student ke case me social links attach karo
  if (role === 'STUDENT') {
    const socialLinks = await getStudentSocialLinks(userKey);
    profile.social_links = socialLinks;
  }

  return profile;
};

/* =========================
   UPDATE STUDENT SOCIAL LINKS
========================= */
export const updateMyProfileService = async (req) => {
  const { user_key, role } = req.user;

  if (role !== 'STUDENT') {
    throw new Error('Only students can update social links');
  }

  const { social_links } = req.body;

  await updateStudentSocialLinks(user_key, social_links);

  return { message: 'Social links updated successfully' };
};

/* =========================
   DELETE STUDENT SOCIAL LINK
========================= */
export const deleteMySocialLinkService = async (req, platform) => {
  const { user_key, role } = req.user;

  if (role !== 'STUDENT') {
    throw new Error('Only students can delete social links');
  }

  await deleteStudentSocialLink(user_key, platform);

  return { message: 'Social link deleted successfully' };
};
