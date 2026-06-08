import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community';
import { Auth } from '../../../services/auth';
import { ToastService } from '../../../services/toast';
import { Category, ThreadImage } from '../../../models/community.model';
import { CloudImagePipe } from '../../../shared/pipes/cloud-image.pipe';

interface NewImage {
  file: File;
  url: string;
}

const MAX_IMAGES = 5;
const MAX_SIZE = 10 * 1024 * 1024;

@Component({
  selector: 'app-edit-thread',
  imports: [CommonModule, FormsModule, RouterLink, CloudImagePipe],
  templateUrl: './edit-thread.html',
})
export class EditThread implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private community = inject(CommunityService);
  private auth = inject(Auth);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  threadId = 0;
  categories: Category[] = [];
  categoryId: number | null = null;
  title = '';
  content = '';

  existingImages: ThreadImage[] = [];
  removedImageIds: number[] = [];
  newImages: NewImage[] = [];

  formTouched = false;
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';

  ngOnInit() {
    this.threadId = Number(this.route.snapshot.paramMap.get('id'));
    this.community.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.cdr.detectChanges();
      },
    });

    this.community.getThread(this.threadId).subscribe({
      next: (thread) => {
        if (this.auth.getUser()?.id !== thread.authorId) {
          this.toast.error('Vous ne pouvez modifier que vos propres threads.');
          this.router.navigate(['/community/thread', this.threadId]);
          return;
        }
        this.title = thread.title;
        this.content = thread.content;
        this.categoryId = thread.categoryId;
        this.existingImages = [...thread.images];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Thread introuvable.');
        this.router.navigate(['/community']);
      },
    });
  }

  get totalImages(): number {
    return this.existingImages.length + this.newImages.length;
  }

  get categoryError(): string {
    if (!this.formTouched) return '';
    return this.categoryId ? '' : 'La catégorie est obligatoire.';
  }

  get titleError(): string {
    if (!this.formTouched) return '';
    if (!this.title.trim()) return 'Le titre est obligatoire.';
    if (this.title.trim().length < 3) return 'Le titre doit contenir au moins 3 caractères.';
    return '';
  }

  get contentError(): string {
    if (!this.formTouched) return '';
    if (!this.content.trim()) return 'Le contenu est obligatoire.';
    if (this.content.trim().length < 10) return 'Le contenu doit contenir au moins 10 caractères.';
    return '';
  }

  get isFormValid(): boolean {
    return (
      this.categoryId != null && this.title.trim().length >= 3 && this.content.trim().length >= 10
    );
  }

  selectCategory(id: number) {
    this.categoryId = id;
  }

  removeExisting(image: ThreadImage) {
    this.removedImageIds = [...this.removedImageIds, image.id];
    this.existingImages = this.existingImages.filter((i) => i.id !== image.id);
  }

  onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    for (const file of Array.from(input.files)) {
      if (this.totalImages >= MAX_IMAGES) {
        this.toast.error(`Maximum ${MAX_IMAGES} images.`);
        break;
      }
      if (!file.type.startsWith('image/')) {
        this.toast.error('Seules les images sont autorisées.');
        continue;
      }
      if (file.size > MAX_SIZE) {
        this.toast.error('Chaque image doit faire moins de 10 MB.');
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        this.newImages.push({ file, url: e.target?.result as string });
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  removeNew(index: number) {
    this.newImages.splice(index, 1);
  }

  triggerUpload() {
    document.getElementById('edit-thread-images')?.click();
  }

  onSubmit() {
    this.formTouched = true;
    if (!this.isFormValid || this.isSubmitting || this.categoryId == null) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.community
      .updateThread(
        this.threadId,
        { title: this.title.trim(), content: this.content.trim(), categoryId: this.categoryId },
        this.newImages.map((i) => i.file),
        this.removedImageIds,
      )
      .subscribe({
        next: () => {
          this.toast.success('Thread mis à jour.');
          this.router.navigate(['/community/thread', this.threadId]);
        },
        error: (err) => {
          this.errorMessage = err.error?.error || 'Une erreur est survenue. Veuillez réessayer.';
          this.toast.error(this.errorMessage);
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
      });
  }
}
