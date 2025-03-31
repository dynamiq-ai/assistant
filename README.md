# Dynamiq Assistant

**dynamiq-assistant** allows you to export and use Dynamiq interfaces as React and vanilla JavaScript components.

✨ [Dynamiq](https://www.getdynamiq.ai/) is an orchestration framework for agentic AI and LLM applications.

[Twitter](https://x.com/Dynamiq_AI) | [Documentation](https://docs.getdynamiq.ai/)

## Install

```bash
npm install @dynamiq/assistant
```

## Usage

To use `@dynamiq/assistant`, first you have to go to the Deployments, make sure you have disabled `Endpoint Authorization`. Then click on the `Endpoint` tab and copy the url from `endpoint` variable.

<img width="1496" alt="image" src="https://github.com/user-attachments/assets/97fccbc1-772d-4d94-b364-db10ddd9ef4a">

You can copy the URL and pass it to the `<DynamiqAssistant />` component in react:

```tsx
import { DynamiqAssistant } from "@dynamiq/assistant/react";

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

You should be able to see the assistant embedded in your app

<img height="525" alt="image" src="https://github.com/user-attachments/assets/bb5ba072-2820-4e62-a4c3-3a4ddb000e1d">

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
