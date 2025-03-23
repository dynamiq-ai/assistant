import { ChatWidget } from '../../src/vanilla';

// Initialize the chat widget
const chatWidget = new ChatWidget('#chat-container', {
  title: 'Vanilla JS Chat Support',
  placeholder: 'Type your message...',
  position: 'bottom-right',
  theme: {
    primaryColor: '#E91E63',
    secondaryColor: '#f5f5f5',
    fontFamily: 'Arial, sans-serif'
  },
  api: {
    url: '',
    streaming: true,
  },
  allowFileUpload: false,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  acceptedFileTypes: "image/*,.pdf",
});

// You can also control the widget programmatically
window.chatWidget = chatWidget; // Expose to window for demo purposes 