import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { Auth } from './auth';

export interface ChatUser {
  id: number;
  name: string;
  email?: string;
}

export interface Message {
  id: number;
  content: string | null;
  imageUrl?: string | null;
  gifUrl?: string | null;
  conversationId: number;
  senderId: number;
  createdAt: string;
  sender: ChatUser;
}

export interface ConversationParticipant {
  userId: number;
  lastReadAt: string;
  user: ChatUser;
}

export interface Conversation {
  id: number;
  type: 'PRIVATE' | 'EVENT_GROUP';
  name: string | null;
  createdAt: string;
  eventId: number | null;
  event?: { id: number; name: string } | null;
  participants: ConversationParticipant[];
  lastMessage: Message | null;
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  private apiUrl = 'http://localhost:3000/api/v1/chat';
  private socket: Socket | null = null;

  readonly conversations$ = new BehaviorSubject<Conversation[]>([]);
  readonly messages$ = new BehaviorSubject<Message[]>([]);
  readonly isWidgetOpen$ = new BehaviorSubject<boolean>(false);

  private activeConversationId: number | null = null;
  private messageSubject = new Subject<Message>();
  private typingSubject = new Subject<{
    userId: number;
    conversationId: number;
    isTyping: boolean;
  }>();

  onMessage(): Observable<Message> {
    return this.messageSubject.asObservable();
  }

  onTyping(): Observable<{
    userId: number;
    conversationId: number;
    isTyping: boolean;
  }> {
    return this.typingSubject.asObservable();
  }

  get totalUnread(): number {
    return this.conversations$.value.reduce((sum, c) => sum + c.unreadCount, 0);
  }

  connect(): void {
    if (this.socket?.connected) return;
    const token = this.auth.getAccessToken();
    this.socket = io('http://localhost:3000', { auth: { token } });

    this.socket.on('message:new', (msg: Message) => {
      this.messageSubject.next(msg);
      this.conversations$.next(
        this.conversations$.value.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessage: msg,
                unreadCount: c.id === this.activeConversationId ? 0 : c.unreadCount + 1,
              }
            : c,
        ),
      );
      if (msg.conversationId === this.activeConversationId) {
        this.messages$.next([...this.messages$.value, msg]);
      }
    });

    this.socket.on('typing:start', (data: { userId: number; conversationId: number }) => {
      this.typingSubject.next({ ...data, isTyping: true });
    });

    this.socket.on('typing:stop', (data: { userId: number; conversationId: number }) => {
      this.typingSubject.next({ ...data, isTyping: false });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinConversation(id: number): void {
    this.socket?.emit('join:conversation', id);
    this.activeConversationId = id;
  }

  leaveConversation(id: number): void {
    this.socket?.emit('leave:conversation', id);
    if (this.activeConversationId === id) this.activeConversationId = null;
  }

  sendMessage(conversationId: number, content: string, imageUrl?: string, gifUrl?: string): void {
    this.socket?.emit('message:send', { conversationId, content, imageUrl, gifUrl });
  }

  uploadChatImage(file: File) {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/upload`, fd);
  }

  startTyping(conversationId: number): void {
    this.socket?.emit('typing:start', conversationId);
  }

  stopTyping(conversationId: number): void {
    this.socket?.emit('typing:stop', conversationId);
  }

  markAsRead(conversationId: number): void {
    this.socket?.emit('message:read', conversationId);
    this.conversations$.next(
      this.conversations$.value.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    );
  }

  loadConversations(): void {
    this.http
      .get<Conversation[]>(`${this.apiUrl}/conversations`)
      .subscribe((conversations) => this.conversations$.next(conversations));
  }

  loadMessages(conversationId: number): void {
    this.http
      .get<Message[]>(`${this.apiUrl}/conversations/${conversationId}/messages?limit=50`)
      .subscribe((messages) => this.messages$.next([...messages].reverse()));
  }

  openConversation(conversationId: number): void {
    const prev = this.activeConversationId;
    if (prev !== null && prev !== conversationId) this.leaveConversation(prev);
    this.joinConversation(conversationId);
    this.loadMessages(conversationId);
    this.markAsRead(conversationId);
  }

  getUsers() {
    return this.http.get<ChatUser[]>(`${this.apiUrl}/users`);
  }

  createPrivateConversation(targetUserId: number) {
    return this.http.post<Conversation>(`${this.apiUrl}/conversations/private`, { targetUserId });
  }

  getConversationName(conversation: Conversation, currentUserId: number): string {
    if (conversation.name) return conversation.name;
    if (conversation.type === 'PRIVATE') {
      const other = conversation.participants.find((p) => p.userId !== currentUserId);
      return other?.user.name ?? 'Conversation';
    }
    return 'Groupe';
  }

  toggleWidget(): void {
    this.isWidgetOpen$.next(!this.isWidgetOpen$.value);
  }

  openWidget(): void {
    this.isWidgetOpen$.next(true);
  }

  closeWidget(): void {
    this.isWidgetOpen$.next(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
