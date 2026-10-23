import vegaEmbed from 'vega-embed';
import { ChatWidgetCore } from '../ChatWidget';
import { HistoryChat } from '../types';

const mockedEmbed = vegaEmbed as unknown as jest.Mock;
const CHART = '```chart\n{"mark":"bar"}\n```';

const flush = async () => {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const mockStreamingResponse = (chunks: string[]) => {
  global.fetch = jest.fn(async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        chunks.forEach((content) =>
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ data: { choices: [{ delta: { content } }] } })}\n\n`
            )
          )
        );
        controller.close();
      },
    });
    return { ok: true, body };
  }) as unknown as typeof fetch;
};

beforeEach(() => {
  localStorage.clear();
  mockedEmbed.mockClear();
});

describe('chart rendering', () => {
  it('embeds a streamed chart once, after the message is complete', async () => {
    mockStreamingResponse([`Here\n\n${CHART}\n\n`, 'and', ' more text']);
    const widget = new ChatWidgetCore(document.createElement('div'), {
      api: { url: '/api', streaming: true },
    });

    widget.sendMessage('chart please');
    await flush();

    expect(mockedEmbed).toHaveBeenCalledTimes(1);
    widget.destroy();
  });

  it('finalizes chart views when the chat is replaced', async () => {
    const finalize = jest.fn();
    mockedEmbed.mockResolvedValue({ view: { finalize } });
    const widget = new ChatWidgetCore(document.createElement('div'), {});

    widget.addBotMessage(CHART);
    await flush();
    widget.startNewChat();

    expect(finalize).toHaveBeenCalledTimes(1);
    widget.destroy();
  });

  it('embeds each chart once when opening a past chat', async () => {
    const pastChat: HistoryChat = {
      sessionId: 'old',
      userId: 'u',
      title: 'old',
      updatedAt: 1,
      messages: [
        { id: '1', text: 'q', sender: 'user', timestamp: 1 },
        { id: '2', text: `${CHART}\n\n${CHART}`, sender: 'bot', timestamp: 1 },
      ],
    };
    localStorage.setItem('chats_history', JSON.stringify([pastChat]));
    const container = document.createElement('div');
    const widget = new ChatWidgetCore(container, { params: { userId: 'u' } });

    container.querySelector<HTMLElement>('.chat-widget-history-chat')!.click();
    await flush();

    expect(mockedEmbed).toHaveBeenCalledTimes(2);
    widget.destroy();
  });
});
