import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { EventService } from '../../../../services/event';
import { MeetzEvent } from '../../../../models/event.model';
import { EventCard } from '../../../../components/event-card/event-card';

@Component({
  selector: 'app-featured-events',
  imports: [EventCard],
  templateUrl: './featured-events.html',
})
export class FeaturedEvents implements OnInit {
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);

  events: MeetzEvent[] = [];
  loading = true;

  ngOnInit() {
    this.eventService.getFeatured().subscribe({
      next: (data) => {
        this.events = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
