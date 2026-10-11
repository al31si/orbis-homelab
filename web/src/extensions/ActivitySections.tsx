import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '@/i18n';
import { Notice } from '@/ui/Notice';
import { useExtensionActivitySections } from './registry';

class SectionBoundary extends Component<{ id: string; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Activity section "${this.props.id}" crashed`, error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return <Notice tone="warn" title={t('ui.errorState.title')} />;
  }
}

/**
 * Activity sections contributed by extensions, lowest `order` first. A section that throws while
 * rendering is replaced by a notice; the rest of the page keeps working.
 */
export function ExtensionActivitySections() {
  const sections = useExtensionActivitySections();
  return (
    <>
      {sections.map(({ id, component: Section }) => (
        <SectionBoundary key={id} id={id}>
          <Section />
        </SectionBoundary>
      ))}
    </>
  );
}
