import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

export interface Gif {
  id: string;
  url: string; // animated gif url (used in preview + stored)
  previewUrl: string; // smaller still/animated for the grid
  title: string;
}

// Public Giphy beta key — replace with your own key for production usage.
const GIPHY_API_KEY = '9yeXYsFvWObfEuW83VC4MiK9U6Kgoc7Q';
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

@Injectable({ providedIn: 'root' })
export class GifService {
  private http = inject(HttpClient);

  trending(limit = 24) {
    return this.fetch(`${GIPHY_BASE}/trending`, { limit });
  }

  search(query: string, limit = 24) {
    if (!query.trim()) return this.trending(limit);
    return this.fetch(`${GIPHY_BASE}/search`, { q: query, limit });
  }

  private fetch(url: string, params: Record<string, string | number>) {
    const search = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      rating: 'pg-13',
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });
    return this.http.get<{ data: any[] }>(`${url}?${search.toString()}`).pipe(
      map((res) =>
        (res.data ?? []).map(
          (g): Gif => ({
            id: g.id,
            url: g.images?.fixed_height?.url ?? g.images?.original?.url,
            previewUrl: g.images?.fixed_width_small?.url ?? g.images?.fixed_height_small?.url,
            title: g.title ?? 'gif',
          }),
        ),
      ),
    );
  }
}
