import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-auth-shell',
  imports: [NgClass],
  templateUrl: './auth-shell.html',
})
export class AuthShell {
  @Input() description = '';
  @Input() iconTop = 'celebration';
  @Input() iconTopColor = 'text-primary';
  @Input() iconBottom = 'groups';
  @Input() iconBottomColor = 'text-blue-500';
  @Input() showMembers = true;
}
