import { ChatWidgetCore } from '../core/ChatWidget';
import { ChatWidgetOptions, ChatMessage } from '../core/types';

export class ChatWidget {
  private instance: ChatWidgetCore | null = null;
  private readonly options: ChatWidgetOptions;
  private readonly targetSelector: string;

  constructor(selector: string, options: ChatWidgetOptions = {}) {
    this.targetSelector = selector;
    this.options = options;
    this.init();
  }

  private init(): void {
    const container = document.querySelector(this.targetSelector);
    if (!container) {
      console.error(`Element with selector "${this.targetSelector}" not found.`);
      return;
    }

    this.instance = new ChatWidgetCore(container as HTMLElement, this.options);
  }

  public open(): void {
    this.instance?.open();
  }

  public close(): void {
    this.instance?.close();
  }

  public toggle(): void {
    this.instance?.toggle();
  }

  public sendMessage(text: string): void {
    this.instance?.sendMessage(text);
  }

  public addMessage(message: ChatMessage): void {
    this.instance?.addMessage(message);
  }

  public destroy(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }
} 