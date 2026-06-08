import { Pipe, PipeTransform } from '@angular/core';

/**
 * Inserts Cloudinary delivery transformations (auto format/quality + width cap)
 * into a Cloudinary URL so we serve right-sized thumbnails instead of full
 * originals. External URLs (e.g. Giphy GIFs) are returned untouched.
 */
@Pipe({ name: 'cloudImg' })
export class CloudImagePipe implements PipeTransform {
  transform(url: string | null | undefined, width = 600): string {
    if (!url) return '';
    if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
    return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
  }
}
