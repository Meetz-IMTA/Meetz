import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community';
import { Category, Thread } from '../../../models/community.model';
import { ThreadCard } from '../components/thread-card/thread-card';

@Component({
  selector: 'app-community-category',
  imports: [CommonModule, FormsModule, RouterLink, ThreadCard],
  templateUrl: './category.html',
})
export class CommunityCategory implements OnInit {
  private route = inject(ActivatedRoute);
  private community = inject(CommunityService);
  private cdr = inject(ChangeDetectorRef);

  category: Category | null = null;
  threads: Thread[] = [];
  sort: 'recent' | 'popular' = 'recent';
  page = 1;
  totalPages = 1;
  categoryId = 0;

  isLoading = true;
  isLoadingMore = false;
  error = '';

  readonly skeletons = Array.from({ length: 5 }, (_, i) => i);

  ngOnInit() {
    this.categoryId = Number(this.route.snapshot.paramMap.get('id'));
    this.community.getCategory(this.categoryId).subscribe({
      next: (category) => {
        this.category = category;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Catégorie introuvable.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
    this.reload();
  }

  reload() {
    this.page = 1;
    this.isLoading = true;
    this.cdr.detectChanges();
    this.community
      .getThreads({ categoryId: this.categoryId, sort: this.sort, page: 1, limit: 10 })
      .subscribe({
        next: (res) => {
          this.threads = res.items;
          this.totalPages = res.totalPages;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Impossible de charger les threads.';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  loadMore() {
    if (this.isLoadingMore || this.page >= this.totalPages) return;
    this.isLoadingMore = true;
    const next = this.page + 1;
    this.community
      .getThreads({ categoryId: this.categoryId, sort: this.sort, page: next, limit: 10 })
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

  setSort(sort: 'recent' | 'popular') {
    if (this.sort === sort) return;
    this.sort = sort;
    this.reload();
  }
}
