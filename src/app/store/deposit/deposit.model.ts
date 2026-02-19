// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface Deposit extends Metadata {
	contractUid: string;
	amount: number;
	date: number;
}