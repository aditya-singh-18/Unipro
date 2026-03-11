import { loginService } from '../services/auth.service.js';

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
    res.status(401).json({
      message: error.message,
    });
  }
};
