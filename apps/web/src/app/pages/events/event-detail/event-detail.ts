import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { EventService } from '../../../services/event';
import { Auth } from '../../../services/auth';
import { MeetzEvent } from '../../../models/event.model';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';

const GEO_CACHE_PREFIX = 'meetz_geo_';

@Component({
  selector: 'app-event-detail',
  imports: [CommonModule, RouterLink, AvatarComponent],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.css',
})
export class EventDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private eventService = inject(EventService);
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  event: MeetzEvent | null = null;
  isLoading = true;
  error = '';
  isDeleting = false;
  showDeleteConfirm = false;
  locationMapUrl: SafeResourceUrl | null = null;
  isJoined = false;
  isJoinLoading = false;
  participantCount = 0;

  get isOwner(): boolean {
    const user = this.auth.getUser();
    return !!user && user.id === this.event?.organizerId;
  }

  get isAuthenticated(): boolean {
    return this.auth.getUser() != null;
  }

  get formattedShortDate(): string {
    if (!this.event) return '';
    const d = new Date(this.event.date);
    const date = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${time}`;
  }

  get formattedDate(): string {
    if (!this.event) return '';
    return new Date(this.event.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  get formattedTime(): string {
    if (!this.event) return '';
    return new Date(this.event.date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  get shortCity(): string {
    if (!this.event?.location) return '';
    return this.event.location.split(',')[0].trim();
  }

  get organizerInitial(): string {
    return this.event?.organizer.name[0]?.toUpperCase() ?? '?';
  }

  goBack() {
    this.location.back();
  }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id)) {
      this.router.navigate(['/events']);
      return;
    }

    this.eventService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          this.event = event;
          this.isJoined = event.isJoined ?? false;
          this.participantCount = event.participantCount ?? 0;
          this.isLoading = false;
          this.cdr.detectChanges();
          if (event.location) this.geocodeLocation(event.location);
        },
        error: () => {
          this.error = 'Événement introuvable.';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  toggleJoin() {
    if (!this.event || this.isJoinLoading) return;
    if (!this.isAuthenticated) {
      this.router.navigate(['/login']);
      return;
    }

    this.isJoinLoading = true;
    this.cdr.detectChanges();

    const action = this.isJoined
      ? this.eventService.leave(this.event.id)
      : this.eventService.join(this.event.id);

    action.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        if (this.isJoined) {
          this.isJoined = false;
          this.participantCount -= 1;
        } else {
          this.isJoined = true;
          this.participantCount += 1;
        }
        this.isJoinLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isJoinLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private geocodeLocation(location: string) {
    const cacheKey = GEO_CACHE_PREFIX + location;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { lat, lon } = JSON.parse(cached);
        this.buildMapUrl(lat, lon);
        return;
      } catch {}
    }
    this.http
      .get<any[]>(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      )
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        if (results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lon = parseFloat(results[0].lon);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ lat, lon }));
          } catch {}
          this.buildMapUrl(lat, lon);
          this.cdr.detectChanges();
        }
      });
  }

  private buildMapUrl(lat: number, lon: number) {
    const m = 0.008;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - m},${lat - m},${lon + m},${lat + m}&layer=mapnik&marker=${lat},${lon}`;
    this.locationMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  confirmDelete() {
    this.showDeleteConfirm = true;
  }
  cancelDelete() {
    this.showDeleteConfirm = false;
  }

  deleteEvent() {
    if (!this.event) return;
    this.isDeleting = true;
    this.cdr.detectChanges();

    this.eventService
      .delete(this.event.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/events']),
        error: () => {
          this.error = "Impossible de supprimer l'événement.";
          this.isDeleting = false;
          this.showDeleteConfirm = false;
          this.cdr.detectChanges();
        },
      });
  }
}
