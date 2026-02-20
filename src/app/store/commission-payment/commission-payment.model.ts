// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface CommissionPayment extends Metadata {
	contractUid: string;
	advisorUid: string;

	role: string;        // CONSULTANT | KAM | MANAGER | CEO | etc
	origin: string;      // comunidad | red_calida | etc

	amount: number;

	scheme: string;      // A | B

	cutDate: number;     // timestamp del corte (7 o 21)
	installment: number; // numero de pago (1,2,3...)

	paid: boolean;
	paidAt?: number;
}