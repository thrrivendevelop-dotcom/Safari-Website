import { useCallback, useEffect, useState } from "react";

const KEY = "rtc_hotels";
const EVENT = "rtc:hotels-updated";

function read() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota */ }
  window.dispatchEvent(new Event(EVENT));
}

export function useHotels() {
  const [hotels, setHotels] = useState(() => read());
  useEffect(() => {
    const handler = () => setHotels(read());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const addHotel = useCallback((h) => {
    const next = [{ ...h, id: `h_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, created_at: new Date().toISOString() }, ...read()];
    write(next); setHotels(next);
  }, []);
  const updateHotel = useCallback((id, patch) => {
    const next = read().map((h) => h.id === id ? { ...h, ...patch } : h);
    write(next); setHotels(next);
  }, []);
  const removeHotel = useCallback((id) => {
    const next = read().filter((h) => h.id !== id);
    write(next); setHotels(next);
  }, []);

  return { hotels, addHotel, updateHotel, removeHotel };
}
