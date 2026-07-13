'use client';
import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

export default function ProgressBarProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ProgressBar
        height="4px"
        color="#f59e0b"
        options={{ showSpinner: false }}
        shallowRouting
      />
    </>
  );
}
