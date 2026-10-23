import { escapeHtml, safeUrl } from '../utils';

describe('escapeHtml', () => {
  it('escapes characters that can break out of text or attributes', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
    );
  });

  it('renders null and undefined as empty strings', () => {
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(null)).toBe('');
  });
});

describe('safeUrl', () => {
  it.each([
    'https://example.com/a?b=c',
    'http://example.com',
    'mailto:a@example.com',
    '/relative/path',
    '#anchor',
  ])('allows %s', (url) => {
    expect(safeUrl(url)).toBe(url);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java\tscript:alert(1)',
    ' javascript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
  ])('rejects %j', (url) => {
    expect(safeUrl(url)).toBeNull();
  });

  it('returns null for empty values', () => {
    expect(safeUrl('')).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
  });
});

describe('safeUrl whitespace handling', () => {
  it.each(['\u00a0javascript:alert(1)', '\u2028javascript:alert(1)'])(
    'rejects %j',
    (url) => {
      expect(safeUrl(url)).toBeNull();
    }
  );
});
