import { findUserByIdentifier } from '../repositories/user.repo.js';
import { comparePassword } from '../utils/password.util.js';
import { generateToken } from '../utils/jwt.util.js';

export const loginService = async (identifier, password, selectedRole) => {
  const user = await findUserByIdentifier(identifier);

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.is_active) {
    throw new Error('Account is inactive');
  }

  const userRole = user.role?.toUpperCase();
  const requestedRole = selectedRole?.toUpperCase();

  // ✅ ROLE CHECK (case-insensitive)
  if (!userRole || !requestedRole || userRole !== requestedRole) {
    throw new Error('Selected role is not allowed for this login');
  }

  const isMatch = await comparePassword(password, user.password_hash);

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken({
    user_key: user.user_key,
    role: userRole,
  });

  return {
    token,
    user: {
      user_key: user.user_key,
      role: userRole,
      email: user.email,
    },
  };
};
