import { useLanguage, tr } from './i18n';
import { useState, type InputHTMLAttributes } from 'react';
import { moneyInput } from './domain';

// Swap decimal and grouping separators together, including incomplete input.
// This preserves the meaning of e.g. English 1,234 and Italian 1.234.
export function localizeMoneyText(text: string) {
  return text.replace(/[.,]/g, (separator) => (separator === '.' ? ',' : '.'));
}
export function MoneyInput({
  defaultCents,
  id,
  'aria-describedby': describedBy,
  ...props
}: Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange'
> & { defaultCents?: number }) {
  const { language } = useLanguage();
  const [input, setInput] = useState(() => ({
    language,
    text: defaultCents === undefined ? '' : moneyInput(defaultCents),
  }));
  let text = input.text;
  if (input.language !== language) {
    text = localizeMoneyText(text);
    setInput({ language, text });
  }
  const hintId = id ? `${id}-decimal` : undefined;
  return (
    <>
      <input
        {...props}
        id={id}
        inputMode="decimal"
        value={text}
        placeholder={moneyInput(0)}
        aria-describedby={
          [describedBy, hintId].filter(Boolean).join(' ') || undefined
        }
        onChange={(event) => setInput({ language, text: event.target.value })}
      />
      <small id={hintId}>
        {tr(
          language === 'en'
            ? 'Usa il punto come separatore decimale (es. 1,234.56).'
            : 'Usa la virgola come separatore decimale (es. 1.234,56).',
        )}
      </small>
    </>
  );
}
