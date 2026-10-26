import { HistoryChat } from './types';

const STORAGE_KEY = 'chats_history';
const ANONYMOUS_USER_ID_KEY = 'dynamiq_assistant_user_id';
const MAX_STORAGE_SIZE = 4.5 * 1024 * 1024; // 4.5MB (leaving some buffer for other data)

export class Storage {
  public static userId: string;
  private static instance: Storage;
  private readonly storage: globalThis.Storage;

  private constructor() {
    this.storage = window.localStorage;
  }

  public static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage();
    }
    return Storage.instance;
  }

  /**
   * A user id that survives reloads, for hosts that don't pass `params.userId`
   */
  public static getAnonymousUserId(): string {
    const storage = Storage.getInstance().storage;
    let userId = storage.getItem(ANONYMOUS_USER_ID_KEY);
    if (!userId) {
      userId = crypto.randomUUID();
      try {
        storage.setItem(ANONYMOUS_USER_ID_KEY, userId);
      } catch (e) {
        console.warn('Failed to persist anonymous user id:', e);
      }
    }
    return userId;
  }

  /**
   * Save chats, dropping the oldest ones (of any user) until they fit within
   * MAX_STORAGE_SIZE and the browser quota. The chat with `keepSessionId` is
   * never dropped. Never throws: failing to save history must not break chat.
   */
  private saveChats(chats: HistoryChat[], keepSessionId?: string): void {
    const remaining = [...chats];
    const oldestFirst = [...chats]
      .filter((chat) => chat.sessionId !== keepSessionId)
      .sort((a, b) => a.updatedAt - b.updatedAt);

    for (;;) {
      const data = JSON.stringify(remaining);
      // localStorage stores UTF-16, 2 bytes per character
      if ((STORAGE_KEY.length + data.length) * 2 <= MAX_STORAGE_SIZE) {
        try {
          this.storage.setItem(STORAGE_KEY, data);
          return;
        } catch (e) {
          if (!oldestFirst.length) {
            console.warn('Failed to save chat history:', e);
            return;
          }
        }
      }
      const oldest = oldestFirst.shift();
      if (!oldest) {
        console.warn('Chat history is too large to save');
        return;
      }
      remaining.splice(remaining.indexOf(oldest), 1);
    }
  }

  private getAllChats(): HistoryChat[] {
    const data = this.storage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse chats from storage:', e);
      return [];
    }
  }

  public getChats(): HistoryChat[] {
    return this.getAllChats().filter(
      (chat: HistoryChat) => chat.userId === Storage.userId
    );
  }

  public addChat(chat: HistoryChat): void {
    this.saveChats([chat, ...this.getAllChats()], chat.sessionId);
  }

  public updateChat(chat: HistoryChat): void {
    const allChats = this.getAllChats();
    const index = allChats.findIndex((c) => c.sessionId === chat.sessionId);

    if (index !== -1) {
      allChats[index] = chat;
      this.saveChats(allChats, chat.sessionId);
    }
  }

  public removeChat(sessionId: string): void {
    const allChats = this.getAllChats();
    this.saveChats(allChats.filter((chat) => chat.sessionId !== sessionId));
  }

  /**
   * Remove all stored chats of every user. The anonymous user id is kept, so
   * widgets that are still mounted keep saving under an id that is shown
   * after a reload.
   */
  public clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }
}

/**
 * Delete all chat history stored by the widget in this browser,
 * e.g. when the user logs out
 */
export function clearChatHistory(): void {
  Storage.getInstance().clear();
}
