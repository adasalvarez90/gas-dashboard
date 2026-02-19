// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface CommissionConfig extends Metadata {
	role: string; // KAM | CONSULTANT | MANAGER | CEO | SM | OS | REFERRAL
	source: string; // Community | Warm Network | Self-Funded | Referrer
	percentage: number; // CommissionConfig percentage
}