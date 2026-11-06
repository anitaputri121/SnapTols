// Koleksi pribadi (tersimpan di perangkat): suka, riwayat, playlist, artis diikuti, pencarian terakhir.
import { createStore, ls } from './store';
import { Track, ArtistLite, regTrack } from './catalog';

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

interface LibState {
  liked: Track[];
  recent: Track[];
  playlists: Playlist[];
  follow: ArtistLite[];
  searches: string[];
}

const init: LibState = {
  liked: ls.get<Track[]>('liked', []),
  recent: ls.get<Track[]>('recent', []),
  playlists: ls.get<Playlist[]>('pls', []),
  follow: ls.get<ArtistLite[]>('follow', []),
  searches: ls.get<string[]>('searches', []),
};
[...init.liked, ...init.recent, ...init.playlists.flatMap((p) => p.tracks)].forEach(regTrack);

export const libStore = createStore<LibState>(init);

const save = () => {
  const s = libStore.get();
  ls.set('liked', s.liked);
  ls.set('recent', s.recent);
  ls.set('pls', s.playlists);
  ls.set('follow', s.follow);
  ls.set('searches', s.searches);
};

export const isLiked = (id: string) => libStore.get().liked.some((t) => t.id === id);

export const library = {
  toggleLike(t: Track): boolean {
    const s = libStore.get();
    const on = !s.liked.some((x) => x.id === t.id);
    libStore.set({ liked: on ? [t, ...s.liked] : s.liked.filter((x) => x.id !== t.id) });
    save();
    return on;
  },
  pushRecent(t: Track) {
    const s = libStore.get();
    libStore.set({ recent: [t, ...s.recent.filter((x) => x.id !== t.id)].slice(0, 50) });
    save();
  },
  createPlaylist(name: string): Playlist {
    const p: Playlist = { id: 'p' + Date.now().toString(36), name, tracks: [] };
    libStore.set({ playlists: [p, ...libStore.get().playlists] });
    save();
    return p;
  },
  renamePlaylist(id: string, name: string) {
    libStore.set({ playlists: libStore.get().playlists.map((p) => (p.id === id ? { ...p, name } : p)) });
    save();
  },
  deletePlaylist(id: string) {
    libStore.set({ playlists: libStore.get().playlists.filter((p) => p.id !== id) });
    save();
  },
  addToPlaylist(id: string, t: Track): boolean {
    const p = libStore.get().playlists.find((x) => x.id === id);
    if (!p || p.tracks.some((x) => x.id === t.id)) return false;
    libStore.set({ playlists: libStore.get().playlists.map((x) => (x.id === id ? { ...x, tracks: [...x.tracks, t] } : x)) });
    save();
    return true;
  },
  removeFromPlaylist(id: string, trackId: string) {
    libStore.set({
      playlists: libStore.get().playlists.map((x) => (x.id === id ? { ...x, tracks: x.tracks.filter((t) => t.id !== trackId) } : x)),
    });
    save();
  },
  toggleFollow(a: ArtistLite): boolean {
    const s = libStore.get();
    const on = !s.follow.some((x) => x.id === a.id);
    libStore.set({ follow: on ? [a, ...s.follow] : s.follow.filter((x) => x.id !== a.id) });
    save();
    return on;
  },
  pushSearch(q: string) {
    libStore.set({ searches: [q, ...libStore.get().searches.filter((x) => x !== q)].slice(0, 10) });
    save();
  },
  clearSearches() {
    libStore.set({ searches: [] });
    save();
  },
};
