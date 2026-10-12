import { useEffect, useState } from "react";

export function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active]);

  return seconds;
}

export function readingStatus(seconds: number): { title: string; detail: string } {
  if (seconds < 4) return { title: "Uploading your resume…", detail: "Checking the file." };
  if (seconds < 25)
    return { title: "Reading your resume…", detail: "Finding your roles, skills and education." };
  return {
    title: "Still working on it…",
    detail: "The server may be waking up. This can take up to a minute.",
  };
}
