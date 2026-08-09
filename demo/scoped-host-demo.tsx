import React from 'react';
import { createRoot } from 'react-dom/client';

import '../tokens.css';
import '../voyage.css';
import { VOYAGE_APP_DEFAULTS } from '../src';
import { VoyageProvider, VoyageToolbar } from '../src/react';

const rootElement = document.getElementById('brainws-root');
if (!rootElement) throw new Error('missing #brainws-root');

createRoot(rootElement).render(
  <React.StrictMode>
    <VoyageProvider
      target={rootElement}
      storageKey="brainws:vg_prefs"
      defaults={VOYAGE_APP_DEFAULTS.brainws}
    >
      <main className="vg-app" style={{ minHeight: 180 }}>
        <header className="vg-header">
          <strong>brainws</strong>
          <span className="vg-sp" />
          <VoyageToolbar
            locale="zh"
            reporter={{ disabled: true }}
            language={{ disabled: true }}
          />
        </header>
        <section className="vg-content">
          <p>Whistle owns the outer document; Voyage owns this application root.</p>
          <span className="vg-badge ok">UP</span>{' '}
          <span className="vg-badge err">ERROR</span>
        </section>
      </main>
    </VoyageProvider>
  </React.StrictMode>
);
