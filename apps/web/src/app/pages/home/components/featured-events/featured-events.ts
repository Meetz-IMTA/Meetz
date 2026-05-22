import { Component, computed, signal } from '@angular/core';
import { NgFor } from '@angular/common';

interface Event {
  title: string;
  category: string;
  badgeColor: string;
  date: string;
  location: string;
  image: string;
  participants: number;
  extra: number;
}

const ALL_EVENTS: Event[] = [
  {
    title: 'Tournoi de Basket 3x3 Amical',
    category: 'Sport',
    badgeColor: 'bg-blue-500',
    date: 'Samedi 14 Oct. • 10:00',
    location: 'Parc du Colombier, Alès',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDiDOfc-KQMMxCLY79BLl7FJQq0tktaPTlgLhmLxlhrfaJAjA0DstwbECORSH0eUALGV4uG9Gb9E6BaEkj793yTircTBiYs2zv_MxKuUjfPYkNkahkbb1NeoNjboZd6cJmlQqmWzI3220d0Afbx6xn11Gyy58q7THA_4fSbAn42yKtqAv1VnMsB_5gSL0Ry5YGiOuY-IJ-EB7yq6ekX5brym_vwQZKMgJfMCx0l-JiApCrXofyCyEZgMuNrgXtmGQZMgtkFsOsdXzI',
    participants: 12,
    extra: 8,
  },
  {
    title: 'Atelier Peinture & Vernissage',
    category: 'Culture',
    badgeColor: 'bg-purple-500',
    date: 'Dimanche 15 Oct. • 14:30',
    location: 'Le Cratère, Alès',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCAJNcijFr09kReGCJ66PSFE1dVKzuwdbA3tuJFwWNxfQAbJpz65ZlxFtrs2IXeSgCy3Xx7mVMf-iPDCJuyzECeCEz16b8jRaNNG3ccOfwHFp-D8dYC1c0o_L5I8sqjYqtwtmZOwWWGKlxVqwzLjUDgJZ3842_mO8-8rBN_WInzCHp0UcZjgHlQw7MLllcrHcE2a2J44fOKRIeY7AmE286YYIYDv1eTmASMqENID1jRoNDC8ClA50anUX3f6AZbKaS1MfPXvNnnv-g',
    participants: 10,
    extra: 5,
  },
  {
    title: 'Dégustation Tapas & Vins Locaux',
    category: 'Gastro',
    badgeColor: 'bg-orange-500',
    date: 'Mardi 17 Oct. • 19:30',
    location: "Les Halles d'Alès",
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA3L0_wk7UAd5JTQ_DGimqJO0fYUHVWT6XbqOyCebvqR-dKAuJpCVJy5z4OJF5BJ7WXG1Ax3leq5WfosAfn6tQeH_CDMlXPQpSoYFIHtB2qMbSPJoT2OZozXQHr0k4Q9qixK_z12n0RkXmztnigxrybFcupbn677vbyboK8L_I3Yx_qhnJniAqQnzpBU1xvlN3Hf5R_8GzUaGUeDiz63M9uYzAM4v5v4aibdC2NoYnwkl72jcGw5smekXpXAaU46oJSHpREOLCeF7Y',
    participants: 20,
    extra: 15,
  },
];

@Component({
  selector: 'app-featured-events',
  imports: [NgFor],
  templateUrl: './featured-events.html',
})
export class FeaturedEvents {
  readonly categories = ['Tous', 'Sport', 'Culture', 'Gastro'];
  activeCategory = 'Tous';

  get filteredEvents(): Event[] {
    if (this.activeCategory === 'Tous') return ALL_EVENTS;
    return ALL_EVENTS.filter((e) => e.category === this.activeCategory);
  }
}
