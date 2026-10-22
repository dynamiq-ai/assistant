export const CHART_ADDITIONAL_DATA = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  width: 'container',
  height: 'container',
  mark: {
    cornerRadiusTopLeft: 5,
    cornerRadiusTopRight: 5,
    tooltip: true,
  },
  params: [
    {
      name: 'hover',
      select: { type: 'point', on: 'pointerover', clear: 'pointerout' },
    },
  ],
};

export const INPUT_V_PADDING = 36;
export const MAX_INPUT_HEIGHT = 80;

export const ARIA_LABELS = {
  openChat: 'Open chat',
  closeChat: 'Close chat',
  newChat: 'New chat',
  fullScreen: 'Toggle full screen',
  close: 'Close',
  send: 'Send message',
  stop: 'Stop generating',
  attachFiles: 'Attach files',
  removeFile: 'Remove file',
  deleteChat: 'Delete chat',
};
