export const CHART_ADDITIONAL_DATA = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  width: 'container',
  height: 'container',
  mark: {
    cornerRadius: 5,
    tooltip: true,
  },
  params: [
    {
      name: 'hover',
      select: { type: 'point', on: 'pointerover', clear: 'pointerout' },
    },
  ],
};

export const INPUT_V_PADDING = 24;
export const MAX_INPUT_HEIGHT = 80;
