import { createMarkdownRenderer } from '../markdown';

const render = (
  text: string,
  options: Parameters<typeof createMarkdownRenderer>[0] = {},
  onContract: (contract: string) => void = () => {}
) => {
  const el = document.createElement('div');
  el.innerHTML = createMarkdownRenderer(options, onContract)(text);
  return el;
};

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

  it('collects contract ids from image blocks and inline image codespans', () => {
    const contracts: string[] = [];
    const el = render(
      '```image\n{"contract":"c-1"}\n```\n\ntext `image{"contract":"c-2"}`',
      { onImageBlock: async () => [] },
      (c) => contracts.push(c)
    );

    expect(contracts).toEqual(['c-1', 'c-2']);
    expect(el.querySelectorAll('[data-contract]')).toHaveLength(2);
  });

  it('skips image blocks whose contract is N/A', () => {
    const contracts: string[] = [];
    render('```image\n{"contract":"N/A"}\n```', {}, (c) => contracts.push(c));

    expect(contracts).toEqual([]);
  });

  it('renders report blocks as manager and direct report cards', () => {
    const contracts: string[] = [];
    const el = render(
      '```report\n' +
        JSON.stringify({
          name: 'Ann',
          role: 'Lead',
          contractId: 'm-1',
          directReports: [{ name: 'Bob', role: 'Dev', contractId: 'r-1' }],
        }) +
        '\n```',
      {},
      (c) => contracts.push(c)
    );

    const names = [...el.querySelectorAll('.chat-message-report-name')].map(
      (n) => n.textContent
    );
    expect(names).toEqual(['Ann', 'Bob']);
    expect(contracts).toEqual(['m-1', 'r-1']);
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
    const red = createMarkdownRenderer({ theme: { primaryColor: 'red' } }, () => {});
    createMarkdownRenderer({ theme: { primaryColor: 'blue' } }, () => {});

    const el = document.createElement('div');
    el.innerHTML = red('```chart\n{"mark":"bar"}\n```');

    const spec = JSON.parse(
      el.querySelector<HTMLElement>('.chat-message-chart')!.dataset.chartSpec!
    );
    expect(spec.mark.color).toBe('red');
  });
});
