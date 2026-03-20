import {
  forgotPasswordService,
  loginService,
  logoutService,
  resetPasswordService,
  verifyEmailService,
} from '../services/auth.service.js';

export const login = async (req, res) => {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password || !role) {
      return res.status(400).json({
        message: 'Identifier, password and role required',
      });
    }

    const result = await loginService(identifier, password, role);

    res.status(200).json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    const status = error?.status || 401;
    return res.status(status).json({
      success: false,
      message: error?.message || 'Authentication failed',
      ...(error?.attemptsRemaining !== undefined ? { attemptsRemaining: error.attemptsRemaining } : {}),
      ...(error?.lockedUntil ? { lockedUntil: error.lockedUntil } : {}),
    });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    await logoutService({
      token,
      userKey: req.user?.user_key,
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    await verifyEmailService(token);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
    });
  } catch (error) {
    return res.status(error?.status || 400).json({
      success: false,
      message: error?.message || 'Invalid or expired verification link. Please contact your administrator to resend.',
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    await forgotPasswordService(email);

    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, you will receive reset instructions.',
    });
  } catch {
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, you will receive reset instructions.',
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    await resetPasswordService(token, newPassword);

    return res.status(200).json({
      success: true,
      message: 'Password reset successful.',
    });
  } catch (error) {
    return res.status(error?.status || 400).json({
      success: false,
      message: error?.message || 'Invalid or expired reset link.',
    });
  }
};
