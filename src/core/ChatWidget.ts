import {
  ChatMessage,
  ChatWidgetOptions,
  ApiConfig,
  CustomParams,
  HistoryChat,
  ContentTypes,
  ReportPerson,
} from './types';
import { createParser, type EventSourceMessage } from 'eventsource-parser';
import './styles.css';
import {
  getRelativeTimeString,
  processMessageText,
  renderImageAndLink,
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
  private progressMessageInterval: NodeJS.Timeout | null = null;
  private progressMessages: string[] = [
    'Sharpening my virtual pencil…',
    'Crunching the numbers…',
    'Exploring the knowledge galaxy…',
    'Fishing for insights…',
    'Stitching together the story…',
    'Cooking up an answer…',
    'Connecting the dots…',
    'Tracking down the last clue…',
    'Almost there…',
  ];

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
    this.historyPanel = new HistoryPanel(
      this.loadChatHistory.bind(this),
      this.handleChatDeleted.bind(this),
      () => !!this.abortController
    );

    this.setupMarkedRenderer();
    this.init();
    if (this.options.fullScreen) {
      this.toggleFullScreen();
    }
    if (this.options.open) {
      this.open();
    }
  }

  private setupMarkedRenderer(): void {
    const renderer = new Renderer();
    const originalCodeRenderer = renderer.code.bind(renderer);
    const originalCodespanRenderer = renderer.codespan.bind(renderer);
    const originalTableImpl = Renderer.prototype.table;

    renderer.link = ({ href, title, text }) => {
      return `<a href="${href}"${
        title ? ` title="${title}"` : ''
      } target="_blank">${text}</a>`;
    };

    renderer.code = ({ text: code, lang: language, escaped }) => {
      // Render organization report
      if (language === 'report') {
        try {
          const reportInfo: ReportPerson = JSON.parse(code);
          const managerName = reportInfo?.name || '';
          const managerRole = reportInfo?.role || '';
          const managerContractId = reportInfo?.contractId || '';
          const directReports: ReportPerson[] = Array.isArray(
            reportInfo?.directReports
          )
            ? (reportInfo.directReports as ReportPerson[])
            : [];
          const managerContractInfo = { contract: managerContractId };

          this.storeContractInfo(managerContractInfo);

          const managerCard = `<div class="chat-message-report-card chat-message-report-card-manager" data-contract-id="${managerContractId}">
            <div class="chat-message-report-text">
              <div class="chat-message-report-name">${managerName}</div>
              <div class="chat-message-report-role">${managerRole}</div>
            </div>
            ${renderImageAndLink(this.options, managerContractInfo)}
          </div>`;

          const reportsCards = directReports
            .map((rep: ReportPerson) => {
              const repName = rep?.name || '';
              const repRole = rep?.role || '';
              const repContractId = rep?.contractId || '';
              const repContractInfo = { contract: repContractId };

              this.storeContractInfo(repContractInfo);

              return `<div class="chat-message-report-card" data-contract-id="${repContractId}">
                <svg class="chat-message-children-report-arrow" width="27" height="104" viewBox="0 0 27 104" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M26.3536 99.6464C26.5488 99.8417 26.5488 100.158 26.3536 100.354L23.1716 103.536C22.9763 103.731 22.6597 103.731 22.4645 103.536C22.2692 103.34 22.2692 103.024 22.4645 102.828L25.2929 100L22.4645 97.1716C22.2692 96.9763 22.2692 96.6597 22.4645 96.4645C22.6597 96.2692 22.9763 96.2692 23.1716 96.4645L26.3536 99.6464ZM1 0H1.5V96H1H0.5V0H1ZM5 100V99.5H26V100V100.5H5V100ZM1 96H1.5C1.5 97.933 3.067 99.5 5 99.5V100V100.5C2.51472 100.5 0.5 98.4853 0.5 96H1Z" fill="#783F8E"/>
                </svg>
                <div class="chat-message-report-text">
                  <div class="chat-message-report-name">${repName}</div>
                  <div class="chat-message-report-role">${repRole}</div>
                </div>
                ${renderImageAndLink(this.options, repContractInfo)}
              </div>`;
            })
            .join('');

          const childrenBlock = directReports.length
            ? `<div class="chat-message-report-children">${reportsCards}</div>`
            : '';

          return `<div class="chat-message-report-container">${managerCard}${childrenBlock}</div>`;
        } catch {
          return 'Building report...';
        }
      }
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
        try {
          const imageInfo = JSON.parse(code);

          if (imageInfo?.contract === 'N/A') {
            return '';
          }

          // Store contract info for later processing
          this.storeContractInfo(imageInfo);

          return renderImageAndLink(this.options, imageInfo);
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

          if (imageInfo?.contract === 'N/A') {
            return '';
          }

          // Store contract info for later processing
          this.storeContractInfo(imageInfo);

          return renderImageAndLink(this.options, imageInfo);
        } catch {
          return 'Loading image...';
        }
      }
      if (text.startsWith('flag')) {
        try {
          const jsonData = text.slice(4).trim();
          const flagInfo = JSON.parse(jsonData);
          const { code, country } = flagInfo;

          if (flagInfo?.code === 'XX') {
            return 'N/A';
          }

          return `<div class="chat-message-flag-container">
          <img src="https://public-assets-rp.s3.eu-central-1.amazonaws.com/flags/${code.toLowerCase()}.svg" alt="${country}" />
          <span>${country}</span>
          </div>`;
        } catch {
          return '';
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

  private async processContractImages(messageId: string): Promise<void> {
    if (this.pendingContracts.size === 0 || !this.options.onImageBlock) {
      return;
    }

    // Collect all contract IDs as array
    const contractIds = Array.from(this.pendingContracts);

    try {
      // Call onImageBlock with array of contract IDs (now async)
      const result = await this.options.onImageBlock(contractIds);

      // Handle both single string and array of strings
      const imageUrls = Array.isArray(result) ? result : [result];

      // Store processed images in message data
      const lastMessage = this.messages.find((m) => m.id === messageId);
      if (lastMessage && imageUrls.length > 0) {
        if (!lastMessage.processedImages) {
          lastMessage.processedImages = {};
        }
        // Map contract IDs to image URLs
        contractIds.forEach((contractId, index) => {
          if (index < imageUrls.length && imageUrls[index]) {
            lastMessage.processedImages![contractId] = imageUrls[index];
          }
        });
      }

      // Update images in the DOM
      if (imageUrls.length > 0) {
        const allImageContainers = this.widgetElement?.querySelectorAll(
          `#chat-message-${messageId} .chat-message-image-link-container[data-contract-id]`
        );

        allImageContainers?.forEach((containerElement, index) => {
          if (index < imageUrls.length) {
            const imgElement =
              containerElement?.querySelector<HTMLImageElement>(
                '.chat-contract-image[data-loading="true"]'
              );

            if (imgElement && imageUrls[index]) {
              imgElement.src = imageUrls[index];
              imgElement.style.display = '';
              imgElement.removeAttribute('data-loading');
              imgElement.classList.add('chat-contract-image-loaded');
            }
          }
        });
      }
    } catch (error) {
      console.error('Error processing contract images:', error);
      // Optionally show error state in UI
      const allImageContainers = this.widgetElement?.querySelectorAll(
        `#chat-message-${messageId} .chat-message-image-link-container[data-contract-id]`
      );

      allImageContainers?.forEach((containerElement) => {
        const imgElement = containerElement?.querySelector<HTMLImageElement>(
          '.chat-contract-image[data-loading="true"]'
        );
        if (imgElement) {
          imgElement.style.display = 'none';
          imgElement.removeAttribute('data-loading');
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
        const feedback = target.dataset.feedback as 'positive' | 'negative';

        // Capture previous feedback state before updating
        const prevFeedbackState = assistantMessage.feedback || null;

        // Store feedback in message
        assistantMessage.feedback = feedback;

        // Update button appearance
        this.updateFeedbackButtons(target.dataset.messageId!, feedback);

        // Update storage
        const chats = this.storage.getChats();
        const chat = chats.find(
          (h: HistoryChat) => h.sessionId === this.params.sessionId
        );
        if (chat) {
          const messageIndex = chat.messages.findIndex(
            (m) => m.id === assistantMessage.id
          );
          if (messageIndex !== -1) {
            chat.messages[messageIndex] = assistantMessage;
            this.storage.updateChat(chat);
          }
        }

        this.options.onFeedback?.(
          e,
          feedback,
          [userMessage, assistantMessage],
          this.params,
          prevFeedbackState
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
        this.stopProgressMessageRotation();
        const lastMessage = this.messages.at(-1);
        if (lastMessage?.text !== '') {
          this.finalizeLastMessage().catch(console.error);
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

    // Prevent sending messages while streaming is active
    if (this.abortController) {
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
    this.historyPanel.updateDisabledState();

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
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        const reader = (response.body as ReadableStream)
          .pipeThrough(new TextDecoderStream())
          .getReader();

        let step = '';
        let message = '';
        const updateMessage = this.addBotMessage(message, true);
        this.hideLoadingSpinner();

        // Create SSE parser with event handlers
        const parser = createParser({
          onEvent: (event: EventSourceMessage) => {
            if (event.data) {
              try {
                if (typeof event.data !== 'string') {
                  console.warn('Invalid event data type:', typeof event.data);
                  return;
                }

                const parsed = JSON.parse(event.data);

                // Validate the structure before accessing nested properties
                if (!parsed || typeof parsed !== 'object') {
                  console.warn('Invalid parsed data structure');
                  return;
                }

                // Check for content
                const content = parsed?.data?.choices?.[0]?.delta?.content;
                const newStep = parsed?.data?.choices?.[0]?.delta?.step;

                if (content) {
                  if (typeof content === 'object') {
                    this.handleIntermediateStreaming(content);
                  } else if (typeof content === 'string') {
                    message =
                      message +
                      (newStep ? (newStep !== step ? '\n\n' : '') : '') +
                      content;
                    if (updateMessage) {
                      updateMessage(message);
                    }
                    step = newStep;
                  }
                }
              } catch (error) {
                console.error(
                  'Failed to parse SSE event JSON:',
                  error,
                  'Raw data:',
                  event.data
                );
              }
            }
            if (event.event === 'streaming' && !message) {
              if (updateMessage) {
                updateMessage(
                  'Sorry, there was an error processing your message. Please try again later.'
                );
              }
            }
          },
          onError: (error) => {
            console.error('SSE parsing error:', error);
          },
        });

        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            // Reset controller once streaming is done
            this.abortController = null;
            this.historyPanel.updateDisabledState();
            break;
          }

          // Feed the chunk to the SSE parser
          parser.feed(value);
        }

        // finalize the message
        await this.finalizeLastMessage();
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
        this.historyPanel.updateDisabledState();
      }
    } catch (error) {
      console.error('Error sending message to API:', error);
      if (this.abortController?.signal.aborted) {
        this.abortController = null;
        this.historyPanel.updateDisabledState();
      } else {
        this.abortController = null;
        this.historyPanel.updateDisabledState();
        // Add an error message to the chat
        this.addBotMessage(
          'Sorry, there was an error processing your message. Please try again later.'
        );
      }
    }
  }

  private async finalizeLastMessage() {
    const lastMessage = this.messages.at(-1);

    if (!lastMessage) {
      return;
    }

    // Process pending contracts and update images (now async)
    await this.processContractImages(lastMessage.id);

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
            processedImages: lastMessage.processedImages,
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

        // Initialize intermediateSteps as an array of IntermediateStep objects
        if (!lastMessage.intermediateSteps) {
          lastMessage.intermediateSteps = [];
        }

        // Find the last step with the same loop_num or create a new one
        const currentLoopNum = content.loop_num ?? 0;
        const lastStepIndex = lastMessage.intermediateSteps.length - 1;
        const lastStep =
          lastStepIndex >= 0
            ? lastMessage.intermediateSteps[lastStepIndex]
            : null;

        if (lastStep && lastStep.loop_num === currentLoopNum) {
          // Append to existing step
          lastStep.thought += content.thought;

          // Update the existing DOM element
          if (intermediateStepsContainer) {
            const stepElements = intermediateStepsContainer.querySelectorAll(
              '.chat-message-intermediate-step'
            );
            const lastStepElement = stepElements[
              stepElements.length - 1
            ] as HTMLDivElement;
            if (lastStepElement) {
              lastStepElement.textContent = lastStep.thought;
            }
          }
        } else {
          // Create new step
          const newStep = {
            thought: content.thought,
            loop_num: currentLoopNum,
          };
          lastMessage.intermediateSteps.push(newStep);

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
              .querySelector('.chat-message-content-main')
              ?.prepend(intermediateStepsContainer);
            intermediateStepsContainer.open = true;
          }
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
      // Stop progress message rotation when content arrives
      if (textElement.classList.contains('chat-message-loading')) {
        this.stopProgressMessageRotation();
        textElement.classList.remove('chat-message-loading');
      }

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
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.3751 11.875C19.3751 12.0408 19.3093 12.1997 19.192 12.3169C19.0748 12.4342 18.9159 12.5 18.7501 12.5H17.5001V13.75C17.5001 13.9158 17.4343 14.0747 17.317 14.1919C17.1998 14.3092 17.0409 14.375 16.8751 14.375C16.7093 14.375 16.5504 14.3092 16.4332 14.1919C16.316 14.0747 16.2501 13.9158 16.2501 13.75V12.5H15.0001C14.8343 12.5 14.6754 12.4342 14.5582 12.3169C14.441 12.1997 14.3751 12.0408 14.3751 11.875C14.3751 11.7092 14.441 11.5503 14.5582 11.4331C14.6754 11.3158 14.8343 11.25 15.0001 11.25H16.2501V10C16.2501 9.83424 16.316 9.67527 16.4332 9.55806C16.5504 9.44085 16.7093 9.375 16.8751 9.375C17.0409 9.375 17.1998 9.44085 17.317 9.55806C17.4343 9.67527 17.5001 9.83424 17.5001 10V11.25H18.7501C18.9159 11.25 19.0748 11.3158 19.192 11.4331C19.3093 11.5503 19.3751 11.7092 19.3751 11.875ZM4.3751 5.625H5.6251V6.875C5.6251 7.04076 5.69095 7.19973 5.80816 7.31694C5.92537 7.43415 6.08434 7.5 6.2501 7.5C6.41586 7.5 6.57484 7.43415 6.69205 7.31694C6.80926 7.19973 6.8751 7.04076 6.8751 6.875V5.625H8.1251C8.29086 5.625 8.44984 5.55915 8.56705 5.44194C8.68426 5.32473 8.7501 5.16576 8.7501 5C8.7501 4.83424 8.68426 4.67527 8.56705 4.55806C8.44984 4.44085 8.29086 4.375 8.1251 4.375H6.8751V3.125C6.8751 2.95924 6.80926 2.80027 6.69205 2.68306C6.57484 2.56585 6.41586 2.5 6.2501 2.5C6.08434 2.5 5.92537 2.56585 5.80816 2.68306C5.69095 2.80027 5.6251 2.95924 5.6251 3.125V4.375H4.3751C4.20934 4.375 4.05037 4.44085 3.93316 4.55806C3.81595 4.67527 3.7501 4.83424 3.7501 5C3.7501 5.16576 3.81595 5.32473 3.93316 5.44194C4.05037 5.55915 4.20934 5.625 4.3751 5.625ZM14.3751 15H13.7501V14.375C13.7501 14.2092 13.6843 14.0503 13.567 13.9331C13.4498 13.8158 13.2909 13.75 13.1251 13.75C12.9593 13.75 12.8004 13.8158 12.6832 13.9331C12.566 14.0503 12.5001 14.2092 12.5001 14.375V15H11.8751C11.7093 15 11.5504 15.0658 11.4332 15.1831C11.316 15.3003 11.2501 15.4592 11.2501 15.625C11.2501 15.7908 11.316 15.9497 11.4332 16.0669C11.5504 16.1842 11.7093 16.25 11.8751 16.25H12.5001V16.875C12.5001 17.0408 12.566 17.1997 12.6832 17.3169C12.8004 17.4342 12.9593 17.5 13.1251 17.5C13.2909 17.5 13.4498 17.4342 13.567 17.3169C13.6843 17.1997 13.7501 17.0408 13.7501 16.875V16.25H14.3751C14.5409 16.25 14.6998 16.1842 14.817 16.0669C14.9343 15.9497 15.0001 15.7908 15.0001 15.625C15.0001 15.4592 14.9343 15.3003 14.817 15.1831C14.6998 15.0658 14.5409 15 14.3751 15ZM17.1337 6.25L6.2501 17.1336C6.01571 17.3678 5.69789 17.4994 5.36651 17.4994C5.03513 17.4994 4.71731 17.3678 4.48292 17.1336L2.86573 15.518C2.74963 15.4019 2.65753 15.2641 2.59469 15.1124C2.53185 14.9607 2.49951 14.7982 2.49951 14.634C2.49951 14.4698 2.53185 14.3072 2.59469 14.1556C2.65753 14.0039 2.74963 13.8661 2.86573 13.75L13.7501 2.86641C13.8662 2.7503 14.004 2.6582 14.1557 2.59537C14.3073 2.53253 14.4699 2.50019 14.6341 2.50019C14.7983 2.50019 14.9608 2.53253 15.1125 2.59537C15.2642 2.6582 15.402 2.7503 15.5181 2.86641L17.1337 4.48203C17.2498 4.59811 17.3419 4.73592 17.4047 4.8876C17.4676 5.03927 17.4999 5.20184 17.4999 5.36602C17.4999 5.53019 17.4676 5.69276 17.4047 5.84444C17.3419 5.99611 17.2498 6.13392 17.1337 6.25ZM16.2501 5.36641L14.6337 3.75L12.1337 6.25L13.7501 7.86641L16.2501 5.36641Z" fill="#783F8E"/></svg>';
    }

    // Create message content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'chat-message-content';

    const mainMessageContentWrapper = document.createElement('div');
    mainMessageContentWrapper.className = 'chat-message-content-wrapper-main';
    const mainMessageContent = document.createElement('div');
    mainMessageContent.className = 'chat-message-content-main';

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

      // Add progress message
      const progressMessage = document.createElement('div');
      progressMessage.className = 'chat-message-progress';
      progressMessage.textContent = this.progressMessages[0];

      dotsContainer.appendChild(progressMessage);

      textElement.appendChild(dotsContainer);

      // Start progress message rotation
      this.startProgressMessageRotation(message.id);
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
      mainMessageContent.appendChild(intermediateStepsContainer);
    }
    mainMessageContent.appendChild(textElement);
    mainMessageContentWrapper.appendChild(mainMessageContent);
    contentContainer.appendChild(mainMessageContentWrapper);
    contentContainer.appendChild(timestamp);

    // Add feedback buttons for bot messages
    if (
      typeof this.options.onFeedback === 'function' &&
      message.sender === 'bot'
    ) {
      const feedbackContainer = UIComponents.createFeedbackButtons(
        message.id,
        message.feedback
      );
      contentContainer.appendChild(feedbackContainer);
    }

    if (message.sender === 'user') {
      messageElement.appendChild(contentContainer);
    } else {
      mainMessageContentWrapper.prepend(avatar);
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

    // Apply stored processed images if available
    this.applyStoredImages(message);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  private applyStoredImages(message: ChatMessage): void {
    if (
      !message.processedImages ||
      Object.keys(message.processedImages).length === 0
    ) {
      return;
    }

    // Find all image containers in this message
    const imageContainers = this.widgetElement?.querySelectorAll(
      `#chat-message-${message.id} .chat-message-image-link-container[data-contract]`
    );

    imageContainers?.forEach((containerElement) => {
      const contractId = containerElement.getAttribute('data-contract');
      if (contractId && message.processedImages![contractId]) {
        const imgElement = containerElement.querySelector<HTMLImageElement>(
          '.chat-contract-image'
        );
        if (imgElement) {
          imgElement.src = message.processedImages![contractId];
          imgElement.style.display = '';
          imgElement.removeAttribute('data-loading');
          imgElement.classList.add('chat-contract-image-loaded');
        }
      }
    });
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

  private startProgressMessageRotation(messageId: string): void {
    let currentIndex = 0;

    this.progressMessageInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % this.progressMessages.length;

      const messageElement = this.widgetElement?.querySelector(
        `#chat-message-${messageId} .chat-message-progress`
      );

      if (messageElement) {
        messageElement.textContent = this.progressMessages[currentIndex];
      }
    }, 10000); // Change message every 10 seconds
  }

  private stopProgressMessageRotation(): void {
    if (this.progressMessageInterval) {
      clearInterval(this.progressMessageInterval);
      this.progressMessageInterval = null;
    }
  }

  public destroy(): void {
    if (this.widgetElement && this.container.contains(this.widgetElement)) {
      this.container.removeChild(this.widgetElement);
    }
    if (this.relativeTimeInterval) {
      clearInterval(this.relativeTimeInterval);
    }
    this.stopProgressMessageRotation();
  }

  public startNewChat(): void {
    this.params.sessionId = crypto.randomUUID();

    // Clear all messages
    this.messages.length = 0;

    // Clear pending contracts
    this.pendingContracts.clear();

    // Stop any ongoing progress message rotation
    this.stopProgressMessageRotation();

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

  private handleChatDeleted(deletedSessionId: string) {
    // If the currently loaded chat was deleted, reset the main panel
    if (this.params.sessionId === deletedSessionId) {
      this.startNewChat();
    }
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

  private updateFeedbackButtons(
    messageId: string,
    feedback: 'positive' | 'negative'
  ): void {
    if (!this.widgetElement) return;

    // Find all feedback buttons for this message
    const feedbackButtons = this.widgetElement.querySelectorAll(
      `[data-message-id="${messageId}"].chat-message-feedback-button`
    );

    feedbackButtons.forEach((button) => {
      const btn = button as HTMLElement;
      // Remove any existing selected state
      btn.classList.remove('feedback-selected');

      // Add selected state to the clicked button and hide the other one
      if (btn.dataset.feedback === feedback) {
        btn.classList.add('feedback-selected');
      } else {
        // Hide the other feedback button
        btn.style.display = 'none';
      }
    });
  }
}
