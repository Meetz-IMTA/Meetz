import { ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  Subject,
  Subscription,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
  catchError,
} from 'rxjs';
import { EventService } from '../../services/event';

const DRAFT_KEY = 'meetz_event_draft';

interface Category {
  label: string;
  icon: string;
  value: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

@Component({
  selector: 'app-create-event',
  imports: [FormsModule, CommonModule],
  templateUrl: './create-event.html',
  styleUrl: './create-event.css',
})
export class CreateEvent implements OnInit, OnDestroy {
  private router = inject(Router);
  private eventService = inject(EventService);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  title = '';
  description = '';
  date = '';
  time = '';
  maxAttendees: number | null = null;
  location = '';
  locationSearch = '';
  selectedLat: number | null = null;
  selectedLon: number | null = null;
  mapUrl: SafeResourceUrl | null = null;
  locationSuggestions: NominatimResult[] = [];
  showSuggestions = false;
  isSearchingLocation = false;
  selectedCategory = '';
  isPrivate = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  imageFile: File | null = null;
  imagePreview: string | null = null;
  formTouched = false;
  hasDraft = false;
  draftSaved = false;

  private searchSubject = new Subject<string>();
  private subs = new Subscription();

  categories: Category[] = [
    { label: 'Sport', icon: 'sports_soccer', value: 'Sport' },
    { label: 'Culture', icon: 'theater_comedy', value: 'Culture' },
    { label: 'Gastro', icon: 'restaurant', value: 'Gastro' },
    { label: 'Jeux', icon: 'videogame_asset', value: 'Jeux' },
    { label: 'Musique', icon: 'music_note', value: 'Musique' },
    { label: 'Savoir', icon: 'lightbulb', value: 'Savoir' },
  ];

  ngOnInit() {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) this.hasDraft = true;

    const searchSub = this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.length < 2) {
            this.locationSuggestions = [];
            this.showSuggestions = false;
            this.isSearchingLocation = false;
            return of([]);
          }
          this.isSearchingLocation = true;
          return this.http
            .get<
              NominatimResult[]
            >(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=0`)
            .pipe(catchError(() => of([])));
        }),
      )
      .subscribe((results) => {
        this.isSearchingLocation = false;
        this.locationSuggestions = results;
        this.showSuggestions = results.length > 0;
        this.cdr.detectChanges();
      });

    this.subs.add(searchSub);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  get titleError(): string {
    if (!this.formTouched) return '';
    if (!this.title.trim()) return 'Le titre est obligatoire.';
    if (this.title.trim().length < 3) return 'Le titre doit contenir au moins 3 caractères.';
    return '';
  }

  get dateError(): string {
    if (!this.formTouched) return '';
    if (!this.date) return 'La date est obligatoire.';
    if (new Date(this.date) < new Date(new Date().toDateString()))
      return 'La date doit être dans le futur.';
    return '';
  }

  get timeError(): string {
    if (!this.formTouched) return '';
    if (!this.time) return "L'heure est obligatoire.";
    // Date + heure (heure et minute) doivent être dans le futur : un événement
    // prévu aujourd'hui à une heure déjà passée ne doit pas être accepté.
    if (this.date && new Date(`${this.date}T${this.time}`) <= new Date())
      return "L'heure doit être dans le futur.";
    return '';
  }

  get maxAttendeesError(): string {
    if (!this.formTouched || this.maxAttendees === null) return '';
    if (this.maxAttendees < 1) return 'Le nombre de participants doit être au moins 1.';
    return '';
  }

  get isFormValid(): boolean {
    if (this.title.trim().length < 3) return false;
    if (!this.date || !this.time) return false;
    // Validation au datetime complet (heure + minute), pas seulement au jour.
    const when = new Date(`${this.date}T${this.time}`);
    if (Number.isNaN(when.getTime()) || when <= new Date()) return false;
    return this.maxAttendees === null || this.maxAttendees >= 1;
  }

  selectCategory(value: string) {
    this.selectedCategory = value;
  }

  onLocationInput(query: string) {
    this.location = '';
    this.selectedLat = null;
    this.selectedLon = null;
    this.mapUrl = null;
    this.searchSubject.next(query);
  }

  selectLocation(result: NominatimResult) {
    this.locationSearch = result.display_name;
    this.location = result.display_name;
    this.selectedLat = parseFloat(result.lat);
    this.selectedLon = parseFloat(result.lon);
    this.showSuggestions = false;
    this.locationSuggestions = [];

    const lat = this.selectedLat;
    const lon = this.selectedLon;
    const margin = 0.04;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - margin},${lat - margin},${lon + margin},${lat + margin}&layer=mapnik&marker=${lat},${lon}`;
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  hideSuggestions() {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  clearLocation() {
    this.locationSearch = '';
    this.location = '';
    this.selectedLat = null;
    this.selectedLon = null;
    this.mapUrl = null;
    this.locationSuggestions = [];
    this.showSuggestions = false;
  }

  restoreDraft() {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      this.title = d.title ?? '';
      this.description = d.description ?? '';
      this.date = d.date ?? '';
      this.time = d.time ?? '';
      this.maxAttendees = d.maxAttendees ?? null;
      this.selectedCategory = d.selectedCategory ?? '';
      this.isPrivate = d.isPrivate ?? false;
      this.locationSearch = d.locationSearch ?? '';
      this.location = d.location ?? '';
      if (d.lat && d.lon) {
        this.selectedLat = d.lat;
        this.selectedLon = d.lon;
        const margin = 0.04;
        const url = `https://www.openstreetmap.org/export/embed.html?bbox=${d.lon - margin},${d.lat - margin},${d.lon + margin},${d.lat + margin}&layer=mapnik&marker=${d.lat},${d.lon}`;
        this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      }
    } catch {}
    this.hasDraft = false;
    this.successMessage = 'Brouillon restauré.';
    setTimeout(() => (this.successMessage = ''), 3000);
  }

  discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    this.hasDraft = false;
  }

  saveDraft() {
    if (!this.title.trim()) {
      this.errorMessage = 'Ajoutez au moins un titre pour sauvegarder le brouillon.';
      setTimeout(() => (this.errorMessage = ''), 3000);
      return;
    }
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        title: this.title,
        description: this.description,
        date: this.date,
        time: this.time,
        maxAttendees: this.maxAttendees,
        selectedCategory: this.selectedCategory,
        isPrivate: this.isPrivate,
        locationSearch: this.locationSearch,
        location: this.location,
        lat: this.selectedLat,
        lon: this.selectedLon,
      }),
    );
    this.draftSaved = true;
    this.successMessage = 'Brouillon sauvegardé !';
    setTimeout(() => {
      this.successMessage = '';
      this.draftSaved = false;
    }, 3000);
  }

  onImageChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = "L'image ne doit pas dépasser 10 MB.";
      setTimeout(() => (this.errorMessage = ''), 3000);
      return;
    }
    this.imageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    this.errorMessage = '';
  }

  removeImage() {
    this.imageFile = null;
    this.imagePreview = null;
  }

  triggerImageUpload() {
    document.getElementById('image-upload')?.click();
  }

  onSubmit() {
    this.formTouched = true;
    if (!this.isFormValid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const time = this.time || '00:00';
    const datetime = new Date(`${this.date}T${time}`).toISOString();

    this.eventService
      .create(
        {
          name: this.title.trim(),
          description: this.description.trim() || undefined,
          date: datetime,
          location: this.location || undefined,
          category: this.selectedCategory || undefined,
          maxAttendees: this.maxAttendees ?? undefined,
          isPrivate: this.isPrivate,
        },
        this.imageFile ?? undefined,
      )
      .subscribe({
        next: () => {
          localStorage.removeItem(DRAFT_KEY);
          this.successMessage = 'Événement publié avec succès !';
          setTimeout(() => this.router.navigate(['/events']), 1500);
        },
        error: (err) => {
          this.errorMessage = err.error?.error || 'Une erreur est survenue. Veuillez réessayer.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
      });
  }
}
