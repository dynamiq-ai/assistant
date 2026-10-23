import { Storage } from '../Storage';
import { ChatWidgetCore } from '../ChatWidget';
import { HistoryChat } from '../types';

const STORAGE_KEY = 'chats_history';
const localStorageProto = Object.getPrototypeOf(window.localStorage);

const chat = (sessionId: string, userId: string, updatedAt: number, size = 10) =>
  ({
    sessionId,
    userId,
    updatedAt,
    title: sessionId,
    messages: [
      { id: sessionId, text: 'x'.repeat(size), sender: 'user', timestamp: updatedAt },
    ],
  }) as HistoryChat;

const storedSessionIds = () =>
  (JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as HistoryChat[]).map(
    (c) => c.sessionId
  );

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
  Storage.userId = 'me';
});

describe('Storage', () => {
  it('returns the same anonymous user id across calls', () => {
    const first = Storage.getAnonymousUserId();

    expect(Storage.getAnonymousUserId()).toBe(first);
  });

  it('drops the oldest chats of any user when history exceeds the size limit', () => {
    const big = 1024 * 1024; // ~2MB each as UTF-16
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([chat('other-old', 'someone', 1, big), chat('mine-old', 'me', 2, big)])
    );

    Storage.getInstance().addChat(chat('mine-new', 'me', 3, big));

    expect(storedSessionIds()).toEqual(['mine-new', 'mine-old']);
  });

  it('does not throw when localStorage is full', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([chat('old', 'someone', 1), chat('older', 'me', 0)])
    );
    const originalSetItem = localStorageProto.setItem;
    jest
      .spyOn(localStorageProto, 'setItem')
      .mockImplementation(function (this: unknown, key, value) {
        // Only the new chat on its own fits
        if (String(value).includes('"old')) {
          throw new DOMException('full', 'QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      });

    expect(() =>
      Storage.getInstance().addChat(chat('new', 'me', 2))
    ).not.toThrow();
    expect(storedSessionIds()).toEqual(['new']);
  });

  it('clears all stored chats', () => {
    Storage.getInstance().addChat(chat('a', 'me', 1));

    Storage.getInstance().clear();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('ChatWidgetCore history', () => {
  it('shows previous chats after a reload when no userId is given', () => {
    const first = new ChatWidgetCore(document.createElement('div'), {});
    first.sendMessage('hello');
    first.destroy();

    const container = document.createElement('div');
    const second = new ChatWidgetCore(container, {});

    expect(
      container.querySelectorAll('.chat-widget-history-chat')
    ).toHaveLength(1);
    second.destroy();
  });

  it('clearHistory removes stored chats and resets the panel', () => {
    const container = document.createElement('div');
    const widget = new ChatWidgetCore(container, { params: { userId: 'u' } });
    widget.sendMessage('hello');

    widget.clearHistory();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(container.querySelectorAll('.chat-widget-history-chat')).toHaveLength(0);
    expect(container.querySelectorAll('.chat-message')).toHaveLength(0);
    widget.destroy();
  });
});
