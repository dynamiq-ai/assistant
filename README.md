<div align="center">
  <img src="https://raw.githubusercontent.com/dynamiq-ai/assistant/main/assets/github-chat-widget-header.png" alt="Dynamiq Assistant" width="600" />
  
  <h1>Dynamiq Assistant</h1>
  
  <p>
    <strong>A powerful chat widget library for AI agents - Built for React and vanilla JavaScript</strong>
  </p>
  
  <p>
    <a href="https://www.npmjs.com/package/@dynamiq/assistant"><img src="https://img.shields.io/npm/v/@dynamiq/assistant?style=flat-square&logo=npm" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/@dynamiq/assistant"><img src="https://img.shields.io/npm/dm/@dynamiq/assistant?style=flat-square&logo=npm" alt="npm downloads" /></a>
    <a href="https://github.com/dynamiq-ai/assistant/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square" alt="License" /></a>
  </p>
  
  <p>
    <a href="https://docs.getdynamiq.ai/">Documentation</a> •
    <a href="#features">Features</a> •
    <a href="#installation">Installation</a> •
    <a href="#usage">Usage</a> •
    <a href="#contributing">Contributing</a>
  </p>

  <p>
    <a href="https://getdynamiq.ai"><img src="https://img.shields.io/badge/🌐_Website-getdynamiq.ai-0066cc?style=for-the-badge" alt="Website" /></a>
    <a href="https://www.linkedin.com/company/dynamiq-ai"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" /></a>
    <a href="https://x.com/Dynamiq_AI"><img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter" /></a>
  </p>
</div>

---

## ✨ About

**dynamiq-assistant** allows you to seamlessly integrate AI agents into your applications through customizable chat widgets. Built specifically for agentic AI experiences, it provides React and vanilla JavaScript components that connect directly to your Dynamiq-powered AI agents.

[Dynamiq](https://www.getdynamiq.ai/) is an orchestration framework for agentic AI and LLM applications, enabling businesses to build, deploy, and manage intelligent AI agents at scale.

## 🚀 Features

- 🤖 **AI Agent Integration** - Purpose-built for connecting to Dynamiq AI agents
- 📱 **Cross-Platform Support** - Works with React and vanilla JavaScript
- 🎨 **Customizable UI** - Fully customizable appearance with theme support
- 📡 **Streaming Support** - Real-time streaming responses from AI agents
- 📁 **File Upload** - Enable AI agents to process images, PDFs, and documents
- 🎯 **Flexible Positioning** - Position the agent widget anywhere on your page
- 🔧 **Event Handlers** - Handle agent feedback, actions, and responses
- 📊 **Vega Chart Support** - AI agents can render data visualizations seamlessly

## 📦 Installation

```bash
npm install @dynamiq/assistant marked@15 vega@5.33.0 vega-lite@5.23.0 vega-embed@6.29.0
```

Or using yarn:

```bash
yarn add @dynamiq/assistant marked@15 vega@5.33.0 vega-lite@5.23.0 vega-embed@6.29.0
```

## 🔧 Setup

To use `@dynamiq/assistant`, first navigate to your Dynamiq deployment:

1. Go to **Deployments** and ensure **Endpoint Authorization** is disabled
2. Click on the **Integration** tab
3. Switch to the **Chat Widget** menu item
4. Copy your unique API URL

<div align="center">
  <img src="https://raw.githubusercontent.com/dynamiq-ai/assistant/main/assets/chat-integration.png" alt="Dynamiq App Integration" width="800" />
</div>

## 💻 Usage

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
      prompts={[
        { icon: '💬', text: 'What documents are needed for the loan?' },
        {
          icon: <FontAwesomeIcon icon={faUser} />,
          text: 'What is the maximum loan amount?',
        },
      ]}
      footerText={
        'Powered by <a href="https://getdynamiq.ai" target="_blank">Dynamiq</a>'
      }
    />
  );
};
```

### Vanilla JavaScript

#### ESM Module

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
<script src="https://cdn.jsdelivr.net/npm/vega@5.33.0"></script>
<script src="https://cdn.jsdelivr.net/npm/vega-lite@5.23.0"></script>
<script src="https://cdn.jsdelivr.net/npm/vega-embed@6.29.0"></script>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@dynamiq/assistant@latest/dist/index.browser.js"></script>
<script>
  const assistant = new dynamiq.DynamiqAssistant(
    '#dynamiq-assistant-container',
    {
      title: 'Dynamiq Assistant',
      placeholder: 'Type your message...',
      position: 'bottom-left',
      api: {
        url: '<YOUR_API_URL>',
        streaming: true,
      },
    }
  );
</script>
```

## 🎨 Widget Preview

Your assistant will appear as an elegant chat widget on your page:

<div align="center">
  <img src="https://raw.githubusercontent.com/dynamiq-ai/assistant/main/assets/chat-visual.png" alt="Widget Preview" height="525" />
</div>

## 📚 API Reference

### Props

| Name                    | Type                  | Description                                                                                      |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `title`                 | `string \| ReactNode` | The title of the assistant. Can be string or ReactNode.                                          |
| `placeholder`           | `string`              | The placeholder text of the chat input.                                                          |
| `welcomeTitle`          | `string`              | The title of the welcome screen.                                                                 |
| `welcomeSubtitle`       | `string`              | The subtitle of the welcome screen.                                                              |
| `position`              | `string`              | The position of the assistant. Can be `bottom-right`, `bottom-left`, `top-right`, or `top-left`. |
| `api.url`               | `string`              | The URL of the assistant endpoint.                                                               |
| `api.streaming`         | `boolean`             | Whether to enable response streaming.                                                            |
| `allowFileUpload`       | `boolean`             | Whether to allow file uploads.                                                                   |
| `maxFileSize`           | `number`              | The maximum file size for file uploads in bytes.                                                 |
| `acceptedFileTypes`     | `string`              | The accepted file types for file uploads.                                                        |
| `params`                | `object`              | The parameters to pass to the assistant input.                                                   |
| `params.userId`         | `string`              | The user ID. By default `crypto.randomUUID()`.                                                   |
| `params.sessionId`      | `string`              | The session ID. By default `crypto.randomUUID()`.                                                |
| `toggleButton`          | `string`              | The ID of the button to toggle the assistant.                                                    |
| `prompts`               | `array`               | The prompts to show in the assistant.                                                            |
| `prompts.icon`          | `string \| ReactNode` | The icon to show in the prompt.                                                                  |
| `prompts.text`          | `string`              | The text to show in the prompt.                                                                  |
| `theme.primaryColor`    | `string`              | The primary color of the assistant.                                                              |
| `theme.secondaryColor`  | `string`              | The secondary color of the assistant.                                                            |
| `theme.fontFamily`      | `string`              | The font family of the assistant.                                                                |
| `allowFullScreen`       | `boolean`             | Whether to show the full screen button.                                                          |
| `footerText`            | `string`              | The text to show in the footer.                                                                  |
| `poweredBy`             | `string`              | The text to show in the powered by section.                                                      |
| `humanSupport`          | `string`              | The text to show in the human support section.                                                   |
| `intermediateStreaming` | `boolean`             | Whether to show the intermediate steps if they are available. By default `true`.                 |
| `hideCloseButton`       | `boolean`             | Whether to hide close button. By default `false`.                                                |
| `fullScreen`            | `boolean`             | Whether to open chat in full screen. By default `false`.                                         |
| `open`                  | `boolean`             | Whether to open chat on page load. By default `false`.                                           |

### Events

| Name           | Description                                     |
| -------------- | ----------------------------------------------- |
| `onFeedback`   | The callback function to handle the feedback.   |
| `onImageBlock` | The callback function to handle image blocks.   |
| `onLink`       | The callback function to handle links.          |
| `onNewChat`    | The callback function to handle new chat.       |
| `onPromptSend` | The callback function to handle prompt sending. |
| `onChatDelete` | The callback function to handle chat deletion.  |
| `onChatOpen`   | The callback function to handle open chat       |
| `onChatClose`  | The callback function to handle close chat      |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build the library
npm run build

# Run tests
npm run test

# Lint code
npm run lint
```

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/dynamiq-ai/assistant)
- [NPM Package](https://www.npmjs.com/package/@dynamiq/assistant)
- [Documentation](https://docs.getdynamiq.ai/)
- [Dynamiq Platform](https://www.getdynamiq.ai/)
- [Report Issues](https://github.com/dynamiq-ai/assistant/issues)

## 🌐 Connect with Us

<div align="center">
  <p>
    <strong>Dynamiq</strong> is the operating platform for agentic AI applications. We're building the future of AI orchestration.
  </p>
  
  <p>
    <a href="https://getdynamiq.ai"><img src="https://img.shields.io/badge/🌐_Website-getdynamiq.ai-0066cc?style=for-the-badge" alt="Website" /></a>
    <a href="https://www.linkedin.com/company/dynamiq-ai"><img src="https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" /></a>
    <a href="https://x.com/Dynamiq_AI"><img src="https://img.shields.io/badge/Twitter-Follow-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter" /></a>
  </p>
  
  <p>
    <a href="https://github.com/dynamiq-ai"><img src="https://img.shields.io/badge/GitHub-dynamiq--ai-181717?style=flat-square&logo=github" alt="GitHub Organization" /></a>
  </p>
</div>
