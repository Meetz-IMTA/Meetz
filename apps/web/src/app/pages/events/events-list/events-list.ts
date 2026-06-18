import { ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventService } from '../../../services/event';
import { EventCard } from '../../../components/event-card/event-card';
import { Auth } from '../../../services/auth';
import { MeetzEvent } from '../../../models/event.model';
import { GeocodingService, Coords } from '../../../services/geocoding';
import { haversineDistance } from '../../../utils/haversine';
import { EventMapView } from './event-map-view/event-map-view';

interface Category {
  label: string;
  icon: string;
  value: string;
}

interface RadiusOption {
  label: string;
  km: number;
}

@Component({
  selector: 'app-events-list',
  imports: [CommonModule, FormsModule, RouterLink, EventCard, EventMapView],
  templateUrl: './events-list.html',
  styleUrl: './events-list.css',
})
export class EventsList implements OnInit, OnDestroy {
  private eventService = inject(EventService);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private geocoding = inject(GeocodingService);
  private destroy$ = new Subject<void>();

  events: MeetzEvent[] = [];
  filteredEvents: MeetzEvent[] = [];
  selectedCategory = 'all';
  searchQuery = '';
  locationFilter = '';
  privateOnly = false;
  viewMode: 'grid' | 'list' | 'map' = 'grid';
  mobileSidebarOpen = false;
  isLoading = true;
  error = '';

  get canCreateEvents(): boolean {
    const role = this.auth.getUser()?.role;
    return role === 'organizer' || role === 'admin';
  }

  // Distance filter state
  distanceRadius: number | null = null;
  cityCoords: Coords | null = null;
  isGeocodingCity = false;
  private eventCoordsMap = new Map<number, Coords | null>();

  readonly skeletonItems = Array.from({ length: 8 }, (_, i) => i);

  readonly categories: Category[] = [
    { label: 'Tous', icon: 'explore', value: 'all' },
    { label: 'Sport', icon: 'sports_soccer', value: 'Sport' },
    { label: 'Culture', icon: 'theater_comedy', value: 'Culture' },
    { label: 'Gastro', icon: 'restaurant', value: 'Gastro' },
    { label: 'Jeux', icon: 'videogame_asset', value: 'Jeux' },
    { label: 'Musique', icon: 'music_note', value: 'Musique' },
    { label: 'Savoir', icon: 'lightbulb', value: 'Savoir' },
  ];

  readonly radiusOptions: RadiusOption[] = [
    { label: '5 km', km: 5 },
    { label: '10 km', km: 10 },
    { label: '25 km', km: 25 },
    { label: '50 km', km: 50 },
    { label: '100 km', km: 100 },
  ];

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const cat = params.get('category');
    if (cat) this.selectedCategory = cat;
    const view = params.get('view');
    if (view === 'list' || view === 'map' || view === 'grid') this.viewMode = view;
    this.isLoading = !this.eventService.hasCachedAll();
    this.loadEvents();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
    if (this.privateOnly) {
      result = result.filter((e) => e.isPrivate);
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
    if (this.locationFilter) {
      if (this.cityCoords && this.distanceRadius != null) {
        result = result.filter((e) => {
          const coords = this.eventCoordsMap.get(e.id);
          if (coords === undefined) return true; // optimistic: not yet geocoded
          if (coords === null) return false; // bad location string
          return (
            haversineDistance(this.cityCoords!.lat, this.cityCoords!.lng, coords.lat, coords.lng) <=
            this.distanceRadius!
          );
        });
      } else {
        result = result.filter((e) =>
          e.location?.toLowerCase().includes(this.locationFilter.toLowerCase()),
        );
      }
    }

    this.filteredEvents = result;
  }

  selectCategory(value: string) {
    this.selectedCategory = value;
    this.mobileSidebarOpen = false;
    this.applyFilters();
  }

  togglePrivateOnly() {
    this.privateOnly = !this.privateOnly;
    this.applyFilters();
  }

  get privateCount(): number {
    return this.events.filter((e) => e.isPrivate).length;
  }

  setLocationFilter(city: string) {
    this.locationFilter = city;
    this.cityCoords = null;

    if (!city.trim()) {
      this.applyFilters();
      return;
    }

    if (this.distanceRadius != null) {
      this.geocodeCity(city);
    } else {
      this.applyFilters();
    }
  }

  setDistanceRadius(km: number | null) {
    this.distanceRadius = km;
    if (km != null && this.locationFilter.trim()) {
      if (this.cityCoords) {
        this.geocodeEvents();
        this.applyFilters();
      } else {
        this.geocodeCity(this.locationFilter);
      }
    } else {
      this.applyFilters();
    }
  }

  onSearch(query: string) {
    this.searchQuery = query;
    this.applyFilters();
  }

  toggleView(mode: 'grid' | 'list' | 'map') {
    this.viewMode = mode;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: mode },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  resetFilters() {
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.locationFilter = '';
    this.privateOnly = false;
    this.distanceRadius = null;
    this.cityCoords = null;
    this.applyFilters();
  }

  countByCategory(value: string): number {
    const pool = this.privateOnly ? this.events.filter((e) => e.isPrivate) : this.events;
    if (value === 'all') return pool.length;
    return pool.filter((e) => e.category === value).length;
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

  private geocodeCity(city: string) {
    this.isGeocodingCity = true;
    this.geocoding
      .geocode(city)
      .pipe(takeUntil(this.destroy$))
      .subscribe((coords) => {
        this.cityCoords = coords;
        this.isGeocodingCity = false;
        if (coords && this.distanceRadius != null) {
          this.geocodeEvents();
        }
        this.applyFilters();
        this.cdr.detectChanges();
      });
  }

  private geocodeEvents() {
    this.events.forEach((event) => {
      if (!event.location || this.eventCoordsMap.has(event.id)) return;
      this.geocoding
        .geocode(event.location)
        .pipe(takeUntil(this.destroy$))
        .subscribe((coords) => {
          this.eventCoordsMap.set(event.id, coords);
          this.applyFilters();
          this.cdr.detectChanges();
        });
    });
  }
}
