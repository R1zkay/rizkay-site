import { CONFIG } from './config.js';
import {initLanguage, applyLanguage, tr} from './i18n.js';
import {initPricing, loadServices} from './pricing.js';

const $ = (selector) => document.querySelector(selector);
const demoTrack = {
  id: 'studio-demo', title: 'RIZKAY sound demo — before / after',
  artist: 'Synthetic sound sample', genre: 'Electronic demo', bpm: 110,
  notes: 'Original, generated demo audio — not client work.',
  raw_url: './assets/demo-raw.mp3', master_url: './assets/demo-master.mp3',
  isDemo: true, is_published: true,
};
let db = null;
let tracks = [];
let selectedId = null;
let selectedTrack = null;
let adminEnabled = false;
let loadGeneration = 0;
let fetchController = null;
let toastTimeout = null;

const audio = {
  context: null, masterBuffer: null, rawBuffer: null,
  masterNode: null, rawNode: null, masterGain: null, rawGain: null, mainGain: null,
  playing: false, offset: 0, startedAt: 0, duration: 0, mode: 'master', volume: .8,
  peaks: null,
};

function configureBrand() {
  const name=(CONFIG.studioName||'RIZKAY').trim();
  $('#brandName').textContent=name;
  $('#footerBrand').textContent=name;
  document.title=`${name} — Mixing & Mastering`;
  $('#year').textContent=new Date().getFullYear();
  const emailLink=$('#emailLink');
  if (CONFIG.email.trim()) {
    emailLink.href=`mailto:${CONFIG.email.trim()}`;
    emailLink.textContent=CONFIG.email.trim();
    emailLink.removeAttribute('data-i18n');
  } else {
    emailLink.href='#contact';
    emailLink.addEventListener('click',(event)=>{event.preventDefault();$('#quoteStatus').textContent=tr('contactNotSet');});
  }
  if (/^https:\/\//i.test(CONFIG.instagramUrl)) {$('#instagramLink').href=CONFIG.instagramUrl;$('#instagramLink').hidden=false;}
  if (/^\d{7,16}$/.test(CONFIG.whatsappNumber)) {$('#whatsappLink').href=`https://wa.me/${CONFIG.whatsappNumber}`;$('#whatsappLink').hidden=false;}
}
function quoteRequest(event) {
  event.preventDefault();
  if (!CONFIG.email.trim()) { $('#quoteStatus').textContent=tr('contactNotSet');return; }
  const data=new FormData(event.currentTarget);
  const service=$('#quoteService').selectedOptions[0]?.textContent || 'Mixing / Mastering';
  const subject=`RIZKAY — ${service} / ${String(data.get('name')).trim()}`;
  const body=[`Name: ${String(data.get('name')).trim()}`,`Email: ${String(data.get('email')).trim()}`,`Service: ${service}`,`Project: ${String(data.get('message')).trim()}`,`Private listening link: ${String(data.get('link')).trim()}`].join('\n\n');
  $('#quoteStatus').textContent=tr('contactOpen');
  window.location.href=`mailto:${encodeURIComponent(CONFIG.email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function openDialog(id) { const dialog = document.getElementById(id); if (!dialog.open) dialog.showModal(); }
function closeDialog(id) { const dialog = document.getElementById(id); if (dialog.open) dialog.close(); }
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('is-visible');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('is-visible'), 4500);
}
function niceError(error) { return error?.message || String(error || 'Ismeretlen hiba'); }
function two(n) { return String(Math.floor(n || 0)).padStart(2, '0'); }
function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  const s = Math.max(0, Math.floor(seconds));
  return `${two(Math.floor(s / 60))}:${two(s % 60)}`;
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function publicAudioUrl(track, side) {
  if (track.isDemo) return track[`${side}_url`];
  return db.storage.from(CONFIG.bucketName).getPublicUrl(track[`${side}_path`]).data.publicUrl;
}

function trackListNode(track, index) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'catalog-item';
  button.classList.toggle('is-selected', track.id === selectedId);
  button.setAttribute('aria-current', String(track.id === selectedId));
  const num = document.createElement('span'); num.className = 'catalog-number'; num.textContent = two(index + 1);
  const artwork = document.createElement('span'); artwork.className = 'catalog-thumb'; artwork.setAttribute('aria-hidden', 'true');
  [24, 52, 79, 40, 96, 63, 28].forEach((height) => { const bar = document.createElement('span'); bar.style.setProperty('--height', `${height}%`); artwork.append(bar); });
  const info = document.createElement('span');
  const title = document.createElement('span'); title.className = 'catalog-title'; title.textContent = track.isDemo ? tr('demoTrack') : track.title;
  const artist = document.createElement('span'); artist.className = 'catalog-artist'; artist.textContent = track.isDemo ? tr('demoArtist') : track.artist;
  info.append(title, artist);
  const genre = document.createElement('span'); genre.className = 'catalog-genre'; genre.textContent = track.genre || 'MIX / MASTER';
  const arrow = document.createElement('span'); arrow.className = 'catalog-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
  button.append(num, artwork, info, genre, arrow);
  button.addEventListener('click', () => { selectTrack(track); document.getElementById('player').scrollIntoView({behavior:'smooth',block:'center'}); });
  return button;
}
function renderCatalog() {
  $('#catalog').replaceChildren();
  if (!tracks.length) {
    const empty = document.createElement('p'); empty.className = 'empty-catalog';
    empty.textContent = tr('catalogEmpty');
    $('#catalog').append(empty);
  } else tracks.forEach((track, index) => $('#catalog').append(trackListNode(track, index)));
  const count = two(tracks.length);
  $('#trackCount').textContent = count;
  $('#catalogCount').textContent = `(${count})`;
}
function stopNodes() {
  for (const key of ['masterNode', 'rawNode']) {
    const node = audio[key];
    if (node) { try { node.stop(); } catch (_) {} try { node.disconnect(); } catch (_) {} audio[key] = null; }
  }
}
function position() { return audio.playing ? clamp(audio.offset + Math.max(0, audio.context.currentTime - audio.startedAt), 0, audio.duration) : audio.offset; }
function pauseAudio() {
  if (audio.playing) audio.offset = position();
  stopNodes(); audio.playing = false; updatePlayButton(); refreshProgress();
}
function resetAudio() {
  stopNodes(); audio.playing = false; audio.offset = 0; audio.duration = 0;
  audio.rawBuffer = null; audio.masterBuffer = null; audio.peaks = null;
  updatePlayButton(); refreshProgress(); drawWaveform();
}
function updatePlayButton() {
  $('#playIcon').textContent = audio.playing ? 'Ⅱ' : '▶';
  $('#playPause').setAttribute('aria-label', audio.playing ? 'Szünet' : 'Lejátszás');
}
function refreshProgress() {
  const pos = position(), percent = audio.duration ? (pos / audio.duration) : 0;
  $('#seekBar').value = String(Math.round(percent * 1000));
  $('#currentTime').textContent = formatTime(pos);
  $('#totalTime').textContent = formatTime(audio.duration);
  $('#wavePlayhead').style.left = `${clamp(percent, 0, 1) * 100}%`;
  $('#seekBar').style.background = `linear-gradient(to right, var(--lime) ${percent * 100}%, #374143 ${percent * 100}%)`;
}
function setMode(mode) {
  audio.mode = mode;
  $('#modeMaster').classList.toggle('is-active', mode === 'master');
  $('#modeRaw').classList.toggle('is-active', mode === 'raw');
  $('#modeMaster').setAttribute('aria-pressed', String(mode === 'master'));
  $('#modeRaw').setAttribute('aria-pressed', String(mode === 'raw'));
  if (audio.context && audio.masterGain && audio.rawGain) {
    const now = audio.context.currentTime;
    for (const gain of [audio.masterGain.gain, audio.rawGain.gain]) gain.cancelScheduledValues(now);
    audio.masterGain.gain.setTargetAtTime(mode === 'master' ? 1 : 0, now, .008);
    audio.rawGain.gain.setTargetAtTime(mode === 'raw' ? 1 : 0, now, .008);
  }
  $('#waveStatus').textContent = mode === 'master' ? 'A / MASTER' : 'B / RAW';
}
function ensureAudioContext() {
  if (!audio.context) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) throw new Error('Ez a böngésző nem támogatja a Web Audio API-t.');
    audio.context = new AudioCtor();
    audio.masterGain = audio.context.createGain(); audio.rawGain = audio.context.createGain();
    audio.mainGain = audio.context.createGain();
    audio.masterGain.connect(audio.mainGain); audio.rawGain.connect(audio.mainGain);
    audio.mainGain.connect(audio.context.destination);
    audio.mainGain.gain.value = audio.volume;
    audio.masterGain.gain.value = audio.mode === 'master' ? 1 : 0;
    audio.rawGain.gain.value = audio.mode === 'raw' ? 1 : 0;
  }
  return audio.context;
}
function startAudioAt(offset) {
  if (!audio.rawBuffer || !audio.masterBuffer) return;
  const ctx = ensureAudioContext();
  stopNodes();
  if (offset >= audio.duration - .02) offset = 0;
  audio.offset = clamp(offset, 0, Math.max(0, audio.duration - .01));
  const startAt = ctx.currentTime + .025;
  audio.masterNode = ctx.createBufferSource(); audio.masterNode.buffer = audio.masterBuffer;
  audio.rawNode = ctx.createBufferSource(); audio.rawNode.buffer = audio.rawBuffer;
  audio.masterNode.connect(audio.masterGain); audio.rawNode.connect(audio.rawGain);
  audio.masterNode.start(startAt, audio.offset);
  audio.rawNode.start(startAt, audio.offset);
  audio.startedAt = startAt; audio.playing = true; updatePlayButton();
  $('#playerStatus').textContent = tr('playing');
}
async function playAudio() {
  if (audio.playing) { pauseAudio(); return; }
  if (!audio.masterBuffer || !audio.rawBuffer) {
    if (!selectedTrack) return;
    await loadAudioForTrack(selectedTrack);
    if (!audio.masterBuffer || !audio.rawBuffer) return;
  }
  try {
    const ctx = ensureAudioContext(); await ctx.resume(); startAudioAt(audio.offset);
  } catch (error) { toast(`Lejátszási hiba: ${niceError(error)}`); }
}
function seekTo(percent) {
  if (!audio.duration) return;
  const next = clamp(percent, 0, 1) * audio.duration;
  if (audio.playing) startAudioAt(next); else audio.offset = next;
  refreshProgress();
}
function calculatePeaks(buffer, columns) {
  const channel = buffer.getChannelData(0), stride = Math.max(1, Math.floor(channel.length / columns));
  const peaks = [];
  for (let i = 0; i < columns; i++) {
    let peak = 0;
    for (let j = i * stride; j < Math.min((i + 1) * stride, channel.length); j += Math.max(1, Math.floor(stride / 35))) peak = Math.max(peak, Math.abs(channel[j]));
    peaks.push(Math.max(.035, peak));
  }
  return peaks;
}
function drawWaveform() {
  const canvas = $('#waveform'), rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const width = rect.width, height = rect.height, center = height/2;
  ctx.fillStyle = '#223037'; ctx.fillRect(0,center-.5,width,1);
  const count = audio.peaks?.length || 140;
  const step = width/count, barWidth = Math.max(1,step*.59);
  for(let i=0;i<count;i++) {
    const peak = audio.peaks ? audio.peaks[i] : (.11 + Math.abs(Math.sin(i*1.91)*Math.cos(i*.44))*.3 + Math.abs(Math.sin(i*.17))*.24);
    const amp = Math.max(2,Math.min(1,peak*1.1)*height*.43);
    const active = audio.duration && i / count <= position() / audio.duration;
    ctx.fillStyle = active ? '#ecffb3' : (i%3===0?'#a8d46b':'#688a60');
    ctx.fillRect(i*step,center-amp,barWidth,amp*2);
  }
}
async function loadAudioForTrack(track) {
  if (!track || (selectedTrack && track.id !== selectedTrack.id)) return;
  const generation = ++loadGeneration;
  if (fetchController) fetchController.abort();
  fetchController = new AbortController();
  $('#waveStatus').textContent = 'LOADING AUDIO...';
  $('#playerStatus').textContent = tr('loading');
  $('#playPause').disabled = true;
  try {
    const ctx = ensureAudioContext();
    const urls = [publicAudioUrl(track,'master'), publicAudioUrl(track,'raw')];
    const responses = await Promise.all(urls.map(url => fetch(url, {signal: fetchController.signal})));
    for (const response of responses) if (!response.ok) throw new Error(`A hangfájl nem érhető el (HTTP ${response.status}).`);
    const [masterBytes, rawBytes] = await Promise.all(responses.map(r => r.arrayBuffer()));
    const [master, raw] = await Promise.all([ctx.decodeAudioData(masterBytes),ctx.decodeAudioData(rawBytes)]);
    if (generation !== loadGeneration) return;
    audio.masterBuffer = master; audio.rawBuffer = raw;
    audio.duration = Math.min(master.duration,raw.duration);
    audio.peaks = calculatePeaks(master, 160);
    refreshProgress(); drawWaveform(); setMode(audio.mode);
    if (Math.abs(master.duration-raw.duration)>.15) {
      $('#playerStatus').textContent = tr('lengthMismatch');
    } else $('#playerStatus').textContent = tr('ready');
  } catch(error) {
    if (generation !== loadGeneration || error.name === 'AbortError') return;
    $('#waveStatus').textContent = tr('loadFailed');
    $('#playerStatus').textContent = `${tr('loadError')} ${niceError(error)}`;
  } finally {
    if (generation === loadGeneration) $('#playPause').disabled = false;
  }
}
function selectTrack(track) {
  ++loadGeneration; if (fetchController) fetchController.abort();
  resetAudio(); selectedTrack = track; selectedId = track.id;
  $('#playerNumber').textContent = track.isDemo ? 'DEMO / REFERENCE' : `REFERENCE / ${two(tracks.indexOf(track)+1)}`;
  $('#playerTitle').textContent = track.isDemo ? tr('demoTrack') : track.title;
  $('#playerArtist').textContent = track.isDemo ? tr('demoArtist') : track.artist;
  $('#trackMeta').replaceChildren();
  [track.genre || 'MIX / MASTER', track.bpm ? `${track.bpm} BPM` : 'A/B COMPARISON', track.isDemo ? 'DEMO' : 'PUBLISHED'].forEach(s => {
    const el=document.createElement('span');el.textContent=s.toUpperCase();$('#trackMeta').append(el);
  });
  renderCatalog();
  loadAudioForTrack(track);
}
async function fetchPublicTracks() {
  if (!db) { tracks = [demoTrack]; }
  else {
    const { data, error } = await db.from('tracks').select('*').eq('is_published',true).order('created_at',{ascending:false});
    if (error) { toast(`Katalógus betöltési hiba: ${niceError(error)}`); tracks = []; }
    else tracks = data || [];
  }
  $('#demoDisclaimer').hidden = !tracks.some(t=>t.isDemo);
  renderCatalog();
  const preferred = tracks.find(t=>t.id===selectedId) || tracks[0];
  if (preferred) selectTrack(preferred);
  else {
    ++loadGeneration; if (fetchController) fetchController.abort(); resetAudio(); selectedTrack=null; selectedId=null;
    $('#playerTitle').textContent=tr('noTrack');$('#playerArtist').textContent=tr('noTrackHint');
    $('#playerStatus').textContent=tr('noTrackHint');
    $('#playPause').disabled = true;
  }
}

async function checkAdmin() {
  if (!db) return false;
  const {data:{user},error:userError} = await db.auth.getUser();
  if (userError || !user) {adminEnabled=false;return false;}
  const {data,error} = await db.rpc('is_studio_admin');
  adminEnabled = !error && data === true;
  return adminEnabled;
}
async function enterAdmin() {
  if (!db) {openDialog('setupDialog');return;}
  try {
    if (await checkAdmin()) { await refreshAdminList();openDialog('adminDialog'); }
    else openDialog('loginDialog');
  } catch (error) { toast(niceError(error)); }
}
async function login(event) {
  event.preventDefault();
  $('#loginSubmit').disabled=true; $('#loginStatus').textContent='Bejelentkezés...';
  const form = new FormData(event.currentTarget);
  try {
    const {error} = await db.auth.signInWithPassword({email:String(form.get('email')).trim(),password:String(form.get('password'))});
    if (error) throw error;
    if (!await checkAdmin()) {await db.auth.signOut();throw new Error('Ez a fiók nem rendelkezik admin jogosultsággal.');}
    closeDialog('loginDialog'); $('#loginStatus').textContent='';event.currentTarget.reset();
    await refreshAdminList();openDialog('adminDialog');
  } catch(error) {$('#loginStatus').textContent=`Hiba: ${niceError(error)}`;}
  finally {$('#loginSubmit').disabled=false;}
}
async function refreshAdminList() {
  if (!db || !adminEnabled) return;
  const list=$('#adminTrackList');list.textContent='Betöltés...';
  const {data,error}=await db.from('tracks').select('*').order('created_at',{ascending:false});
  if (error) {list.textContent=`Hiba: ${niceError(error)}`;return;}
  list.replaceChildren();
  if (!data.length) {list.textContent='Még nem töltöttél fel zenét.';return;}
  for (const track of data) {
    const row=document.createElement('div');row.className='admin-track-row';
    const info=document.createElement('div');const name=document.createElement('strong');name.textContent=track.title;
    const detail=document.createElement('small');detail.textContent=`${track.artist} • ${track.is_published?'NYILVÁNOS':'REJTETT'}`;
    info.append(name,detail);
    const buttons=document.createElement('div');buttons.className='admin-track-actions';
    const toggle=document.createElement('button');toggle.type='button';toggle.textContent=track.is_published?'Elrejtés':'Közzététel';
    toggle.addEventListener('click',async()=>{
      toggle.disabled=true;
      const {error}=await db.from('tracks').update({is_published:!track.is_published}).eq('id',track.id);
      if(error){toast(`Hiba: ${niceError(error)}`);toggle.disabled=false;return;}
      await fetchPublicTracks();await refreshAdminList();toast('A megjelenítés frissült.');
    });
    const remove=document.createElement('button');remove.type='button';remove.className='delete';remove.textContent='Törlés';
    remove.addEventListener('click',async()=>{
      if(!confirm(`Biztosan végleg törlöd ezt a dalt és a hozzá tartozó fájlokat?\n\n${track.title}`))return;
      remove.disabled=true;
      const {error}=await db.from('tracks').delete().eq('id',track.id);
      if(error){toast(`Törlési hiba: ${niceError(error)}`);remove.disabled=false;return;}
      const {error:filesError}=await db.storage.from(CONFIG.bucketName).remove([track.raw_path,track.master_path]);
      if(filesError)toast(`A rekord törölve, de fájlokat külön kell törölni: ${niceError(filesError)}`);
      await fetchPublicTracks();await refreshAdminList();toast('A referencia törölve.');
    });
    buttons.append(toggle,remove);row.append(info,buttons);list.append(row);
  }
}
function extensionOf(file) {
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  if(!['mp3','wav','flac','m4a','aac','ogg','webm'].includes(ext))throw new Error(`Nem támogatott hangfájl: ${file.name}`);
  return ext;
}
function fileType(file,ext) {
  const known={mp3:'audio/mpeg',wav:'audio/wav',flac:'audio/flac',m4a:'audio/mp4',aac:'audio/aac',ogg:'audio/ogg',webm:'audio/webm'};
  return known[ext] || file.type || 'application/octet-stream';
}
async function upload(event) {
  event.preventDefault();
  const status=$('#uploadStatus'),submit=$('#uploadSubmit');
  if (!adminEnabled) {status.textContent='Előbb jelentkezz be adminisztrátorként.';return;}
  const values=new FormData(event.currentTarget);
  const master=values.get('master'), raw=values.get('raw');
  submit.disabled=true;status.textContent='Fájlok ellenőrzése...';
  const paths=[];
  try {
    if(!(master instanceof File) || !(raw instanceof File) || !master.size || !raw.size)throw new Error('Mindkét hangfájlt válaszd ki.');
    const extMaster=extensionOf(master),extRaw=extensionOf(raw);
    const maxBytes=CONFIG.maxFileSizeMb*1024*1024;
    if(master.size>maxBytes||raw.size>maxBytes)throw new Error(`Egy hangfájl legfeljebb ${CONFIG.maxFileSizeMb} MB lehet. Tömörítsd 320 kbps MP3 formátumba.`);
    const title=String(values.get('title')||'').trim();const artist=String(values.get('artist')||'').trim();
    if(!title || !artist)throw new Error('A cím és az előadó neve kötelező.');
    const id=crypto.randomUUID();
    const masterPath=`tracks/${id}/master.${extMaster}`;const rawPath=`tracks/${id}/raw.${extRaw}`;
    status.textContent='1/3 • Master feltöltése...';
    let result=await db.storage.from(CONFIG.bucketName).upload(masterPath,master,{contentType:fileType(master,extMaster),upsert:false,cacheControl:'3600'});
    if(result.error)throw result.error;paths.push(masterPath);
    status.textContent='2/3 • Nyers hanganyag feltöltése...';
    result=await db.storage.from(CONFIG.bucketName).upload(rawPath,raw,{contentType:fileType(raw,extRaw),upsert:false,cacheControl:'3600'});
    if(result.error)throw result.error;paths.push(rawPath);
    status.textContent='3/3 • Adatok mentése...';
    const bpm=String(values.get('bpm')||'').trim();
    const {error}=await db.from('tracks').insert({
      title,artist,genre:String(values.get('genre')||'').trim().slice(0,50) || null,
      bpm:bpm?Number(bpm):null,notes:String(values.get('notes')||'').trim().slice(0,300)||null,
      master_path:masterPath,raw_path:rawPath,is_published:values.get('published')==='on',
    });
    if(error)throw error;
    status.textContent='✓ Sikeres feltöltés! A közzétett dal megjelent a katalógusban.';
    event.currentTarget.reset();$('#masterFilename').textContent='Nincs fájl kiválasztva';$('#rawFilename').textContent='Nincs fájl kiválasztva';
    await fetchPublicTracks();await refreshAdminList();
  } catch(error) {
    if(paths.length)await db.storage.from(CONFIG.bucketName).remove(paths);
    status.textContent=`Hiba: ${niceError(error)}`;
  } finally {submit.disabled=false;}
}

function events() {
  $('#playPause').addEventListener('click',playAudio);
  $('#modeMaster').addEventListener('click',()=>setMode('master'));
  $('#modeRaw').addEventListener('click',()=>setMode('raw'));
  $('#seekBar').addEventListener('input',(event)=>seekTo(Number(event.target.value)/1000));
  $('#waveContainer').addEventListener('click',(event)=>{const r=event.currentTarget.getBoundingClientRect();seekTo((event.clientX-r.left)/r.width);});
  $('#volume').addEventListener('input',(event)=>{
    audio.volume=Number(event.target.value)/100;
    $('#volumePct').textContent=`${Math.round(audio.volume*100)}%`;
    if(audio.mainGain)audio.mainGain.gain.setTargetAtTime(audio.volume,audio.context.currentTime,.015);
  });
  $('#adminOpen').addEventListener('click',enterAdmin);
  $('#quoteForm').addEventListener('submit',quoteRequest);
  $('#loginForm').addEventListener('submit',login);
  $('#uploadForm').addEventListener('submit',upload);
  $('#logoutButton').addEventListener('click',async()=>{await db.auth.signOut();adminEnabled=false;closeDialog('adminDialog');toast('Sikeresen kijelentkeztél.');});
  for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>closeDialog(button.dataset.close));
  for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',(event)=>{if(event.target===dialog)dialog.close();});
  $('#masterFile').addEventListener('change',(event)=>{$('#masterFilename').textContent=event.target.files?.[0]?.name||'Nincs fájl kiválasztva';});
  $('#rawFile').addEventListener('change',(event)=>{$('#rawFilename').textContent=event.target.files?.[0]?.name||'Nincs fájl kiválasztva';});
  $('#menuToggle').addEventListener('click',()=>{
    const menu=$('.nav-links'),isOpen=menu.classList.toggle('is-open');
    $('#menuToggle').setAttribute('aria-expanded',String(isOpen));
  });
  for(const link of document.querySelectorAll('.nav-links a'))link.addEventListener('click',()=>{
    $('.nav-links').classList.remove('is-open');$('#menuToggle').setAttribute('aria-expanded','false');
  });
  new ResizeObserver(drawWaveform).observe($('#waveContainer'));
  function animate() {
    if(audio.playing){
      if(position()>=audio.duration-.015){pauseAudio();audio.offset=0;$('#playerStatus').textContent=tr('ended');}
      refreshProgress();
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

async function init() {
  configureBrand();
  initPricing({getDb:()=>db,getAdmin:()=>adminEnabled,toast});
  initLanguage();events();
  document.addEventListener('rizkay-language',()=>{
    if(selectedTrack?.isDemo){$('#playerTitle').textContent=tr('demoTrack');$('#playerArtist').textContent=tr('demoArtist');}
    if(!selectedTrack){$('#playerTitle').textContent=tr('noTrack');$('#playerArtist').textContent=tr('noTrackHint');}
    renderCatalog();
  });
  if(CONFIG.supabaseUrl && CONFIG.supabasePublishableKey) {
    try {
      const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      db=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey);
      await checkAdmin();
    } catch(error) {toast(`Adatbázis-kapcsolati hiba: ${niceError(error)}`);}
  }
  await Promise.all([fetchPublicTracks(),loadServices()]);
}
init();
