import { LandingPage } from '@/components/landing-page';
import { AuthenticatedHomeRedirect } from '@/components/authenticated-home-redirect';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '',
  url: 'https://music.dcintelix.rw',
  description: 'Connect, discover and grow with Rwanda’s music industry.',
  parentOrganization: {
    '@type': 'Organization',
    name: 'DCINTELIX',
  },
};

export default function HomePage() {
  return (
    <>
      <AuthenticatedHomeRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
