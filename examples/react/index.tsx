import React from 'react';
import ReactDOM from 'react-dom';
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
        allowFileUpload={true}
        maxFileSize={10 * 1024 * 1024} // 10MB
        acceptedFileTypes="image/*,.pdf,.doc,.docx,.txt"
      />
  );
};

ReactDOM.render(<App />, document.getElementById('root')); 