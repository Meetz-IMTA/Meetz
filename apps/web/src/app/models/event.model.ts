export interface EventOrganizer {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface MeetzEvent {
  id: number;
  name: string;
  description: string | null;
  date: string;
  location: string | null;
  category: string | null;
  maxAttendees: number | null;
  imageUrl: string | null;
  isPrivate: boolean;
  organizerId: number;
  organizer: EventOrganizer;
  participantCount?: number;
  isJoined?: boolean;
}
