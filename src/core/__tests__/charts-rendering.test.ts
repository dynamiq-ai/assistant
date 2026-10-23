import vegaEmbed from 'vega-embed';
import { ChatWidgetCore } from '../ChatWidget';
import { HistoryChat } from '../types';
import { flushPromises } from '../../test/utils';

const mockedEmbed = vegaEmbed as unknown as jest.Mock;
const CHART = '```chart\n{"mark":"bar"}\n```';

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
  jest.restoreAllMocks();
  mockedEmbed.mockReset();
  mockedEmbed.mockImplementation(async () => ({
    view: { finalize: jest.fn() },
    finalize: jest.fn(),
  }));
});

describe('chart rendering', () => {
  it('embeds a streamed chart once, after the message is complete', async () => {
    mockStreamingResponse([`Here\n\n${CHART}\n\n`, 'and', ' more text']);
    const widget = new ChatWidgetCore(document.createElement('div'), {
      api: { url: '/api', streaming: true },
    });

    widget.sendMessage('chart please');
    await flushPromises();

    expect(mockedEmbed).toHaveBeenCalledTimes(1);
    widget.destroy();
  });

  it('finalizes embedded charts when the chat is replaced', async () => {
    const finalize = jest.fn();
    mockedEmbed.mockResolvedValue({ view: { finalize: jest.fn() }, finalize });
    const widget = new ChatWidgetCore(document.createElement('div'), {});

    widget.addBotMessage(CHART);
    await flushPromises();
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
    await flushPromises();

    expect(mockedEmbed).toHaveBeenCalledTimes(2);
    widget.destroy();
  });
});

describe('chart rendering edge cases', () => {
  it('embeds charts of a partial answer when the stream fails', async () => {
    global.fetch = jest.fn(async () => {
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(controller) {
          const content = `Partial\n\n${CHART}\n\n`;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ data: { choices: [{ delta: { content } }] } })}\n\n`
            )
          );
          // Erroring right away would discard the queued chunk
          setTimeout(() => controller.error(new Error('network down')));
        },
      });
      return { ok: true, body };
    }) as unknown as typeof fetch;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    const widget = new ChatWidgetCore(container, {
      api: { url: '/api', streaming: true },
      onFeedback: () => {},
    });

    widget.sendMessage('chart please');
    await flushPromises();

    expect(mockedEmbed).toHaveBeenCalledTimes(1);
    const [partial] = container.querySelectorAll('.chat-message-bot');
    expect(partial.querySelector('.chat-message-feedback')).not.toBeNull();
    widget.destroy();
  });

  it('finalizes a chart that finishes embedding after the chat was replaced', async () => {
    const finalize = jest.fn();
    let resolveEmbed: (value: unknown) => void = () => {};
    mockedEmbed.mockReturnValue(
      new Promise((resolve) => {
        resolveEmbed = resolve;
      })
    );
    const widget = new ChatWidgetCore(document.createElement('div'), {});

    widget.addBotMessage(CHART);
    widget.startNewChat();
    resolveEmbed({ view: { finalize: jest.fn() }, finalize });
    await flushPromises();

    expect(finalize).toHaveBeenCalledTimes(1);
    widget.destroy();
  });
});
