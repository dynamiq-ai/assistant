import {
  ChatMessage,
  ChatWidgetOptions,
  ApiConfig,
  CustomParams,
} from './types';
import './styles.css';
import { getRelativeTimeString } from './utils';
import { marked } from 'marked';

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

export class ChatWidgetCore {
  private readonly container: HTMLElement;
  private readonly messages: ChatMessage[] = [];
  private readonly options: ChatWidgetOptions;
  private isOpen: boolean = false;
  private widgetElement: HTMLElement | null = null;
  private readonly apiConfig: ApiConfig | undefined;
  private selectedFiles: File[] = [];
  private isLoading: boolean = false;
  private relativeTimeInterval: NodeJS.Timeout | null = null;
  private params: CustomParams;

  constructor(container: HTMLElement, options: ChatWidgetOptions = {}) {
    this.container = container;
    this.options = {
      title: 'Dynamiq Assistant',
      placeholder: 'Type a message...',
      position: 'bottom-right',
      theme: {
        primaryColor: '#6c5ce7',
        secondaryColor: '#f5f5f5',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      },
      allowFileUpload: false,
      maxFileSize: 5 * 1024 * 1024, // 5MB default
      acceptedFileTypes: '*', // All file types by default
      ...options,
    };

    this.params = {
      userId: crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      ...options.params,
    };
    this.apiConfig = this.options.api;
    this.selectedFiles = [];

    this.init();
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
    const widget = document.createElement('div');
    widget.className = `chat-widget chat-widget-${this.options.position}`;

    // Set custom CSS variables for theming
    if (this.options.theme) {
      widget.style.setProperty(
        '--primary-color',
        this.options.theme.primaryColor || '#6c5ce7'
      );
      widget.style.setProperty(
        '--secondary-color',
        this.options.theme.secondaryColor || '#f5f5f5'
      );
      widget.style.setProperty(
        '--font-family',
        this.options.theme.fontFamily || 'Inter, sans-serif'
      );
    }

    // Create the toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'chat-widget-toggle';
    toggleButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

    // Create the chat container
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-widget-container';
    chatContainer.style.display = 'none';

    // Create the chat header
    const header = document.createElement('div');
    header.className = 'chat-widget-header';

    const title = document.createElement('h3');
    title.textContent = this.options.title || 'Chat Assistant';

    const headerActions = document.createElement('div');
    headerActions.className = 'chat-widget-header-actions';

    // Add the New Chat button
    const newChatButton = document.createElement('button');
    newChatButton.className = 'chat-widget-new-chat';
    newChatButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> New Chat';

    const closeButton = document.createElement('button');
    closeButton.className = 'chat-widget-close';
    closeButton.innerHTML = '&times;';

    headerActions.appendChild(newChatButton);
    headerActions.appendChild(closeButton);

    header.appendChild(title);
    header.appendChild(headerActions);

    // Create the messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'chat-widget-messages';

    // Create the input area
    const inputContainer = document.createElement('div');
    inputContainer.className = 'chat-widget-input';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = this.options.placeholder || 'Type your message...';

    const sendButton = document.createElement('button');
    sendButton.className = 'chat-widget-send';
    sendButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';

    // Add file upload button if enabled
    if (this.options.allowFileUpload) {
      const fileInputContainer = document.createElement('div');
      fileInputContainer.className = 'chat-widget-file-input-container';

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'chat-widget-file-input';
      fileInput.className = 'chat-widget-file-input';
      fileInput.multiple = true;
      fileInput.accept = this.options.acceptedFileTypes || '*';

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
    // Create the human support link
    const humanSupportContainer = document.createElement('div');
    humanSupportContainer.className = 'chat-widget-human-support';

    const humanSupportLink = document.createElement('a');
    humanSupportLink.href = 'mailto:hello@getdynamiq.ai';
    humanSupportLink.className = 'chat-widget-human-link';
    humanSupportLink.innerHTML =
      'Talk to a human instead <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';

    humanSupportContainer.appendChild(humanSupportLink);

    // Create footer
    const footer = document.createElement('div');
    footer.className = 'chat-widget-footer';
    footer.innerHTML =
      'Powered by <a href="https://getdynamiq.ai" target="_blank">Dynamiq</a>';

    // Assemble the chat container
    chatContainer.appendChild(header);
    chatContainer.appendChild(messagesContainer);
    chatContainer.appendChild(inputContainer);
    chatContainer.appendChild(humanSupportContainer);
    chatContainer.appendChild(footer);

    // Assemble the widget
    if (!this.options.toggleButton) {
      widget.appendChild(toggleButton);
    }
    widget.appendChild(chatContainer);

    // Add to the container
    this.container.appendChild(widget);

    // Store references
    this.widgetElement = widget;

    // Add initial bot message
    this.addBotMessage('Hi! How can I help you today?');
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

    // Send button click
    const sendButton = this.widgetElement.querySelector('.chat-widget-send');
    if (sendButton) {
      sendButton.addEventListener('click', () => {
        const input = this.widgetElement?.querySelector<HTMLInputElement>(
          '.chat-widget-input input[type="text"]'
        );
        if (input && input.value.trim()) {
          this.sendMessage(input.value);
        }
      });
    }

    // Input keypress (Enter)
    const input = this.widgetElement.querySelector<HTMLInputElement>(
      '.chat-widget-input input[type="text"]'
    );
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          this.sendMessage(input.value);
        }
      });
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
    if (!this.isOpen) return;

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
    if (!text.trim() && this.selectedFiles.length === 0) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
      files: [...this.selectedFiles], // Include any selected files
    };

    this.addMessage(message);

    const input = this.widgetElement?.querySelector<HTMLInputElement>(
      '.chat-widget-input input[type="text"]'
    );
    if (input) {
      input.value = '';
    }

    // Clear selected files and file preview
    this.clearFileSelection();

    // If API is configured, send the message to the API
    if (this.apiConfig) {
      this.showLoadingSpinner();
      this.handleApiCommunication(message).finally(() => {
        this.hideLoadingSpinner();
      });
    }
  }

  private showLoadingSpinner(): void {
    if (this.isLoading) return;

    this.isLoading = true;

    const messagesContainer = this.widgetElement?.querySelector(
      '.chat-widget-messages'
    );
    if (!messagesContainer) return;

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

    try {
      // Create FormData for the request
      const formData = new FormData();

      let history: { role: string; content: string }[] = [];

      if (this.messages.length) {
        // remove auto-generated message
        history = this.messages.slice(1).map((m) => ({
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
            break;
          }

          // Each chunk might contain multiple `data:` events, so split by empty line
          const events = value.trim().split('\n\r');

          events.forEach((eventLine) => {
            const [eventTypeLine, dataLine] = eventLine.trim().split('\n');
            const eventType = eventTypeLine.trim().split(': ')[1];

            if (eventType === 'data') {
              const jsonData = dataLine.slice(5).trim(); // Remove 'data:' prefix

              try {
                const parsed = JSON.parse(jsonData);

                // Check for content in the right location
                const content = parsed?.data?.choices?.[0]?.delta?.content;
                const newStep = parsed?.data?.choices?.[0]?.delta?.step;
                if (content) {
                  message =
                    message +
                    (newStep ? (newStep !== step ? '\n\n' : '') : '') +
                    content;
                  if (updateMessage) {
                    updateMessage(message);
                  }
                  step = newStep;
                }
              } catch (error) {
                console.error('Failed to parse JSON:', error);
              }
            }
          });
        }
        // finalize the message
        const lastMessage = this.messages.at(-1);
        if (lastMessage) {
          lastMessage.text = message;
        }
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
      }
    } catch (error) {
      console.error('Error sending message to API:', error);
      // Add an error message to the chat
      this.addBotMessage(
        'Sorry, there was an error processing your message. Please try again later.'
      );
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
      timestamp: new Date(),
    };

    this.addMessage(botMessage);
    if (streaming) {
      return (message: string) => {
        this.updateMessage(messageId, message);
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
        textElement.innerHTML = await marked(text);
        textElement.className = 'chat-message-text chat-message-markdown';
      } else {
        textElement.textContent = text;
      }
    }
  }

  public addMessage(message: ChatMessage): void {
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
    } else {
      avatar.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
    }

    // Create message content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'chat-message-content';

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
        textElement.innerHTML = await marked(message.text);
        textElement.className += ' chat-message-markdown';
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
    contentContainer.appendChild(textElement);
    contentContainer.appendChild(timestamp);

    if (message.sender === 'user') {
      messageElement.appendChild(contentContainer);
      messageElement.appendChild(avatar);
    } else {
      messageElement.appendChild(avatar);
      messageElement.appendChild(contentContainer);
    }

    messagesContainer.appendChild(messageElement);

    // Replace the existing file rendering code with our new method
    if (message.files && message.files.length > 0) {
      const filesContainer = document.createElement('div');
      filesContainer.className = 'chat-message-files';

      message.files.forEach((file) => {
        filesContainer.appendChild(this.renderFileAttachment(file));
      });

      contentContainer.appendChild(filesContainer);
    }

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

    // Clear the messages container
    const messagesContainer = this.widgetElement?.querySelector(
      '.chat-widget-messages'
    );
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }

    // Add the initial bot message
    this.addBotMessage('Hi! How can I help you today?');

    // Clear any file selections
    this.clearFileSelection();

    // Clear the input field
    const input = this.widgetElement?.querySelector<HTMLInputElement>(
      ".chat-widget-input input[type='text']"
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
  }
}
