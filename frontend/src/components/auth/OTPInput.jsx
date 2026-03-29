import React, { useRef, useEffect } from 'react';

export default function OTPInput({ value, onChange, length = 6 }) {
  const inputs = useRef([]);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  const handleChange = (e, idx) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    const chars = value.split('');
    chars[idx] = char;
    const next = chars.join('').slice(0, length);
    onChange(next);
    if (char && idx < length - 1) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      if (!value[idx] && idx > 0) {
        inputs.current[idx - 1]?.focus();
        const chars = value.split('');
        chars[idx - 1] = '';
        onChange(chars.join(''));
      }
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < length - 1) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-3">Verification code</label>
      <div className="flex gap-3">
        {Array.from({ length }).map((_, idx) => (
          <input
            key={idx}
            ref={el => inputs.current[idx] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[idx] || ''}
            onChange={e => handleChange(e, idx)}
            onKeyDown={e => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            className="flex-1 aspect-square text-center text-xl font-bold bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition caret-transparent"
          />
        ))}
      </div>
    </div>
  );
}
