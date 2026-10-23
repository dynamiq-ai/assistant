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
