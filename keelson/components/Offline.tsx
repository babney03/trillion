"use client";

import { useEffect } from "react";

// Registers the service worker that keeps the app usable with no signal.
export default function Offline() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (location.hostname === "localhost" && process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
