import React from 'react';
import ReactDOM from 'react-dom/client';
import { DynamiqAssistant } from '../../src/react';

const App = () => {
  return (
    <DynamiqAssistant
      title={
        <span>
          Assistant{' '}
          <span
            style={{
              fontSize: '12px',
              padding: '4px 6px',
              color: '#783F8E',
              borderRadius: '4px',
              backgroundColor: '#f2eaf6',
            }}
          >
            Beta
          </span>
        </span>
      }
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
      prompts={[
        { icon: '💬', text: 'What documents are needed for the loan?' },
        { icon: '🤔', text: 'What is the interest rate for the loan?' },
      ]}
      theme={{
        primaryColor: '#783F8E',
        secondaryColor: '#cccccc',
        fontFamily: 'Arial',
      }}
      allowFullScreen={true}
      humanSupport={`<a href="mailto:hello@getdynamiq.ai">Talk to a human instead <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></a>`}
      footerText={
        'AI Assistant is beta stage and answer might not be accurate.<br> <a href="https://getdynamiq.ai" target="_blank">Terms & Conditions</a>'
      }
      poweredBy={
        'Powered by <a href="https://getdynamiq.ai" target="_blank">Dynamiq</a>'
      }
    />
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
