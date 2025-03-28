# Dynamiq Assistant

A customizable chat widget for React and vanilla JavaScript applications.

## Installation

```bash
npm install @dynamiq-ai/assistant
```

## Usage

### React

```tsx
import { DynamiqAssistant } from "@dynamiq-ai/assistant/react";

const App = () => {
  return (
    <DynamiqAssistant
      title="Dynamiq Assistant"
      placeholder="Type your message..."
      position="bottom-right"
      api={{
        url: "<YOUR_API_URL>",
        streaming: true,
      }}
      allowFileUpload={true}
      maxFileSize={10 * 1024 * 1024} // 10MB
      acceptedFileTypes="image/*,.pdf,.doc,.docx,.txt"
    />
  );
};
```

### Vanilla

TBD
