import type { Badge } from './badge.model';
import type { EventSummary } from './event.model';

export type UserRole = 'admin' | 'creator' | 'user' | 'organizer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  role: UserRole;
  /** Note moyenne reçue (1-5), null si aucune note. */
  rating: number | null;
  bio: string | null;
  joinedAt: Date;
  isOnline?: boolean;
}

/** Une cooptation effectuée par un créateur. */
export interface CooptationEntry {
  user: User;
  date: Date;
}

/** Profil étendu — page profil et utilisateur courant. */
export interface UserProfile extends User {
  badges: Badge[];
  recentEvents: EventSummary[];
  cooptations: CooptationEntry[];
  friendsCount: number;
  eventsCount: number;
  /** Créateurs uniquement : cooptations utilisées sur l'année (sinon null). */
  cooptationsUsed: number | null;
  /** Créateurs uniquement : quota annuel (sinon null). */
  cooptationsMax: number | null;
}
