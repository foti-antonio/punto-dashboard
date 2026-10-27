import { tr, useLanguage } from './i18n';
import { useEffect, useState } from 'react';
import { Leaf } from 'lucide-react';
import { today } from './domain';
import { getDailyQuote } from './quotes';

export function DailyQuote() {
  const { language } = useLanguage();
  const [date, setDate] = useState(today);
  const quote = getDailyQuote(date, language);

  useEffect(() => {
    const refresh = () => setDate(today());
    const onVisibilityChange = () => {
      if (!document.hidden) refresh();
    };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, []);

  return (
    <figure
      className="sidebar-note"
      aria-label={tr('Citazione stoica del giorno')}
    >
      <span className="note-icon" aria-hidden="true">
        <Leaf size={18} />
      </span>
      <blockquote cite={quote.source}>
        <strong>«{quote.text}»</strong>
      </blockquote>
      <figcaption title={quote.reference}>{quote.author}</figcaption>
      <span className="note-decoration" aria-hidden="true">
        ↗
      </span>
    </figure>
  );
}
