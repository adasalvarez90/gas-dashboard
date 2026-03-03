// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface Tranche extends Metadata {
	contractUid: string;

	amount: number;

	totalDeposited: number;

	funded: boolean;
	fundedAt?: number;

	sequence: number; // 1 = inicial, 2 = anexo1, 3 = anexo2
}