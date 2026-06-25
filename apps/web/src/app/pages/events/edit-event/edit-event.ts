import { ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { EventService } from '../../../services/event';
import { Auth } from '../../../services/auth';
import { MeetzEvent } from '../../../models/event.model';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface Category {
  label: string;
  icon: string;
  value: string;
}

@Component({
  selector: 'app-edit-event',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './edit-event.html',
  styleUrl: './edit-event.css',
})
export class EditEvent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventService = inject(EventService);
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  eventId = 0;
  isLoadingEvent = true;
  loadError = '';

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
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  imageFile: File | null = null;
  imagePreview: string | null = null;
  existingImageUrl: string | null = null;
  formTouched = false;

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
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(this.eventId)) {
      this.router.navigate(['/home']);
      return;
    }

    this.eventService.getById(this.eventId).subscribe({
      next: (event) => {
        const user = this.auth.getUser();
        if (!user || user.id !== event.organizerId) {
          this.router.navigate(['/events', this.eventId]);
          return;
        }
        this.populateForm(event);
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadError = "Impossible de charger l'événement.";
        this.isLoadingEvent = false;
        this.cdr.detectChanges();
      },
    });

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

  private populateForm(event: MeetzEvent) {
    this.title = event.name;
    this.description = event.description ?? '';
    this.selectedCategory = event.category ?? '';
    this.maxAttendees = event.maxAttendees;
    this.existingImageUrl = event.imageUrl;

    const d = new Date(event.date);
    this.date = d.toISOString().split('T')[0];
    this.time = d.toTimeString().slice(0, 5);

    if (event.location) {
      this.location = event.location;
      this.locationSearch = event.location;
    }

    this.isLoadingEvent = false;
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
    if (!this.formTouched || !this.date) return '';
    return '';
  }

  get timeError(): string {
    if (!this.formTouched) return '';
    if (!this.time) return "L'heure est obligatoire.";
    // Date + heure (heure et minute) doivent être dans le futur.
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
    this.selectedCategory = this.selectedCategory === value ? '' : value;
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
    setTimeout(() => (this.showSuggestions = false), 200);
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
    this.existingImageUrl = null;
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
    this.existingImageUrl = null;
  }

  triggerImageUpload() {
    document.getElementById('image-upload-edit')?.click();
  }

  onSubmit() {
    this.formTouched = true;
    if (!this.isFormValid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const time = this.time || '00:00';
    const datetime = new Date(`${this.date}T${time}`).toISOString();

    const payload = {
      name: this.title.trim(),
      description: this.description.trim() || undefined,
      date: datetime,
      location: this.location || undefined,
      category: this.selectedCategory || undefined,
      maxAttendees: this.maxAttendees ?? undefined,
      imageUrl: !this.imageFile && this.existingImageUrl ? this.existingImageUrl : undefined,
    };

    this.eventService.update(this.eventId, payload, this.imageFile ?? undefined).subscribe({
      next: () => {
        this.successMessage = 'Événement mis à jour avec succès !';
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/events', this.eventId]), 1500);
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Une erreur est survenue. Veuillez réessayer.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  cancel() {
    this.router.navigate(['/events', this.eventId]);
  }
}
