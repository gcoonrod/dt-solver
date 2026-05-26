"use client";

import { useEffect, useRef, useCallback } from "react";

import { useTimingStore } from "@/store/useTimingStore";

const AUTO_SAVE_DELAY_MS = 2000;

export function usePersistence() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const store = useTimingStore.getState();
    store.fetchProfileList().then(() => {
      if (!mountedRef.current) return;
      const list = useTimingStore.getState().profileList;
      if (list.length > 0) {
        store.loadProfile(list[0].id);
      } else {
        useTimingStore.setState({ isLoading: false });
      }
    });
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const unsub = useTimingStore.subscribe((state, prev) => {
      if (state.isDirty && !prev.isDirty && state.profileId) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            useTimingStore.getState().saveProfile();
          }
        }, AUTO_SAVE_DELAY_MS);
      }
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    useTimingStore.getState().saveProfile();
  }, []);

  return { saveNow };
}
