export const requireSuperAdmin = (req, res, next) => {
  if (req.user?.is_super_admin === true) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'This action requires super-admin privileges. Contact your system administrator.',
  });
};

export const requireSuperAdminForAdminRole = (req, res, next) => {
  const requestedRole = String(req.body?.role || '').toUpperCase();
  if (requestedRole !== 'ADMIN') {
    return next();
  }

  return requireSuperAdmin(req, res, next);
};
