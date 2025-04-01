import { DynamiqAssistant } from '../../src/vanilla';

// Initialize the chat widget
const chatWidget = new DynamiqAssistant('#chat-container', {
  title: 'Dynamiq Assistant',
  placeholder: 'Type your message...',
  position: 'bottom-left',
  api: {
    url: 'https://c312dfe2-5dbf-44f3-a497-898325283434.apps.sandbox.getdynamiq.ai',
    streaming: false,
  },
  allowFileUpload: false,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  acceptedFileTypes: 'image/*,.pdf',
});

// You can also control the widget programmatically
window.chatWidget = chatWidget; // Expose to window for demo purposes
