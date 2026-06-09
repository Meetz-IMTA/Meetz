import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommunityService } from '../../../../services/community';
import { AdminService } from '../../../../services/admin';
import { ThreadComment } from '../../../../models/community.model';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { CloudImagePipe } from '../../../../shared/pipes/cloud-image.pipe';
import { LikeButton } from '../like-button/like-button';
import { CommentComposer } from '../comment-composer/comment-composer';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';

@Component({
  selector: 'app-comment-item',
  imports: [
    FormsModule,
    RouterLink,
    TimeAgoPipe,
    CloudImagePipe,
    LikeButton,
    CommentComposer,
    AvatarComponent,
  ],
  templateUrl: './comment-item.html',
  host: { class: 'block' },
})
export class CommentItem {
  @HostBinding('attr.id') get hostId() {
    return 'comment-' + this.comment.id;
  }

  @Input({ required: true }) comment!: ThreadComment;
  @Input({ required: true }) threadId!: number;
  @Input() currentUserId: number | null = null;
  @Input() isAuthenticated = false;
  @Input() isAdmin = false;
  @Input() depth = 0;
  /** Set when this reply is rendered flat (past the indent cap) to show context. */
  @Input() replyingToName: string | null = null;
  @Output() changed = new EventEmitter<void>();

  private community = inject(CommunityService);
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  /** Stop adding indentation past this depth to avoid ever-narrowing cards. */
  readonly MAX_DEPTH = 3;

  showReply = false;
  repliesCollapsed = false;
  isDeleting = false;
  isLiking = false;
  lightboxOpen = false;

  showDeleteModal = false;
  showReportModal = false;
  reportReason = '';
  isReporting = false;
  reportDone = false;

  get isOwner(): boolean {
    return this.currentUserId != null && this.currentUserId === this.comment.authorId;
  }

  get canDelete(): boolean {
    return this.isOwner || this.isAdmin;
  }

  /** Indent replies only while under the depth cap; flatten beyond it. */
  get indentReplies(): boolean {
    return this.depth < this.MAX_DEPTH;
  }

  /** Total number of replies in this comment's subtree (for the collapsed label). */
  get descendantCount(): number {
    const count = (replies: ThreadComment[]): number =>
      replies.reduce((sum, r) => sum + 1 + count(r.replies), 0);
    return count(this.comment.replies);
  }

  toggleReplies() {
    this.repliesCollapsed = !this.repliesCollapsed;
  }

  get authorInitial(): string {
    return this.comment.author.name?.[0]?.toUpperCase() ?? '?';
  }

  toggleReply() {
    this.showReply = !this.showReply;
  }

  onReplyPosted() {
    this.showReply = false;
    this.changed.emit();
  }

  toggleLike() {
    if (this.isLiking) return;
    this.isLiking = true;
    this.community.toggleCommentLike(this.comment.id).subscribe({
      next: (res) => {
        this.comment.isLiked = res.liked;
        this.comment.likesCount = res.likesCount;
        this.isLiking = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLiking = false;
        this.cdr.detectChanges();
      },
    });
  }

  openDelete() {
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
  }

  deleteComment() {
    if (this.isDeleting) return;
    this.isDeleting = true;
    this.cdr.detectChanges();
    const onSuccess = () => {
      this.showDeleteModal = false;
      this.changed.emit();
    };
    const onError = () => {
      this.isDeleting = false;
      this.showDeleteModal = false;
      this.cdr.detectChanges();
    };
    if (this.isAdmin && !this.isOwner) {
      this.adminService
        .deleteComment(this.comment.id)
        .subscribe({ next: onSuccess, error: onError });
    } else {
      this.community.deleteComment(this.comment.id).subscribe({ next: onSuccess, error: onError });
    }
  }

  openReport() {
    this.showReportModal = true;
    this.reportReason = '';
    this.reportDone = false;
  }

  cancelReport() {
    this.showReportModal = false;
  }

  submitReport() {
    if (this.isReporting) return;
    this.isReporting = true;
    this.cdr.detectChanges();
    this.community.reportComment(this.comment.id, this.reportReason.trim() || undefined).subscribe({
      next: () => {
        this.isReporting = false;
        this.reportDone = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.showReportModal = false;
          this.cdr.detectChanges();
        }, 1500);
      },
      error: () => {
        this.isReporting = false;
        this.cdr.detectChanges();
      },
    });
  }
}
