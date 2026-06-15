import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription, Subject, of } from 'rxjs';
import { filter, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import {
  ChatService,
  type Conversation,
  type Message,
  type MessageReaction,
  type ChatUser,
} from '../../services/chat.service';
import { Auth } from '../../services/auth';
import { GifService, type Gif } from '../../services/gif';

type WidgetView = 'list' | 'chat' | 'new-chat';

@Component({
  selector: 'app-chat-widget',
  imports: [FormsModule, AsyncPipe, RouterLink],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.css',
})
export class ChatWidget implements OnInit, AfterViewChecked, OnDestroy {
  private chatService = inject(ChatService);
  private auth = inject(Auth);
  private router = inject(Router);
  private gifService = inject(GifService);

  isOnChatPage = signal(false);

  @ViewChild('widgetMessages') private widgetMessages?: ElementRef<HTMLDivElement>;
  @ViewChild('widgetPhotoInput') private widgetPhotoInput?: ElementRef<HTMLInputElement>;

  readonly currentUser = this.auth.getUser();
  readonly isOpen$ = this.chatService.isWidgetOpen$;

  view = signal<WidgetView>('list');
  activeConversation = signal<Conversation | null>(null);
  conversations = signal<Conversation[]>([]);
  messages = signal<Message[]>([]);
  typingUserIds = signal<number[]>([]);
  allUsers = signal<ChatUser[]>([]);
  userSearch = signal('');

  readonly filteredUsers = computed(() => {
    const term = this.userSearch().toLowerCase();
    if (!term) return this.allUsers();
    return this.allUsers().filter(
      (u) => u.name.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term),
    );
  });

  seenBy = signal<Map<number, string>>(new Map());

  readonly lastSeenMessageId = computed(() => {
    const currentUserId = this.currentUser?.id;
    if (!currentUserId) return null;
    const seenMap = this.seenBy();
    let latestOtherReadMs = 0;
    seenMap.forEach((lastReadAt, uid) => {
      if (uid !== currentUserId) {
        const t = new Date(lastReadAt).getTime();
        if (t > latestOtherReadMs) latestOtherReadMs = t;
      }
    });
    if (!latestOtherReadMs) return null;
    const msgs = this.messages();
    let lastSeenId: number | null = null;
    for (const msg of msgs) {
      if (
        msg.senderId === currentUserId &&
        new Date(msg.createdAt).getTime() <= latestOtherReadMs
      ) {
        lastSeenId = msg.id;
      }
    }
    return lastSeenId;
  });

  // Hover actions
  readonly EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
  readonly INPUT_EMOJIS = [
    '😀',
    '😂',
    '😍',
    '🥰',
    '😎',
    '🤔',
    '😢',
    '😮',
    '😡',
    '🥳',
    '😅',
    '🤣',
    '😊',
    '😘',
    '😤',
    '🤩',
    '😴',
    '🤗',
    '👍',
    '👎',
    '❤️',
    '🔥',
    '🎉',
    '🙏',
    '💪',
    '👏',
    '🙌',
    '💯',
    '✨',
    '🫡',
    '🤝',
    '😷',
  ];
  hoveredMsgId = signal<number | null>(null);
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  emojiPickerMsgId = signal<number | null>(null);
  showInputEmojiPicker = signal(false);
  reportMsgId = signal<number | null>(null);
  reportReason = '';
  reportCategory = signal<string | null>(null);
  reportStep = signal<1 | 2>(1);
  reportDone = signal<number | null>(null);

  // GIF picker
  showGifPicker = signal(false);
  gifQuery = '';
  gifs = signal<Gif[]>([]);
  gifLoading = signal(false);

  // Attachments
  selectedGifUrl = signal<string | null>(null);
  selectedImageFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  imageUploading = signal(false);

  messageText = '';
  private isTypingActive = false;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldScroll = false;
  private subs = new Subscription();
  private gifSearch$ = new Subject<string>();

  totalUnread = signal(0);

  get canSend(): boolean {
    return (
      !this.imageUploading() &&
      (!!this.messageText.trim() || !!this.selectedGifUrl() || !!this.selectedImageFile())
    );
  }

  ngOnInit(): void {
    this.isOnChatPage.set(this.router.url === '/chat');
    this.chatService.connect();
    this.chatService.loadConversations();

    this.subs.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => {
          const onChat = e.urlAfterRedirects === '/chat';
          this.isOnChatPage.set(onChat);
          if (onChat) this.chatService.closeWidget();
        }),
    );

    this.subs.add(
      this.gifSearch$
        .pipe(
          debounceTime(350),
          distinctUntilChanged(),
          switchMap((q) => {
            this.gifLoading.set(true);
            return this.gifService.search(q).pipe(catchError(() => of<Gif[]>([])));
          }),
        )
        .subscribe((gifs) => {
          this.gifs.set(gifs);
          this.gifLoading.set(false);
        }),
    );

    this.subs.add(
      this.chatService.conversations$.subscribe((convs) => {
        this.conversations.set(convs);
        this.totalUnread.set(convs.reduce((sum, c) => sum + c.unreadCount, 0));
      }),
    );

    this.subs.add(
      this.chatService.messages$.subscribe((msgs) => {
        this.messages.set(msgs);
        this.shouldScroll = true;
      }),
    );

    this.subs.add(
      this.chatService.onMessage().subscribe((msg) => {
        if (msg.conversationId === this.activeConversation()?.id) {
          this.shouldScroll = true;
        }
      }),
    );

    this.subs.add(
      this.chatService.onTyping().subscribe(({ userId, conversationId, isTyping }) => {
        if (conversationId !== this.activeConversation()?.id) return;
        if (isTyping) {
          this.typingUserIds.update((ids) => [...new Set([...ids, userId])]);
        } else {
          this.typingUserIds.update((ids) => ids.filter((id) => id !== userId));
        }
      }),
    );

    this.subs.add(
      this.chatService.onConversationRead().subscribe(({ userId, conversationId, lastReadAt }) => {
        if (conversationId !== this.activeConversation()?.id) return;
        this.seenBy.update((map) => new Map(map).set(userId, lastReadAt));
      }),
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.clearTypingTimer();
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
  }

  toggle(): void {
    this.chatService.toggleWidget();
  }

  close(): void {
    this.chatService.closeWidget();
    this.backToList();
  }

  expandToFullPage(): void {
    const conv = this.activeConversation();
    this.chatService.setPendingConversation(conv?.id ?? null);
    this.close();
  }

  openConversation(conv: Conversation): void {
    this.activeConversation.set(conv);
    this.view.set('chat');
    this.typingUserIds.set([]);
    this.clearAttachment();
    this.showGifPicker.set(false);
    const initSeen = new Map<number, string>();
    conv.participants.forEach((p) => initSeen.set(p.userId, p.lastReadAt));
    this.seenBy.set(initSeen);
    this.chatService.openConversation(conv.id);
    this.shouldScroll = true;
  }

  openNewChatView(): void {
    this.view.set('new-chat');
    this.userSearch.set('');
    this.chatService.getUsers().subscribe((users) => this.allUsers.set(users));
  }

  startPrivateChat(user: ChatUser): void {
    this.chatService.createPrivateConversation(user.id).subscribe({
      next: (conv) => {
        const existing = this.conversations().find((c) => c.id === conv.id);
        const target = existing ?? {
          id: conv.id,
          type: conv.type,
          name: (conv as any).name ?? null,
          createdAt: conv.createdAt,
          eventId: (conv as any).eventId ?? null,
          event: (conv as any).event ?? null,
          participants: conv.participants ?? [],
          lastMessage: (conv as any).messages?.[0] ?? null,
          unreadCount: 0,
        };
        if (!existing) {
          this.conversations.update((cs) => [target as Conversation, ...cs]);
        }
        this.openConversation(target as Conversation);
        this.chatService.loadConversations();
      },
      error: () => {
        this.view.set('list');
      },
    });
  }

  backToList(): void {
    const conv = this.activeConversation();
    if (conv) this.chatService.leaveConversation(conv.id);
    this.activeConversation.set(null);
    this.messages.set([]);
    this.view.set('list');
    this.clearAttachment();
    this.showGifPicker.set(false);
  }

  // ── Attachments ──

  triggerPhotoUpload(): void {
    this.widgetPhotoInput?.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    this.clearAttachment();
    this.selectedImageFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  toggleGifPicker(): void {
    const next = !this.showGifPicker();
    this.showGifPicker.set(next);
    if (next && this.gifs().length === 0) {
      this.gifSearch$.next('');
    }
  }

  onGifSearch(query: string): void {
    this.gifQuery = query;
    this.gifSearch$.next(query);
  }

  selectGif(gif: Gif): void {
    const conv = this.activeConversation();
    this.showGifPicker.set(false);
    this.clearAttachment();
    if (!conv) return;
    this.chatService.sendMessage(conv.id, this.messageText.trim(), undefined, gif.url);
    this.messageText = '';
    this.clearTyping();
  }

  clearAttachment(): void {
    this.selectedGifUrl.set(null);
    this.selectedImageFile.set(null);
    this.imagePreview.set(null);
  }

  // ── Send ──

  sendMessage(): void {
    const text = this.messageText.trim();
    const conv = this.activeConversation();
    const gifUrl = this.selectedGifUrl();
    const imageFile = this.selectedImageFile();
    if (!text && !gifUrl && !imageFile) return;
    if (!conv) return;

    if (imageFile) {
      this.imageUploading.set(true);
      this.chatService.uploadChatImage(imageFile).subscribe({
        next: ({ url }) => {
          this.chatService.sendMessage(conv.id, text, url, undefined);
          this.messageText = '';
          this.clearAttachment();
          this.imageUploading.set(false);
          this.clearTyping();
          this.shouldScroll = true;
        },
        error: () => {
          this.imageUploading.set(false);
        },
      });
    } else {
      this.chatService.sendMessage(conv.id, text, undefined, gifUrl ?? undefined);
      this.messageText = '';
      this.clearAttachment();
      this.clearTyping();
    }
  }

  onEnterKey(event: Event): void {
    if (!(event as KeyboardEvent).shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onInput(): void {
    const conv = this.activeConversation();
    if (!conv) return;
    if (!this.isTypingActive) {
      this.isTypingActive = true;
      this.chatService.startTyping(conv.id);
    }
    this.clearTypingTimer();
    this.typingTimer = setTimeout(() => this.clearTyping(), 2000);
  }

  clearTyping(): void {
    if (!this.isTypingActive) return;
    this.isTypingActive = false;
    const conv = this.activeConversation();
    if (conv) this.chatService.stopTyping(conv.id);
    this.clearTypingTimer();
  }

  // ── Hover ──

  msgMouseEnter(msgId: number): void {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.hoveredMsgId.set(msgId);
  }

  msgMouseLeave(): void {
    this.hoverTimer = setTimeout(() => this.hoveredMsgId.set(null), 150);
  }

  // ── Reactions & Report ──

  toggleEmojiPicker(msgId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.emojiPickerMsgId.set(this.emojiPickerMsgId() === msgId ? null : msgId);
    this.reportMsgId.set(null);
  }

  sendReaction(msg: Message, emoji: string): void {
    const conv = this.activeConversation();
    if (!conv) return;
    this.emojiPickerMsgId.set(null);
    this.chatService.reactToMessage(msg.id, conv.id, emoji);
  }

  openReport(msgId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.reportMsgId.set(this.reportMsgId() === msgId ? null : msgId);
    this.emojiPickerMsgId.set(null);
    this.reportReason = '';
    this.reportCategory.set(null);
    this.reportStep.set(1);
    this.reportDone.set(null);
  }

  submitReport(msgId: number): void {
    const cat = this.reportCategory();
    if (!cat) return;
    const reason = this.reportReason.trim() ? `${cat} — ${this.reportReason.trim()}` : cat;
    this.chatService.reportChatMessage(msgId, reason).subscribe({
      next: () => {
        this.reportDone.set(msgId);
        this.reportReason = '';
        this.reportCategory.set(null);
        setTimeout(() => {
          this.reportMsgId.set(null);
          this.reportDone.set(null);
        }, 2000);
      },
      error: () => {},
    });
  }

  groupedReactions(
    reactions: MessageReaction[],
  ): { emoji: string; count: number; hasMe: boolean }[] {
    const map = new Map<string, { count: number; hasMe: boolean }>();
    const myId = this.currentUser?.id;
    for (const r of reactions) {
      const entry = map.get(r.emoji) ?? { count: 0, hasMe: false };
      entry.count++;
      if (r.userId === myId) entry.hasMe = true;
      map.set(r.emoji, entry);
    }
    return Array.from(map.entries()).map(([emoji, v]) => ({ emoji, ...v }));
  }

  insertEmoji(emoji: string): void {
    this.messageText += emoji;
  }

  closePopovers(): void {
    this.emojiPickerMsgId.set(null);
    this.reportMsgId.set(null);
    this.showInputEmojiPicker.set(false);
  }

  lastMessagePreview(conv: Conversation): string {
    const m = conv.lastMessage;
    if (!m) return 'Démarrer la conversation…';
    if (m.content) return m.content;
    if (m.imageUrl) return '📷 Photo';
    if (m.gifUrl) return '🎬 GIF';
    return '';
  }

  getDisplayName(conv: Conversation): string {
    return this.chatService.getConversationName(conv, this.currentUser?.id);
  }

  getInitial(conv: Conversation): string {
    return this.getDisplayName(conv)[0]?.toUpperCase() ?? '?';
  }

  getConversationAvatar(conv: Conversation): string | null {
    return this.chatService.getConversationAvatar(conv, this.currentUser?.id ?? 0);
  }

  isMe(msg: Message): boolean {
    return msg.senderId === this.currentUser?.id;
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const mins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  }

  private scrollToBottom(): void {
    try {
      const el = this.widgetMessages?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {
      // noop
    }
  }

  private clearTypingTimer(): void {
    if (this.typingTimer !== null) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }
}
