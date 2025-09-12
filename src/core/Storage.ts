import { HistoryChat } from './types';

const STORAGE_KEY = 'chats_history';
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

  private getStorageSize(): number {
    let total = 0;
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key) {
        const value = this.storage.getItem(key);
        if (value) {
          total += (key.length + value.length) * 2;
        }
      }
    }
    return total;
  }

  private getItemSize(key: string, value: string): number {
    return (key.length + value.length) * 2;
  }

  private cleanupOldData(): void {
    const userChats = this.getChats();
    const allChats = this.getAllChats();

    if (!userChats.length) {
      return;
    }

    // Sort user chats by updatedAt in ascending order (oldest first)
    const sortedUserChats = [...userChats].sort(
      (a, b) => a.updatedAt - b.updatedAt
    );

    let currentSize = this.getStorageSize();

    // Remove oldest user chats until we have enough space
    const chatsToRemove = new Set<string>();
    while (currentSize > MAX_STORAGE_SIZE && sortedUserChats.length > 0) {
      const removedChat = sortedUserChats.shift();
      if (removedChat) {
        chatsToRemove.add(removedChat.sessionId);
        const removedSize = this.getItemSize(
          STORAGE_KEY,
          JSON.stringify([removedChat])
        );
        currentSize -= removedSize;
      }
    }

    // Filter out removed chats from all chats and save
    const remainingChats = allChats.filter(
      (chat) => !chatsToRemove.has(chat.sessionId)
    );
    this.storage.setItem(STORAGE_KEY, JSON.stringify(remainingChats));
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
    const allChats = this.getAllChats();
    const newAllChats = [chat, ...allChats];
    const newData = JSON.stringify(newAllChats);
    const newDataSize = this.getItemSize(STORAGE_KEY, newData);

    if (newDataSize > MAX_STORAGE_SIZE) {
      this.cleanupOldData();
    }

    this.storage.setItem(STORAGE_KEY, newData);
  }

  public updateChat(chat: HistoryChat): void {
    const allChats = this.getAllChats();
    const index = allChats.findIndex((c) => c.sessionId === chat.sessionId);

    if (index !== -1) {
      allChats[index] = chat;
      const newData = JSON.stringify(allChats);
      const newDataSize = this.getItemSize(STORAGE_KEY, newData);

      if (newDataSize > MAX_STORAGE_SIZE) {
        this.cleanupOldData();
      }

      this.storage.setItem(STORAGE_KEY, newData);
    }
  }

  public removeChat(sessionId: string): void {
    const allChats = this.getAllChats();
    const filteredChats = allChats.filter(
      (chat) => chat.sessionId !== sessionId
    );
    this.storage.setItem(STORAGE_KEY, JSON.stringify(filteredChats));
  }

  public clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }
}
