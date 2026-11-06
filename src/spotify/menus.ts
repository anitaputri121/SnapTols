// Isi menu ⋯ untuk satu lagu, menu negara, dan aksi pembuatan playlist.
import { Track, COUNTRIES, flag, getCC, setCC } from './catalog';
import { engine } from './engine';
import { library, libStore, isLiked } from './library';
import { openSheet, closeSheet, openPrompt, router, toast, SheetItem } from './uiStore';

export async function createPlaylistFlow(then?: (id: string) => void) {
  const n = libStore.get().playlists.length + 1;
  const name = await openPrompt('Playlist baru', 'Nama playlist', 'Playlist saya #' + n);
  if (!name) return null;
  const p = library.createPlaylist(name);
  toast('Playlist dibuat');
  then?.(p.id);
  return p;
}

function playlistPicker(t: Track) {
  const items: SheetItem[] = [
    {
      label: 'Playlist baru…',
      icon: 'plus',
      onSelect: async () => {
        closeSheet();
        const p = await createPlaylistFlow();
        if (p) {
          library.addToPlaylist(p.id, t);
          toast('Ditambahkan ke “' + p.name + '”');
        }
      },
    },
    'sep',
  ];
  libStore.get().playlists.forEach((p) =>
    items.push({
      label: p.name,
      icon: p.tracks.some((x) => x.id === t.id) ? 'check' : 'music',
      active: p.tracks.some((x) => x.id === t.id),
      onSelect: () => {
        closeSheet();
        toast(library.addToPlaylist(p.id, t) ? 'Ditambahkan ke “' + p.name + '”' : 'Sudah ada di “' + p.name + '”');
      },
    }),
  );
  openSheet('Tambah ke playlist', items, t.title);
}

export function openTrackMenu(t: Track, opts: { playlistId?: string } = {}) {
  const items: SheetItem[] = [
    { label: 'Putar sekarang', icon: 'play', onSelect: () => { closeSheet(); engine.playList([t], 0, 'Lagu'); } },
    { label: 'Putar berikutnya', icon: 'queue', onSelect: () => { closeSheet(); toast(engine.addToQueue(t, true) === 'started' ? 'Memutar lagu' : 'Akan diputar berikutnya'); } },
    { label: 'Tambah ke antrean', icon: 'plus', onSelect: () => { closeSheet(); toast(engine.addToQueue(t, false) === 'started' ? 'Memutar lagu' : 'Ditambahkan ke antrean'); } },
    'sep',
    {
      label: isLiked(t.id) ? 'Hapus dari Lagu yang Disukai' : 'Simpan ke Lagu yang Disukai',
      icon: 'heart',
      active: isLiked(t.id),
      onSelect: () => { closeSheet(); toast(library.toggleLike(t) ? 'Ditambahkan ke Lagu yang Disukai' : 'Dihapus dari Lagu yang Disukai'); },
    },
    { label: 'Tambah ke playlist…', icon: 'list', onSelect: () => playlistPicker(t) },
  ];
  if (opts.playlistId) {
    items.push({
      label: 'Hapus dari playlist ini',
      icon: 'trash',
      danger: true,
      onSelect: () => { closeSheet(); library.removeFromPlaylist(opts.playlistId as string, t.id); toast('Dihapus dari playlist'); },
    });
  }
  items.push('sep');
  if (t.artistId) items.push({ label: 'Buka artis', icon: 'user', onSelect: () => { closeSheet(); router.go('artist', t.artistId, t.artist); } });
  if (t.albumId) items.push({ label: 'Buka album', icon: 'disc', onSelect: () => { closeSheet(); router.go('album', t.albumId, t.album); } });
  openSheet(t.title, items, t.artist);
}

export function openCountryMenu(onChange: () => void) {
  const items: SheetItem[] = [
    ...COUNTRIES.map(([cc, name]): SheetItem => ({
      label: `${flag(cc)}  ${name}`,
      active: cc === getCC(),
      onSelect: () => { setCC(cc); closeSheet(); toast('Katalog: ' + name); onChange(); },
    })),
  ];
  openSheet('Negara katalog', items, 'Mempengaruhi tangga lagu dan hasil pencarian');
}
