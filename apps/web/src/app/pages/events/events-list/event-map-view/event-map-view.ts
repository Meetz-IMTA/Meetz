import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { Subject, takeUntil } from 'rxjs';
import { MeetzEvent } from '../../../../models/event.model';
import { GeocodingService, Coords } from '../../../../services/geocoding';

@Component({
  selector: 'app-event-map-view',
  imports: [CommonModule],
  templateUrl: './event-map-view.html',
  styleUrl: './event-map-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventMapView implements AfterViewInit, OnChanges, OnDestroy {
  @Input() events: MeetzEvent[] = [];
  @Input() cityCoords: Coords | null = null;
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  selectedEvent: MeetzEvent | null = null;

  private map: L.Map | null = null;
  private markers = new Map<number, L.Marker>();
  private destroy$ = new Subject<void>();

  private geocoding = inject(GeocodingService);
  private router = inject(Router);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  private pin(active = false): L.DivIcon {
    const w = active ? 30 : 24;
    const h = active ? 42 : 34;
    const fill = active ? '#9b0f31' : '#be123c';
    const innerR = active ? 6 : 5;
    return L.divIcon({
      html: `<svg viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35));display:block">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 8.28 12 22 12 22S24 20.28 24 12C24 5.37 18.63 0 12 0z" fill="${fill}"/>
        <circle cx="12" cy="12" r="${innerR}" fill="white"/>
      </svg>`,
      className: '',
      iconSize: [w, h],
      iconAnchor: [w / 2, h],
    });
  }

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.initMap();
      this.syncMarkers();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.map) return;
    if (changes['cityCoords'] && this.cityCoords) {
      this.zone.runOutsideAngular(() => this.panToCity());
    }
    if (changes['events']) {
      this.zone.runOutsideAngular(() => this.syncMarkers());
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.map?.remove();
  }

  closePreview() {
    if (!this.selectedEvent) return;
    this.markers.get(this.selectedEvent.id)?.setIcon(this.pin(false));
    this.selectedEvent = null;
    this.cdr.markForCheck();
  }

  navigate(event: MeetzEvent) {
    this.router.navigate(['/events', event.id]);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  private initMap() {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [46.2276, 2.2137],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.map.on('click', () => {
      this.zone.run(() => this.closePreview());
    });
  }

  private panToCity() {
    if (this.cityCoords && this.map) {
      this.map.flyTo([this.cityCoords.lat, this.cityCoords.lng], 10, { duration: 1.2 });
    }
  }

  private syncMarkers() {
    // Remove markers for events no longer in the filtered list
    const currentIds = new Set(this.events.map((e) => e.id));
    this.markers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        this.markers.delete(id);
        if (this.selectedEvent?.id === id) {
          this.zone.run(() => {
            this.selectedEvent = null;
            this.cdr.markForCheck();
          });
        }
      }
    });

    // Geocode and add markers for new events
    this.events.forEach((event) => {
      if (this.markers.has(event.id) || !event.location) return;

      this.geocoding
        .geocode(event.location)
        .pipe(takeUntil(this.destroy$))
        .subscribe((coords) => {
          if (!coords || !this.map || this.markers.has(event.id)) return;

          const marker = L.marker([coords.lat, coords.lng], { icon: this.pin(false) });

          marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.zone.run(() => {
              // Second click on active pin → navigate directly
              if (this.selectedEvent?.id === event.id) {
                this.router.navigate(['/events', event.id]);
                return;
              }
              // Deactivate previous pin
              if (this.selectedEvent) {
                this.markers.get(this.selectedEvent.id)?.setIcon(this.pin(false));
              }
              this.selectedEvent = event;
              marker.setIcon(this.pin(true));
              this.cdr.markForCheck();
            });
          });

          marker.addTo(this.map!);
          this.markers.set(event.id, marker);
        });
    });
  }
}
