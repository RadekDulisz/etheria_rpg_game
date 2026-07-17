export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  jti: string;
}
