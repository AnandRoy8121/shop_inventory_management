import { BaseRepository } from './base.repository';
import { User, Prisma } from '@prisma/client';

export class UserRepository extends BaseRepository {
  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.db.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase().trim(),
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({
      where: { id },
      data,
    });
  }

  async list(params?: { skip?: number; take?: number; activeOnly?: boolean }): Promise<{
    users: User[];
    total: number;
  }> {
    const where: Prisma.UserWhereInput = params?.activeOnly ? { isActive: true } : {};

    const [total, users] = await Promise.all([
      this.db.user.count({ where }),
      this.db.user.findMany({
        where,
        skip: params?.skip,
        take: params?.take,
        orderBy: { name: 'asc' },
      }),
    ]);

    return { users, total };
  }
}

export const userRepository = new UserRepository();
