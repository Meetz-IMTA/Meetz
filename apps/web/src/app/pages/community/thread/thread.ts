import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommunityService } from '../../../services/community';
import { Auth } from '../../../services/auth';
import { AdminService } from '../../../services/admin';
import { ToastService } from '../../../services/toast';
import { Comment, Thread, ThreadComment } from '../../../models/community.model';
import { CommentItem } from '../components/comment-item/comment-item';
import { CommentComposer } from '../components/comment-composer/comment-composer';
import { LikeButton } from '../components/like-button/like-button';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { CloudImagePipe } from '../../../shared/pipes/cloud-image.pipe';

@Component({
  selector: 'app-community-thread',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CommentItem,
    CommentComposer,
    LikeButton,
    TimeAgoPipe,
    CloudImagePipe,
  ],
  templateUrl: './thread.html',
})
export class CommunityThread implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private community = inject(CommunityService);
  private auth = inject(Auth);
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  thread: Thread | null = null;
  commentTree: ThreadComment[] = [];
  threadId = 0;

  isLoading = true;
  error = '';

  isLiking = false;

  isDeleting = false;
  showDeleteConfirm = false;

  showReport = false;
  reportReason = '';
  isReporting = false;
  reportDone = false;

  lightboxUrl: string | null = null;
  private routeSub?: Subscription;

  get isAuthenticated(): boolean {
    return this.auth.getUser() != null;
  }

  get currentUserId(): number | null {
    return this.auth.getUser()?.id ?? null;
  }

  get isOwner(): boolean {
    return this.currentUserId != null && this.currentUserId === this.thread?.authorId;
  }

  get isAdmin(): boolean {
    return this.auth.getUser()?.role === 'admin';
  }

  get authorInitial(): string {
    return this.thread?.author.name?.[0]?.toUpperCase() ?? '?';
  }

  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (isNaN(id)) {
        this.router.navigate(['/community']);
        return;
      }
      this.threadId = id;
      this.load();
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  load() {
    this.isLoading = true;
    this.community.getThread(this.threadId).subscribe({
      next: (thread) => {
        this.thread = thread;
        this.commentTree = this.buildTree(thread.comments ?? []);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.scrollToFragment();
      },
      error: () => {
        this.error = 'Thread introuvable.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private scrollToFragment() {
    const fragment = this.route.snapshot.fragment;
    if (!fragment) return;
    setTimeout(() => {
      const el = document.getElementById(fragment);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('mz-highlight');
        setTimeout(() => el.classList.remove('mz-highlight'), 2000);
      }
    }, 50);
  }

  private buildTree(comments: Comment[]): ThreadComment[] {
    const map = new Map<number, ThreadComment>();
    comments.forEach((c) => map.set(c.id, { ...c, replies: [] }));

    const roots: ThreadComment[] = [];
    map.forEach((node) => {
      if (node.parentCommentId != null && map.has(node.parentCommentId)) {
        map.get(node.parentCommentId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  toggleLike() {
    if (!this.thread || this.isLiking) return;
    if (!this.isAuthenticated) {
      this.router.navigate(['/login']);
      return;
    }
    this.isLiking = true;
    this.community.toggleLike(this.thread.id).subscribe({
      next: (res) => {
        if (this.thread) {
          this.thread.isLiked = res.liked;
          this.thread.likesCount = res.likesCount;
        }
        this.isLiking = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLiking = false;
        this.cdr.detectChanges();
      },
    });
  }

  refreshComments() {
    this.community.getThread(this.threadId).subscribe({
      next: (thread) => {
        this.thread = thread;
        this.commentTree = this.buildTree(thread.comments ?? []);
        this.cdr.detectChanges();
      },
    });
  }

  confirmDelete() {
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
  }

  deleteThread() {
    if (!this.thread) return;
    this.isDeleting = true;
    const onSuccess = () => {
      this.toast.success('Thread supprimé.');
      this.router.navigate(['/community']);
    };
    const onError = () => {
      this.toast.error('Impossible de supprimer le thread.');
      this.isDeleting = false;
      this.showDeleteConfirm = false;
      this.cdr.detectChanges();
    };
    if (this.isAdmin && !this.isOwner) {
      this.adminService.deleteThread(this.thread.id).subscribe({ next: onSuccess, error: onError });
    } else {
      this.community.deleteThread(this.thread.id).subscribe({ next: onSuccess, error: onError });
    }
  }

  openReport() {
    if (!this.isAuthenticated) {
      this.router.navigate(['/login']);
      return;
    }
    this.showReport = true;
    this.reportDone = false;
    this.reportReason = '';
  }

  cancelReport() {
    this.showReport = false;
  }

  submitReport() {
    if (!this.thread || this.isReporting) return;
    this.isReporting = true;
    this.community.reportThread(this.thread.id, this.reportReason.trim() || undefined).subscribe({
      next: () => {
        this.isReporting = false;
        this.reportDone = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.showReport = false;
          this.cdr.detectChanges();
        }, 1500);
      },
      error: () => {
        this.isReporting = false;
        this.cdr.detectChanges();
      },
    });
  }

  openLightbox(url: string) {
    this.lightboxUrl = url;
  }

  closeLightbox() {
    this.lightboxUrl = null;
  }
}
