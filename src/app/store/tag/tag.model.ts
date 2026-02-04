// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface Tag extends Metadata {
	name: string;
	level: number;
}