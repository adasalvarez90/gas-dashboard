// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface Deposit extends Metadata {
	trancheUid: string;
	contractUid: string;

	amount: number;

	depositedAt: number;
}