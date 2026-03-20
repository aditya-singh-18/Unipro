import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/env.js';

const jwtSecret = config.jwtSecret;
const jwtExpiry = config.jwtExpiry;

export const generateToken = (payload) => {
  const jwtPayload = {
    ...payload,
    jti: crypto.randomUUID(),
  };

  return jwt.sign(jwtPayload, jwtSecret, {
    expiresIn: jwtExpiry,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, jwtSecret);
};
