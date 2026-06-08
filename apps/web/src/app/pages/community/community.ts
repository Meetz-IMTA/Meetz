import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { CommunityService } from '../../services/community';
import { Auth } from '../../services/auth';
import { AdminService } from '../../services/admin';
import { Category, Thread } from '../../models/community.model';
import { ThreadCard } from './components/thread-card/thread-card';

@Component({
  selector: 'app-community',
  imports: [CommonModule, FormsModule, RouterLink, ThreadCard],
  templateUrl: './community.html',
})
export class Community implements OnInit {
  private community = inject(CommunityService);
  private auth = inject(Auth);
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  get isAdmin(): boolean {
    return this.auth.getUser()?.role === 'admin';
  }

  categories: Category[] = [];
  popularThreads: Thread[] = [];
  threads: Thread[] = [];

  categorySearch = '';
  selectedCategoryId: number | null = null;

  search = '';
  sort: 'recent' | 'popular' = 'recent';
  page = 1;
  totalPages = 1;

  isLoadingCategories = true;
  isLoadingThreads = true;
  isLoadingMore = false;
  error = '';

  readonly skeletons = Array.from({ length: 6 }, (_, i) => i);

  private searchSubject = new Subject<string>();

  private readonly FAV_KEY = 'meetz_fav_categories';
  private readonly SIDEBAR_CAP = 8;
  favorites: number[] = [];

  ngOnInit() {
    this.loadFavorites();
    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.reloadThreads());

    this.loadCategories();
    this.loadPopular();
    this.reloadThreads();
  }

  private loadFavorites() {
    try {
      const raw = localStorage.getItem(this.FAV_KEY);
      this.favorites = raw ? JSON.parse(raw) : [];
    } catch {
      this.favorites = [];
    }
  }

  isFavorite(id: number): boolean {
    return this.favorites.includes(id);
  }

  toggleFavorite(id: number, event: Event) {
    event.stopPropagation();
    this.favorites = this.isFavorite(id)
      ? this.favorites.filter((f) => f !== id)
      : [...this.favorites, id];
    localStorage.setItem(this.FAV_KEY, JSON.stringify(this.favorites));
  }

  private get searchedCategories(): Category[] {
    const q = this.categorySearch.trim().toLowerCase();
    if (!q) return this.categories;
    return this.categories.filter((c) => c.name.toLowerCase().includes(q));
  }

  get isSearchingCategories(): boolean {
    return this.categorySearch.trim().length > 0;
  }

  get favoriteCategories(): Category[] {
    return this.searchedCategories.filter((c) => this.isFavorite(c.id));
  }

  private get otherCategories(): Category[] {
    return this.searchedCategories.filter((c) => !this.isFavorite(c.id));
  }

  /** Capped list of non-favorite categories (full list while searching). */
  get visibleCategories(): Category[] {
    return this.isSearchingCategories
      ? this.otherCategories
      : this.otherCategories.slice(0, this.SIDEBAR_CAP);
  }

  get hiddenCategoryCount(): number {
    return this.isSearchingCategories
      ? 0
      : Math.max(0, this.otherCategories.length - this.SIDEBAR_CAP);
  }

  get totalThreadCount(): number {
    return this.categories.reduce((sum, c) => sum + (c._count?.threads ?? 0), 0);
  }

  get selectedCategory(): Category | null {
    return this.categories.find((c) => c.id === this.selectedCategoryId) ?? null;
  }

  loadCategories() {
    this.community.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.isLoadingCategories = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingCategories = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadPopular() {
    this.community.getThreads({ sort: 'popular', limit: 5 }).subscribe({
      next: (res) => {
        this.popularThreads = res.items;
        this.cdr.detectChanges();
      },
    });
  }

  reloadThreads() {
    this.page = 1;
    this.isLoadingThreads = true;
    this.error = '';
    this.cdr.detectChanges();
    this.community
      .getThreads({
        sort: this.sort,
        search: this.search || undefined,
        categoryId: this.selectedCategoryId ?? undefined,
        page: 1,
        limit: 10,
      })
      .subscribe({
        next: (res) => {
          this.threads = res.items;
          this.totalPages = res.totalPages;
          this.isLoadingThreads = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Impossible de charger les threads.';
          this.isLoadingThreads = false;
          this.cdr.detectChanges();
        },
      });
  }

  loadMore() {
    if (this.isLoadingMore || this.page >= this.totalPages) return;
    this.isLoadingMore = true;
    const next = this.page + 1;
    this.community
      .getThreads({
        sort: this.sort,
        search: this.search || undefined,
        categoryId: this.selectedCategoryId ?? undefined,
        page: next,
        limit: 10,
      })
      .subscribe({
        next: (res) => {
          this.threads = [...this.threads, ...res.items];
          this.page = next;
          this.totalPages = res.totalPages;
          this.isLoadingMore = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoadingMore = false;
          this.cdr.detectChanges();
        },
      });
  }

  selectCategory(id: number | null) {
    if (this.selectedCategoryId === id) return;
    this.selectedCategoryId = id;
    this.reloadThreads();
  }

  onSearchChange(value: string) {
    this.search = value;
    this.searchSubject.next(value);
  }

  setSort(sort: 'recent' | 'popular') {
    if (this.sort === sort) return;
    this.sort = sort;
    this.reloadThreads();
  }

  adminDeleteThread(threadId: number) {
    this.adminService.deleteThread(threadId).subscribe({
      next: () => {
        this.threads = this.threads.filter((t) => t.id !== threadId);
        this.popularThreads = this.popularThreads.filter((t) => t.id !== threadId);
        this.cdr.detectChanges();
      },
    });
  }
}
