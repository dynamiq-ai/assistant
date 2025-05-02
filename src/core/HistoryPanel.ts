import { HistoryChat } from './types';
import { Storage } from './Storage';

class HistoryPanel {
  private chats: HistoryChat[] = [];
  private readonly onChatItemClick: (sessionId: string) => void;
  private chatsContainer: HTMLDivElement;
  private storage: Storage;
  private activeChat: HistoryChat | null = null;

  constructor(onChatItemClick: (sessionId: string) => void) {
    this.storage = Storage.getInstance();
    this.chats = this.storage.getChats();
    this.onChatItemClick = onChatItemClick;
  }

  render() {
    const historyPanel = document.createElement('div');
    historyPanel.className = 'chat-widget-history';

    const historyTitle = document.createElement('h4');
    historyTitle.className = 'chat-widget-history-title';
    historyTitle.innerHTML = 'History';
    historyPanel.appendChild(historyTitle);

    const chatsContainer = document.createElement('div');
    chatsContainer.className = 'chat-widget-history-chats-container';
    historyPanel.appendChild(chatsContainer);

    this.chats
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach((chat) => chatsContainer.appendChild(this.renderChat(chat)));

    const historyEmpty = document.createElement('div');
    historyEmpty.className = 'chat-widget-history-empty';
    historyEmpty.innerHTML = 'No chats yet';
    if (this.chats.length === 0) {
      chatsContainer.appendChild(historyEmpty);
    }
    this.chatsContainer = chatsContainer;

    return historyPanel;
  }

  addChat(chat: HistoryChat) {
    this.hideEmpty();
    this.chats.push(chat);
    this.storage.addChat(chat);
    this.chatsContainer.prepend(this.renderChat(chat));
    this.setActiveChat(chat);
  }

  hideEmpty() {
    const historyEmpty = this.chatsContainer.querySelector(
      '.chat-widget-history-empty'
    );
    if (historyEmpty) {
      historyEmpty.remove();
    }
  }

  setActiveChat(chat: HistoryChat) {
    this.activeChat = chat;
    this.chatsContainer
      .querySelectorAll('.chat-widget-history-chat')
      .forEach((item) => {
        item.classList.remove('active');
      });
    const chatItem = this.chatsContainer.querySelector(
      `.chat-widget-history-chat[data-session-id="${chat.sessionId}"]`
    );
    if (chatItem) {
      chatItem.classList.add('active');
    }
  }

  private renderChat(chat: HistoryChat) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-widget-history-chat';
    chatItem.setAttribute('data-session-id', chat.sessionId);

    // Title
    const title = document.createElement('div');
    title.className = 'chat-widget-history-chat-title';
    title.textContent = chat.title;
    chatItem.appendChild(title);

    // Timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'chat-widget-history-chat-timestamp';
    const date = new Date(chat.updatedAt);
    timestamp.textContent = date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    chatItem.appendChild(timestamp);

    chatItem.addEventListener('click', () =>
      this.onChatItemClick(chat.sessionId)
    );
    return chatItem;
  }
}

export default HistoryPanel;
