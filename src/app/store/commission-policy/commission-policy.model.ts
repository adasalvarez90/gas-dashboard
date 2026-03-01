// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface CommissionPolicy extends Metadata {
	name: string;
	active: boolean;

	validFrom: number;
	validTo: number;

	scheme: 'A' | 'B';
	yieldPercent?: number;

	overrideTotalCommissionPercent?: number;
	overrideImmediatePercent?: number;
}