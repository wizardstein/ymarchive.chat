// Cross-session profile merger. Takes the parsed YMProfile[] from multiple
// cached archive sessions and combines them into a single deduped result.
// Username and peer matching is case-insensitive (YM usernames were
// case-insensitive on the protocol; old folder backups vary in case). Pure
// and isomorphic — no DOM/Storage access.

import type { YMConversation, YMMessage, YMProfile } from "./types";
import { compareMessages, dedupeMessages } from "./zipParser";

interface PeerBucket {
  displayPeer: string;
  messages: YMMessage[];
}

interface ProfileBucket {
  displayUsername: string;
  peers: Map<string, PeerBucket>;
  avatarHistory: string[];
  avatarSeen: Set<string>;
}

function getOrCreateProfileBucket(
  buckets: Map<string, ProfileBucket>,
  username: string,
): ProfileBucket {
  const key = username.toLowerCase();
  let b = buckets.get(key);
  if (!b) {
    b = {
      displayUsername: username,
      peers: new Map(),
      avatarHistory: [],
      avatarSeen: new Set(),
    };
    buckets.set(key, b);
  }
  return b;
}

function getOrCreatePeerBucket(
  bucket: ProfileBucket,
  peer: string,
): PeerBucket {
  const key = peer.toLowerCase();
  let p = bucket.peers.get(key);
  if (!p) {
    p = { displayPeer: peer, messages: [] };
    bucket.peers.set(key, p);
  }
  return p;
}

export function mergeProfiles(sources: YMProfile[][]): YMProfile[] {
  const buckets = new Map<string, ProfileBucket>();

  for (const profiles of sources) {
    for (const profile of profiles) {
      const bucket = getOrCreateProfileBucket(buckets, profile.username);

      for (const conv of profile.conversations) {
        const peerBucket = getOrCreatePeerBucket(bucket, conv.peer);
        for (const m of conv.messages) peerBucket.messages.push(m);
      }

      for (const url of profile.avatarHistory) {
        if (!bucket.avatarSeen.has(url)) {
          bucket.avatarSeen.add(url);
          bucket.avatarHistory.push(url);
        }
      }
      if (profile.avatarUrl && !bucket.avatarSeen.has(profile.avatarUrl)) {
        bucket.avatarSeen.add(profile.avatarUrl);
        bucket.avatarHistory.push(profile.avatarUrl);
      }
    }
  }

  const merged: YMProfile[] = [];
  for (const bucket of buckets.values()) {
    const conversations: YMConversation[] = [];
    for (const peerBucket of bucket.peers.values()) {
      peerBucket.messages.sort(compareMessages);
      const deduped = dedupeMessages(peerBucket.messages);
      if (deduped.length > 0) {
        conversations.push({ peer: peerBucket.displayPeer, messages: deduped });
      }
    }
    conversations.sort((a, b) => b.messages.length - a.messages.length);
    if (conversations.length === 0 && bucket.avatarHistory.length === 0) continue;

    const avatarUrl =
      bucket.avatarHistory.length > 0
        ? bucket.avatarHistory[bucket.avatarHistory.length - 1]
        : null;

    merged.push({
      username: bucket.displayUsername,
      avatarUrl,
      avatarHistory: bucket.avatarHistory,
      conversations,
    });
  }

  merged.sort((a, b) => {
    const ca = a.conversations.reduce((s, c) => s + c.messages.length, 0);
    const cb = b.conversations.reduce((s, c) => s + c.messages.length, 0);
    return cb - ca;
  });

  return merged;
}
