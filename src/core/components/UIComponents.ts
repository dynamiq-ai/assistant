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
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.7499 11.9895C21.7506 12.2567 21.6798 12.5193 21.545 12.7501C21.4102 12.9808 21.2162 13.1714 20.983 13.302L5.24144 22.3029C5.01527 22.4312 4.75987 22.499 4.49988 22.4998C4.26011 22.4993 4.02395 22.4413 3.8112 22.3308C3.59845 22.2202 3.4153 22.0602 3.27711 21.8643C3.13892 21.6684 3.04972 21.4421 3.01698 21.2046C2.98424 20.9671 3.00892 20.7252 3.08894 20.4992L5.653 13.0039C5.67827 12.9297 5.72612 12.8653 5.78985 12.8198C5.85357 12.7742 5.92997 12.7497 6.00831 12.7498H12.7499C12.8527 12.75 12.9545 12.7291 13.0488 12.6883C13.1432 12.6476 13.2282 12.5879 13.2986 12.5129C13.3689 12.4379 13.4231 12.3492 13.4577 12.2524C13.4923 12.1556 13.5067 12.0527 13.4999 11.9501C13.4829 11.7572 13.3936 11.5779 13.25 11.4481C13.1064 11.3182 12.9191 11.2474 12.7255 11.2498H6.01488C5.93665 11.2499 5.86034 11.2256 5.79662 11.1802C5.73291 11.1348 5.68499 11.0706 5.65956 10.9967L3.08706 3.49667C2.98688 3.20928 2.9765 2.89821 3.05728 2.60478C3.13807 2.31135 3.3062 2.04943 3.53936 1.85381C3.77251 1.65819 4.05966 1.53812 4.36267 1.50955C4.66567 1.48098 4.9702 1.54526 5.23581 1.69385L20.9858 10.6835C21.2175 10.814 21.4103 11.0036 21.5446 11.2331C21.6788 11.4626 21.7497 11.7236 21.7499 11.9895Z" fill="#783F8E"/></svg>';

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

  static createFeedbackButtons(messageId: string): HTMLDivElement {
    const feedbackContainer = document.createElement('div');
    feedbackContainer.className = 'chat-message-feedback';

    const thumbsUp = document.createElement('button');
    thumbsUp.className = 'chat-message-feedback-button';
    thumbsUp.innerHTML =
      '<svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.625 4.0075C13.4842 3.84795 13.3111 3.72019 13.1171 3.63269C12.9231 3.54519 12.7128 3.49996 12.5 3.5H9V2.5C9 1.83696 8.73661 1.20107 8.26777 0.732233C7.79893 0.263392 7.16304 1.28189e-07 6.5 1.28189e-07C6.40711 -6.63752e-05 6.31604 0.0257445 6.237 0.0745385C6.15795 0.123333 6.09407 0.19318 6.0525 0.27625L3.69125 5H1C0.734784 5 0.48043 5.10536 0.292893 5.29289C0.105357 5.48043 0 5.73478 0 6V11.5C0 11.7652 0.105357 12.0196 0.292893 12.2071C0.48043 12.3946 0.734784 12.5 1 12.5H11.75C12.1154 12.5001 12.4684 12.3668 12.7425 12.1252C13.0166 11.8835 13.1931 11.5501 13.2388 11.1875L13.9888 5.1875C14.0153 4.97626 13.9966 4.76179 13.9339 4.55833C13.8712 4.35488 13.7659 4.16711 13.625 4.0075ZM1 6H3.5V11.5H1V6ZM12.9963 5.0625L12.2463 11.0625C12.231 11.1834 12.1722 11.2945 12.0808 11.3751C11.9895 11.4556 11.8718 11.5 11.75 11.5H4.5V5.61812L6.79437 1.02875C7.13443 1.09681 7.4404 1.2806 7.66021 1.54884C7.88002 1.81708 8.0001 2.1532 8 2.5V4C8 4.13261 8.05268 4.25979 8.14645 4.35355C8.24021 4.44732 8.36739 4.5 8.5 4.5H12.5C12.571 4.49998 12.6411 4.51505 12.7058 4.54423C12.7704 4.5734 12.8282 4.61601 12.8751 4.66922C12.9221 4.72242 12.9571 4.78501 12.978 4.85282C12.9989 4.92063 13.0051 4.9921 12.9963 5.0625Z" fill="currentColor" /></svg>';
    thumbsUp.title = 'Helpful';
    thumbsUp.setAttribute('aria-label', 'Helpful');
    thumbsUp.type = 'button';
    thumbsUp.dataset.feedback = 'positive';
    thumbsUp.dataset.messageId = messageId;

    const thumbsDown = document.createElement('button');
    thumbsDown.className = 'chat-message-feedback-button';
    thumbsDown.innerHTML =
      '<svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.9888 7.8125L13.2388 1.8125C13.1931 1.44993 13.0166 1.1165 12.7425 0.87483C12.4684 0.633161 12.1154 0.499875 11.75 0.5H1C0.734784 0.5 0.48043 0.605357 0.292893 0.792893C0.105357 0.98043 0 1.23478 0 1.5V7C0 7.26522 0.105357 7.51957 0.292893 7.70711C0.48043 7.89464 0.734784 8 1 8H3.69125L6.0525 12.7238C6.09407 12.8068 6.15795 12.8767 6.237 12.9255C6.31604 12.9743 6.40711 13.0001 6.5 13C7.16304 13 7.79893 12.7366 8.26777 12.2678C8.73661 11.7989 9 11.163 9 10.5V9.5H12.5C12.7129 9.50007 12.9233 9.45484 13.1173 9.36732C13.3113 9.27979 13.4845 9.15197 13.6253 8.99235C13.7662 8.83273 13.8714 8.64497 13.9341 8.44154C13.9967 8.23812 14.0154 8.02369 13.9888 7.8125ZM3.5 7H1V1.5H3.5V7ZM12.875 8.33062C12.8284 8.38423 12.7708 8.42712 12.706 8.45635C12.6413 8.48559 12.571 8.50048 12.5 8.5H8.5C8.36739 8.5 8.24021 8.55268 8.14645 8.64645C8.05268 8.74021 8 8.86739 8 9V10.5C8.0001 10.8468 7.88002 11.1829 7.66021 11.4512C7.4404 11.7194 7.13443 11.9032 6.79437 11.9712L4.5 7.38188V1.5H11.75C11.8718 1.49996 11.9895 1.54439 12.0808 1.62494C12.1722 1.7055 12.231 1.81664 12.2463 1.9375L12.9963 7.9375C13.0056 8.0079 12.9996 8.07949 12.9787 8.14735C12.9578 8.21521 12.9224 8.27773 12.875 8.33062Z" fill="currentColor"/></svg>';
    thumbsDown.title = 'Not helpful';
    thumbsDown.setAttribute('aria-label', 'Not helpful');
    thumbsDown.type = 'button';
    thumbsDown.dataset.feedback = 'negative';
    thumbsDown.dataset.messageId = messageId;

    feedbackContainer.appendChild(thumbsUp);
    feedbackContainer.appendChild(thumbsDown);

    return feedbackContainer;
  }

  static createContractLinkIcon(): string {
    return '<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.4569 7.7975C15.435 7.74813 14.9056 6.57375 13.7287 5.39687C12.1606 3.82875 10.18 3 7.99999 3C5.81999 3 3.83937 3.82875 2.27124 5.39687C1.09437 6.57375 0.562494 7.75 0.543119 7.7975C0.51469 7.86144 0.5 7.93064 0.5 8.00062C0.5 8.0706 0.51469 8.1398 0.543119 8.20375C0.564994 8.25312 1.09437 9.42688 2.27124 10.6038C3.83937 12.1713 5.81999 13 7.99999 13C10.18 13 12.1606 12.1713 13.7287 10.6038C14.9056 9.42688 15.435 8.25312 15.4569 8.20375C15.4853 8.1398 15.5 8.0706 15.5 8.00062C15.5 7.93064 15.4853 7.86144 15.4569 7.7975ZM7.99999 12C6.07624 12 4.39562 11.3006 3.00437 9.92188C2.43352 9.35418 1.94786 8.70685 1.56249 8C1.94776 7.29309 2.43343 6.64574 3.00437 6.07812C4.39562 4.69938 6.07624 4 7.99999 4C9.92374 4 11.6044 4.69938 12.9956 6.07812C13.5676 6.6456 14.0543 7.29295 14.4406 8C13.99 8.84125 12.0269 12 7.99999 12ZM7.99999 5C7.40665 5 6.82663 5.17595 6.33328 5.50559C5.83994 5.83524 5.45542 6.30377 5.22836 6.85195C5.00129 7.40013 4.94188 8.00333 5.05764 8.58527C5.17339 9.16721 5.45912 9.70176 5.87867 10.1213C6.29823 10.5409 6.83278 10.8266 7.41472 10.9424C7.99667 11.0581 8.59987 10.9987 9.14804 10.7716C9.69622 10.5446 10.1648 10.1601 10.4944 9.66671C10.824 9.17336 11 8.59334 11 8C10.9992 7.2046 10.6828 6.44202 10.1204 5.87959C9.55797 5.31716 8.79539 5.00083 7.99999 5ZM7.99999 10C7.60443 10 7.21775 9.8827 6.88885 9.66294C6.55996 9.44318 6.30361 9.13082 6.15224 8.76537C6.00086 8.39991 5.96125 7.99778 6.03842 7.60982C6.11559 7.22186 6.30608 6.86549 6.58578 6.58579C6.86549 6.30608 7.22185 6.1156 7.60981 6.03843C7.99778 5.96126 8.39991 6.00087 8.76536 6.15224C9.13081 6.30362 9.44317 6.55996 9.66293 6.88886C9.8827 7.21776 9.99999 7.60444 9.99999 8C9.99999 8.53043 9.78928 9.03914 9.41421 9.41421C9.03913 9.78929 8.53043 10 7.99999 10Z" fill="#783F8E"/></svg>';
  }
}
