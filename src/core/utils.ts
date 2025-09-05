import { UIComponents } from './components/UIComponents';
import { CHART_ADDITIONAL_DATA } from './constants';
import { ChatWidgetOptions } from './types';

/**
 * Convert a date to a relative time string, such as
 * "a minute ago", "in 2 hours", "yesterday", "3 months ago", etc.
 * using Intl.RelativeTimeFormat
 */
export function getRelativeTimeString(
  date: Date | number,
  lang = navigator.language
): string {
  // Allow dates or times to be passed
  const timeMs = typeof date === 'number' ? date : date.getTime();

  // Get the amount of seconds between the given date and now
  const deltaSeconds = Math.round((timeMs - Date.now()) / 1000);

  // Array representing one minute, hour, day, week, month, etc in seconds
  const cutoffs = [
    60,
    3600,
    86400,
    86400 * 7,
    86400 * 30,
    86400 * 365,
    Infinity,
  ];

  // Array equivalent to the above but in the string representation of the units
  const units: Intl.RelativeTimeFormatUnit[] = [
    'second',
    'minute',
    'hour',
    'day',
    'week',
    'month',
    'year',
  ];

  // Grab the ideal cutoff unit
  const unitIndex = cutoffs.findIndex(
    (cutoff) => cutoff > Math.abs(deltaSeconds)
  );

  // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
  // is one day in seconds, so we can divide our seconds by this to get the # of days
  const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;

  // Intl.RelativeTimeFormat do its magic
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex]);
}

/**
 * Update the chart code with the primary color and additional data
 * @param initialCode - The initial code
 * @param primaryColor - The primary color
 * @returns The updated code
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateChartCode = (initialCode: any, primaryColor: string) => {
  const updatedMark = {
    ...CHART_ADDITIONAL_DATA.mark,
    ...(typeof initialCode.mark === 'object'
      ? initialCode.mark
      : typeof initialCode.mark === 'string'
      ? { type: initialCode.mark }
      : {}),
    color: primaryColor,
  };

  return {
    ...CHART_ADDITIONAL_DATA,
    ...initialCode,
    width: 'container',
    mark: updatedMark,
    ...(!!initialCode?.encoding && {
      encoding: {
        ...initialCode.encoding,
        ...(!!initialCode.encoding?.color && {
          color: {
            ...initialCode.encoding.color,
            value: primaryColor,
          },
        }),
      },
    }),
  };
};

/**
 * Resize an input element to fit its content
 * @param input - The input element to resize
 * @param vPadding - The vertical padding of the input
 * @param maxHeight - The maximum height of the input
 */
export function resizeInput(
  input: HTMLTextAreaElement,
  vPadding: number,
  maxHeight: number
) {
  input.style.height = 'auto';
  const newHeight = input.scrollHeight - vPadding;
  input.style.height = `${Math.min(newHeight, maxHeight)}px`;
}

export function processMessageText(text: string) {
  // Remove leading spaces from each line to prevent code block treatment
  return (
    text
      .split('\n')
      .map((line) => line.trimStart())
      .join('\n')
      // Remove double newlines artifacts
      .replaceAll('\\n\\n', '\n')
      .replaceAll('Photo/Documents', '')
  );
}

export const renderImageAndLink = (
  options: ChatWidgetOptions,
  imageInfo: { contract: string }
) => {
  const contractId = crypto.randomUUID();
  const contractLinkIcon = UIComponents.createContractLinkIcon();
  return options.onImageBlock || options.onLink
    ? `<div class="chat-message-image-link-container" data-contract-id="${contractId}" data-contract="${
        imageInfo.contract
      }">
        ${
          options.onImageBlock
            ? `<img src="" class="chat-contract-image" style="display: none;" data-loading="true" />`
            : ''
        }
        ${
          options.onLink?.(imageInfo)
            ? `<a href="${options.onLink?.(
                imageInfo
              )}" target="_blank">${contractLinkIcon}</a>`
            : ''
        }
        </div>`
    : '';
};
