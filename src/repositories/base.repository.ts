import { prisma } from '@/lib/prisma';

export abstract class BaseRepository {
  protected get db() {
    return prisma;
  }
}
