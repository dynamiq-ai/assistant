import { ChatWidgetCore } from '../ChatWidget';

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

const mount = (options: ConstructorParameters<typeof ChatWidgetCore>[1] = {}) => {
  const container = document.createElement('div');
  const widget = new ChatWidgetCore(container, options);
  return { container, widget };
};

describe('message ids', () => {
  it('are unique even when messages are created in the same millisecond', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    const { container, widget } = mount();

    widget.sendMessage('hi');
    widget.addBotMessage('hello');

    const ids = [...container.querySelectorAll('.chat-message')].map((m) => m.id);
    expect(new Set(ids).size).toBe(2);
    widget.destroy();
  });
});

describe('feedback', () => {
  it('does not pair the first bot message with an unrelated later message', () => {
    const onFeedback = jest.fn();
    const { container, widget } = mount({ onFeedback });

    widget.addBotMessage('Welcome!');
    widget.sendMessage('a question');
    container
      .querySelector<HTMLElement>('.chat-message-bot .chat-message-feedback-button')!
      .click();

    const messages = onFeedback.mock.calls[0][2];
    expect(messages.map((m: { text: string }) => m.text)).toEqual(['Welcome!']);
    widget.destroy();
  });

  it('passes the preceding user message and the bot message', () => {
    const onFeedback = jest.fn();
    const { container, widget } = mount({ onFeedback });

    widget.sendMessage('a question');
    widget.addBotMessage('an answer');
    container
      .querySelector<HTMLElement>('.chat-message-bot .chat-message-feedback-button')!
      .click();

    const messages = onFeedback.mock.calls[0][2];
    expect(messages.map((m: { text: string }) => m.text)).toEqual([
      'a question',
      'an answer',
    ]);
    widget.destroy();
  });
});

describe('message input', () => {
  const setup = () => {
    const { container, widget } = mount();
    const input = container.querySelector<HTMLTextAreaElement>(
      '.chat-widget-input textarea'
    )!;
    input.value = 'hello';
    const press = (init: KeyboardEventInit) =>
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init })
      );
    const sent = () => container.querySelectorAll('.chat-message-user').length;
    return { widget, press, sent };
  };

  it('sends on Enter', () => {
    const { widget, press, sent } = setup();

    press({});

    expect(sent()).toBe(1);
    widget.destroy();
  });

  it('inserts a new line on Shift+Enter', () => {
    const { widget, press, sent } = setup();

    const notPrevented = press({ shiftKey: true });

    expect(sent()).toBe(0);
    expect(notPrevented).toBe(true);
    widget.destroy();
  });

  it('does not send while an IME composition is in progress', () => {
    const { widget, press, sent } = setup();

    press({ isComposing: true });

    expect(sent()).toBe(0);
    widget.destroy();
  });
});

describe('destroy', () => {
  it('aborts a request that is still in flight', () => {
    let signal: AbortSignal | undefined;
    global.fetch = jest.fn((_url, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    }) as unknown as typeof fetch;
    const { widget } = mount({ api: { url: '/api' } });

    widget.sendMessage('hi');
    widget.destroy();

    expect(signal?.aborted).toBe(true);
  });

  it('stops listening to a host-provided toggle button', () => {
    const button = document.createElement('button');
    button.id = 'host-toggle';
    document.body.appendChild(button);
    const onChatOpenFirst = jest.fn();
    const onChatOpenSecond = jest.fn();

    mount({ toggleButton: 'host-toggle', onChatOpen: onChatOpenFirst }).widget.destroy();
    const { widget } = mount({ toggleButton: 'host-toggle', onChatOpen: onChatOpenSecond });
    button.click();

    expect(onChatOpenFirst).not.toHaveBeenCalled();
    expect(onChatOpenSecond).toHaveBeenCalledTimes(1);
    widget.destroy();
    button.remove();
  });

  it('revokes object URLs created for attachment previews', () => {
    URL.createObjectURL = jest.fn(() => 'blob:preview');
    URL.revokeObjectURL = jest.fn();
    const { widget } = mount();

    widget.addMessage({
      id: 'm1',
      text: 'see file',
      sender: 'user',
      timestamp: Date.now(),
      files: [new File(['x'], 'a.png', { type: 'image/png' })],
    });
    widget.destroy();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });
});

describe('welcome prompts', () => {
  it('shows prompt text as plain text and keeps the HTML icon', () => {
    const { container, widget } = mount({
      prompts: [{ icon: '<svg class="icon"></svg>', text: '<b>Ask</b> me' }],
    });

    const prompt = container.querySelector<HTMLButtonElement>('.chat-widget-prompt')!;
    expect(prompt.querySelector('b')).toBeNull();
    expect(prompt.textContent).toContain('<b>Ask</b> me');
    expect(prompt.querySelector('svg.icon')).not.toBeNull();
    widget.destroy();
  });
});

describe('updateParams', () => {
  it('ignores undefined values instead of clearing the user and session ids', () => {
    const onPromptSend = jest.fn();
    const { widget } = mount({ onPromptSend });
    widget.sendMessage('first');
    const { userId, sessionId } = onPromptSend.mock.calls[0][1];

    widget.updateParams({ userId: undefined, sessionId: undefined, lang: 'de' });
    widget.sendMessage('second');

    expect(onPromptSend.mock.calls[1][1]).toMatchObject({ userId, sessionId, lang: 'de' });
    widget.destroy();
  });
});

describe('IME composition in Safari', () => {
  it('does not send on the Enter that confirms a composition (keyCode 229)', () => {
    const { container, widget } = mount();
    const input = container.querySelector<HTMLTextAreaElement>('.chat-widget-input textarea')!;
    input.value = 'こんにちは';

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true })
    );

    expect(container.querySelectorAll('.chat-message-user')).toHaveLength(0);
    widget.destroy();
  });
});

describe('allowedResourceOrigins', () => {
  const remoteImageSrc = (options: ConstructorParameters<typeof ChatWidgetCore>[1]) => {
    const { container, widget } = mount(options);
    widget.addBotMessage('![x](https://cdn.example.com/x.png)');
    const src = container.querySelector('.chat-message-bot img')?.getAttribute('src');
    widget.destroy();
    return src;
  };

  it('allows remote images by default', () => {
    expect(remoteImageSrc({})).toBe('https://cdn.example.com/x.png');
  });

  it('blocks remote images when set to an empty list', () => {
    expect(remoteImageSrc({ allowedResourceOrigins: [] })).toBeNull();
  });
});
