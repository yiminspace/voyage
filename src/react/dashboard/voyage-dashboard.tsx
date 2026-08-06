import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react';

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export type VoyageStatusTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface VoyageDashboardShellProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional footer kept inside the application surface. */
  footer?: ReactNode;
}

/** Product-dashboard surface with a consistent responsive content width. */
export function VoyageDashboardShell({ className, children, footer, ...props }: VoyageDashboardShellProps) {
  return (
    <div {...props} className={classes('vg-dashboard', className)}>
      {children}
      {footer == null ? null : <div className="vg-dashboard-footer-slot">{footer}</div>}
    </div>
  );
}

export interface VoyageDashboardHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  mark?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
}

/** Branded application header. App identity and status stay left; global actions stay right. */
export function VoyageDashboardHeader({
  mark,
  eyebrow,
  title,
  subtitle,
  status,
  actions,
  className,
  ...props
}: VoyageDashboardHeaderProps) {
  return (
    <header {...props} className={classes('vg-dashboard-header', className)}>
      <div className="vg-dashboard-identity">
        {mark == null ? null : <div className="vg-dashboard-mark" aria-hidden="true">{mark}</div>}
        <div className="vg-dashboard-brand-copy">
          {eyebrow == null ? null : <div className="vg-dashboard-eyebrow">{eyebrow}</div>}
          <div className="vg-dashboard-brand-line">
            <strong className="vg-dashboard-brand">{title}</strong>
            {subtitle == null ? null : <span className="vg-dashboard-subtitle">{subtitle}</span>}
          </div>
        </div>
      </div>
      <div className="vg-dashboard-header-end">
        {status == null ? null : <div className="vg-dashboard-header-status">{status}</div>}
        {actions == null ? null : <div className="vg-dashboard-header-actions">{actions}</div>}
      </div>
    </header>
  );
}

export interface VoyageDashboardHeroProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/** Short page introduction. Keep it directional rather than promotional. */
export function VoyageDashboardHero({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}: VoyageDashboardHeroProps) {
  return (
    <section {...props} className={classes('vg-dashboard-hero', className)}>
      <div className="vg-dashboard-hero-copy">
        {eyebrow == null ? null : <div className="vg-dashboard-kicker">{eyebrow}</div>}
        <h1>{title}</h1>
        {description == null ? null : <p>{description}</p>}
      </div>
      {actions == null ? null : <div className="vg-dashboard-hero-actions">{actions}</div>}
    </section>
  );
}

export interface VoyageMetricCardProps extends HTMLAttributes<HTMLElement> {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: 'neutral' | 'accent';
}

export function VoyageMetricCard({
  label,
  value,
  detail,
  icon,
  tone = 'neutral',
  className,
  ...props
}: VoyageMetricCardProps) {
  return (
    <article {...props} className={classes('vg-dashboard-metric', `vg-dashboard-metric-${tone}`, className)}>
      <div className="vg-dashboard-metric-top">
        <span className="vg-dashboard-metric-label">{label}</span>
        {icon == null ? null : <span className="vg-dashboard-metric-icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className="vg-dashboard-metric-value">{value}</div>
      {detail == null ? null : <div className="vg-dashboard-metric-detail">{detail}</div>}
    </article>
  );
}

export function VoyageMetricGrid({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classes('vg-dashboard-metrics', className)}>{children}</div>;
}

export function VoyageDashboardSection({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={classes('vg-dashboard-section', className)}>{children}</section>;
}

export interface VoyageSectionHeadingProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function VoyageSectionHeading({ title, description, action, className, ...props }: VoyageSectionHeadingProps) {
  return (
    <div {...props} className={classes('vg-dashboard-section-heading', className)}>
      <div>
        <h2>{title}</h2>
        {description == null ? null : <p>{description}</p>}
      </div>
      {action == null ? null : <div className="vg-dashboard-section-action">{action}</div>}
    </div>
  );
}

export interface VoyageActionCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: ReactNode;
  meta?: ReactNode;
  detail?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  tone?: VoyageStatusTone;
}

/** Compact, fully clickable card for queues such as “up next”. */
export function VoyageActionCard({
  title,
  meta,
  detail,
  leading,
  trailing,
  tone = 'neutral',
  className,
  type = 'button',
  ...props
}: VoyageActionCardProps) {
  return (
    <button {...props} type={type} className={classes('vg-dashboard-action-card', `vg-tone-${tone}`, className)}>
      {leading == null ? null : <span className="vg-dashboard-action-leading" aria-hidden="true">{leading}</span>}
      <span className="vg-dashboard-action-copy">
        <strong>{title}</strong>
        {meta == null ? null : <span className="vg-dashboard-action-meta">{meta}</span>}
        {detail == null ? null : <span className="vg-dashboard-action-detail">{detail}</span>}
      </span>
      {trailing == null ? null : <span className="vg-dashboard-action-trailing">{trailing}</span>}
    </button>
  );
}

export function VoyageActionGrid({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classes('vg-dashboard-action-grid', className)}>{children}</div>;
}

export function VoyageDashboardWorkspace({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classes('vg-dashboard-workspace', className)}>{children}</div>;
}

export interface VoyagePanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
}

/** Generic surface used by the library and inspector columns. */
export function VoyagePanel({
  title,
  description,
  actions,
  padded = false,
  className,
  children,
  ...props
}: VoyagePanelProps) {
  return (
    <section {...props} className={classes('vg-dashboard-panel', padded && 'vg-dashboard-panel-padded', className)}>
      {title == null && description == null && actions == null ? null : (
        <div className="vg-dashboard-panel-head">
          <div>
            {title == null ? null : <h2>{title}</h2>}
            {description == null ? null : <p>{description}</p>}
          </div>
          {actions == null ? null : <div className="vg-dashboard-panel-actions">{actions}</div>}
        </div>
      )}
      <div className="vg-dashboard-panel-body">{children}</div>
    </section>
  );
}

export interface VoyageEntityRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  tone?: VoyageStatusTone;
}

/** Dense master-list row with one clear selection state. */
export function VoyageEntityRow({
  title,
  description,
  meta,
  leading,
  trailing,
  selected = false,
  tone = 'neutral',
  className,
  type = 'button',
  ...props
}: VoyageEntityRowProps) {
  return (
    <button
      {...props}
      type={type}
      className={classes('vg-dashboard-entity', `vg-tone-${tone}`, selected && 'is-selected', className)}
      aria-current={props['aria-current'] ?? (selected ? 'true' : undefined)}
    >
      {leading == null ? <span className="vg-dashboard-status-dot" aria-hidden="true" /> : (
        <span className="vg-dashboard-entity-leading" aria-hidden="true">{leading}</span>
      )}
      <span className="vg-dashboard-entity-copy">
        <span className="vg-dashboard-entity-title-line">
          <strong>{title}</strong>
          {meta == null ? null : <span className="vg-dashboard-entity-meta">{meta}</span>}
        </span>
        {description == null ? null : <span className="vg-dashboard-entity-description">{description}</span>}
      </span>
      {trailing == null ? null : <span className="vg-dashboard-entity-trailing">{trailing}</span>}
    </button>
  );
}

export interface VoyageInspectorProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
}

export function VoyageInspector({
  eyebrow,
  title,
  description,
  status,
  actions,
  className,
  children,
  ...props
}: VoyageInspectorProps) {
  return (
    <aside {...props} className={classes('vg-dashboard-inspector', className)}>
      <div className="vg-dashboard-inspector-head">
        <div>
          {eyebrow == null ? null : <div className="vg-dashboard-eyebrow">{eyebrow}</div>}
          <div className="vg-dashboard-inspector-title-line">
            <h2>{title}</h2>
            {status}
          </div>
          {description == null ? null : <p>{description}</p>}
        </div>
      </div>
      <div className="vg-dashboard-inspector-body">{children}</div>
      {actions == null ? null : <div className="vg-dashboard-inspector-actions">{actions}</div>}
    </aside>
  );
}

export interface VoyageFieldGroupProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  hint?: ReactNode;
}

export function VoyageFieldGroup({ label, hint, className, children, ...props }: VoyageFieldGroupProps) {
  return (
    <div {...props} className={classes('vg-dashboard-field', className)}>
      <div className="vg-dashboard-field-label">
        <strong>{label}</strong>
        {hint == null ? null : <span>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export interface VoyageChoiceCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  selected?: boolean;
}

export function VoyageChoiceCard({
  title,
  description,
  selected = false,
  className,
  type = 'button',
  ...props
}: VoyageChoiceCardProps) {
  return (
    <button
      {...props}
      type={type}
      className={classes('vg-dashboard-choice', selected && 'is-selected', className)}
      aria-pressed={props['aria-pressed'] ?? selected}
    >
      <span className="vg-dashboard-choice-indicator" aria-hidden="true" />
      <span>
        <strong>{title}</strong>
        {description == null ? null : <small>{description}</small>}
      </span>
    </button>
  );
}

export function VoyageChoiceGrid({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classes('vg-dashboard-choice-grid', className)}>{children}</div>;
}

export interface VoyageSwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  checked: boolean;
  label: ReactNode;
  description?: ReactNode;
}

export function VoyageSwitch({
  checked,
  label,
  description,
  className,
  type = 'button',
  ...props
}: VoyageSwitchProps) {
  return (
    <button
      {...props}
      type={type}
      role="switch"
      aria-checked={checked}
      className={classes('vg-dashboard-switch-row', className)}
    >
      <span className="vg-dashboard-switch-copy">
        <strong>{label}</strong>
        {description == null ? null : <small>{description}</small>}
      </span>
      <span className={classes('vg-dashboard-switch', checked && 'is-on')} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

export interface VoyageRouteStep {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: VoyageStatusTone;
}

export interface VoyageRouteListProps extends HTMLAttributes<HTMLOListElement> {
  steps: VoyageRouteStep[];
}

export function VoyageRouteList({ steps, className, ...props }: VoyageRouteListProps) {
  return (
    <ol {...props} className={classes('vg-dashboard-route', className)}>
      {steps.map((step) => (
        <li key={step.id} className={classes(`vg-tone-${step.tone ?? 'neutral'}`)}>
          <span className="vg-dashboard-route-icon" aria-hidden="true">{step.icon ?? '·'}</span>
          <span>
            <strong>{step.title}</strong>
            {step.description == null ? null : <small>{step.description}</small>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export interface VoyageStatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: VoyageStatusTone;
}

export function VoyageStatusPill({ tone = 'neutral', className, children, ...props }: VoyageStatusPillProps) {
  return (
    <span {...props} className={classes('vg-dashboard-status-pill', `vg-tone-${tone}`, className)}>
      <span className="vg-dashboard-status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function VoyageDashboardFooter({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return <footer {...props} className={classes('vg-dashboard-footer', className)}>{children}</footer>;
}
