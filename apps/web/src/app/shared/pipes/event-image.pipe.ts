import { Pipe, PipeTransform } from '@angular/core';

const DEFAULTS_DIR = '/assets/images/defaults';

// Categories disposant d'une image dediee dans assets/images/defaults/.
// Toute autre valeur (ou categorie nulle) retombe sur default.webp.
const KNOWN_CATEGORIES = new Set(['sport', 'culture', 'gastro', 'jeux', 'musique', 'savoir']);

/**
 * Renvoie l'URL d'image a afficher pour un evenement : son `imageUrl` s'il en a
 * un, sinon une image de remplacement locale selon sa categorie.
 *
 * Usage : `[src]="event.imageUrl | eventImage: event.category"`
 */
@Pipe({ name: 'eventImage' })
export class EventImagePipe implements PipeTransform {
  transform(imageUrl: string | null | undefined, category: string | null | undefined): string {
    if (imageUrl) return imageUrl;
    return `${DEFAULTS_DIR}/${this.categorySlug(category)}.webp`;
  }

  private categorySlug(category: string | null | undefined): string {
    if (!category) return 'default';
    const slug = category
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // retire les accents
    return KNOWN_CATEGORIES.has(slug) ? slug : 'default';
  }
}
