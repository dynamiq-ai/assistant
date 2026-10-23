import vegaEmbed from 'vega-embed';
import { expressionInterpreter } from 'vega-interpreter';
import { embedChart } from '../charts';

const mockedEmbed = vegaEmbed as unknown as jest.Mock;

type EmbedOptions = {
  ast: boolean;
  expr: unknown;
  actions: boolean;
  loader: { sanitize: (uri: string, options: object) => Promise<{ href: string }> };
};

const embedOptions = async (allowedOrigins?: string[]) => {
  mockedEmbed.mockClear();
  await embedChart(document.createElement('div'), { mark: 'bar' }, allowedOrigins);
  return mockedEmbed.mock.calls[0][2] as EmbedOptions;
};

describe('embedChart', () => {
  it('uses the expression interpreter instead of generated code', async () => {
    const options = await embedOptions();

    expect(options.ast).toBe(true);
    expect(options.expr).toBe(expressionInterpreter);
    expect(options.actions).toBe(false);
  });

  it('refuses to load chart data from other origins', async () => {
    const { loader } = await embedOptions();

    await expect(loader.sanitize('https://evil.test/data.json', {})).rejects.toThrow();
  });

  it('loads same-origin and allowed chart data', async () => {
    const { loader } = await embedOptions(['https://data.example.com']);

    await expect(loader.sanitize('/data.json', {})).resolves.toEqual({
      href: '/data.json',
    });
    await expect(
      loader.sanitize('https://data.example.com/d.json', {})
    ).resolves.toEqual({ href: 'https://data.example.com/d.json' });
  });
});
