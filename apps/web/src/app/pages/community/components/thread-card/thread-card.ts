import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Thread } from '../../../../models/community.model';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { CloudImagePipe } from '../../../../shared/pipes/cloud-image.pipe';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';

@Component({
  selector: 'app-thread-card',
  imports: [RouterLink, TimeAgoPipe, CloudImagePipe, AvatarComponent],
  templateUrl: './thread-card.html',
  host: { class: 'block' },
})
export class ThreadCard {
  @Input({ required: true }) thread!: Thread;
  @Input() isAdmin = false;
  @Output() adminDelete = new EventEmitter<number>();

  get authorInitial(): string {
    return this.thread.author.name?.[0]?.toUpperCase() ?? '?';
  }

  onAdminDelete(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.adminDelete.emit(this.thread.id);
  }
}
