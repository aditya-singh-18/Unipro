import bcrypt from 'bcryptjs';

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

export const COMMON_PASSWORDS = [
  'password',
  'password1',
  '123456789',
  '12345678',
  'qwerty123',
  'iloveyou',
  'admin123',
  'welcome1',
  'monkey123',
  'dragon123',
  'master123',
  'hello123',
  'sunshine1',
  'princess1',
  'letmein1',
  'football',
  'shadow123',
  'superman',
  'michael1',
  'jennifer1',
];

export const validatePassword = (password) => {
  const errors = [];

  if (typeof password !== 'string' || password.length < 10) {
    errors.push('Must be at least 10 characters');
  }

  if (!/[A-Z]/.test(password || '')) {
    errors.push('Must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password || '')) {
    errors.push('Must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password || '')) {
    errors.push('Must contain at least one digit');
  }

  if (!SPECIAL_CHAR_REGEX.test(password || '')) {
    errors.push('Must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateAndHashPassword = async (password) => {
  const validation = validatePassword(password);
  if (!validation.valid) {
    throw { status: 400, message: validation.errors.join('. ') };
  }

  if (COMMON_PASSWORDS.includes(String(password || '').toLowerCase())) {
    throw {
      status: 400,
      message: 'This password is too common. Please choose a unique password.',
    };
  }

  return bcrypt.hash(password, 12);
};
