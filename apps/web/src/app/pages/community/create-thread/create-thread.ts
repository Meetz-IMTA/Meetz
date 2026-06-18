import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community';
import { ToastService } from '../../../services/toast';
import { Category } from '../../../models/community.model';

interface ImagePreview {
  file: File;
  url: string;
}

const MAX_IMAGES = 5;
const MAX_SIZE = 10 * 1024 * 1024;

@Component({
  selector: 'app-create-thread',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-thread.html',
})
export class CreateThread implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private community = inject(CommunityService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  categories: Category[] = [];
  categoryId: number | null = null;
  title = '';
  content = '';
  images: ImagePreview[] = [];

  formTouched = false;
  isSubmitting = false;
  errorMessage = '';

  ngOnInit() {
    this.community.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        const preselect = this.route.snapshot.queryParamMap.get('categoryId');
        if (preselect) this.categoryId = Number(preselect);
        this.cdr.detectChanges();
      },
    });
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

  onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    for (const file of Array.from(input.files)) {
      if (this.images.length >= MAX_IMAGES) {
        this.flashError(`Maximum ${MAX_IMAGES} images.`);
        break;
      }
      if (!file.type.startsWith('image/')) {
        this.flashError('Seules les images sont autorisées.');
        continue;
      }
      if (file.size > MAX_SIZE) {
        this.flashError('Chaque image doit faire moins de 10 MB.');
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        this.images.push({ file, url: e.target?.result as string });
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  removeImage(index: number) {
    this.images.splice(index, 1);
  }

  triggerUpload() {
    document.getElementById('thread-images')?.click();
  }

  private flashError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => {
      this.errorMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  onSubmit() {
    this.formTouched = true;
    if (!this.isFormValid || this.isSubmitting || this.categoryId == null) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.community
      .createThread(
        {
          title: this.title.trim(),
          content: this.content.trim(),
          categoryId: this.categoryId,
        },
        this.images.map((i) => i.file),
      )
      .subscribe({
        next: (thread) => {
          this.toast.success('Thread publié !');
          this.router.navigate(['/community/thread', thread.id]);
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
