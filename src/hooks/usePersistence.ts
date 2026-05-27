"use client";

import { useEffect, useRef, useCallback } from "react";

import { useTimingStore } from "@/store/useTimingStore";

const AUTO_SAVE_DELAY_MS = 2000;

export function usePersistence() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const prevSignalsRef = useRef<unknown>(null);
  const prevConstraintsRef = useRef<unknown>(null);

  useEffect(() => {
    mountedRef.current = true;
    const store = useTimingStore.getState();
    store.fetchICLibrary().catch(() => {});
    store.fetchProfileList().then(async () => {
      if (!mountedRef.current) return;
      const list = useTimingStore.getState().profileList;
      if (list.length > 0) {
        await store.loadProfile(list[0].id);
      } else {
        useTimingStore.setState({ isLoading: false });
      }
    }).catch(() => {
      if (mountedRef.current) {
        useTimingStore.setState({ isLoading: false });
      }
    });
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const s = useTimingStore.getState();
    prevSignalsRef.current = s.signals;
    prevConstraintsRef.current = s.constraints;

    const unsub = useTimingStore.subscribe((state) => {
      if (!state.isDirty || !state.profileId) return;
      const signalsChanged = state.signals !== prevSignalsRef.current;
      const constraintsChanged = state.constraints !== prevConstraintsRef.current;
      if (!signalsChanged && !constraintsChanged) return;

      prevSignalsRef.current = state.signals;
      prevConstraintsRef.current = state.constraints;
      const targetProfileId = state.profileId;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        const current = useTimingStore.getState();
        if (current.isDirty && current.profileId === targetProfileId) {
          current.saveProfile();
        }
      }, AUTO_SAVE_DELAY_MS);
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    return useTimingStore.getState().saveProfile();
  }, []);

  return { saveNow };
}
