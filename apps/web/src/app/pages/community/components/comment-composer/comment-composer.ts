import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { CommunityService } from '../../../../services/community';
import { Gif, GifService } from '../../../../services/gif';

const EMOJIS = [
  '😀',
  '😁',
  '😂',
  '🤣',
  '😊',
  '😍',
  '😘',
  '😎',
  '🤩',
  '🥳',
  '😅',
  '😉',
  '🙂',
  '🙃',
  '😇',
  '🤔',
  '🤨',
  '😐',
  '😴',
  '😜',
  '😢',
  '😭',
  '😡',
  '🥺',
  '😱',
  '😬',
  '🤯',
  '😤',
  '🤗',
  '🤭',
  '👍',
  '👎',
  '👏',
  '🙌',
  '🙏',
  '💪',
  '👀',
  '🔥',
  '✨',
  '⭐',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '💔',
  '💯',
  '✅',
  '🎉',
  '🎊',
  '🚀',
  '⚡',
  '🌟',
  '💡',
  '🎁',
  '🏆',
  '🥇',
  '👌',
  '😏',
  '😋',
  '🤤',
  '🤝',
  '👋',
  '🤙',
  '💀',
  '👻',
  '🐶',
  '🍕',
];

const MAX_SIZE = 10 * 1024 * 1024;

@Component({
  selector: 'app-comment-composer',
  imports: [CommonModule, FormsModule],
  templateUrl: './comment-composer.html',
})
export class CommentComposer {
  @Input({ required: true }) threadId!: number;
  @Input() parentCommentId?: number;
  @Input() placeholder = 'Ajouter un commentaire...';
  @Input() compact = false;
  @Output() posted = new EventEmitter<void>();

  @ViewChild('textarea') textareaRef?: ElementRef<HTMLTextAreaElement>;

  private community = inject(CommunityService);
  private gifService = inject(GifService);
  private cdr = inject(ChangeDetectorRef);

  readonly emojis = EMOJIS;

  text = '';
  isSubmitting = false;
  error = '';

  showEmoji = false;
  showGif = false;

  gifQuery = '';
  gifs: Gif[] = [];
  isLoadingGifs = false;

  selectedGifUrl: string | null = null;
  imageFile: File | null = null;
  imagePreview: string | null = null;

  private gifSearch$ = new Subject<string>();

  constructor() {
    this.gifSearch$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((q) => {
          this.isLoadingGifs = true;
          this.cdr.detectChanges();
          return this.gifService.search(q).pipe(catchError(() => of([])));
        }),
      )
      .subscribe({
        next: (gifs) => {
          this.gifs = gifs;
          this.isLoadingGifs = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoadingGifs = false;
          this.error = 'Impossible de charger les GIFs.';
          this.cdr.detectChanges();
        },
      });
  }

  get canSubmit(): boolean {
    return !this.isSubmitting && (!!this.text.trim() || !!this.selectedGifUrl || !!this.imageFile);
  }

  get hasAttachment(): boolean {
    return !!this.selectedGifUrl || !!this.imagePreview;
  }

  // ── Emoji ──
  toggleEmoji() {
    this.showEmoji = !this.showEmoji;
    this.showGif = false;
  }

  addEmoji(emoji: string) {
    const el = this.textareaRef?.nativeElement;
    if (el && el.selectionStart != null) {
      const start = el.selectionStart;
      const end = el.selectionEnd ?? start;
      this.text = this.text.slice(0, start) + emoji + this.text.slice(end);
      setTimeout(() => {
        el.focus();
        const pos = start + emoji.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      this.text += emoji;
    }
  }

  // ── GIF ──
  toggleGif() {
    this.showGif = !this.showGif;
    this.showEmoji = false;
    if (this.showGif && this.gifs.length === 0) {
      this.gifSearch$.next('');
    }
  }

  onGifQueryChange(value: string) {
    this.gifQuery = value;
    this.gifSearch$.next(value);
  }

  selectGif(gif: Gif) {
    this.clearAttachment();
    this.selectedGifUrl = gif.url;
    this.showGif = false;
  }

  // ── Image ──
  triggerImage() {
    this.fileInputId && document.getElementById(this.fileInputId)?.click();
  }

  get fileInputId(): string {
    return `composer-img-${this.threadId}-${this.parentCommentId ?? 'root'}`;
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.flashError('Seules les images sont autorisées.');
      return;
    }
    if (file.size > MAX_SIZE) {
      this.flashError("L'image doit faire moins de 10 MB.");
      return;
    }
    this.clearAttachment();
    this.imageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearAttachment() {
    this.selectedGifUrl = null;
    this.imageFile = null;
    this.imagePreview = null;
  }

  private flashError(msg: string) {
    this.error = msg;
    setTimeout(() => {
      this.error = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  submit() {
    if (!this.canSubmit) return;
    this.isSubmitting = true;
    this.error = '';
    this.community
      .addComment(this.threadId, {
        content: this.text.trim() || undefined,
        parentCommentId: this.parentCommentId,
        image: this.imageFile ?? undefined,
        gifUrl: this.selectedGifUrl ?? undefined,
      })
      .subscribe({
        next: () => {
          this.text = '';
          this.clearAttachment();
          this.showEmoji = false;
          this.showGif = false;
          this.isSubmitting = false;
          this.posted.emit();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err.error?.error || 'Échec de la publication.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
      });
  }
}
