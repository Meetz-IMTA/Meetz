import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Category {
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
}

@Component({
  selector: 'app-categories-section',
  imports: [RouterLink],
  templateUrl: './categories-section.html',
})
export class CategoriesSection {
  readonly categories: Category[] = [
    {
      label: 'Sport',
      icon: 'fitness_center',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-500',
    },
    {
      label: 'Culture',
      icon: 'theater_comedy',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-500',
    },
    {
      label: 'Gastro',
      icon: 'restaurant',
      bgColor: 'bg-orange-500/10',
      textColor: 'text-orange-500',
    },
    {
      label: 'Jeux',
      icon: 'sports_esports',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-500',
    },
    { label: 'Musique', icon: 'music_note', bgColor: 'bg-pink-500/10', textColor: 'text-pink-500' },
    {
      label: 'Savoir',
      icon: 'lightbulb',
      bgColor: 'bg-yellow-500/10',
      textColor: 'text-yellow-500',
    },
  ];
}
