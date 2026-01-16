// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

export enum Role {
	DEV = 0,
	ADMIN = 1,
	USER = 2
}
//
export interface User extends Metadata {
  uid: string;
  email: string;
  name: string;
  role: Role; // 0=dev, 1=admin, 2=user
}