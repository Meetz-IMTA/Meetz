import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, shareReplay } from 'rxjs';

export interface Coords {
  lat: number;
  lng: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

const STORAGE_KEY = 'meetz_geocache_v1';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private http = inject(HttpClient);
  private cache = new Map<string, Coords | null>();
  private inFlight = new Map<string, Observable<Coords | null>>();

  constructor() {
    this.loadFromStorage();
  }

  geocode(location: string): Observable<Coords | null> {
    const key = location.toLowerCase().trim();
    if (!key) return of(null);
    if (this.cache.has(key)) return of(this.cache.get(key) ?? null);
    if (this.inFlight.has(key)) return this.inFlight.get(key)!;

    const req$ = this.http
      .get<NominatimResult[]>(NOMINATIM_URL, {
        params: { q: location, format: 'json', limit: '1' },
        headers: { 'Accept-Language': 'fr' },
      })
      .pipe(
        map((results) => {
          const coords: Coords | null = results?.[0]
            ? { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
            : null;
          this.setCache(key, coords);
          return coords;
        }),
        catchError(() => {
          this.setCache(key, null);
          return of(null);
        }),
        shareReplay(1),
      );

    this.inFlight.set(key, req$);
    req$.subscribe(() => this.inFlight.delete(key));
    return req$;
  }

  private setCache(key: string, coords: Coords | null) {
    this.cache.set(key, coords);
    this.saveToStorage();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        (JSON.parse(raw) as [string, Coords | null][]).forEach(([k, v]) => this.cache.set(k, v));
      }
    } catch {
      /* ignore */
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.cache.entries()]));
    } catch {
      /* ignore */
    }
  }
}
