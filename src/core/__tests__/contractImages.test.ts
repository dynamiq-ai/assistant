import { ChatWidgetCore } from '../ChatWidget';
import { HistoryChat } from '../types';

const flush = async () => {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const mockJsonResponse = (output: string) => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ output }),
  })) as unknown as typeof fetch;
};

const imageSrcs = (container: HTMLElement, contract: string) =>
  [
    ...container.querySelectorAll<HTMLImageElement>(
      `[data-contract="${contract}"] .chat-contract-image`
    ),
  ].map((img) => img.getAttribute('src'));

beforeEach(() => localStorage.clear());

describe('contract images', () => {
  it('puts each resolved URL on every image of its contract', async () => {
    mockJsonResponse('`image{"contract":"c-1"}` `image{"contract":"c-1"}` `image{"contract":"c-2"}`');
    const onImageBlock = jest.fn(async (ids: string[]) => ids.map((id) => `/img/${id}.png`));
    const container = document.createElement('div');
    const widget = new ChatWidgetCore(container, {
      api: { url: '/api' },
      onImageBlock,
    });

    widget.sendMessage('show');
    await flush();

    expect(onImageBlock).toHaveBeenCalledWith(['c-1', 'c-2']);
    expect(imageSrcs(container, 'c-1')).toEqual(['/img/c-1.png', '/img/c-1.png']);
    expect(imageSrcs(container, 'c-2')).toEqual(['/img/c-2.png']);
    widget.destroy();
  });

  it('persists resolved images for non-streaming responses', async () => {
    mockJsonResponse('`image{"contract":"c-1"}`');
    const widget = new ChatWidgetCore(document.createElement('div'), {
      api: { url: '/api' },
      params: { userId: 'u', sessionId: 's' },
      onImageBlock: async () => ['/img/c-1.png'],
    });

    widget.sendMessage('show');
    await flush();

    const [chat] = JSON.parse(localStorage.getItem('chats_history')!) as HistoryChat[];
    expect(chat.messages[1].processedImages).toEqual({ 'c-1': '/img/c-1.png' });
    widget.destroy();
  });

  it('only requests the contracts of the new message after opening a past chat', async () => {
    const pastChat: HistoryChat = {
      sessionId: 'old',
      userId: 'u',
      title: 'old',
      updatedAt: 1,
      messages: [
        { id: '1', text: 'q', sender: 'user', timestamp: 1 },
        { id: '2', text: '`image{"contract":"c-old"}`', sender: 'bot', timestamp: 1 },
      ],
    };
    localStorage.setItem('chats_history', JSON.stringify([pastChat]));
    mockJsonResponse('`image{"contract":"c-new"}`');
    const onImageBlock = jest.fn(async (ids: string[]) => ids.map(() => '/x.png'));
    const container = document.createElement('div');
    const widget = new ChatWidgetCore(container, {
      api: { url: '/api' },
      params: { userId: 'u' },
      onImageBlock,
    });

    container.querySelector<HTMLElement>('.chat-widget-history-chat')!.click();
    await flush();
    widget.sendMessage('next');
    await flush();

    expect(onImageBlock).toHaveBeenCalledTimes(1);
    expect(onImageBlock).toHaveBeenCalledWith(['c-new']);
    widget.destroy();
  });
});
