// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

export interface UserPhoto {
	url: string;
	fileName?: string;
	mimetype?: string;
	type: string;
	sizeXs?: number;
	sizeSm?: number;
	sizeMd?: number;
	pathXs?: string;
	pathSm?: string;
	pathMd?: string;
	extension?: string;
}
//
export enum Role {
	SUPERADMIN = 0,
	ADMIN = 1,
	USER = 2
}
//
export interface UserPermissions {
	module: number;
	value: number;
}
//
export interface User extends Metadata {
	// Auth info
	username: string;		// The username
	email: string;			// The user email
	password: string;		// The hashed  password
	// Personal data
	photo: UserPhoto;
	name: string;
	lastname: string;
	// Access Type
	role: Role;
	photoXs?: string;
	photoSm?: string;
	photoMd?: string;
	// Alerts
	recoveryToken?: string;
	recoveryDate?: number;
	activeConversation: boolean;
}
