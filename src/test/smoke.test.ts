import { ChatWidgetCore } from '../core/ChatWidget';

describe('test setup', () => {
  it('mounts the widget into a jsdom container', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const widget = new ChatWidgetCore(container, {});

    expect(container.querySelector('.chat-widget')).not.toBeNull();
    widget.destroy();
  });
});

describe('markdown rendering', () => {
  it('renders bot markdown through marked', async () => {
    const container = document.createElement('div');
    const widget = new ChatWidgetCore(container, {});

    widget.addBotMessage('**bold**');
    await new Promise((resolve) => setTimeout(resolve));

    expect(container.querySelector('.chat-message-bot strong')?.textContent).toBe(
      'bold'
    );
    widget.destroy();
  });
});

describe('bot message rendering', () => {
  const PAYLOAD = '<img src=x onerror="window.__xss = true">';

  it('sanitizes streamed and history-loaded bot messages', async () => {
    const container = document.createElement('div');
    const widget = new ChatWidgetCore(container, {});

    widget.sendMessage('hi');
    const update = widget.addBotMessage('', true) as (m: string) => void;
    update(`streamed ${PAYLOAD}`);
    widget.addBotMessage(`complete ${PAYLOAD}`);
    await new Promise((resolve) => setTimeout(resolve));

    expect(container.querySelectorAll('.chat-message-bot')).toHaveLength(2);
    expect(container.querySelector('[onerror]')).toBeNull();
    widget.destroy();
  });
});
