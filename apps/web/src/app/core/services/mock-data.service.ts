import { Injectable, computed, signal } from '@angular/core';
import type { User, UserProfile, CooptationEntry } from '../../shared/models/user.model';
import type {
  Friend,
  FriendRequest,
  UserRelation,
  UserSearchResult,
} from '../../shared/models/friendship.model';
import type { Badge } from '../../shared/models/badge.model';
import type { EventSummary } from '../../shared/models/event.model';
import type { Report, ReportReason } from '../../shared/models/report.model';

/**
 * Données mockées du périmètre Amis/Profil.
 * Tout est en mémoire (reset au rechargement de la page).
 * À remplacer par des appels HTTP quand le backend exposera les endpoints.
 */

// ─── Données de référence ───────────────────────────────────────────────────

const D = (s: string) => new Date(s);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

const BADGES: Badge[] = [
  {
    id: 'b1',
    key: 'first_event',
    label: 'Premier pas',
    description: 'A participé à son premier événement',
    icon: 'celebration',
    earnedAt: D('2023-04-01'),
    category: 'participation',
  },
  {
    id: 'b2',
    key: 'social_butterfly',
    label: 'Papillon social',
    description: 'A ajouté 5 amis',
    icon: 'group_add',
    earnedAt: D('2023-06-10'),
    category: 'social',
  },
  {
    id: 'b3',
    key: 'coopter_1',
    label: 'Coopteur',
    description: 'A coopté son premier membre',
    icon: 'person_add',
    earnedAt: D('2024-01-20'),
    category: 'cooptation',
  },
  {
    id: 'b4',
    key: 'regular',
    label: 'Fidèle',
    description: 'A rejoint 10 événements',
    icon: 'military_tech',
    earnedAt: D('2024-02-15'),
    category: 'participation',
  },
];

const RECENT_EVENTS: EventSummary[] = [
  {
    id: 'e1',
    title: 'Trail du Gardon',
    category: 'Sport',
    date: daysAgo(40),
    location: 'Bambouseraie, Alès',
    coverImage: null,
    status: 'past',
  },
  {
    id: 'e2',
    title: 'Apéro Jazz',
    category: 'Culture',
    date: daysAgo(20),
    location: 'Le Cube, Alès',
    coverImage: null,
    status: 'past',
  },
  {
    id: 'e3',
    title: 'Sortie vélo Cévennes',
    category: 'Sport',
    date: daysAgo(8),
    location: 'Piste du Gardon',
    coverImage: null,
    status: 'past',
  },
  {
    id: 'e4',
    title: 'Pique-nique au parc',
    category: 'Détente',
    date: daysAgo(-5),
    location: 'Parc du Colombier',
    coverImage: null,
    status: 'upcoming',
  },
  {
    id: 'e5',
    title: 'Tournoi de pétanque',
    category: 'Sport',
    date: daysAgo(-12),
    location: 'Place de la Mairie',
    coverImage: null,
    status: 'upcoming',
  },
];

const ALL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Sarah Köhler',
    email: 'sarah.k@meetz.fr',
    avatarUrl: 'https://i.pravatar.cc/160?u=u1',
    role: 'user',
    rating: 4.5,
    bio: 'Fan de rando et de photo.',
    joinedAt: D('2023-05-20'),
    isOnline: true,
  },
  {
    id: 'u2',
    name: 'Thomas Ravier',
    email: 't.ravier@meetz.fr',
    avatarUrl: 'https://i.pravatar.cc/160?u=u2',
    role: 'creator',
    rating: 4.8,
    bio: 'Organisateur de trails dans les Cévennes.',
    joinedAt: D('2022-11-08'),
    isOnline: false,
  },
  {
    id: 'u3',
    name: 'Camille Dupont',
    email: 'c.dupont@meetz.fr',
    avatarUrl: 'https://i.pravatar.cc/160?u=u3',
    role: 'user',
    rating: null,
    bio: null,
    joinedAt: D('2024-01-15'),
    isOnline: true,
  },
  {
    id: 'u4',
    name: 'Antoine Bernard',
    email: 'a.bernard@meetz.fr',
    avatarUrl: 'https://i.pravatar.cc/160?u=u4',
    role: 'user',
    rating: 4.2,
    bio: 'Toujours partant pour un concert.',
    joinedAt: D('2023-09-03'),
    isOnline: false,
  },
  {
    id: 'u5',
    name: 'Marie-Claire Petit',
    email: 'mc.petit@meetz.fr',
    avatarUrl: 'https://i.pravatar.cc/160?u=u5',
    role: 'creator',
    rating: 4.6,
    bio: 'Passionnée de gastronomie locale.',
    joinedAt: D('2023-02-28'),
    isOnline: false,
  },
  {
    id: 'u6',
    name: 'Julien Tarroux',
    email: 'j.tarroux@meetz.fr',
    avatarUrl: 'https://i.pravatar.cc/160?u=u6',
    role: 'user',
    rating: null,
    bio: null,
    joinedAt: D('2024-03-01'),
    isOnline: true,
  },
  {
    id: 'u7',
    name: 'Nadia Chebbi',
    email: 'n.chebbi@meetz.fr',
    avatarUrl: 'https://i.pravatar.cc/160?u=u7',
    role: 'user',
    rating: 4.1,
    bio: 'Jeux de société & soirées quiz.',
    joinedAt: D('2024-02-14'),
    isOnline: false,
  },
  {
    id: 'u8',
    name: 'Romain Fabre',
    email: 'r.fabre@meetz.fr',
    avatarUrl: 'https://i.pravatar.cc/160?u=u8',
    role: 'user',
    rating: null,
    bio: null,
    joinedAt: D('2024-04-05'),
    isOnline: false,
  },
];

const CURRENT_USER: UserProfile = {
  id: 'u0',
  name: 'Lucas Martin',
  email: 'lucas.martin@meetz.fr',
  avatarUrl: 'https://i.pravatar.cc/160?u=u0',
  role: 'creator',
  rating: 4.7,
  bio: 'Passionné de running et de culture locale. Organisateur de sorties à Alès depuis 2 ans.',
  joinedAt: D('2023-03-15'),
  isOnline: true,
  badges: BADGES,
  recentEvents: RECENT_EVENTS,
  cooptations: [{ user: ALL_USERS[2], date: D('2024-01-20') }],
  friendsCount: 3,
  eventsCount: 12,
  cooptationsUsed: 1,
  cooptationsMax: 5,
};

const INIT_FRIENDS: Friend[] = [
  { id: 'f1', user: ALL_USERS[0], since: D('2023-07-10') },
  { id: 'f2', user: ALL_USERS[1], since: D('2023-12-05') },
  { id: 'f3', user: ALL_USERS[2], since: D('2024-02-20') },
];

const INIT_REQUESTS: FriendRequest[] = [
  { id: 'req1', from: ALL_USERS[3], to: CURRENT_USER, sentAt: daysAgo(2), direction: 'incoming' },
  { id: 'req2', from: ALL_USERS[4], to: CURRENT_USER, sentAt: daysAgo(5), direction: 'incoming' },
  { id: 'req3', from: CURRENT_USER, to: ALL_USERS[5], sentAt: daysAgo(1), direction: 'outgoing' },
];

// Badges/événements génériques pour les profils des autres utilisateurs.
const GENERIC_BADGES: Badge[] = [BADGES[0], BADGES[1]];
const GENERIC_EVENTS: EventSummary[] = [RECENT_EVENTS[0], RECENT_EVENTS[1]];

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly _friends = signal<Friend[]>([...INIT_FRIENDS]);
  private readonly _requests = signal<FriendRequest[]>([...INIT_REQUESTS]);
  private readonly _reports = signal<Report[]>([]);
  private readonly _currentUser = signal<UserProfile>({ ...CURRENT_USER });

  // Accès en lecture seule
  readonly currentUser = this._currentUser.asReadonly();
  readonly friends = this._friends.asReadonly();
  readonly friendRequests = this._requests.asReadonly();
  readonly reports = this._reports.asReadonly();

  readonly incomingRequests = computed(() =>
    this._requests().filter((r) => r.direction === 'incoming'),
  );
  readonly outgoingRequests = computed(() =>
    this._requests().filter((r) => r.direction === 'outgoing'),
  );
  readonly pendingRequestsCount = computed(() => this.incomingRequests().length);

  // ── Profils ────────────────────────────────────────────────────────────

  /** Profil d'un utilisateur (courant ou autre). undefined si introuvable. */
  getUserProfile(id: string): UserProfile | undefined {
    if (id === this._currentUser().id) return this._currentUser();

    const user = ALL_USERS.find((u) => u.id === id);
    if (!user) return undefined;

    const isCreator = user.role === 'creator';
    return {
      ...user,
      badges: GENERIC_BADGES,
      recentEvents: GENERIC_EVENTS,
      cooptations: [],
      friendsCount: 5,
      eventsCount: 7,
      cooptationsUsed: isCreator ? 2 : null,
      cooptationsMax: isCreator ? 5 : null,
    };
  }

  /** Met à jour le profil de l'utilisateur courant (édition). */
  updateCurrentUser(changes: Partial<Pick<UserProfile, 'name' | 'bio' | 'avatarUrl'>>): void {
    this._currentUser.update((u) => ({ ...u, ...changes }));
  }

  // ── Actions amis ──────────────────────────────────────────────────────────

  sendFriendRequest(userId: string): void {
    const user = ALL_USERS.find((u) => u.id === userId);
    if (!user || this.getUserRelation(userId).status !== 'none') return;
    this._requests.update((reqs) => [
      ...reqs,
      {
        id: `req_${Date.now()}`,
        from: this._currentUser(),
        to: user,
        sentAt: new Date(),
        direction: 'outgoing',
      },
    ]);
  }

  acceptFriendRequest(requestId: string): void {
    const req = this._requests().find((r) => r.id === requestId);
    if (!req || req.direction !== 'incoming') return;
    this._friends.update((f) => [
      ...f,
      { id: `f_${Date.now()}`, user: req.from, since: new Date() },
    ]);
    this._requests.update((r) => r.filter((x) => x.id !== requestId));
  }

  declineFriendRequest(requestId: string): void {
    this._requests.update((r) => r.filter((x) => x.id !== requestId));
  }

  cancelFriendRequest(requestId: string): void {
    this._requests.update((r) => r.filter((x) => x.id !== requestId));
  }

  removeFriend(userId: string): void {
    this._friends.update((f) => f.filter((x) => x.user.id !== userId));
  }

  // ── Relations & recherche ───────────────────────────────────────────────

  getUserRelation(userId: string): { status: UserRelation; requestId?: string } {
    if (userId === this._currentUser().id) return { status: 'self' };
    if (this._friends().some((f) => f.user.id === userId)) return { status: 'friend' };
    const req = this._requests().find(
      (r) =>
        (r.direction === 'outgoing' && r.to.id === userId) ||
        (r.direction === 'incoming' && r.from.id === userId),
    );
    if (req) {
      return {
        status: req.direction === 'outgoing' ? 'request_sent' : 'request_received',
        requestId: req.id,
      };
    }
    return { status: 'none' };
  }

  searchUsers(query: string): UserSearchResult[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return ALL_USERS.filter((u) => u.id !== this._currentUser().id)
      .filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .map((u) => {
        const rel = this.getUserRelation(u.id);
        return { user: u, relation: rel.status, requestId: rel.requestId };
      });
  }

  // ── Signalement ────────────────────────────────────────────────────────

  submitReport(reportedUserId: string, reason: ReportReason, details: string | null): void {
    this._reports.update((r) => [
      ...r,
      { id: `rep_${Date.now()}`, reportedUserId, reason, details, createdAt: new Date() },
    ]);
  }

  // ── Utilitaire ───────────────────────────────────────────────────────────

  timeAgo(date: Date): string {
    const ms = Date.now() - date.getTime();
    const days = Math.floor(Math.abs(ms) / 86_400_000);
    const future = ms < 0;
    if (days === 0) return "aujourd'hui";
    if (days === 1) return future ? 'demain' : 'hier';
    if (days < 30) return future ? `dans ${days} jours` : `il y a ${days} jours`;
    const months = Math.floor(days / 30);
    return future ? `dans ${months} mois` : `il y a ${months} mois`;
  }
}
