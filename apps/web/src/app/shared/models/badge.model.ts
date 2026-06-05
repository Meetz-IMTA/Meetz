export type BadgeCategory = 'participation' | 'social' | 'organisation' | 'cooptation';

export interface Badge {
  id: string;
  /** Identifiant technique (ex: 'first_event'). */
  key: string;
  label: string;
  description: string;
  /** Nom d'une icône Material Symbols Outlined (ex: 'celebration'). */
  icon: string;
  earnedAt: Date;
  category: BadgeCategory;
}
