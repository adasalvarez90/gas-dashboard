// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface Advisor extends Metadata {
	name: string;
	hierarchyLevel: string;
	tags: string[];
	managerId: string | null;
}