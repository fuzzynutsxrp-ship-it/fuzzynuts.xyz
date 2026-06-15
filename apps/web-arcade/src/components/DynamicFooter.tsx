'use client';

import dynamic from 'next/dynamic';

const Footer = dynamic(
  () => import('@/components/layout/Footer').then((m) => ({ default: m.Footer })),
  { ssr: false },
);

export default function DynamicFooter() {
  return <Footer />;
}
