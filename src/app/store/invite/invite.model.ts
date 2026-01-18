export type InviteStatus =
  | 'pending'     // creada, no usada
  | 'used'        // ya registrada
  | 'expired'     // pasó el tiempo
  | 'cancelled';  // cancelada por admin/dev

export interface Invite {
  id: string;             // UUID
  email: string;
  role: 1 | 2;            // admin | user
  token: string;          // random secure token
  status: InviteStatus;

  createdBy: string;      // uid del admin/dev
  createdAt: number;      // Date.now()

  expiresAt: number;      // Date.now() + TTL

  usedAt?: number;
  cancelledAt?: number;

  resendCount: number;
  lastSentAt?: number;
}
