import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventService } from '../../services/event';
import { EventCard } from '../../components/event-card/event-card';
import { MeetzEvent } from '../../models/event.model';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-my-events',
  imports: [CommonModule, RouterLink, EventCard],
  templateUrl: './my-events.html',
  styleUrl: './my-events.css',
})
export class MyEvents implements OnInit {
  private eventService = inject(EventService);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);

  events: MeetzEvent[] = [];
  isLoading = true;
  error = '';

  get canCreateEvents(): boolean {
    const role = this.auth.getUser()?.role;
    return role === 'organizer' || role === 'admin';
  }

  ngOnInit() {
    const user = this.auth.getUser();
    if (!user?.id) {
      this.error = 'Utilisateur non authentifié.';
      this.isLoading = false;
      return;
    }
    this.eventService.getAll({ organizerId: user.id }).subscribe({
      next: (events) => {
        this.events = events;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger vos événements.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
