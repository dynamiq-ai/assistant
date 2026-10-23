import { loader as createLoader } from 'vega';
import vegaEmbed, { type VisualizationSpec } from 'vega-embed';
import { expressionInterpreter } from 'vega-interpreter';
import { isAllowedResourceUrl } from './utils';

/**
 * Render a Vega-Lite spec from a bot message into `element`.
 *
 * The spec is untrusted, so expressions run in the interpreter (no generated
 * code, which also keeps charts working under a CSP without 'unsafe-eval'),
 * and data can only be loaded from the allowed origins.
 */
export function embedChart(
  element: HTMLElement,
  spec: VisualizationSpec,
  allowedOrigins: string[] = []
) {
  const loader = createLoader();
  const sanitize = loader.sanitize.bind(loader);
  loader.sanitize = async (uri, options) => {
    const result = await sanitize(uri, options);
    if (!isAllowedResourceUrl(result.href, allowedOrigins)) {
      throw new Error(`Chart data URL is not allowed: ${result.href}`);
    }
    return result;
  };

  return vegaEmbed(element, spec, {
    actions: false,
    ast: true,
    expr: expressionInterpreter,
    loader,
  });
}
