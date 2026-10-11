import { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import { useFeatures } from '@/boot';
import { DataProvider } from '@/data';
import { useExtensionPages } from '@/extensions';
import { AppShell } from '@/shell/AppShell';
import { Page } from '@/ui/Page';
import { Skeleton } from '@/ui/Skeleton';
import { ToastProvider } from '@/ui/Toast';
import HomePage from '@/pages/HomePage';

const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const ServiceDetailPage = lazy(() => import('@/pages/ServiceDetailPage'));
const SystemPage = lazy(() => import('@/pages/SystemPage'));
const StoragePage = lazy(() => import('@/pages/StoragePage'));
const ActivityPage = lazy(() => import('@/pages/ActivityPage'));
const MorePage = lazy(() => import('@/pages/MorePage'));
const DiagnosticsPage = lazy(() => import('@/pages/DiagnosticsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function RouteFallback() {
  return (
    <Page>
      <Skeleton width={160} height={36} radius={10} />
    </Page>
  );
}

/** Routes of the pages this instance has; a page whose feature is off is simply not routed. */
function Routes() {
  const features = useFeatures();
  const extensionPages = useExtensionPages();
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/services/:id" component={ServiceDetailPage} />
      {features.system && <Route path="/system" component={SystemPage} />}
      {features.storage && <Route path="/storage" component={StoragePage} />}
      {features.activity && <Route path="/activity" component={ActivityPage} />}
      <Route path="/more" component={MorePage} />
      <Route path="/more/diagnostics" component={DiagnosticsPage} />
      {extensionPages.map((page) => (
        <Route key={page.path} path={page.path} component={page.component} />
      ))}
      <Route component={NotFoundPage} />
    </Switch>
  );
}

export default function App() {
  return (
    <DataProvider>
      <ToastProvider>
        <AppShell>
          <Suspense fallback={<RouteFallback />}>
            <Routes />
          </Suspense>
        </AppShell>
      </ToastProvider>
    </DataProvider>
  );
}
