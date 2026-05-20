'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function TrialBanner({ days, locale }: { days: number; locale: string }) {
  const t = useTranslations('billing');
  const [loading, setLoading] = useState(false);

  async function upgrade() {
    setLoading(true);
    const res = await fetch('/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ locale }) });
    const { url } = await res.json();
    if (url) location.href = url;
    setLoading(false);
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-fjord-600 to-glacier-700 text-white p-4 flex items-center justify-between gap-4">
      <p className="font-medium">{t('trialBanner', { days })}</p>
      <button className="btn bg-white text-fjord-700 font-semibold hover:bg-fjord-50" onClick={upgrade} disabled={loading}>
        {loading ? '…' : t('upgrade')}
      </button>
    </div>
  );
}
