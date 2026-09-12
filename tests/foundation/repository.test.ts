import { describe, it, expect, afterAll } from 'vitest';
import { userRepository } from '../../src/repositories/user.repository';
import { userService } from '../../src/services/user.service';
import { ConflictError } from '../../src/lib/errors';
import { Role } from '@prisma/client';
import prisma from '../../src/lib/prisma';

describe('Repository & Domain Service Architecture', () => {
  const testEmail = `foundation.test.${Date.now()}@example.com`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it('retrieves an existing user by email using the repository', async () => {
    const admin = await userRepository.findByEmail('admin@apexretail.com');
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe(Role.ADMIN);
  });

  it('creates and registers a new user via the userService layer', async () => {
    const newUser = await userService.registerUser({
      name: 'Foundation Test Staff',
      email: testEmail,
      password: 'StrongPassword123!',
      role: Role.CASHIER,
      isActive: true,
    });

    expect(newUser.id).toBeDefined();
    expect(newUser.email).toBe(testEmail);
    expect(newUser.role).toBe(Role.CASHIER);

    // Verify retrieval
    const retrieved = await userRepository.findById(newUser.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.email).toBe(testEmail);
  });

  it('prevents duplicate user registration via ConflictError', async () => {
    await expect(
      userService.registerUser({
        name: 'Duplicate Staff',
        email: testEmail,
        password: 'StrongPassword123!',
        role: Role.CASHIER,
        isActive: true,
      })
    ).rejects.toThrow(ConflictError);
  });
});
