import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MeetzEvent } from '../../models/event.model';

@Component({
  selector: 'app-event-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './event-card.html',
  styleUrl: './event-card.css',
})
export class EventCard {
  @Input({ required: true }) event!: MeetzEvent;

  get formattedDate(): string {
    return new Date(this.event.date).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  get formattedTime(): string {
    return new Date(this.event.date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  get shortLocation(): string {
    if (!this.event.location) return '';
    const parts = this.event.location.split(',');
    return parts.length > 1 ? parts[0].trim() : this.event.location;
  }
}
