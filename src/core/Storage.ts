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
    const chats = this.getChats();
    if (!chats.length) {
      return;
    }
    // Sort chats by updatedAt in ascending order (oldest first)
    chats.sort((a, b) => a.updatedAt - b.updatedAt);

    let currentSize = this.getStorageSize();

    // Remove oldest chats until we have enough space
    while (currentSize > MAX_STORAGE_SIZE && chats.length > 0) {
      const removedChat = chats.shift();
      if (removedChat) {
        const removedSize = this.getItemSize(
          STORAGE_KEY,
          JSON.stringify([removedChat])
        );
        currentSize -= removedSize;
      }
    }
    // Save the remaining chats
    this.storage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }

  public getChats(): HistoryChat[] {
    const data = this.storage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }

    try {
      const parsedData = JSON.parse(data);
      return parsedData.filter(
        (chat: HistoryChat) => chat.userId === Storage.userId
      );
    } catch (e) {
      console.error('Failed to parse chats from storage:', e);
      return [];
    }
  }

  public addChat(chat: HistoryChat): void {
    const chats = this.getChats();
    const newChats = [chat, ...chats];
    const newData = JSON.stringify(newChats);
    const newDataSize = this.getItemSize(STORAGE_KEY, newData);

    if (newDataSize > MAX_STORAGE_SIZE) {
      this.cleanupOldData();
    }

    this.storage.setItem(STORAGE_KEY, newData);
  }

  public updateChat(chat: HistoryChat): void {
    const chats = this.getChats();
    const index = chats.findIndex((c) => c.sessionId === chat.sessionId);

    if (index !== -1) {
      chats[index] = chat;
      const newData = JSON.stringify(chats);
      const newDataSize = this.getItemSize(STORAGE_KEY, newData);

      if (newDataSize > MAX_STORAGE_SIZE) {
        this.cleanupOldData();
      }

      this.storage.setItem(STORAGE_KEY, newData);
    }
  }

  public removeChat(sessionId: string): void {
    const chats = this.getChats();
    const filteredChats = chats.filter((chat) => chat.sessionId !== sessionId);
    this.storage.setItem(STORAGE_KEY, JSON.stringify(filteredChats));
  }

  public clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }
}
