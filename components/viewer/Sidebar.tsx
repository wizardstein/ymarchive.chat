"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { colorFor, initialsFor } from "@/lib/avatar";
import type { YMProfile } from "@/lib/types";

interface SidebarProps {
  profile: YMProfile;
  profileCount: number;
  activePeer: string | null;
  onSelectPeer: (peer: string) => void;
  onSwitchProfile: () => void;
  onReset: () => void;
}

export function Sidebar({
  profile,
  profileCount,
  activePeer,
  onSelectPeer,
  onSwitchProfile,
  onReset,
}: SidebarProps) {
  const [filter, setFilter] = useState("");

  const filteredConvos = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return profile.conversations;
    return profile.conversations.filter((c) =>
      c.peer.toLowerCase().includes(f),
    );
  }, [profile, filter]);

  const totalMessages = profile.conversations.reduce(
    (s, c) => s + c.messages.length,
    0,
  );

  return (
    <aside className="flex h-full w-full flex-col border-slate-200 bg-white md:w-72 md:flex-none md:border-r">
      <div className="border-b border-slate-200 p-3">
        <button
          onClick={onReset}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-500 hover:border-ym-purple hover:text-ym-purple"
        >
          ← Open a different archive
        </button>
      </div>

      <div className="flex items-center gap-3 border-b border-slate-200 p-3">
        <ProfileAvatar profile={profile} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">
            {profile.username}
          </div>
          <div className="truncate text-[11px] text-slate-500">
            {totalMessages.toLocaleString()} messages
          </div>
        </div>
        {profileCount > 1 && (
          <button
            onClick={onSwitchProfile}
            title="Switch to another profile in this archive"
            className="flex-none rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-ym-purple hover:text-ym-purple"
          >
            Switch
          </button>
        )}
      </div>

      <div className="border-b border-slate-200 p-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search contacts…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-ym-purple focus:outline-none focus:ring-1 focus:ring-ym-purple"
        />
      </div>

      <div className="scrollbar-slim flex-1 overflow-y-auto">
        {filteredConvos.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">No conversations match.</p>
        ) : null}
        {filteredConvos.length > 0 && (
          <ul>
            {filteredConvos.map((c) => {
              const active = c.peer === activePeer;
              const last = c.messages[c.messages.length - 1];
              return (
                <li key={c.peer}>
                  <button
                    onClick={() => onSelectPeer(c.peer)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                      active ? "bg-ym-purple/10" : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: colorFor(c.peer) }}
                    >
                      {initialsFor(c.peer)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {c.peer}
                        </div>
                        <div className="flex-none text-[10px] text-slate-400">
                          {c.messages.length.toLocaleString()}
                        </div>
                      </div>
                      {last && (
                        <div className="truncate text-xs text-slate-500">
                          {last.text.slice(0, 60)}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-200 p-3 text-center">
        <Link
          href="/feedback"
          className="text-[11px] text-slate-400 hover:text-ym-purple"
        >
          💬 Send feedback or report a bug
        </Link>
      </div>
    </aside>
  );
}

function ProfileAvatar({
  profile,
  size,
}: {
  profile: YMProfile;
  size: number;
}) {
  if (profile.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatarUrl}
        alt={profile.username}
        width={size}
        height={size}
        className="flex-none rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{
        width: size,
        height: size,
        background: colorFor(profile.username),
      }}
    >
      {initialsFor(profile.username)}
    </div>
  );
}
