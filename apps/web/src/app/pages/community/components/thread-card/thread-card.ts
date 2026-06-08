import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Thread } from '../../../../models/community.model';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { CloudImagePipe } from '../../../../shared/pipes/cloud-image.pipe';

@Component({
  selector: 'app-thread-card',
  imports: [RouterLink, TimeAgoPipe, CloudImagePipe],
  templateUrl: './thread-card.html',
  host: { class: 'block' },
})
export class ThreadCard {
  @Input({ required: true }) thread!: Thread;

  get authorInitial(): string {
    return this.thread.author.name?.[0]?.toUpperCase() ?? '?';
  }
}
