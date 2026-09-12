import { userRepository } from '@/repositories/user.repository';
import {
  comparePassword,
  createSessionToken,
  setAuthCookie,
  clearAuthCookie,
  getAuthSession,
  AuthSessionUser,
} from '@/lib/auth';
import { UnauthorizedError } from '@/lib/errors';
import { LoginInput } from '@/schemas/auth.schema';

export class AuthService {
  /**
   * Validate user credentials against the database repository
   */
  async validateCredentials(credentials: LoginInput): Promise<AuthSessionUser> {
    const user = await userRepository.findByEmail(credentials.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = await comparePassword(credentials.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Login user and issue signed session cookie
   */
  async login(credentials: LoginInput): Promise<AuthSessionUser> {
    const user = await this.validateCredentials(credentials);
    const token = await createSessionToken(user);
    await setAuthCookie(token);
    return user;
  }

  /**
   * Logout user and clear session cookie
   */
  async logout(): Promise<void> {
    await clearAuthCookie();
  }

  /**
   * Get active authenticated user session
   */
  async getCurrentUser(): Promise<AuthSessionUser | null> {
    return getAuthSession();
  }
}

export const authService = new AuthService();
