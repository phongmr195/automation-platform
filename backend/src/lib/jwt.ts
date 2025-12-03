import jwt from "jsonwebtoken";

// JWT secret keys - IMPORTANT: Move to environment variables in production
const ACCESS_TOKEN_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  "your-access-token-secret-change-in-production";
const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "your-refresh-token-secret-change-in-production";

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "1h"; // 1 hour
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface JWTPayload extends TokenPayload {
  iat?: number;
  exp?: number;
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log("Access token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log("Invalid access token");
    }
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log("Refresh token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log("Invalid refresh token");
    }
    return null;
  }
}

/**
 * Calculate refresh token expiration date
 */
export function getRefreshTokenExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now
  return expiryDate;
}
