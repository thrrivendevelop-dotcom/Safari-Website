import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "rtc_site_images";
const EVENT = "rtc:images-updated";

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeStore(map) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* quota */ }
}

const Ctx = createContext({ images: {}, setImage: () => {}, removeImage: () => {} });

export function SiteImagesProvider({ children }) {
  const [images, setImages] = useState(() => readStore());

  useEffect(() => {
    const handler = () => setImages(readStore());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setImage = useCallback((key, dataUrl) => {
    const next = { ...readStore(), [key]: dataUrl };
    writeStore(next);
    setImages(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const removeImage = useCallback((key) => {
    const cur = readStore();
    delete cur[key];
    writeStore(cur);
    setImages(cur);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return <Ctx.Provider value={{ images, setImage, removeImage }}>{children}</Ctx.Provider>;
}

export function useSiteImage(key, fallback = null) {
  const { images } = useContext(Ctx);
  return images[key] || fallback;
}

export function useSiteImages() {
  return useContext(Ctx);
}
