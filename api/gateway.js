// Satu-satunya Vercel Function proyek ini. Rute diatur di vercel.json (rewrites).
import { gateway } from '../server/gateway.mjs';

export default {
  fetch(request) {
    return gateway(request);
  },
};
