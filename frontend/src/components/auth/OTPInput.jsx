import React from 'react';

export default function OTPInput({ value, onChange, length = 6 }) {
  const handleChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(val);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        Verification code
      </label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={length}
        value={value}
        onChange={handleChange}
        placeholder="Enter 6-digit code"
        className="w-full bg-zinc-800 border border-zinc-700 text-white text-center text-2xl font-bold tracking-[0.5em] rounded-xl py-4 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition placeholder:text-zinc-600 placeholder:text-base placeholder:tracking-normal"
      />
      <p className="text-xs text-zinc-500 mt-2 text-center">
        Please enter the {length}-digit code sent to your email.
      </p>
    </div>
  );
}
