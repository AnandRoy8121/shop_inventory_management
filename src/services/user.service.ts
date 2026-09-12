import { userRepository } from '@/repositories/user.repository';
import { hashPassword } from '@/lib/auth';
import { RegisterUserInput } from '@/schemas/auth.schema';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { UserDTO } from '@/types/user.types';

export class UserService {
  async registerUser(input: RegisterUserInput): Promise<UserDTO> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`User with email "${input.email}" already exists.`);
    }

    const passwordHash = await hashPassword(input.password);

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      isActive: input.isActive,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async getUserById(id: string): Promise<UserDTO> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}

export const userService = new UserService();
