import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  VOYAGE_VERSION,
  type VoyageIssueReport,
  type VoyageLocale,
  type VoyagePrefs,
} from '../src/index';
import {
  VoyageIssueReporter,
  VoyageAccountMenu,
  VoyageProvider,
  VoyageStateView,
  useVoyage,
  type VoyageIssueSubmitResult,
} from '../src/react/index';

const DEMO_ENDPOINT = '/__voyage-demo-intake';
const INITIAL_PREFS: VoyagePrefs = {
  theme: 'slate',
  mode: 'dark',
  style: 'classic',
  tone: 'quiet',
};

declare global {
  interface Window {
    __voyageDemoFetchInstalled?: boolean;
  }
}

function installDemoIntake() {
  if (window.__voyageDemoFetchInstalled) return;
  window.__voyageDemoFetchInstalled = true;
  const nativeFetch = window.fetch.bind(window);
  let issueSequence = 1;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.pathname
        : new URL(input.url).pathname;
    if (url !== DEMO_ENDPOINT) return nativeFetch(input, init);

    await new Promise((resolve) => window.setTimeout(resolve, 450));
    const issueNumber = `DEMO-${String(issueSequence).padStart(3, '0')}`;
    issueSequence += 1;
    return new Response(JSON.stringify({ issueNumber }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  };
}

function currentPrefs(): VoyagePrefs {
  const fittingRoom = document.getElementById('fit');
  return {
    theme: (fittingRoom?.getAttribute('data-theme') ?? 'slate') as VoyagePrefs['theme'],
    mode: (fittingRoom?.getAttribute('data-mode') ?? 'dark') as VoyagePrefs['mode'],
    style: (fittingRoom?.getAttribute('data-style') ?? 'classic') as VoyagePrefs['style'],
    tone: (fittingRoom?.getAttribute('data-tone') ?? 'quiet') as VoyagePrefs['tone'],
  };
}

function DemoPreferenceBridge() {
  const { setPrefs } = useVoyage();

  useEffect(() => {
    const sync = (event?: Event) => {
      const detail = (event as CustomEvent<VoyagePrefs> | undefined)?.detail;
      setPrefs(detail ?? currentPrefs());
    };
    const frame = window.requestAnimationFrame(() => sync());
    window.addEventListener('voyage-demo-prefs', sync);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('voyage-demo-prefs', sync);
    };
  }, [setPrefs]);

  return null;
}

function EvidencePanel({
  report,
  onClose,
}: {
  report: VoyageIssueReport;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(report, null, 2);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = json;
      textarea.setAttribute('data-vg-private', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, [json]);

  return createPortal(
    <dialog
      open
      className="vg-reporter-panel vg-demo-evidence"
      aria-label="本地 intake 收到的证据包"
      data-vg-reporter-ui
      data-vg-private
    >
      <header className="vg-reporter-panel-head">
        <strong>本地 intake 收到的证据包</strong>
        <button type="button" className="vg-iconbtn" aria-label="关闭证据包" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="vg-demo-evidence-copy">
        <p>
          这是刚才准备发给服务端的完整 JSON。当前由试衣间本地拦截，
          不会访问 GitHub，也不会创建真实 Issue。
        </p>
        <pre>{json}</pre>
        <div className="vg-demo-evidence-actions">
          <small>{report.schema} · {report.targets.length} 个目标</small>
          <button type="button" className="vg-btn" onClick={() => void copy()}>
            {copied ? '已复制' : '复制 JSON'}
          </button>
        </div>
      </div>
    </dialog>,
    document.body
  );
}

function ReporterDemo() {
  const [locale, setLocale] = useState<VoyageLocale>('zh');
  const [lastReport, setLastReport] = useState<VoyageIssueReport | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [demoAuthenticated, setDemoAuthenticated] = useState(true);

  useEffect(() => {
    const updateLocale = (event: Event) => {
      setLocale((event as CustomEvent<VoyageLocale>).detail);
    };
    window.addEventListener('voyage-demo-locale', updateLocale);
    return () => window.removeEventListener('voyage-demo-locale', updateLocale);
  }, []);

  const submitted = useCallback(
    (_result: VoyageIssueSubmitResult, report: VoyageIssueReport) => {
      setLastReport(report);
      setShowEvidence(true);
    },
    []
  );

  return (
    <VoyageProvider defaults={INITIAL_PREFS}>
      <DemoPreferenceBridge />
      <VoyageIssueReporter
        endpoint={DEMO_ENDPOINT}
        app={{ name: 'voyage-fitting-room', release: VOYAGE_VERSION }}
        locale={locale}
        metadata={{ demo: true, createsRealIssue: false }}
        onSubmitted={submitted}
      />
      {lastReport ? (
        <button type="button" className="vg-btn" onClick={() => setShowEvidence(true)}>
          证据 JSON
        </button>
      ) : null}
      <span className="vg-topbar-separator" aria-hidden="true" />
      {lastReport && showEvidence ? (
        <EvidencePanel report={lastReport} onClose={() => setShowEvidence(false)} />
      ) : null}
      {componentDemoHost ? createPortal(
        <div className="vg-component-demo-grid">
          <div className="vg-component-demo-card">
            <VoyageStateView
              variant="loading"
              heading={locale === 'zh' ? '正在处理登录' : 'Completing sign in'}
              description={locale === 'zh' ? '即将安全地返回应用' : 'Returning to the app securely'}
            />
          </div>
          <div className="vg-component-demo-card">
            <VoyageStateView
              variant="error"
              heading={locale === 'zh' ? '登录失败' : 'Sign in failed'}
              description={locale === 'zh' ? '认证信息无效或已经过期' : 'Authentication is invalid or expired'}
              action={<button type="button" className="vg-btn primary">{locale === 'zh' ? '重试' : 'Retry'}</button>}
            />
          </div>
          <div className="vg-component-demo-card vg-component-demo-account">
            <p>{locale === 'zh' ? '账户菜单使用真实 React + 原生 Popover API' : 'Real React account menu using the native Popover API'}</p>
            <VoyageAccountMenu
              locale={locale}
              isAuthenticated={demoAuthenticated}
              identity={{ name: 'Voyage User', secondary: 'voyage@example.com' }}
              onLogin={() => setDemoAuthenticated(true)}
              onLogout={() => setDemoAuthenticated(false)}
            />
          </div>
        </div>,
        componentDemoHost
      ) : null}
    </VoyageProvider>
  );
}

installDemoIntake();

const toolbar = document.getElementById('toolbar');
if (!toolbar) throw new Error('Voyage 试衣间缺少 #toolbar');
const componentDemoHost = document.getElementById('componentDemoRoot');
document.getElementById('componentStatic')?.setAttribute('hidden', '');

const host = document.createElement('span');
host.id = 'reporterDemoRoot';
host.style.display = 'contents';
toolbar.prepend(host);
createRoot(host).render(<ReporterDemo />);
