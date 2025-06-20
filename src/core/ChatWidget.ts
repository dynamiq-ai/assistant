import {
  ChatMessage,
  ChatWidgetOptions,
  ApiConfig,
  CustomParams,
  HistoryChat,
  ContentTypes,
} from './types';
import './styles.css';
import {
  getRelativeTimeString,
  processMessageText,
  resizeInput,
  updateChartCode,
} from './utils';
import { marked, Renderer, type Tokens } from 'marked';
import HistoryPanel from './HistoryPanel';
import { Storage } from './Storage';
import vegaEmbed from 'vega-embed';
import { INPUT_V_PADDING, MAX_INPUT_HEIGHT } from './constants';
import { UIComponents } from './components/UIComponents';

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

export class ChatWidgetCore {
  private readonly container: HTMLElement;
  private readonly historyPanel: HistoryPanel;
  private readonly options: ChatWidgetOptions;
  private messages: ChatMessage[] = [];
  private isOpen: boolean = false;
  private widgetElement: HTMLElement | null = null;
  private readonly apiConfig: ApiConfig | undefined;
  private selectedFiles: File[] = [];
  private isLoading: boolean = false;
  private relativeTimeInterval: NodeJS.Timeout | null = null;
  private params: CustomParams;
  private storage: Storage;
  private abortController: AbortController | null = null;
  private pendingContracts: Set<string> = new Set();

  constructor(container: HTMLElement, options: ChatWidgetOptions = {}) {
    this.container = container;
    this.storage = Storage.getInstance();
    this.options = {
      title: 'Dynamiq Assistant',
      placeholder: 'Type a message...',
      welcomeTitle: 'Welcome to Dynamiq',
      welcomeSubtitle: 'How can I help you today?',
      position: 'bottom-right',
      theme: {
        primaryColor: '#6c5ce7',
        secondaryColor: '#f5f5f5',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      },
      allowFileUpload: false,
      maxFileSize: 5 * 1024 * 1024, // 5MB default
      acceptedFileTypes: '*', // All file types by default
      intermediateStreaming: true,
      ...options,
    };

    this.params = {
      userId: crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      ...options.params,
    };
    Storage.userId = this.params.userId;
    this.apiConfig = this.options.api;
    this.selectedFiles = [];
    this.historyPanel = new HistoryPanel(this.loadChatHistory.bind(this));

    this.setupMarkedRenderer();
    this.init();
  }

  private setupMarkedRenderer(): void {
    const renderer = new Renderer();
    const originalCodeRenderer = renderer.code.bind(renderer);
    const originalCodespanRenderer = renderer.codespan.bind(renderer);
    const originalTableImpl = Renderer.prototype.table;

    renderer.code = ({ text: code, lang: language, escaped }) => {
      //Render Vega charts
      if (language === 'chart') {
        try {
          const initialCode = JSON.parse(code);
          const primaryThemeColor =
            this.options.theme?.primaryColor || '#6c5ce7';

          const updatedCode = updateChartCode(initialCode, primaryThemeColor);

          const chartId = `vega-chart-${Math.random()
            .toString(36)
            .substring(7)}`;
          const escapedSpec = JSON.stringify(updatedCode)
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<div class="chat-message-chart-container">
          <div id="${chartId}" class="chat-message-chart" data-chart-spec="${escapedSpec}"></div>
          </div>`;
        } catch {
          return 'Building chart...';
        }
      }
      //Render code block images
      if (language === 'image') {
        const contractLinkIcon = UIComponents.createContractLinkIcon();
        try {
          const imageInfo = JSON.parse(code);
          const contractId = crypto.randomUUID();

          // Store contract info for later processing
          this.storeContractInfo(imageInfo);

          return this.options.onImageBlock || this.options.onLink
            ? `<div class="chat-message-image-link-container" data-contract-id="${contractId}">
        ${
          this.options.onImageBlock
            ? `<img src="" class="chat-contract-image" style="display: none;" data-loading="true" />`
            : ''
        }
        ${
          this.options.onLink?.(imageInfo)
            ? `<a href="${this.options.onLink?.(
                imageInfo
              )}" target="_blank">${contractLinkIcon}</a>`
            : ''
        }
        </div>`
            : '';
        } catch {
          return 'Loading image...';
        }
      }
      return originalCodeRenderer({ text: code, lang: language, escaped });
    };

    //Render inline images
    renderer.codespan = (token: Tokens.Codespan) => {
      const { text } = token;
      if (text.startsWith('image')) {
        try {
          const jsonData = text.slice(5).trim();
          const imageInfo = JSON.parse(jsonData);
          const contractLinkIcon = UIComponents.createContractLinkIcon();
          const contractId = crypto.randomUUID();

          // Store contract info for later processing
          this.storeContractInfo(imageInfo);

          return this.options.onImageBlock || this.options.onLink
            ? `<div class="chat-message-image-link-container" data-contract-id="${contractId}">
          ${
            this.options.onImageBlock
              ? `<img src="" class="chat-contract-image" style="display: none;" data-loading="true" />`
              : ''
          }
          ${
            this.options.onLink?.(imageInfo)
              ? `<a href="${this.options.onLink?.(
                  imageInfo
                )}" target="_blank">${contractLinkIcon}</a>`
              : ''
          }
          </div>`
            : '';
        } catch {
          return 'Loading image...';
        }
      }
      return originalCodespanRenderer(token);
    };

    // Define our function with the correct runtime signature
    const tableOverride = function (
      this: Renderer,
      header: string,
      body: string
    ): string {
      const tableHtml = originalTableImpl.call(this, header, body);
      return '<div style="overflow-x: auto;">' + tableHtml + '</div>';
    };

    // Assign with a cast through unknown to the type expected by the linter for the property
    renderer.table = tableOverride as unknown as (
      token: Tokens.Table
    ) => string;

    marked.use({ renderer });
  }

  private storeContractInfo(imageInfo: { contract: string }): void {
    this.pendingContracts.add(imageInfo.contract);
  }

  private processContractImages(messageId: string): void {
    if (this.pendingContracts.size === 0 || !this.options.onImageBlock) {
      return;
    }

    // Collect all contract IDs as array
    const contractIds = Array.from(this.pendingContracts);

    // Call onImageBlock with array of contract IDs
    const result = this.options.onImageBlock(contractIds);

    // Handle both single string and array of strings
    const imageUrls = Array.isArray(result) ? result : [result];

    // Update images in the DOM
    if (imageUrls.length > 0) {
      const allImageContainers = this.widgetElement?.querySelectorAll(
        `#chat-message-${messageId} .chat-message-image-link-container[data-contract-id]`
      );

      allImageContainers?.forEach((containerElement, index) => {
        if (index < imageUrls.length) {
          const imgElement = containerElement?.querySelector<HTMLImageElement>(
            '.chat-contract-image[data-loading="true"]'
          );

          if (imgElement && imageUrls[index]) {
            imgElement.src = imageUrls[index];
            imgElement.style.display = '';
            imgElement.removeAttribute('data-loading');
          }
        }
      });
    }

    // Clear pending contracts for this message
    this.pendingContracts.clear();
  }

  private init(): void {
    this.createWidget();
    this.attachEventListeners();
    this.setTimers();
  }

  private setTimers(): void {
    this.relativeTimeInterval = setInterval(() => {
      this.messages.forEach((message) => {
        const timestamp = message.timestamp;
        const relativeTime = getRelativeTimeString(timestamp);
        const messageElement = this.widgetElement?.querySelector(
          `#chat-message-${message.id}`
        );
        const timestampElement = messageElement?.querySelector(
          '.chat-message-timestamp'
        );

        if (timestampElement) {
          timestampElement.textContent = relativeTime;
        }
      });
    }, 60000);
  }

  private createWidget(): void {
    // Create the main widget container
    const widget = UIComponents.createWidget(this.options);

    // Create the toggle button
    const toggleButton = this.options.toggleButton
      ? document.getElementById(this.options.toggleButton)
      : UIComponents.createToggleButton();

    // Create the chat container
    const chatContainer = UIComponents.createChatContainer();

    // Create the chat header
    const header = UIComponents.createHeader(this.options);

    // Create content container
    const contentContainer = UIComponents.createContentContainer();

    // Create the input area
    const inputContainer = UIComponents.createInputContainer(this.options);

    // Create the human support link
    const humanSupportContainer = this.options.humanSupport
      ? UIComponents.createHumanSupport(this.options)
      : null;

    // Create footer
    const footer = this.options.footerText
      ? UIComponents.createFooter(this.options)
      : null;

    // Add powered by section
    const poweredByContainer = this.options.poweredBy
      ? UIComponents.createPoweredBy(this.options)
      : null;

    // Add welcome screen
    const welcomeScreen = UIComponents.createWelcomeScreen(this.options);
    contentContainer.appendChild(welcomeScreen);

    // Chat panel holds everything except the header
    const chatPanel = document.createElement('div');
    chatPanel.className = 'chat-widget-panel';

    // Create the history container
    chatPanel.appendChild(this.historyPanel.render());

    const chatMain = document.createElement('div');
    chatMain.className = 'chat-widget-main';
    chatMain.appendChild(contentContainer);
    chatMain.appendChild(inputContainer);

    chatPanel.appendChild(chatMain);

    // Assemble the chat container
    chatContainer.appendChild(header);
    chatContainer.appendChild(chatPanel);

    if (humanSupportContainer) {
      chatMain.appendChild(humanSupportContainer);
    }
    if (footer) {
      chatMain.appendChild(footer);
    }
    if (poweredByContainer) {
      chatMain.appendChild(poweredByContainer);
    }

    // Assemble the widget
    if (!this.options.toggleButton && toggleButton) {
      widget.appendChild(toggleButton);
    }
    widget.appendChild(chatContainer);

    // Add to the container
    this.container.appendChild(widget);

    // Store references
    this.widgetElement = widget;
  }

  private attachEventListeners(): void {
    if (!this.widgetElement) {
      return;
    }

    // Toggle button click
    const toggleButton = this.options.toggleButton
      ? document.getElementById(this.options.toggleButton)
      : this.widgetElement.querySelector('.chat-widget-toggle');

    if (toggleButton) {
      toggleButton.addEventListener('click', () => this.toggle());
    } else {
      console.warn('Toggle button not found');
    }

    // Close button click
    const closeButton = this.widgetElement.querySelector('.chat-widget-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }

    // Full screen button click
    const fullScreenButton = this.widgetElement.querySelector(
      '.chat-widget-full-screen'
    );
    if (fullScreenButton) {
      fullScreenButton.addEventListener('click', () => this.toggleFullScreen());
    }

    // Welcome screen click
    const promptsButtons =
      this.widgetElement.querySelectorAll<HTMLButtonElement>(
        '.chat-widget-prompt'
      );
    promptsButtons.forEach((button) => {
      button.addEventListener('click', () =>
        this.sendMessage(button.dataset.prompt!)
      );
    });

    // Message container click
    const messageContainer = this.widgetElement.querySelector(
      '.chat-widget-messages'
    );
    if (messageContainer) {
      messageContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.matches('.chat-message-feedback-button')) {
          return;
        }

        const assistantMessageIndex = this.messages.findIndex(
          (m) => m.id === target.dataset.messageId
        );
        if (assistantMessageIndex === -1) {
          return;
        }
        const assistantMessage = this.messages.at(assistantMessageIndex)!;
        const userMessage = this.messages.at(assistantMessageIndex - 1)!;

        this.options.onFeedback?.(
          e,
          target.dataset.feedback as 'positive' | 'negative',
          [userMessage, assistantMessage],
          this.params
        );
      });
    }

    // Send button click
    const sendButton = this.widgetElement.querySelector('.chat-widget-send');
    if (sendButton) {
      sendButton.addEventListener('click', () => {
        const input = this.widgetElement?.querySelector<HTMLTextAreaElement>(
          '.chat-widget-input textarea'
        );
        if (input && input.value.trim()) {
          this.sendMessage(input.value);
          resizeInput(input, INPUT_V_PADDING, MAX_INPUT_HEIGHT);
        }
      });
    }

    // Abort button click
    const abortButton = this.widgetElement.querySelector('.chat-widget-abort');
    if (abortButton) {
      abortButton.addEventListener('click', () => {
        this.abortController?.abort();
        this.hideLoadingSpinner();
        const lastMessage = this.messages.at(-1);
        if (lastMessage?.text !== '') {
          this.finalizeLastMessage();
        } else {
          this.messages = this.messages.slice(0, -1);
          this.widgetElement
            ?.querySelector<HTMLDivElement>(`#chat-message-${lastMessage.id}`)
            ?.remove();
        }
      });
    }

    // Input keypress and input events
    const input = this.widgetElement.querySelector<HTMLTextAreaElement>(
      '.chat-widget-input textarea'
    );
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          e.preventDefault();
          this.sendMessage(input.value);
          resizeInput(input, INPUT_V_PADDING, MAX_INPUT_HEIGHT);
        }
      });
      input.addEventListener('input', () =>
        resizeInput(input, INPUT_V_PADDING, MAX_INPUT_HEIGHT)
      );
    }

    // File input change
    const fileInput = this.widgetElement.querySelector<HTMLInputElement>(
      '.chat-widget-file-input'
    );
    const fileButton = this.widgetElement.querySelector(
      '.chat-widget-file-button'
    );

    if (fileInput && fileButton) {
      // Open file dialog when the button is clicked
      fileButton.addEventListener('click', () => {
        fileInput.click();
      });

      // Handle file selection
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
          this.handleFileSelection(fileInput.files);
        }
      });
    }

    // New chat button click
    const newChatButton = this.widgetElement.querySelector(
      '.chat-widget-new-chat'
    );
    if (newChatButton) {
      newChatButton.addEventListener('click', () => this.startNewChat());
    }
  }

  private toggleFullScreen(): void {
    const chatContainer = this.widgetElement?.querySelector<HTMLDivElement>(
      '.chat-widget-container'
    );
    if (chatContainer) {
      chatContainer.classList.toggle('chat-widget-container-full-screen');
    }
    // Force a resize event to ensure the chart is resized
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 500);
  }

  private handleFileSelection(files: FileList): void {
    // Check file size limits
    const maxSize = this.options.maxFileSize || 5 * 1024 * 1024; // Default 5MB

    // Convert FileList to array for easier handling
    const fileArray = Array.from(files);

    // Filter out files that exceed the size limit
    const validFiles = fileArray.filter((file) => file.size <= maxSize);

    if (validFiles.length !== fileArray.length) {
      alert(
        `Some files exceed the maximum size limit of ${Math.round(
          maxSize / (1024 * 1024)
        )}MB and were not added.`
      );
    }

    // Add valid files to selected files array
    this.selectedFiles = [...this.selectedFiles, ...validFiles];

    // Show file preview
    this.updateFilePreview();
  }

  private updateFilePreview(): void {
    const inputContainer =
      this.widgetElement?.querySelector('.chat-widget-input');
    if (!inputContainer) return;

    // Create or get file preview area
    let filePreviewArea = inputContainer.querySelector<HTMLDivElement>(
      '.chat-widget-file-preview'
    );

    if (!filePreviewArea) {
      filePreviewArea = document.createElement('div');
      filePreviewArea.className = 'chat-widget-file-preview';
      inputContainer.insertBefore(filePreviewArea, inputContainer.firstChild);
    }

    // Clear existing preview
    filePreviewArea.innerHTML = '';

    // If no files, hide the preview area
    if (this.selectedFiles.length === 0) {
      filePreviewArea.style.display = 'none';
      return;
    }

    // Show the preview area
    filePreviewArea.style.display = 'flex';

    // Add file items to preview
    this.selectedFiles.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'chat-widget-file-item';

      const fileName = document.createElement('span');
      fileName.textContent = file.name;

      const removeButton = document.createElement('button');
      removeButton.innerHTML = '&times;';
      removeButton.title = 'Remove file';
      removeButton.addEventListener('click', () => {
        this.selectedFiles.splice(index, 1);
        this.updateFilePreview();
      });

      fileItem.appendChild(fileName);
      fileItem.appendChild(removeButton);
      filePreviewArea?.appendChild(fileItem);
    });
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(): void {
    if (this.isOpen) return;

    const chatContainer = this.widgetElement?.querySelector<HTMLDivElement>(
      '.chat-widget-container'
    );
    const toggleButton = this.widgetElement?.querySelector(
      '.chat-widget-toggle'
    );

    if (chatContainer) {
      chatContainer.style.display = 'flex';
      this.isOpen = true;

      // Change the toggle button icon to a cross
      if (toggleButton) {
        toggleButton.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      }
    }
  }

  public close(): void {
    if (!this.isOpen) {
      return;
    }

    const chatContainer = this.widgetElement?.querySelector<HTMLDivElement>(
      '.chat-widget-container'
    );
    const toggleButton = this.widgetElement?.querySelector(
      '.chat-widget-toggle'
    );

    if (chatContainer) {
      chatContainer.style.display = 'none';
      this.isOpen = false;

      // Change the toggle button icon back to chat
      if (toggleButton) {
        toggleButton.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
      }
    }
  }

  public sendMessage(text: string): void {
    if (!text.trim() && this.selectedFiles.length === 0) {
      return;
    }

    const message: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: Date.now(),
      files: [...this.selectedFiles], // Include any selected files
    };

    this.hideWelcomeScreen();
    this.showMessagesContainer();

    this.addMessage(message);

    const input = this.widgetElement?.querySelector<HTMLTextAreaElement>(
      '.chat-widget-input textarea'
    );
    if (input) {
      input.value = '';
    }

    // Clear selected files and file preview
    this.clearFileSelection();

    // If API is configured, send the message to the API
    if (this.apiConfig) {
      this.showLoadingSpinner();
      this.toggleGeneratingState(true);
      this.handleApiCommunication(message).finally(() => {
        this.hideLoadingSpinner();
        this.toggleGeneratingState(false);
      });
    }
  }

  private showWelcomeScreen(): void {
    const welcomeScreen = this.widgetElement?.querySelector<HTMLDivElement>(
      '.chat-widget-welcome-screen'
    );
    if (welcomeScreen) {
      welcomeScreen.style.display = 'flex';
    }
  }

  private hideWelcomeScreen(): void {
    const welcomeScreen = this.widgetElement?.querySelector<HTMLDivElement>(
      '.chat-widget-welcome-screen'
    );
    if (welcomeScreen) {
      welcomeScreen.style.display = 'none';
    }
  }

  private showMessagesContainer(): void {
    const messagesContainer = this.widgetElement?.querySelector<HTMLDivElement>(
      '.chat-widget-messages'
    );
    if (messagesContainer) {
      messagesContainer.style.display = 'block';
    }
  }

  private hideMessagesContainer(): void {
    const messagesContainer = this.widgetElement?.querySelector<HTMLDivElement>(
      '.chat-widget-messages'
    );
    if (messagesContainer) {
      messagesContainer.style.display = 'none';
    }
  }

  private showLoadingSpinner(): void {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    const messagesContainer = this.widgetElement?.querySelector(
      '.chat-widget-messages'
    );
    if (!messagesContainer) {
      return;
    }

    const spinnerElement = document.createElement('div');
    spinnerElement.className = 'chat-loading-spinner';
    spinnerElement.id = 'chat-loading-spinner';

    // Create three dots for the spinner
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'chat-loading-spinner-dot';
      spinnerElement.appendChild(dot);
    }

    messagesContainer.appendChild(spinnerElement);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  private hideLoadingSpinner(): void {
    this.isLoading = false;

    const spinnerElement = this.widgetElement?.querySelector(
      '#chat-loading-spinner'
    );
    if (spinnerElement && spinnerElement.parentNode) {
      spinnerElement.parentNode.removeChild(spinnerElement);
    }
  }

  private async handleApiCommunication(message: ChatMessage): Promise<void> {
    if (!this.apiConfig) {
      return;
    }
    this.abortController = new AbortController();

    try {
      // Create FormData for the request
      const formData = new FormData();

      let history: { role: string; content: string }[] = [];

      if (this.messages.length) {
        history = this.messages.map((m) => ({
          role: m.sender === 'bot' ? 'assistant' : 'user',
          content: m.text,
        }));
        formData.append('chat_history', JSON.stringify(history));
      }

      const { userId, sessionId, ...rest } = this.params;

      // Add message content to formData
      const input = {
        input: message.text,
        user_id: userId,
        session_id: sessionId,
        ...(history.length && { chat_history: history }),
        ...rest,
      };

      formData.append('input', JSON.stringify(input));
      formData.append('stream', this.apiConfig.streaming ? 'true' : 'false');
      formData.append('user_id', input.user_id);
      formData.append('session_id', input.session_id);

      // Add any files if provided
      if (message.files && message.files.length) {
        message.files.forEach((file) => {
          formData.append('files', file);
        });
      }

      const response = await fetch(this.apiConfig.url, {
        method: 'POST',
        headers: this.apiConfig.headers || {},
        body: formData,
        signal: this.abortController.signal,
      });

      if (this.apiConfig.streaming) {
        const reader = (response.body as ReadableStream)
          .pipeThrough(new TextDecoderStream())
          .getReader();

        let step = '';
        let message = '';
        const updateMessage = this.addBotMessage(message, true);
        this.hideLoadingSpinner();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            this.abortController = null;
            break;
          }

          // Each chunk might contain multiple `data:` events, so split by empty line
          const events = value.trim().split('\n\r');

          events.forEach((eventLine) => {
            const [eventTypeLine, dataLine] = eventLine.trim().split('\r\n');
            const eventType = eventTypeLine.trim().split(': ')[1];

            if (eventType === 'data') {
              const jsonData = dataLine.slice(5).trim(); // Remove 'data:' prefix

              try {
                const parsed = JSON.parse(jsonData);

                // Check for content in the right location
                const content = parsed?.data?.choices?.[0]?.delta?.content;
                const newStep = parsed?.data?.choices?.[0]?.delta?.step;

                if (content && typeof content === 'string') {
                  message =
                    message +
                    (newStep ? (newStep !== step ? '\n\n' : '') : '') +
                    content;
                  if (updateMessage) {
                    updateMessage(message);
                  }
                  step = newStep;
                } else if (content && typeof content === 'object') {
                  this.handleIntermediateStreaming(content);
                }
              } catch (error) {
                console.error('Failed to parse JSON:', error);
              }
            }
          });
        }
        // finalize the message
        this.finalizeLastMessage();
      } else {
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.output) {
          this.addBotMessage(data.output);
        } else {
          this.addBotMessage(
            "I received your message but I don't have a response."
          );
        }
        this.abortController = null;
      }
    } catch (error) {
      console.log('Error sending message to API:', error);
      if (this.abortController?.signal.aborted) {
        this.abortController = null;
      } else {
        // Add an error message to the chat
        this.addBotMessage(
          'Sorry, there was an error processing your message. Please try again later.'
        );
      }
    }
  }

  private finalizeLastMessage() {
    const lastMessage = this.messages.at(-1);

    if (!lastMessage) {
      return;
    }

    // Process pending contracts and update images
    this.processContractImages(lastMessage.id);

    // update the message in the history
    const chats = this.storage.getChats();
    const chat = chats.find(
      (h: HistoryChat) => h.sessionId === this.params.sessionId
    );
    if (chat) {
      chat.messages = chat.messages.map((m) => {
        if (m.id === lastMessage.id) {
          return {
            ...m,
            text: lastMessage.text,
            intermediateSteps: lastMessage.intermediateSteps,
          };
        }
        return m;
      });
      this.storage.updateChat(chat);
    }

    // hide the intermediate steps container
    const intermediateStepsContainer =
      this.widgetElement?.querySelector<HTMLDetailsElement>(
        `#chat-message-${lastMessage.id} .chat-message-intermediate-steps`
      );
    if (intermediateStepsContainer) {
      intermediateStepsContainer.open = false;
    }
  }

  private handleIntermediateStreaming(content: ContentTypes) {
    if (!this.options.intermediateStreaming) {
      return;
    }

    if (content.thought) {
      const lastMessage = this.messages.at(-1);
      if (lastMessage) {
        lastMessage.intermediateSteps = [
          ...(lastMessage.intermediateSteps ?? []),
          content.thought,
        ];
        const message = this.widgetElement?.querySelector(
          `#chat-message-${lastMessage.id}`
        );

        if (!message) {
          return;
        }

        let intermediateStepsContainer =
          message.querySelector<HTMLDetailsElement>(
            '.chat-message-intermediate-steps'
          );
        if (intermediateStepsContainer) {
          intermediateStepsContainer.appendChild(
            UIComponents.createIntermediateStep(content.thought)
          );
          intermediateStepsContainer.open = true;
        } else {
          intermediateStepsContainer = UIComponents.createIntermediateSteps(
            lastMessage.intermediateSteps
          );
          message
            .querySelector('.chat-message-content')
            ?.prepend(intermediateStepsContainer);
          intermediateStepsContainer.open = true;
        }
        const messagesContainer = this.widgetElement?.querySelector(
          '.chat-widget-messages'
        );
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }
    }
  }

  public addBotMessage(
    text: string,
    streaming?: boolean
  ): ((message: string) => void) | void {
    const messageId = Date.now().toString();
    const botMessage: ChatMessage = {
      id: messageId,
      text,
      sender: 'bot',
      timestamp: Date.now(),
    };

    this.addMessage(botMessage);
    if (streaming) {
      return (message: string) => {
        const lastMessage = this.messages.find((m) => m.id === messageId);
        if (lastMessage) {
          lastMessage.text = message;
        }
        this.updateMessage(messageId, processMessageText(message));
      };
    }
  }

  public async updateMessage(messageId: string, text: string) {
    const message = this.widgetElement?.querySelector(
      `#chat-message-${messageId}`
    );
    const textElement = message?.querySelector('.chat-message-text');
    if (textElement) {
      // Parse markdown for bot messages if markdown is enabled
      if (message?.classList.contains('chat-message-bot')) {
        const rawHtml = await marked(text);
        textElement.innerHTML = rawHtml;
        textElement.className = 'chat-message-text chat-message-markdown';

        if (textElement.querySelector('.chat-message-chart-container')) {
          message.classList.add('chat-message--full-width');
        } else {
          message.classList.remove('chat-message--full-width');
        }

        // After setting innerHTML, find and render charts
        this.renderVegaChartsInElement(textElement as HTMLElement);
      } else {
        textElement.textContent = text;
      }
    }
  }

  public addMessage(message: ChatMessage): void {
    // first message, so create a new chat in history
    if (this.messages.length === 0) {
      const newChat: HistoryChat = {
        title: message.text,
        updatedAt: Date.now(),
        userId: this.params.userId,
        sessionId: this.params.sessionId,
        messages: [message],
      };

      this.historyPanel.addChat(newChat);
    } else {
      // update the chat in history
      const chats = this.storage.getChats();
      const chat = chats.find(
        (h: HistoryChat) => h.sessionId === this.params.sessionId
      );
      console.assert(chat, 'Chat not found in history');
      if (chat) {
        chat.messages.push(message);
        chat.updatedAt = Date.now();
        this.storage.updateChat(chat);
      }
    }

    this.messages.push(message);
    this.renderMessage(message);
  }

  private async renderMessage(message: ChatMessage): Promise<void> {
    const messagesContainer = this.widgetElement?.querySelector(
      '.chat-widget-messages'
    );
    if (!messagesContainer) {
      return;
    }

    const messageElement = document.createElement('div');
    messageElement.id = `chat-message-${message.id}`;
    messageElement.className = `chat-message chat-message-${message.sender}`;

    // Create avatar
    const avatar = document.createElement('div');
    avatar.className = 'chat-message-avatar';

    if (message.sender === 'bot') {
      avatar.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>';
    }

    // Create message content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'chat-message-content';

    const intermediateStepsContainer = message.intermediateSteps
      ? UIComponents.createIntermediateSteps(message.intermediateSteps)
      : null;

    // Create text element
    const textElement = document.createElement('div');
    textElement.className = 'chat-message-text';

    // Check if message is empty and show loading dots if it is
    if (!message.text && message.sender === 'bot') {
      textElement.className += ' chat-message-loading';

      // Add the bouncing dots
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'chat-message-dots';

      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'chat-message-dot';
        dotsContainer.appendChild(dot);
      }

      textElement.appendChild(dotsContainer);
    } else {
      // Parse markdown if the message is from the bot and markdown is enabled
      if (message.sender === 'bot') {
        const rawHtml = await marked(processMessageText(message.text));
        textElement.innerHTML = rawHtml;
        textElement.className += ' chat-message-markdown';
        // After setting innerHTML, find and render charts
        // This needs to be done *after* the message element is in the DOM.
        this.renderVegaChartsInElement(textElement as HTMLElement);
      } else {
        textElement.textContent = message.text;
      }
    }

    // Create timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'chat-message-timestamp';

    // Format the timestamp
    const messageTime = message.timestamp;
    const timeText = getRelativeTimeString(messageTime);

    timestamp.textContent = timeText;

    // Assemble the message
    if (this.options.intermediateStreaming && intermediateStepsContainer) {
      contentContainer.appendChild(intermediateStepsContainer);
    }
    contentContainer.appendChild(textElement);
    contentContainer.appendChild(timestamp);

    // Add feedback buttons for bot messages
    if (
      typeof this.options.onFeedback === 'function' &&
      message.sender === 'bot'
    ) {
      const feedbackContainer = UIComponents.createFeedbackButtons(message.id);
      contentContainer.appendChild(feedbackContainer);
    }

    if (message.sender === 'user') {
      messageElement.appendChild(contentContainer);
    } else {
      messageElement.appendChild(avatar);
      messageElement.appendChild(contentContainer);
    }

    messagesContainer.appendChild(messageElement);

    // Replace the existing file rendering code with our new method
    if (message.files && message.files.length > 0) {
      const filesContainer = document.createElement('div');
      filesContainer.className = 'chat-message-files';

      message.files
        .filter((f) => f instanceof File)
        .forEach((file) => {
          filesContainer.appendChild(this.renderFileAttachment(file));
        });

      contentContainer.appendChild(filesContainer);
    }

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  private async renderVegaChartsInElement(
    parentElement: HTMLElement
  ): Promise<void> {
    const chartDivs = parentElement.querySelectorAll<HTMLDivElement>(
      '.chat-message-chart'
    );

    chartDivs.forEach(async (chartDiv) => {
      const chartId = chartDiv.id;
      const specString = chartDiv.getAttribute('data-chart-spec');
      if (specString) {
        try {
          // The specString is already validated as JSON by the renderer
          // and properly escaped for the data attribute.
          // We need to unescape it if vegaEmbed expects a raw string, or parse if it expects an object.
          // vegaEmbed can take a string spec.
          const chartSpec = JSON.parse(specString);
          await vegaEmbed(`#${chartId}`, chartSpec, { actions: false });
        } catch {
          chartDiv.innerHTML = 'Error rendering chart data.';
        }
      } else {
        console.warn(`Chart div ${chartId} missing data-chart-spec.`);
        chartDiv.innerHTML = 'Error: Chart data not found.';
      }
    });
  }

  private clearFileSelection(): void {
    this.selectedFiles = [];
    const filePreviewArea = this.widgetElement?.querySelector<HTMLDivElement>(
      '.chat-widget-file-preview'
    );
    if (filePreviewArea) {
      filePreviewArea.innerHTML = '';
      filePreviewArea.style.display = 'none';
    }

    // Reset file input
    const fileInput = this.widgetElement?.querySelector<HTMLInputElement>(
      '.chat-widget-file-input'
    );
    if (fileInput) {
      fileInput.value = '';
    }
  }

  public destroy(): void {
    if (this.widgetElement && this.container.contains(this.widgetElement)) {
      this.container.removeChild(this.widgetElement);
    }
    if (this.relativeTimeInterval) {
      clearInterval(this.relativeTimeInterval);
    }
  }

  public startNewChat(): void {
    this.params.sessionId = crypto.randomUUID();

    // Clear all messages
    this.messages.length = 0;

    // Clear pending contracts
    this.pendingContracts.clear();

    // Clear the messages container
    const messagesContainer = this.widgetElement?.querySelector(
      '.chat-widget-messages'
    );
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }

    this.hideMessagesContainer();
    this.showWelcomeScreen();

    // Clear any file selections
    this.clearFileSelection();

    // Clear the input field
    const input = this.widgetElement?.querySelector<HTMLTextAreaElement>(
      '.chat-widget-input textarea'
    );
    if (input) {
      input.value = '';
    }
  }

  private renderFileAttachment(file: File) {
    const fileElement = document.createElement('div');
    fileElement.className = 'chat-message-file';

    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.className = 'chat-message-file-preview';
      img.src = URL.createObjectURL(file as Blob);
      img.alt = file.name;
      fileElement.appendChild(img);
    } else {
      const icon = document.createElement('div');
      icon.className = 'chat-message-file-icon';

      // Choose icon based on file type
      let svgIcon = '';

      if (file.type.startsWith('audio/')) {
        // Audio file icon
        svgIcon =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
      } else if (file.type.startsWith('video/')) {
        // Video file icon
        svgIcon =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>';
      } else if (file.type.startsWith('application/pdf')) {
        // PDF file icon
        svgIcon =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15v-4"></path><path d="M12 15v-6"></path><path d="M15 15v-2"></path></svg>';
      } else if (file.type.startsWith('text/')) {
        // Text file icon
        svgIcon =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
      } else {
        // Default file icon
        svgIcon =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
      }

      icon.innerHTML = svgIcon;
      fileElement.appendChild(icon);
    }

    const fileName = document.createElement('div');
    fileName.className = 'chat-message-file-name';
    fileName.textContent = file.name;
    fileElement.appendChild(fileName);

    // Add download button
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'chat-message-file-download';
    downloadBtn.textContent = 'Download';
    downloadBtn.addEventListener('click', () => this.downloadFile(file));
    fileElement.appendChild(downloadBtn);

    return fileElement;
  }

  private downloadFile(file: File) {
    // If we have a URL, create an anchor and trigger download
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    // Clean up the URL object after download is initiated
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  public updateParams(params: ChatWidgetOptions['params']) {
    this.params = { ...this.params, ...params };
    Storage.userId = this.params.userId;
  }

  private async loadChatHistory(sessionId: string) {
    const chats = this.storage.getChats();
    const chat = chats.find((h: HistoryChat) => h.sessionId === sessionId);
    if (chat) {
      this.historyPanel.setActiveChat(chat);
      this.hideWelcomeScreen();
      this.showMessagesContainer();
      this.messages = chat.messages as ChatMessage[];
      // Clear the messages container
      const messagesContainer = this.widgetElement?.querySelector(
        '.chat-widget-messages'
      );
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
      }
      // how to keep order of messages
      for (const message of this.messages) {
        // skip empty messages since they are meaningless
        if (message.text) {
          await this.renderMessage(message);
        }
      }

      this.params.sessionId = sessionId;
      this.params.userId = chat.userId;
    }
  }

  private toggleGeneratingState(generating: boolean): void {
    if (generating) {
      this.widgetElement?.classList.add('chat-widget-generating');
    } else {
      this.widgetElement?.classList.remove('chat-widget-generating');
    }
  }
}
