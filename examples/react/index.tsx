import React from 'react';
import ReactDOM from 'react-dom/client';
import { DynamiqAssistant } from '../../src/react';

const App = () => {
  return (
    <DynamiqAssistant
      title="Dynamiq Assistant"
      placeholder="Type your message..."
      position="bottom-right"
      api={{
        url: '',
        streaming: true,
      }}
      params={{
        userId: '123',
        sessionId: '234',
        userName: 'John Doe',
        language: 'en',
      }}
      allowFileUpload={true}
      maxFileSize={10 * 1024 * 1024} // 10MB
      acceptedFileTypes="image/*,.pdf,.doc,.docx,.txt"
    />
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
