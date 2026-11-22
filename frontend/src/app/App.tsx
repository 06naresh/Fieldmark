import { AppRouter } from '@/app/router';
import { ServiceWorkerUpdateBanner } from '@/pwa/components/ServiceWorkerUpdateBanner';

export function App(): React.JSX.Element {
  return (
    <>
      <ServiceWorkerUpdateBanner />
      <AppRouter />
    </>
  );
}
