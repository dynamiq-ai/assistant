import { HistoryChat } from './types';

class HistoryPanel {
  private chats: HistoryChat[] = [];

  constructor() {
    this.chats = localStorage.getItem('chats_history')
      ? JSON.parse(localStorage.getItem('chats_history') || '')
      : [];
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

    const historyEmpty = document.createElement('div');
    historyEmpty.className = 'chat-widget-history-empty';
    historyEmpty.innerHTML = 'No chats yet';
    chatsContainer.appendChild(historyEmpty);

    return historyPanel;
  }
}

export default HistoryPanel;
