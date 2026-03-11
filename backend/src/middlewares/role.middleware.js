export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role?.toUpperCase();

    if (!allowedRoles.map(r => r.toUpperCase()).includes(userRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
};
