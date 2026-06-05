export interface EventOrganizer {
  id: number;
  name: string;
  email: string;
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
  organizerId: number;
  organizer: EventOrganizer;
  participantCount?: number;
  isJoined?: boolean;
}
