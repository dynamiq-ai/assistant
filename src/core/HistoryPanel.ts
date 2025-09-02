import { HistoryChat } from './types';
import { Storage } from './Storage';

class HistoryPanel {
  private readonly chats: HistoryChat[] = [];
  private readonly onChatItemClick: (sessionId: string) => void;
  private readonly onChatItemDelete?: (sessionId: string) => void;
  private readonly isStreamingActive: () => boolean;
  private chatsContainer: HTMLDivElement;
  private readonly storage: Storage;
  private activeChat: HistoryChat | null = null;

  constructor(
    onChatItemClick: (sessionId: string) => void,
    onChatItemDelete?: (sessionId: string) => void,
    isStreamingActive?: () => boolean
  ) {
    this.storage = Storage.getInstance();
    this.chats = this.storage.getChats();
    this.onChatItemClick = onChatItemClick;
    this.onChatItemDelete = onChatItemDelete;
    this.isStreamingActive = isStreamingActive || (() => false);
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

    // Group chats by date and render them
    this.renderGroupedChats(chatsContainer);

    if (this.chats.length === 0) {
      chatsContainer.appendChild(this.renderEmptyState());
    }
    this.chatsContainer = chatsContainer;

    return historyPanel;
  }

  private renderGroupedChats(container: HTMLDivElement) {
    // Sort chats by updatedAt in descending order
    const sortedChats = [...this.chats].sort(
      (a, b) => b.updatedAt - a.updatedAt
    );

    // Group chats by date
    const groupedChats = this.groupChatsByDate(sortedChats);

    // Render each date group
    Object.entries(groupedChats).forEach(([dateLabel, chats]) => {
      // Create date header
      const dateHeader = document.createElement('div');
      dateHeader.className = 'chat-widget-history-date-header';
      dateHeader.textContent = dateLabel;
      container.appendChild(dateHeader);

      // Render chats for this date
      chats.forEach((chat) => {
        container.appendChild(this.renderChat(chat));
      });
    });
  }

  private groupChatsByDate(
    chats: HistoryChat[]
  ): Record<string, HistoryChat[]> {
    const groups: Record<string, HistoryChat[]> = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    chats.forEach((chat) => {
      const chatDate = new Date(chat.updatedAt);
      let dateLabel: string;

      if (this.isSameDay(chatDate, today)) {
        dateLabel = 'Today';
      } else if (this.isSameDay(chatDate, yesterday)) {
        dateLabel = 'Yesterday';
      } else {
        dateLabel = chatDate.toLocaleDateString(undefined, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      }

      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(chat);
    });

    return groups;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  addChat(chat: HistoryChat) {
    this.hideEmpty();
    this.chats.push(chat);
    this.storage.addChat(chat);

    // Re-render the entire grouped chats structure
    this.chatsContainer.innerHTML = '';
    this.renderGroupedChats(this.chatsContainer);

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

  updateDisabledState() {
    const isDisabled = this.isStreamingActive();
    const chatItems = this.chatsContainer.querySelectorAll(
      '.chat-widget-history-chat'
    );

    chatItems.forEach((chatItem) => {
      const deleteBtn = chatItem.querySelector(
        '.chat-widget-history-chat-delete'
      ) as HTMLElement;

      if (isDisabled) {
        chatItem.classList.add('disabled');
        (chatItem as HTMLElement).style.pointerEvents = 'none';
        (chatItem as HTMLElement).style.opacity = '0.5';
        if (deleteBtn) {
          deleteBtn.style.pointerEvents = 'none';
          deleteBtn.style.opacity = '0.5';
        }
      } else {
        chatItem.classList.remove('disabled');
        (chatItem as HTMLElement).style.pointerEvents = '';
        (chatItem as HTMLElement).style.opacity = '';
        if (deleteBtn) {
          deleteBtn.style.pointerEvents = '';
          deleteBtn.style.opacity = '';
        }
      }
    });
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

    // Check if streaming is active to disable the chat item
    const isDisabled = this.isStreamingActive();
    if (isDisabled) {
      chatItem.classList.add('disabled');
      chatItem.style.pointerEvents = 'none';
      chatItem.style.opacity = '0.5';
    }

    // Title only (no timestamp since it's grouped by date)
    const title = document.createElement('div');
    title.className = 'chat-widget-history-chat-title';
    title.textContent = chat.title;
    chatItem.appendChild(title);

    // Delete button (bin icon)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'chat-widget-history-chat-delete';
    deleteBtn.title = 'Delete chat';
    deleteBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';

    if (!isDisabled) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteChat(chat.sessionId);
      });
    } else {
      deleteBtn.style.pointerEvents = 'none';
      deleteBtn.style.opacity = '0.5';
    }
    chatItem.appendChild(deleteBtn);

    if (!isDisabled) {
      chatItem.addEventListener('click', () =>
        this.onChatItemClick(chat.sessionId)
      );
    }
    return chatItem;
  }

  private renderEmptyState(): HTMLDivElement {
    const historyEmpty = document.createElement('div');
    historyEmpty.className = 'chat-widget-history-empty';
    const historyEmptyIcon = document.createElement('div');
    historyEmptyIcon.innerHTML =
      '<svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M63.0062 40.3405C62.8288 39.8453 62.6203 39.3618 62.382 38.8929L51.3347 13.7594C51.2302 13.5174 51.0805 13.2974 50.8938 13.1113C50.1044 12.3218 49.1673 11.6955 48.1359 11.2682C47.1045 10.841 45.9991 10.621 44.8827 10.621C43.7663 10.621 42.6608 10.841 41.6294 11.2682C40.598 11.6955 39.6609 12.3218 38.8716 13.1113C38.4744 13.5089 38.251 14.0475 38.25 14.6094V21.2501H29.75V14.6094C29.7502 14.3303 29.6954 14.0538 29.5888 13.7959C29.4821 13.5379 29.3257 13.3035 29.1284 13.106C28.3391 12.3165 27.402 11.6902 26.3706 11.2629C25.3392 10.8356 24.2337 10.6157 23.1173 10.6157C22.0009 10.6157 20.8955 10.8356 19.8641 11.2629C18.8327 11.6902 17.8956 12.3165 17.1063 13.106C16.9195 13.2921 16.7698 13.5121 16.6653 13.7541L5.61797 38.8876C5.37967 39.3565 5.17118 39.84 4.99375 40.3352C4.3682 42.0855 4.13291 43.9514 4.30435 45.8022C4.4758 47.653 5.04983 49.444 5.98624 51.0496C6.92266 52.6552 8.1988 54.0366 9.72528 55.0971C11.2518 56.1577 12.9917 56.8716 14.8231 57.189C16.6545 57.5063 18.5332 57.4194 20.3275 56.9343C22.1218 56.4492 23.7883 55.5777 25.2104 54.3808C26.6324 53.1839 27.7756 51.6905 28.5598 50.0053C29.3439 48.3201 29.7502 46.4838 29.75 44.6251V25.5001H38.25V44.6251C38.2491 46.484 38.6546 48.3207 39.4383 50.0064C40.2219 51.6921 41.3647 53.186 42.7866 54.3835C44.2084 55.581 45.8749 56.4532 47.6693 56.9388C49.4637 57.4244 51.3426 57.5118 53.1743 57.1947C55.006 56.8777 56.7463 56.164 58.2731 55.1036C59.7999 54.0432 61.0764 52.6617 62.0131 51.056C62.9498 49.4503 63.524 47.6592 63.6956 45.8082C63.8671 43.9572 63.6319 42.091 63.0062 40.3405ZM20.3761 15.8712C21.0846 15.2746 21.9685 14.9258 22.8934 14.8779C23.8184 14.83 24.7336 15.0855 25.5 15.6055V35.1316C23.8409 33.6419 21.8194 32.6143 19.6381 32.1518C17.4568 31.6894 15.1923 31.8083 13.0714 32.4966L20.3761 15.8712ZM17 53.1251C15.3189 53.1251 13.6755 52.6265 12.2777 51.6926C10.8798 50.7586 9.79037 49.431 9.14703 47.8779C8.50368 46.3247 8.33535 44.6156 8.66333 42.9668C8.9913 41.318 9.80085 39.8034 10.9896 38.6147C12.1783 37.4259 13.6929 36.6164 15.3417 36.2884C16.9906 35.9604 18.6996 36.1287 20.2528 36.7721C21.806 37.4154 23.1335 38.5049 24.0675 39.9027C25.0015 41.3005 25.5 42.9439 25.5 44.6251C25.5 46.8794 24.6045 49.0414 23.0104 50.6355C21.4164 52.2295 19.2543 53.1251 17 53.1251ZM42.5 15.6029C43.2664 15.0828 44.1816 14.8273 45.1066 14.8752C46.0315 14.9232 46.9154 15.272 47.6239 15.8685L54.9286 32.4913C52.8075 31.8033 50.5428 31.6848 48.3615 32.1478C46.1802 32.6107 44.1588 33.6388 42.5 35.129V15.6029ZM51 53.1251C49.3189 53.1251 47.6755 52.6265 46.2777 51.6926C44.8798 50.7586 43.7904 49.431 43.147 47.8779C42.5037 46.3247 42.3354 44.6156 42.6633 42.9668C42.9913 41.318 43.8008 39.8034 44.9896 38.6147C46.1783 37.4259 47.6929 36.6164 49.3417 36.2884C50.9906 35.9604 52.6996 36.1287 54.2528 36.7721C55.806 37.4154 57.1335 38.5049 58.0675 39.9027C59.0015 41.3005 59.5 42.9439 59.5 44.6251C59.5 46.8794 58.6045 49.0414 57.0104 50.6355C55.4163 52.2295 53.2543 53.1251 51 53.1251Z" fill="#BDBDBD"/></svg>';
    historyEmpty.appendChild(historyEmptyIcon);
    const historyEmptyTitle = document.createElement('h4');
    historyEmptyTitle.innerHTML = 'No chats yet';
    historyEmpty.appendChild(historyEmptyTitle);
    const historyEmptyDescription = document.createElement('span');
    historyEmptyDescription.innerHTML = 'Your chat history will be shown here';
    historyEmpty.appendChild(historyEmptyDescription);
    return historyEmpty;
  }

  private deleteChat(sessionId: string) {
    // Remove from storage
    this.storage.removeChat(sessionId);

    // Remove from local state
    const index = this.chats.findIndex((c) => c.sessionId === sessionId);
    if (index !== -1) {
      const wasActive = this.activeChat?.sessionId === sessionId;
      this.chats.splice(index, 1);
      if (wasActive) {
        this.activeChat = null;
      }
    }

    // Re-render the grouped chats
    this.chatsContainer.innerHTML = '';
    if (this.chats.length === 0) {
      this.chatsContainer.appendChild(this.renderEmptyState());
    } else {
      this.renderGroupedChats(this.chatsContainer);
      // Re-apply active state if any
      if (this.activeChat) {
        this.setActiveChat(this.activeChat);
      }
    }

    // Notify parent
    this.onChatItemDelete?.(sessionId);
  }
}

export default HistoryPanel;
