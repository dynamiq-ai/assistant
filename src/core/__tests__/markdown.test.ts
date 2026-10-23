import { createMarkdownRenderer } from '../markdown';

const render = (
  text: string,
  options: Parameters<typeof createMarkdownRenderer>[0] = {}
) => {
  const el = document.createElement('div');
  el.innerHTML = createMarkdownRenderer(options)(text);
  return el;
};

const contracts = (el: HTMLElement) =>
  [...el.querySelectorAll('[data-contract]')].map((c) =>
    c.getAttribute('data-contract')
  );

describe('createMarkdownRenderer', () => {
  it('renders basic markdown with line breaks', () => {
    const el = render('**bold**\nnext');

    expect(el.querySelector('strong')?.textContent).toBe('bold');
    expect(el.querySelector('br')).not.toBeNull();
  });

  it('opens links in a new tab', () => {
    const link = render('[docs](https://example.com)').querySelector('a');

    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('wraps tables in a horizontally scrollable container', () => {
    const el = render('| a | b |\n|---|---|\n| 1 | 2 |');

    const wrapper = el.querySelector('table')?.parentElement;
    expect(wrapper?.style.overflowX).toBe('auto');
  });

  it('renders chart blocks as placeholders with the themed spec', () => {
    const el = render('```chart\n{"mark":"bar"}\n```', {
      theme: { primaryColor: '#ff0000' },
    });

    const chart = el.querySelector<HTMLElement>('.chat-message-chart');
    const spec = JSON.parse(chart!.dataset.chartSpec!);
    expect(spec.mark).toMatchObject({ type: 'bar', color: '#ff0000' });
  });

  it('shows a placeholder while a chart block is incomplete', () => {
    expect(render('```chart\n{"mark":\n```').textContent).toContain(
      'Building chart...'
    );
  });

  it('renders contract containers for image blocks and inline image codespans', () => {
    const el = render(
      '```image\n{"contract":"c-1"}\n```\n\ntext `image{"contract":"c-2"}`',
      { onImageBlock: async () => [] }
    );

    expect(contracts(el)).toEqual(['c-1', 'c-2']);
  });

  it('skips image blocks whose contract is N/A', () => {
    const el = render('```image\n{"contract":"N/A"}\n```', {
      onImageBlock: async () => [],
    });

    expect(contracts(el)).toEqual([]);
  });

  it('renders report blocks as manager and direct report cards', () => {
    const el = render(
      '```report\n' +
        JSON.stringify({
          name: 'Ann',
          role: 'Lead',
          contractId: 'm-1',
          directReports: [{ name: 'Bob', role: 'Dev', contractId: 'r-1' }],
        }) +
        '\n```',
      { onImageBlock: async () => [] }
    );

    const names = [...el.querySelectorAll('.chat-message-report-name')].map(
      (n) => n.textContent
    );
    expect(names).toEqual(['Ann', 'Bob']);
    expect(contracts(el)).toEqual(['m-1', 'r-1']);
  });

  it('renders flag codespans as an image and country name', () => {
    const el = render('`flag{"code":"DE","country":"Germany"}`');

    expect(el.querySelector('img')?.getAttribute('src')).toMatch(/\/de\.svg$/);
    expect(el.textContent).toContain('Germany');
  });

  it('falls back to default rendering for other code blocks', () => {
    const el = render('```js\nconst a = 1;\n```');

    expect(el.querySelector('pre code')?.textContent).toContain('const a = 1;');
  });

  it('keeps renderer state separate per instance', () => {
    const red = createMarkdownRenderer({ theme: { primaryColor: 'red' } });
    createMarkdownRenderer({ theme: { primaryColor: 'blue' } });

    const el = document.createElement('div');
    el.innerHTML = red('```chart\n{"mark":"bar"}\n```');

    const spec = JSON.parse(
      el.querySelector<HTMLElement>('.chat-message-chart')!.dataset.chartSpec!
    );
    expect(spec.mark.color).toBe('red');
  });
});

describe('createMarkdownRenderer escaping', () => {
  const PAYLOAD = '"><img src=x onerror="alert(1)">';
  const hasInjectedImg = (el: HTMLElement) =>
    [...el.querySelectorAll('img')].some((img) => img.hasAttribute('onerror'));

  it('does not allow javascript: links', () => {
    const el = render('[x](javascript:alert(1))');

    expect(el.innerHTML).not.toMatch(/javascript:/i);
    expect(el.textContent?.trim()).toBe('x');
  });

  it('escapes link titles', () => {
    const el = render(`[x](https://example.com '${PAYLOAD}')`);

    expect(hasInjectedImg(el)).toBe(false);
    expect(el.querySelector('a')?.getAttribute('title')).toBe(PAYLOAD);
  });

  it('adds rel=noopener noreferrer to links', () => {
    const link = render('[x](https://example.com)').querySelector('a');

    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('escapes report names, roles and contract ids', () => {
    const el = render(
      '```report\n' +
        JSON.stringify({
          name: PAYLOAD,
          role: PAYLOAD,
          contractId: PAYLOAD,
          directReports: [{ name: PAYLOAD, role: PAYLOAD, contractId: PAYLOAD }],
        }) +
        '\n```',
      { onImageBlock: async () => [] }
    );

    expect(hasInjectedImg(el)).toBe(false);
    expect(el.querySelector('.chat-message-report-name')?.textContent).toBe(
      PAYLOAD
    );
    expect(
      el.querySelector('.chat-message-image-link-container')?.getAttribute(
        'data-contract'
      )
    ).toBe(PAYLOAD);
  });

  it('escapes the flag country', () => {
    const el = render(
      '`flag' + JSON.stringify({ code: 'DE', country: PAYLOAD }) + '`'
    );

    expect(hasInjectedImg(el)).toBe(false);
    expect(el.textContent).toContain(PAYLOAD);
  });

  it('does not build a flag URL from an invalid country code', () => {
    const el = render('`flag{"code":"../../evil","country":"X"}`');

    expect(el.querySelector('img')).toBeNull();
  });

  it('escapes image contract ids', () => {
    const el = render(
      '```image\n' + JSON.stringify({ contract: PAYLOAD }) + '\n```',
      { onImageBlock: async () => [] }
    );

    expect(hasInjectedImg(el)).toBe(false);
    expect(
      el.querySelector('[data-contract]')?.getAttribute('data-contract')
    ).toBe(PAYLOAD);
  });

  it('escapes onLink URLs and drops unsafe schemes', () => {
    const quoted = render('```image\n{"contract":"c"}\n```', {
      onLink: () => `https://example.com/${PAYLOAD}`,
    });
    const scripted = render('```image\n{"contract":"c"}\n```', {
      onLink: () => 'javascript:alert(1)',
    });

    expect(hasInjectedImg(quoted)).toBe(false);
    expect(scripted.querySelector('a')).toBeNull();
  });
});

describe('createMarkdownRenderer sanitizing', () => {
  it.each([
    ['img onerror', '<img src=x onerror="alert(1)">'],
    ['svg onload', '<svg onload="alert(1)"></svg>'],
    ['script tag', '<script>alert(1)</script>'],
    ['iframe', '<iframe src="https://evil.test"></iframe>'],
    ['raw javascript: link', '<a href="javascript:alert(1)">x</a>'],
    ['event handler on div', '<div onmouseover="alert(1)">hover</div>'],
    ['form action', '<form action="https://evil.test"><button>go</button></form>'],
  ])('removes %s from raw HTML', (_, payload) => {
    const html = createMarkdownRenderer({})(`hello ${payload}`);

    expect(html).not.toMatch(/onerror|onload|onmouseover|<script|<iframe|<form|javascript:/i);
  });

  it('opens raw HTML links in a new tab without opener access', () => {
    const link = render('<a href="https://example.com">x</a>').querySelector('a');

    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('keeps the widget-owned chart, image and report markup', () => {
    const el = render(
      '```chart\n{"mark":"bar"}\n```\n\n```image\n{"contract":"c-1"}\n```\n\n```report\n{"name":"Ann","contractId":"m-1"}\n```',
      { onImageBlock: async () => [], onLink: () => 'https://example.com/c' }
    );

    const chart = el.querySelector<HTMLElement>('.chat-message-chart');
    expect(chart?.id).toMatch(/^vega-chart-/);
    expect(JSON.parse(chart!.dataset.chartSpec!).mark.type).toBe('bar');
    expect(el.querySelector('[data-contract="c-1"] .chat-contract-image')).not.toBeNull();
    expect(el.querySelector('[data-contract="c-1"] a')?.getAttribute('href')).toBe(
      'https://example.com/c'
    );
    expect(el.querySelector('.chat-message-report-card-manager')).not.toBeNull();
  });
});

describe('createMarkdownRenderer remote resources', () => {
  it('blocks images from other origins by default', () => {
    const img = render('![x](https://evil.test/pixel?q=secret)').querySelector('img');

    expect(img?.hasAttribute('src')).toBe(false);
  });

  it('allows same-origin, relative and data: images by default', () => {
    const el = render(
      `![a](/a.png) ![b](${location.origin}/b.png) ![c](data:image/png;base64,AAAA)`
    );

    const srcs = [...el.querySelectorAll('img')].map((i) => i.getAttribute('src'));
    expect(srcs).toEqual([
      '/a.png',
      `${location.origin}/b.png`,
      'data:image/png;base64,AAAA',
    ]);
  });

  it('allows images from configured origins', () => {
    const el = render('![x](https://cdn.example.com/x.png)', {
      allowedResourceOrigins: ['https://cdn.example.com'],
    });

    expect(el.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example.com/x.png'
    );
  });

  it('allows every origin with *', () => {
    const el = render('![x](https://anything.test/x.png)', {
      allowedResourceOrigins: ['*'],
    });

    expect(el.querySelector('img')?.getAttribute('src')).toBe(
      'https://anything.test/x.png'
    );
  });

  it('blocks remote srcset, video poster and svg image sources', () => {
    const el = render(
      '<img srcset="https://evil.test/a.png 1x">' +
        '<video poster="https://evil.test/p.png" src="https://evil.test/v.mp4"></video>' +
        '<svg><image href="https://evil.test/s.png"></image></svg>'
    );

    expect(el.innerHTML).not.toContain('evil.test');
  });

  it('removes inline styles that can load resources', () => {
    const el = render(
      '<div style="background:url(https://evil.test/x)">a</div>' +
        '<div style="background:\\75rl(https://evil.test/x)">b</div>'
    );

    expect(el.innerHTML).not.toContain('evil.test');
  });

  it('keeps links to other origins', () => {
    const link = render('[x](https://other.test)').querySelector('a');

    expect(link?.getAttribute('href')).toBe('https://other.test');
  });

  it('keeps built-in flag images', () => {
    const img = render('`flag{"code":"DE","country":"Germany"}`').querySelector('img');

    expect(img?.getAttribute('src')).toMatch(/flags\/de\.svg$/);
  });
});
