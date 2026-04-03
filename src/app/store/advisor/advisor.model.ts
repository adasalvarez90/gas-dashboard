// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

export type AdvisorFiscalActivity = 'RESICO' | 'PERSONA_FISICA_ACTIVIDAD_EMPRESARIAL';

//
export interface Advisor extends Metadata {
	name: string;
	hierarchyLevel: string;
	tags: string[];
	managerId: string | null;
	fiscalActivity: AdvisorFiscalActivity;
	/**
	 * Archivado: no aparece en listas de selección; el documento permanece en Firestore
	 * para mostrar nombres en contratos / histórico.
	 */
	archived?: boolean;
}