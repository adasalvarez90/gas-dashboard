// Models
import { Metadata } from 'src/app/models/metadata.model';
import { User } from '../user';

//
export interface Auth {
  user?: Partial<User>;
  isAuthenticated: boolean;
  loading?: boolean;
  error?: any;
}
