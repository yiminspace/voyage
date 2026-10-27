import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import {
  VOYAGE_APP_DEFAULTS,
  VOYAGE_EXAM_CONTRASTS,
  VOYAGE_EXAM_TEXT_SIZES,
  voyageExamAttrs,
  type VoyageExamContrast,
  type VoyageExamDisplay,
  type VoyageExamTextSize,
} from '../src';
import { VoyageProvider, VoyageToolbar } from '../src/react';

const demoTheme = new URLSearchParams(location.search).get('theme') === 'ielts' ? 'ielts' : 'examhall';

const CONTRAST_LABELS: Record<VoyageExamContrast, string> = {
  'black-on-white': 'Black on white',
  'white-on-black': 'White on black',
  'yellow-on-black': 'Yellow on black',
};

const TEXT_SIZE_LABELS: Record<VoyageExamTextSize, string> = {
  regular: 'Regular',
  large: 'Large',
  'x-large': 'Extra large',
};

const EXAM_TOKENS = [
  'paper', 'ink', 'muted', 'subtle', 'panel', 'hover', 'rule', 'field',
  'focus', 'link', 'solid', 'solid-ink', 'step-off', 'step-off-ink',
  'current', 'done', 'todo', 'flag', 'mark', 'mark-ink', 'alert', 'alert-ink',
  'ok', 'ok-bg', 'ok-line', 'bad', 'bad-bg', 'bad-line', 'part', 'part-bg',
] as const;

type ExamToken = (typeof EXAM_TOKENS)[number];

function swatchStyle(token: ExamToken): CSSProperties {
  return { '--demo-swatch': `var(--vg-exam-${token})` } as CSSProperties;
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d={direction === 'left' ? 'M15 5 8 12l7 7z' : 'M9 5l7 7-7 7z'} fill="currentColor" />
    </svg>
  );
}

function TokenSwatches({ display }: { display: VoyageExamDisplay }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Partial<Record<ExamToken, string>>>({});

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const next: Partial<Record<ExamToken, string>> = {};
    for (const swatch of grid.querySelectorAll<HTMLElement>('[data-token]')) {
      next[swatch.dataset.token as ExamToken] = getComputedStyle(swatch).backgroundColor;
    }
    setValues(next);
  }, [display.contrast, display.text]);

  return (
    <div className="demo-exam-swatches" ref={gridRef} aria-label="Exam tokens">
      {EXAM_TOKENS.map((token) => (
        <div className="demo-exam-swatch" key={token}>
          <i data-token={token} style={swatchStyle(token)} />
          <span>
            <code>--vg-exam-{token}</code>
            <small>{values[token] ?? ''}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function ExamSample({ display }: { display: VoyageExamDisplay }) {
  const attrs = voyageExamAttrs(display);
  return (
    <section {...attrs} className={`${attrs.className} demo-exam`} id="exam-root" aria-label="Exam hall sample">
      <header className="demo-exam-bar">
        <strong>Voyage</strong>
        <span>Demo candidate</span>
        <small role="status">Saved</small>
      </header>
      <div className="demo-exam-rubric" id="exam-rubric">
        <strong>Part 1</strong>
        <p>Questions 1–3. Complete the notes about the Riverside Sports Club.</p>
      </div>
      <div className="demo-exam-content" lang="en">
        <h2>Riverside Sports Club: new member notes</h2>
        <p>
          The front desk opens at{' '}
          <input className="demo-exam-gap" id="exam-gap-1" aria-label="Question 1" placeholder="1" autoComplete="off" />{' '}
          on weekdays.
        </p>
        <p>
          The climbing wall is next to the{' '}
          <input className="demo-exam-gap" aria-label="Question 2" placeholder="2" autoComplete="off" />.
        </p>
        <fieldset className="demo-exam-options">
          <legend>3 Which evening is set aside for junior tennis?</legend>
          <label><input type="radio" name="exam-q3" /> A Monday</label>
          <label><input type="radio" name="exam-q3" defaultChecked /> B Thursday</label>
          <label><input type="radio" name="exam-q3" /> C Sunday</label>
        </fieldset>
        <p>
          Members may <mark className="vg-exam-mark">bring one guest</mark> each month; see the{' '}
          <a href="#exam-root">visitor rules</a>.
        </p>
        <p className="demo-exam-verdicts">
          <span className="demo-exam-verdict is-correct">✓ Correct</span>
          <span className="demo-exam-verdict is-incorrect">✗ Incorrect</span>
          <span className="demo-exam-verdict is-partial">◐ Partly correct</span>
          <span className="demo-exam-alert">5 minutes left</span>
        </p>
      </div>
      <div className="demo-exam-steps">
        <button type="button" className="demo-exam-step" id="exam-previous" aria-label="Previous" aria-disabled="true">
          <ArrowIcon direction="left" />
        </button>
        <button type="button" className="demo-exam-step" id="exam-next" aria-label="Next">
          <ArrowIcon direction="right" />
        </button>
      </div>
      <nav className="demo-exam-nav" aria-label="Questions">
        <strong>Part 1</strong>
        <button type="button" className="demo-exam-qbtn is-answered" aria-label="Question 1, answered">1</button>
        <button type="button" className="demo-exam-qbtn" aria-label="Question 2, Not attempted, Active" aria-current="step">2</button>
        <button type="button" className="demo-exam-qbtn is-flagged" aria-label="Question 3, Not attempted, flagged">3</button>
      </nav>
      <TokenSwatches display={display} />
    </section>
  );
}

function ExamTokensDemo() {
  const [display, setDisplay] = useState<VoyageExamDisplay>({
    theme: demoTheme,
    contrast: VOYAGE_EXAM_CONTRASTS[0],
    text: VOYAGE_EXAM_TEXT_SIZES[0],
  });
  const [palette, setPalette] = useState(true);

  return (
    <div className="demo-page">
      <header className="demo-head">
        <div>
          <h1>Exam hall tokens</h1>
          <p>{demoTheme} × plain × crisp, with a nested .vg-exam root from voyageExamAttrs()</p>
        </div>
        <span className="demo-sp" />
        <VoyageToolbar locale="en" palette={palette} />
      </header>

      <div className="demo-controls">
        <fieldset>
          <legend>Contrast</legend>
          {VOYAGE_EXAM_CONTRASTS.map((contrast) => (
            <label key={contrast}>
              <input
                type="radio"
                name="exam-contrast"
                checked={display.contrast === contrast}
                onChange={() => setDisplay((current) => ({ ...current, contrast }))}
              />
              {CONTRAST_LABELS[contrast]}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Text size</legend>
          {VOYAGE_EXAM_TEXT_SIZES.map((text) => (
            <label key={text}>
              <input
                type="radio"
                name="exam-text"
                checked={display.text === text}
                onChange={() => setDisplay((current) => ({ ...current, text }))}
              />
              {TEXT_SIZE_LABELS[text]}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Toolbar</legend>
          <label>
            <input type="checkbox" checked={palette} onChange={(event) => setPalette(event.target.checked)} />
            Theme palette
          </label>
        </fieldset>
      </div>

      <div className="demo-daily" id="daily-surface">
        <button type="button" className="vg-btn primary">Start</button>
        <button type="button" className="vg-btn">Later</button>
        <input className="vg-input" id="daily-input" aria-label="Daily answer" placeholder="Type the word" />
        <span className="demo-daily-mark">highlighted word</span>
      </div>

      <ExamSample display={display} />
    </div>
  );
}

const rootElement = document.getElementById('exam-demo-root');
if (!rootElement) throw new Error('missing #exam-demo-root');

createRoot(rootElement).render(
  <VoyageProvider defaults={demoTheme === 'ielts' ? VOYAGE_APP_DEFAULTS.ielts : VOYAGE_APP_DEFAULTS.prism} storageKey={`voyage-demo:exam-tokens:${demoTheme}`}>
    <ExamTokensDemo />
  </VoyageProvider>
);
