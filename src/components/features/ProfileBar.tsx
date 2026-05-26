"use client";

import { useState } from "react";

import { useTimingStore } from "@/store/useTimingStore";

interface ProfileBarProps {
  saveNow: () => void;
}

export default function ProfileBar({ saveNow }: ProfileBarProps) {
  const profileId = useTimingStore((s) => s.profileId);
  const activeProfile = useTimingStore((s) => s.activeProfile);
  const isDirty = useTimingStore((s) => s.isDirty);
  const isSaving = useTimingStore((s) => s.isSaving);
  const profileList = useTimingStore((s) => s.profileList);
  const loadProfile = useTimingStore((s) => s.loadProfile);
  const createProfile = useTimingStore((s) => s.createProfile);
  const deleteProfile = useTimingStore((s) => s.deleteProfile);

  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProfile(newName.trim());
    setNewName("");
    setShowNewInput(false);
  };

  const handleDelete = async () => {
    if (!profileId) return;
    if (!window.confirm(`Delete "${activeProfile.name}"?`)) return;
    await deleteProfile(profileId);
  };

  const handleSwitch = async (id: string) => {
    setShowSwitcher(false);
    await loadProfile(id);
  };

  return (
    <div className="flex items-center gap-3 px-4 h-10 border-b border-slate-800/60 bg-[#11161e] text-[11px]">
      <div className="relative">
        <button
          onClick={() => setShowSwitcher(!showSwitcher)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-slate-700 hover:border-slate-600 text-slate-300"
        >
          <span className="font-medium truncate max-w-[200px]">{activeProfile.name || "No profile"}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="opacity-50">
            <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        {showSwitcher && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-[#0d1117] border border-slate-700 rounded-sm shadow-lg z-50">
            {profileList.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSwitch(p.id)}
                className={`w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-300 ${
                  p.id === profileId ? "bg-slate-800/50 text-slate-100" : ""
                }`}
              >
                {p.name}
              </button>
            ))}
            {profileList.length === 0 && (
              <div className="px-3 py-2 text-slate-500">No profiles</div>
            )}
          </div>
        )}
      </div>

      {isDirty && (
        <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
      )}

      <button
        onClick={saveNow}
        disabled={!isDirty || isSaving}
        className="px-2 py-1 rounded-sm border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-30 disabled:cursor-default"
      >
        {isSaving ? "Saving…" : "Save"}
      </button>

      <div className="flex-1" />

      {showNewInput ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowNewInput(false); }}
            placeholder="Profile name"
            className="px-2 py-1 rounded-sm border border-slate-700 bg-[#0a0e14] text-slate-300 text-[11px] w-40"
          />
          <button onClick={handleCreate} className="px-2 py-1 text-emerald-400 hover:text-emerald-300">Create</button>
          <button onClick={() => setShowNewInput(false)} className="px-2 py-1 text-slate-500 hover:text-slate-400">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewInput(true)}
          className="px-2 py-1 text-slate-400 hover:text-slate-200"
        >
          + New
        </button>
      )}

      {profileId && (
        <button
          onClick={handleDelete}
          className="px-2 py-1 text-slate-500 hover:text-rose-400"
        >
          Delete
        </button>
      )}
    </div>
  );
}
