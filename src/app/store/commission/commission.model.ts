// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface Commission extends Metadata {
	role: string; // KAM | CONSULTANT | MANAGER | CEO | SM | OS | REFERRAL
	source: string; // Community | Warm Network | Self-Funded | Referrer
	percentage: number; // Commission percentage
}