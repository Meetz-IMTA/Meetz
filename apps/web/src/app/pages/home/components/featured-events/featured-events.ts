import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { EventService } from '../../../../services/event';
import { MeetzEvent } from '../../../../models/event.model';
import { EventCard } from '../../../../components/event-card/event-card';

@Component({
  selector: 'app-featured-events',
  imports: [NgFor, EventCard],
  templateUrl: './featured-events.html',
})
export class FeaturedEvents implements OnInit {
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);

  events: MeetzEvent[] = [];
  categories: string[] = [];
  activeCategory = 'Tous';
  loading = true;

  ngOnInit() {
    this.eventService.getAll().subscribe((data) => {
      this.events = data;
      const cats = [...new Set(data.map((e) => e.category).filter(Boolean))] as string[];
      this.categories = ['Tous', ...cats];
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  get filteredEvents(): MeetzEvent[] {
    const list =
      this.activeCategory === 'Tous'
        ? this.events
        : this.events.filter((e) => e.category === this.activeCategory);
    return list.slice(0, 3);
  }
}
