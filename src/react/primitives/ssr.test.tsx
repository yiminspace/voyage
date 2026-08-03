// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VoyageSpinner, VoyageStateView } from './index';

describe('@yiminlab/voyage/react/primitives SSR', () => {
  it('不依赖 window 且可直接服务端渲染', () => {
    expect(typeof window).toBe('undefined');
    const html = renderToStaticMarkup(
      <>
        <VoyageStateView variant="loading" heading="Loading" />
        <VoyageSpinner label="Standalone loading" />
      </>
    );
    expect(html).toContain('vg-state-view-loading');
    expect(html).toContain('Loading');
  });
});
