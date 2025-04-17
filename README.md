# Dynamiq Assistant

**dynamiq-assistant** allows you to export and use Dynamiq interfaces as React and vanilla JavaScript components.

✨ [Dynamiq](https://www.getdynamiq.ai/) is an orchestration framework for agentic AI and LLM applications.

[Twitter](https://x.com/Dynamiq_AI) | [Documentation](https://docs.getdynamiq.ai/)

## Install

```bash
npm install @dynamiq/assistant marked@15
```

## Usage

To use `@dynamiq/assistant`, first you have to go to the Deployments, make sure you have disabled `Endpoint Authorization`. Then click on the `Endpoint` tab and copy the url from `endpoint` variable.

<img width="1496" alt="image" src="https://raw.githubusercontent.com/dynamiq-ai/assistant/refs/heads/main/assets/dynamiq-app.png">

You can copy the URL and pass it to the configuration for DynamiqAssistant:

### React

```tsx
import { DynamiqAssistant } from '@dynamiq/assistant/react';

const App = () => {
  return (
    <DynamiqAssistant
      title="Dynamiq Assistant"
      placeholder="Type your message..."
      position="bottom-right"
      api={{
        url: '<YOUR_API_URL>',
        streaming: true,
      }}
      allowFileUpload={true}
      maxFileSize={10 * 1024 * 1024} // 10MB
      acceptedFileTypes="image/*,.pdf,.doc,.docx,.txt"
      params={{
        userId: '123',
        sessionId: '234',
        userName: 'John Doe',
        language: 'en',
      }}
    />
  );
};
```

### Browser

#### ESM 

```js
import { DynamiqAssistant } from '@dynamiq/assistant/vanilla';

const assistant = new DynamiqAssistant('#dynamiq-assistant-container', {
  title: 'Dynamiq Assistant',
  placeholder: 'Type your message...',
  position: 'bottom-left',
  api: {
    url: '<YOUR_API_URL>',
    streaming: true,
  },
  allowFileUpload: false,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  acceptedFileTypes: 'image/*,.pdf',
});
```

#### Script Tag

```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@dynamiq/assistant@latest/dist/index.browser.js"></script>
<script>
  const assistant = new dynamiq.DynamiqAssistant('#dynamiq-assistant-container', {
    title: 'Dynamiq Assistant',
    placeholder: 'Type your message...',
    position: 'bottom-left',
    api: {
      url: '<YOUR_API_URL>',
      streaming: true,
    },
  });
</script>
```

You should be able to see the assistant embedded in your app

<img height="525" alt="image" src="https://raw.githubusercontent.com/dynamiq-ai/assistant/refs/heads/main/assets/widget-preview.png">

## Props

These are all the props you can pass to the `<DynamiqAssistant />` component.

| Name                | Type      | Description                                                                                      |
| ------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| `title`             | `string`  | The title of the assistant.                                                                      |
| `placeholder`       | `string`  | The placeholder text of the chat input.                                                          |
| `position`          | `string`  | The position of the assistant. Can be `bottom-right`, `bottom-left`, `top-right`, or `top-left`. |
| `api.url`           | `string`  | The URL of the assistant endpoint.                                                               |
| `api.streaming`     | `boolean` | Whether to enable response streaming.                                                            |
| `allowFileUpload`   | `boolean` | Whether to allow file uploads.                                                                   |
| `maxFileSize`       | `number`  | The maximum file size for file uploads in bytes.                                                 |
| `acceptedFileTypes` | `string`  | The accepted file types for file uploads.                                                        |
| `params`            | `object`  | The parameters to pass to the assistant input.                                                   |
| `params.userId`     | `string`  | The user ID. By default `crypto.randomUUID()`.                                                   |
| `params.sessionId`  | `string`  | The session ID. By default `crypto.randomUUID()`.                                                |
