/**
 * Dramabox Streaming API service
 * Powered by NexaDev Dramabox Endpoints
 * Private Master Key handled securely (never shown in UI)
 */

export const DRAMABOX_API_HOST = 'https://api.nexadev.my.id/api';

export interface DramaItem {
  id: string;
  title: string;
  cover: string;
  intro?: string;
  chapterCount?: number;
  tags?: string[];
  category?: string;
  views?: string;
  updated?: string;
  author?: string;
  url: string;
}

export interface DramaCategory {
  id: number;
  name: string;
  replaceName: string;
  url?: string;
}

export interface DramaEpisode {
  index: number;
  id: string;
  name: string;
  indexStr?: string;
  duration?: number;
  cover?: string;
  mp4?: string | null;
  videoUrl: string;
  unlock?: boolean;
}

export interface DramaDetailData {
  book: DramaItem;
  episodes: DramaEpisode[];
  totalEpisodes?: number;
}

export function sanitizeDramaboxError(msg: any): string {
  if (!msg) return 'Terjadi kendala saat memuat drama.';
  const str = typeof msg === 'string' ? msg : msg.message || String(msg);
  return str
    .replace(/key=[^&\s]+/gi, 'key=***')
    .replace(/\bNexaDev\b/gi, 'Server');
}

/**
 * Universal fetch with proxy support for both Vite dev and Netlify / Vercel
 */
function isRecord(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function payloadNodes(payload: unknown): Record<string, any>[] { const nodes:Record<string,any>[]=[], q:unknown[]=[payload], seen=new Set<unknown>(); while(q.length&&nodes.length<40){const v=q.shift();if(!isRecord(v)||seen.has(v))continue;seen.add(v);nodes.push(v);for(const k of ['data','result','response','payload'])if(v[k]!=null)q.push(v[k]);}return nodes; }
function findArray(payload: unknown, keys: string[]): any[] { const q:unknown[]=[payload],seen=new Set<unknown>();while(q.length){const v=q.shift();if(Array.isArray(v))return v;if(!isRecord(v)||seen.has(v))continue;seen.add(v);for(const k of keys)if(Array.isArray(v[k]))return v[k];for(const k of ['data','result','response','payload'])if(v[k]!=null)q.push(v[k]);}return []; }
function firstValue(...values:unknown[]):string { for(const v of values){if(typeof v==='string'&&v.trim())return v.trim();if(typeof v==='number'&&Number.isFinite(v))return String(v);}return ''; }
function mapDramaItem(b:any):DramaItem { const x=isRecord(b?.book)?b.book:(b||{});const id=firstValue(x.id,x.bookId,x.book_id,x.idStr);return {id:id||firstValue(x.url,x.link,x.title,x.name),title:firstValue(x.title,x.name,x.bookName)||'Drama Tanpa Judul',cover:firstValue(x.cover,x.coverUrl,x.cover_url,x.thumbnail,x.thumb,x.image),intro:firstValue(x.intro,x.description,x.desc,x.synopsis),chapterCount:Number(x.chapterCount||x.totalChapter||x.episodes||x.totalEpisodes||0),tags:Array.isArray(x.tags)?x.tags:Array.isArray(x.genre)?x.genre:[],category:firstValue(x.category,x.genreName,x.type),views:firstValue(x.views,x.viewCount),updated:firstValue(x.updated,x.updateTime),author:firstValue(x.author,x.writer),url:firstValue(x.url,x.link,x.detailUrl,x.bookUrl,x.id?String(x.id):'')}; }
function apiErrorMessage(data:any):string|undefined { for(const n of payloadNodes(data)){const m=firstValue(n.message,n.msg,n.error?.message,n.error);if(m)return m;}return undefined; }
async function fetchDramabox(endpointPath:string, queryParams:Record<string,string|number>={}):Promise<any>{
 // Kunci API ditambahkan oleh server (fungsi server), bukan oleh browser.
 const params=new URLSearchParams();for(const [k,v] of Object.entries(queryParams))if(v!==undefined&&v!==null&&v!=='')params.set(k,String(v));
 const query=params.toString(), url=`/media-api${endpointPath}${query?`?${query}`:''}`;
 const res=await fetch(url,{headers:{Accept:'application/json, text/plain, */*'},cache:'no-store'});const body=await res.text();const ct=(res.headers.get('content-type')||'').toLowerCase();
 if(ct.includes('text/html')||/^\s*<!doctype html|^\s*<html[\s>]/i.test(body))throw new Error('Proxy API mengirim halaman HTML, bukan data DramaBox. Periksa aturan media-api pada deployment.');
 let data:any;try{data=body?JSON.parse(body):{};}catch{throw new Error(`Respons DramaBox bukan JSON (HTTP ${res.status}).`);}
 if(!res.ok)throw new Error(apiErrorMessage(data)||`Server DramaBox gagal dengan HTTP ${res.status}.`);
 if(data?.success===false||data?.status===false||data?.ok===false)throw new Error(apiErrorMessage(data)||'Layanan DramaBox menolak permintaan.');
 return data;
}

/**
 * Fetches Dramabox Homepage (Featured carousels and trending sections)
 */
export async function getDramaboxHome(): Promise<{ featured: DramaItem[]; sections: { id: number; name: string; items: DramaItem[] }[] }> {
 const data=await fetchDramabox('/dramabox/home');const featured=findArray(data,['featured','banners','banner','featuredBooks','recommendations']).map(mapDramaItem);const sections=findArray(data,['sections','moduleList','blocks']).map((sec:any,i:number)=>({id:Number(sec.id??sec.typeId??i),name:firstValue(sec.name,sec.title,sec.moduleName)||'Drama Pilihan',items:findArray(sec,['items','books','list','videos']).map(mapDramaItem)}));return {featured,sections};
}
export async function getDramaboxCategories(): Promise<DramaCategory[]> { const data=await fetchDramabox('/dramabox/categories');return findArray(data,['types','categories','categoryList','list','items']).map((t:any,i:number)=>({id:Number(t.id??t.typeId??t.typeTwoId??i),name:firstValue(t.name,t.title,t.typeName)||'Kategori',replaceName:firstValue(t.replaceName,t.name,t.title),url:firstValue(t.url,t.link)||undefined})); }
export async function getDramaboxBrowse(typeId:number=0,page:number=1):Promise<{books:DramaItem[];pageNo:number;pages:number}>{const data=await fetchDramabox('/dramabox/browse',{typeId,page});const books=findArray(data,['books','items','list','results','videos']).map(mapDramaItem);const meta=payloadNodes(data).find(n=>n.pageNo!==undefined||n.pages!==undefined||n.totalPages!==undefined)||{};return {books,pageNo:Number(meta.pageNo??meta.page??page),pages:Number(meta.pages??meta.totalPages??meta.totalPage??1)};}
export async function searchDramabox(query:string):Promise<DramaItem[]>{if(!query.trim())return [];const data=await fetchDramabox('/dramabox/search',{q:query.trim()});return findArray(data,['books','items','list','results','videos']).map(mapDramaItem);}

/**
 * Fetches Drama Detail including Book Info and Episode List
 */
export async function getDramaboxDetail(dramaUrl: string): Promise<DramaDetailData> {
  const response = await fetchDramabox('/dramabox/detail', { url: dramaUrl.trim() });
  const data = payloadNodes(response).find(n => n.book || n.episodes || n.chapters) || response;
  const b = data.book || data.item || {};
  const episodeRows = findArray(data, ['episodes','chapters','chapterList','list']);
  if (b && (b.title || b.name || episodeRows.length)) {
    const book: DramaItem = {
      id: String(b.id || ''),
      title: b.title || 'Drama Detail',
      cover: b.cover || '',
      intro: b.intro || '',
      chapterCount: b.chapterCount || b.totalChapter || data.total || 0,
      tags: Array.isArray(b.tags) ? b.tags : [],
      category: b.category || '',
      views: b.views || '',
      updated: b.updated || '',
      author: b.author || '',
      url: b.url || dramaUrl,
    };

    const episodes: DramaEpisode[] = episodeRows.map((ep: any, idx: number) => ({
      index: ep.index !== undefined ? Number(ep.index) : idx + 1,
      id: String(ep.id || idx + 1),
      name: firstValue(ep.name, ep.title, ep.chapterName) || `Episode ${ep.index || idx + 1}`,
      indexStr: ep.indexStr || String(idx + 1).padStart(3, '0'),
      duration: ep.duration || 0,
      cover: ep.cover || '',
      mp4: ep.mp4 || null,
      videoUrl: firstValue(ep.videoUrl, ep.video_url, ep.playUrl, ep.url, ep.link),
      unlock: ep.unlock !== false,
    }));

    return {
      book,
      episodes,
      totalEpisodes: Number(data.total || data.totalEpisodes || episodes.length),
    };
  }
  throw new Error('Gagal memuat detail drama.');
}

/**
 * Fetches direct video streaming link for an episode
 */
export async function getDramaboxEpisodeVideo(episodeVideoUrl:string):Promise<{mp4Url?:string;episodes:DramaEpisode[];book?:DramaItem}>{
 const response=await fetchDramabox('/dramabox/video',{url:episodeVideoUrl.trim()});const data=payloadNodes(response).find(n=>n.episodes||n.chapters||n.book)||response;const rows=findArray(data,['episodes','chapters','chapterList','list']);
 if(rows.length||data.book||data.mp4Url||data.mp4){const episodes:DramaEpisode[]=rows.map((ep:any,i:number)=>({index:ep.index!==undefined?Number(ep.index):i+1,id:firstValue(ep.id,ep.chapterId,ep.chapter_id)||String(i+1),name:firstValue(ep.name,ep.title,ep.chapterName)||`Episode ${ep.index||i+1}`,indexStr:firstValue(ep.indexStr,ep.chapterIndex)||String(i+1).padStart(3,'0'),duration:Number(ep.duration||0),cover:firstValue(ep.cover,ep.thumbnail,ep.image),mp4:firstValue(ep.mp4,ep.mp4Url,ep.video)||null,videoUrl:firstValue(ep.videoUrl,ep.video_url,ep.playUrl,ep.url,ep.link),unlock:ep.unlock!==false}));const current=episodes.find(e=>e.videoUrl===episodeVideoUrl||episodeVideoUrl.includes(e.id));return {mp4Url:firstValue(data.mp4Url,data.mp4,data.videoUrl,data.playUrl,current?.mp4,episodes[0]?.mp4)||undefined,episodes,book:data.book?mapDramaItem(data.book):undefined};}
 throw new Error('Gagal memuat tautan video episode DramaBox.');
}
