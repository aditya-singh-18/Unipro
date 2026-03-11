import jwt from 'jsonwebtoken';
import config from '../config/env.js';

const jwtSecret = config.jwtSecret;
const jwtExpiry = config.jwtExpiry;

export const generateToken = (payload) => {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiry,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, jwtSecret);
};
