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
        ...(!!initialCode.encoding?.color &&
          'value' in initialCode.encoding.color && {
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

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape a value for use in HTML text or a quoted attribute
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

const SAFE_URL_SCHEMES = ['http', 'https', 'mailto'];

/**
 * Return the URL if it is relative or uses an allowed scheme, otherwise null.
 * Browsers ignore whitespace and control characters inside a scheme
 * ("java\tscript:"), so they are stripped before checking.
 */
export function safeUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) {
    return null;
  }
  // eslint-disable-next-line no-control-regex
  const normalized = trimmed.replace(/[\u0000-\u0020\u007f]/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized)?.[1];
  if (scheme && !SAFE_URL_SCHEMES.includes(scheme.toLowerCase())) {
    return null;
  }
  return trimmed;
}

/**
 * Whether the browser may load a resource (image, chart data, ...) from `url`.
 * Same-origin, relative, data: and blob: URLs are always allowed; other origins
 * must be listed in `allowedOrigins`, or `allowedOrigins` must contain '*'.
 */
export function isAllowedResourceUrl(
  url: string,
  allowedOrigins: string[] = []
): boolean {
  if (allowedOrigins.includes('*')) {
    return true;
  }
  let parsed: URL;
  try {
    parsed = new URL(url, window.location.href);
  } catch {
    return false;
  }
  if (parsed.protocol === 'data:') {
    return true;
  }
  const origins = [window.location.origin];
  allowedOrigins.forEach((origin) => {
    try {
      origins.push(new URL(origin).origin);
    } catch {
      // ignore invalid entries
    }
  });
  return origins.includes(parsed.origin);
}

export const renderImageAndLink = (
  options: ChatWidgetOptions,
  imageInfo: { contract: string }
) => {
  if (!options.onImageBlock && !options.onLink) {
    return '';
  }
  const contractId = crypto.randomUUID();
  const linkUrl = safeUrl(options.onLink?.(imageInfo));
  return `<div class="chat-message-image-link-container" data-contract-id="${contractId}" data-contract="${escapeHtml(
    imageInfo.contract
  )}">
        ${
          options.onImageBlock
            ? `<img src="" class="chat-contract-image" style="display: none;" data-loading="true" />`
            : ''
        }
        ${
          linkUrl
            ? `<a href="${escapeHtml(
                linkUrl
              )}" target="_blank" rel="noopener noreferrer">${UIComponents.createContractLinkIcon()}</a>`
            : ''
        }
        </div>`;
};
