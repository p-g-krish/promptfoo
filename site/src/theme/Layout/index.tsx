import EventsBanner from '@site/src/components/EventsBanner';
import type { Props } from '@theme/Layout';
import OriginalLayout from '@theme-original/Layout';

export default function Layout(props: Props): JSX.Element {
  return (
    <>
      <EventsBanner />
      <OriginalLayout {...props} />
    </>
  );
}
