export const validateStudentProfileUpdate = (req, res, next) => {
  const { social_links } = req.body;

  if (!Array.isArray(social_links)) {
    return res.status(400).json({
      message: 'social_links must be an array'
    });
  }

  for (const item of social_links) {
    if (!item.platform || !item.link) {
      return res.status(400).json({
        message: 'platform and link are required'
      });
    }
  }

  next();
};
