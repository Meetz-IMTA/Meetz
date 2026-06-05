import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventService } from '../../../services/event';
import { EventCard } from '../../../components/event-card/event-card';
import { Auth } from '../../../services/auth';
import { MeetzEvent } from '../../../models/event.model';

interface Category {
  label: string;
  icon: string;
  value: string;
}

@Component({
  selector: 'app-events-list',
  imports: [CommonModule, FormsModule, RouterLink, EventCard],
  templateUrl: './events-list.html',
  styleUrl: './events-list.css',
})
export class EventsList implements OnInit {
  private eventService = inject(EventService);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);

  events: MeetzEvent[] = [];
  filteredEvents: MeetzEvent[] = [];
  selectedCategory = 'all';
  searchQuery = '';
  locationFilter = '';
  viewMode: 'grid' | 'list' = 'grid';
  isLoading = true;
  error = '';

  readonly skeletonItems = Array.from({ length: 8 }, (_, i) => i);

  categories: Category[] = [
    { label: 'Tous', icon: 'explore', value: 'all' },
    { label: 'Sport', icon: 'sports_soccer', value: 'Sport' },
    { label: 'Culture', icon: 'theater_comedy', value: 'Culture' },
    { label: 'Gastro', icon: 'restaurant', value: 'Gastro' },
    { label: 'Jeux', icon: 'videogame_asset', value: 'Jeux' },
    { label: 'Musique', icon: 'music_note', value: 'Musique' },
    { label: 'Savoir', icon: 'lightbulb', value: 'Savoir' },
  ];

  ngOnInit() {
    this.isLoading = !this.eventService.hasCachedAll();
    this.loadEvents();
  }

  loadEvents() {
    this.isLoading = true;
    this.error = '';
    const currentUserId = this.auth.getUser()?.id;
    this.eventService.getAll().subscribe({
      next: (events) => {
        this.events = currentUserId
          ? events.filter((e) => e.organizerId !== currentUserId)
          : events;
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger les événements.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters() {
    let result = [...this.events];

    if (this.selectedCategory !== 'all') {
      result = result.filter((e) => e.category === this.selectedCategory);
    }
    if (this.locationFilter) {
      result = result.filter((e) =>
        e.location?.toLowerCase().includes(this.locationFilter.toLowerCase()),
      );
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q),
      );
    }

    this.filteredEvents = result;
  }

  selectCategory(value: string) {
    this.selectedCategory = value;
    this.applyFilters();
  }

  setLocationFilter(city: string) {
    this.locationFilter = city;
    this.applyFilters();
  }

  onSearch(query: string) {
    this.searchQuery = query;
    this.applyFilters();
  }

  toggleView(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }

  countByCategory(value: string): number {
    if (value === 'all') return this.events.length;
    return this.events.filter((e) => e.category === value).length;
  }

  formatShortDate(date: string): string {
    return new Date(date)
      .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      .toUpperCase();
  }

  shortLocation(location: string | null): string {
    if (!location) return '';
    const parts = location.split(',');
    return parts.length > 1 ? parts[0].trim() : location;
  }
}
