import { Role } from '@prisma/client';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

export interface AuthContextUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
