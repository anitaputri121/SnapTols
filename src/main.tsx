import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ServerErrorScreen, { SHOW_SERVER_ERROR } from './components/ServerErrorScreen.tsx';
import './index.css';

// Saat SHOW_SERVER_ERROR = true (lihat ServerErrorScreen.tsx), web langsung menampilkan
// layar ERROR yang tidak bisa ditutup. Ubah ke false untuk membuka web seperti biasa.
createRoot(document.getElementById('root')!).render(
  SHOW_SERVER_ERROR ? <ServerErrorScreen /> : <App />
);
