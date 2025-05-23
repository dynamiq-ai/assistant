import { ChatWidgetOptions } from '../types';

export class UIComponents {
  static createWidget(options: ChatWidgetOptions): HTMLElement {
    const widget = document.createElement('div');
    widget.className = `chat-widget chat-widget-${options.position}`;

    // Set custom CSS variables for theming
    if (options.theme) {
      widget.style.setProperty(
        '--primary-color',
        options.theme.primaryColor || '#6c5ce7'
      );
      widget.style.setProperty(
        '--secondary-color',
        options.theme.secondaryColor || '#f5f5f5'
      );
      widget.style.setProperty(
        '--font-family',
        options.theme.fontFamily || 'Inter, sans-serif'
      );
    }

    return widget;
  }

  static createToggleButton(): HTMLButtonElement {
    const toggleButton = document.createElement('button');
    toggleButton.className = 'chat-widget-toggle';
    toggleButton.type = 'button';
    toggleButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    return toggleButton;
  }

  static createChatContainer(): HTMLDivElement {
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-widget-container';
    chatContainer.style.display = 'none';
    return chatContainer;
  }

  static createHeader(options: ChatWidgetOptions): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'chat-widget-header';

    const title = document.createElement('h3');
    title.innerHTML = (options.title as string) || 'Chat Assistant';

    const headerActions = document.createElement('div');
    headerActions.className = 'chat-widget-header-actions';

    // Add the New Chat button
    const newChatButton = document.createElement('button');
    newChatButton.className = 'chat-widget-new-chat';
    newChatButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> New Chat';

    const closeButton = document.createElement('button');
    closeButton.className = 'chat-widget-close';
    closeButton.type = 'button';
    closeButton.innerHTML = '&times;';

    const fullScreenButton = document.createElement('button');
    fullScreenButton.className = 'chat-widget-full-screen';
    fullScreenButton.type = 'button';
    fullScreenButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>';

    headerActions.appendChild(newChatButton);
    if (options.allowFullScreen) {
      headerActions.appendChild(fullScreenButton);
    }
    headerActions.appendChild(closeButton);

    header.appendChild(title);
    header.appendChild(headerActions);

    return header;
  }

  static createContentContainer(): HTMLDivElement {
    const contentContainer = document.createElement('div');
    contentContainer.className = 'chat-widget-content';

    // Create the messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'chat-widget-messages';
    messagesContainer.style.display = 'none';
    contentContainer.appendChild(messagesContainer);

    return contentContainer;
  }

  static createInputContainer(options: ChatWidgetOptions): HTMLDivElement {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'chat-widget-input';

    const input = document.createElement('textarea');
    input.rows = 1;
    input.placeholder = options.placeholder || 'Type your message...';

    const sendButton = document.createElement('button');
    sendButton.className = 'chat-widget-send';
    sendButton.type = 'button';
    sendButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';

    const abortButton = document.createElement('button');
    abortButton.className = 'chat-widget-abort';
    abortButton.type = 'button';
    abortButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="currentColor"/></svg>';
    abortButton.title = 'Stop generating';

    // Add file upload button if enabled
    if (options.allowFileUpload) {
      const fileInputContainer = document.createElement('div');
      fileInputContainer.className = 'chat-widget-file-input-container';

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'chat-widget-file-input';
      fileInput.className = 'chat-widget-file-input';
      fileInput.multiple = true;
      fileInput.accept = options.acceptedFileTypes || '*';

      const fileButton = document.createElement('button');
      fileButton.className = 'chat-widget-file-button';
      fileButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>';
      fileButton.title = 'Attach files';

      fileInputContainer.appendChild(fileInput);
      fileInputContainer.appendChild(fileButton);

      inputContainer.appendChild(fileInputContainer);
    }

    inputContainer.appendChild(input);
    inputContainer.appendChild(sendButton);
    inputContainer.appendChild(abortButton);

    return inputContainer;
  }

  static createWelcomeScreen(options: ChatWidgetOptions): HTMLDivElement {
    const welcomeScreen = document.createElement('div');
    welcomeScreen.className = 'chat-widget-welcome-screen';

    const welcomeTitle = document.createElement('h3');
    welcomeTitle.className = 'chat-widget-welcome-title';
    welcomeTitle.textContent = options.welcomeTitle!;

    const welcomeSubtitle = document.createElement('p');
    welcomeSubtitle.className = 'chat-widget-welcome-subtitle';
    welcomeSubtitle.textContent = options.welcomeSubtitle!;

    welcomeScreen.appendChild(welcomeTitle);
    welcomeScreen.appendChild(welcomeSubtitle);

    // Add prompts if provided
    if (options.prompts) {
      const promptsContainer = document.createElement('div');
      promptsContainer.className = 'chat-widget-prompts';
      options.prompts.forEach((prompt) => {
        const promptElement = document.createElement('button');
        promptElement.type = 'button';
        promptElement.className = 'chat-widget-prompt';
        promptElement.innerHTML = `${prompt.icon} ${prompt.text}`;
        promptElement.dataset.prompt = prompt.text;
        promptsContainer.appendChild(promptElement);
      });
      welcomeScreen.appendChild(promptsContainer);
    }

    return welcomeScreen;
  }

  static createFooter(options: ChatWidgetOptions): HTMLDivElement {
    const footer = document.createElement('div');
    footer.className = 'chat-widget-footer';
    footer.innerHTML = options.footerText || '';
    return footer;
  }

  static createPoweredBy(options: ChatWidgetOptions): HTMLDivElement {
    const poweredByContainer = document.createElement('div');
    poweredByContainer.className = 'chat-widget-powered-by';
    poweredByContainer.innerHTML = options.poweredBy || '';
    return poweredByContainer;
  }

  static createHumanSupport(options: ChatWidgetOptions): HTMLDivElement {
    const humanSupportContainer = document.createElement('div');
    humanSupportContainer.className = 'chat-widget-human-support';
    humanSupportContainer.innerHTML = options.humanSupport ?? '';
    return humanSupportContainer;
  }

  static createIntermediateSteps(steps: string[]): HTMLDetailsElement {
    const intermediateStepsContainer = document.createElement('details');
    intermediateStepsContainer.className = 'chat-message-intermediate-steps';

    if (steps.length > 0) {
      const summary = document.createElement('summary');
      intermediateStepsContainer.appendChild(summary);
      steps.forEach((step) => {
        const stepElement = UIComponents.createIntermediateStep(step);
        intermediateStepsContainer.appendChild(stepElement);
      });
    }

    return intermediateStepsContainer;
  }

  static createIntermediateStep(step: string): HTMLDivElement {
    const stepElement = document.createElement('div');
    stepElement.className = 'chat-message-intermediate-step';
    stepElement.textContent = step;
    return stepElement;
  }
}
