/** Résumé léger d'un événement — affiché dans le profil et le fil d'activité. */
export interface EventSummary {
  id: string;
  title: string;
  category: string;
  date: Date;
  location: string;
  coverImage: string | null;
  status: 'upcoming' | 'ongoing' | 'past';
}
