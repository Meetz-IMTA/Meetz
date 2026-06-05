import type { User } from './user.model';

export interface Friend {
  id: string;
  user: User;
  since: Date;
}

export interface FriendRequest {
  id: string;
  from: User;
  to: User;
  sentAt: Date;
  /** 'incoming' = reçue par l'utilisateur courant / 'outgoing' = envoyée. */
  direction: 'incoming' | 'outgoing';
}

export type UserRelation =
  | 'friend'
  | 'request_sent' // l'utilisateur courant a envoyé une demande
  | 'request_received' // l'utilisateur courant a reçu une demande
  | 'self' // c'est l'utilisateur courant lui-même
  | 'none';

export interface UserSearchResult {
  user: User;
  relation: UserRelation;
  /** Renseigné si relation vaut 'request_sent' ou 'request_received'. */
  requestId?: string;
}
