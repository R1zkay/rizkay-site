import { getLang, tr } from './i18n.js';

const demoServices = [
 {id:'mixing',slug:'mixing',title_hu:'Mixing',title_en:'Mixing',title_de:'Mixing',description_hu:'Sávok, dinamika, tér és karakter egységes, professzionális mixben.',description_en:'Balance, dynamics, space and character in a professional mix.',description_de:'Balance, Dynamik, Raum und Charakter in einem professionellen Mix.',price_chf:null,revisions_included:null,is_active:true,sort_order:1},
 {id:'mastering',slug:'mastering',title_hu:'Mastering',title_en:'Mastering',title_de:'Mastering',description_hu:'Végső finomhangolás, egységes hangkép és kiadásra kész fájl.',description_en:'Final polish, tonal consistency and a release-ready master.',description_de:'Letzter Feinschliff, ausgewogener Sound und releasefertiges Master.',price_chf:null,revisions_included:null,is_active:true,sort_order:2},
 {id:'mix-master',slug:'mix-master',title_hu:'Mixing + Mastering',title_en:'Mixing + Mastering',title_de:'Mixing + Mastering',description_hu:'A teljes út a nyers sávoktól a végleges masterig.',description_en:'A complete workflow from raw stems to final master.',description_de:'Komplettpaket von den Rohspuren bis zum finalen Master.',price_chf:null,revisions_included:null,is_active:true,sort_order:3},
 {id:'stem-mixing',slug:'stem-mixing',title_hu:'Stem Mixing',title_en:'Stem Mixing',title_de:'Stem Mixing',description_hu:'Csoportosított stemsávok kiegyensúlyozása és végső mixelése.',description_en:'Mixing from grouped stems, with focus on balance and impact.',description_de:'Mixing aus gruppierten Stems mit Fokus auf Balance und Druck.',price_chf:null,revisions_included:null,is_active:true,sort_order:4},
 {id:'stem-mastering',slug:'stem-mastering',title_hu:'Stem Mastering',title_en:'Stem Mastering',title_de:'Stem Mastering',description_hu:'Több stemsávos master a rugalmasabb hangzásformálásért.',description_en:'Mastering from multiple stems for greater tonal control.',description_de:'Mastering aus mehreren Stems für mehr klangliche Kontrolle.',price_chf:null,revisions_included:null,is_active:true,sort_order:5}
];
let services = demoServices;
let adminServices = [];
let dbGetter = () => null;
let adminGetter = () => false;
let notify = () => {};
const $ = x => document.querySelector(x);
const label = (service,field) => service[`${field}_${getLang()}`] || service[`${field}_en`] || service[`${field}_hu`] || '';
function el(tag, className, content) {
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(content !== undefined)node.textContent=content;
  return node;
}
function priceLabel(price) {
  if (price === null || price === undefined || price === '') return tr('quoteOnly');
  return `${tr('from')} CHF ${new Intl.NumberFormat(getLang()==='de'?'de-CH':getLang()==='hu'?'hu-HU':'en-CH',{maximumFractionDigits:2}).format(Number(price))}`;
}
function render() {
  const grid=$('#servicesGrid'); grid.replaceChildren();
  const shown=services.filter(s=>s.is_active);
  shown.forEach((s,i)=>{
    const card=el('article','service-card');
    card.append(el('span','service-no',String(i+1).padStart(2,'0')+' / RIZKAY'));
    card.append(el('h3','service-title',label(s,'title')));
    card.append(el('p','service-desc',label(s,'description')));
    card.append(el('div','service-price',priceLabel(s.price_chf)));
    card.append(el('p','service-revision',s.revisions_included===null || s.revisions_included===undefined ? tr('revisionDiscuss') : `${s.revisions_included} ${tr('revisionUnit')}`));
    const link=el('a','service-link',tr('packageCta'));link.href='#contact';
    link.addEventListener('click',()=>{ const select=$('#quoteService');select.value=String(s.id); });
    card.append(link);grid.append(card);
  });
  if(!shown.length)grid.append(el('p','empty-catalog',tr('noServices')));
  const selector=$('#quoteService');const selected=selector.value;
  selector.replaceChildren(new Option(tr('formChoose'),''));
  shown.forEach(s=>selector.add(new Option(label(s,'title'),String(s.id))));
  if(shown.some(s=>String(s.id)===selected)) selector.value=selected;
}
export async function loadServices() {
  const db=dbGetter();
  if(!db) { services=demoServices;render();return; }
  const {data,error}=await db.from('studio_services').select('*').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:true});
  if(error){ notify('A szolgáltatások nem tölthetők be. Ellenőrizd a Supabase SQL beállításait.');services=demoServices; }
  else services=data || [];
  render();
}
const fieldNames=['title_hu','title_en','title_de','description_hu','description_en','description_de'];
function makeField(key,value,tag='input') {
  const labelEl=el('label','',key.replaceAll('_',' ').toUpperCase());
  const input=el(tag);
  input.name=key;
  if(tag==='textarea'){input.rows=2;input.maxLength=350;}else{input.type='text';input.maxLength=90;}
  input.value=value ?? '';
  labelEl.append(input);
  return labelEl;
}
function editCard(s) {
  const wrapper=el('details','admin-service-card');const summary=el('summary','',`${s.title_hu} · ${priceLabel(s.price_chf)}`);wrapper.append(summary);
  const form=el('form','form-stack');
  const fields=el('div','form-grid');
  for(const key of ['title_hu','title_en','title_de'])fields.append(makeField(key,s[key]));
  const p=el('label','', 'ÁR (CHF)');const pi=el('input');pi.name='price_chf';pi.type='number';pi.min='0.01';pi.step='0.01';pi.placeholder='Üres = egyedi ajánlat';pi.value=s.price_chf??'';p.append(pi);fields.append(p);
  const r=el('label','', 'BENNE FOGLALT REVÍZIÓK');const ri=el('input');ri.name='revisions_included';ri.type='number';ri.min='0';ri.max='100';ri.placeholder='Üres = megegyezés szerint';ri.value=s.revisions_included??'';r.append(ri);fields.append(r);
  form.append(fields);
  for(const key of ['description_hu','description_en','description_de'])form.append(makeField(key,s[key],'textarea'));
  const visible=el('label','check-field');const chk=el('input');chk.type='checkbox';chk.name='is_active';chk.checked=!!s.is_active;visible.append(chk,document.createTextNode(' Nyilvános a szolgáltatás'));form.append(visible);
  const buttons=el('div','service-edit-actions');
  const del=el('button','delete','Törlés');del.type='button';del.addEventListener('click',async()=>{
    if(!confirm(`Végleg törlöd: ${s.title_hu}?`))return;
    const db=dbGetter();const {error}=await db.from('studio_services').delete().eq('id',s.id);
    if(error){notify(`Hiba: ${error.message}`);return;}
    notify('Csomag törölve.');await Promise.all([loadServices(),loadAdminServices()]);
  });
  const save=el('button','save','Változások mentése');save.type='submit';buttons.append(del,save);form.append(buttons);
  const result=el('p','form-status');form.append(result);
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(!adminGetter())return;
    const values=new FormData(form);
    const body={is_active:chk.checked,price_chf: values.get('price_chf')===''?null:Number(values.get('price_chf')),revisions_included:values.get('revisions_included')===''?null:Number(values.get('revisions_included'))};
    for(const key of fieldNames)body[key]=String(values.get(key)||'').trim();
    if(['title_hu','title_en','title_de'].some(k=>!body[k])){result.textContent='Mindhárom nyelven add meg a címet.';return;}
    save.disabled=true;result.textContent='Mentés...';
    const {error}=await dbGetter().from('studio_services').update(body).eq('id',s.id);
    save.disabled=false;
    if(error){result.textContent=`Hiba: ${error.message}`;return;}
    notify('Árlista frissítve.');await Promise.all([loadServices(),loadAdminServices()]);
  });
  wrapper.append(form);return wrapper;
}
export async function loadAdminServices() {
  if(!adminGetter()) return;
  const list=$('#adminServicesList');list.textContent='Csomagok betöltése...';
  const {data,error}=await dbGetter().from('studio_services').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true});
  if(error){list.textContent=`Hiba: ${error.message}`;return;}
  adminServices=data || [];list.replaceChildren();
  for(const s of adminServices)list.append(editCard(s));
}
function initAdminTabs() {
  const a=$('#adminTracksTab'),b=$('#adminPricesTab'),p1=$('#adminTracksPanel'),p2=$('#adminPricesPanel');
  function setTab(which){
    const prices=which==='prices';a.classList.toggle('is-selected',!prices);b.classList.toggle('is-selected',prices);
    a.setAttribute('aria-selected',String(!prices));b.setAttribute('aria-selected',String(prices));p1.hidden=prices;p2.hidden=!prices;
    if(prices)loadAdminServices();
  }
  a.addEventListener('click',()=>setTab('tracks'));b.addEventListener('click',()=>setTab('prices'));
  $('#addServiceForm').addEventListener('submit',async event=>{
    event.preventDefault();if(!adminGetter())return;
    const form=event.currentTarget,data=new FormData(form),submit=$('#addServiceSubmit'),status=$('#addServiceStatus');
    const body={sort_order:(adminServices.at(-1)?.sort_order ?? 0)+1,price_chf:data.get('price_chf')===''?null:Number(data.get('price_chf')),revisions_included:data.get('revisions_included')===''?null:Number(data.get('revisions_included')),is_active:true};
    for(const key of fieldNames)body[key]=String(data.get(key)||'').trim();
    if(['title_hu','title_en','title_de'].some(k=>!body[k])){status.textContent='Mindhárom nyelven add meg a címet.';return;}
    submit.disabled=true;status.textContent='Mentés...';
    const {error}=await dbGetter().from('studio_services').insert(body);
    submit.disabled=false;
    if(error){status.textContent=`Hiba: ${error.message}`;return;}
    status.textContent='✓ Csomag mentve!';form.reset();await Promise.all([loadServices(),loadAdminServices()]);
  });
}
export function initPricing({getDb,getAdmin,toast}) {
  dbGetter=getDb;adminGetter=getAdmin;notify=toast;
  initAdminTabs();document.addEventListener('rizkay-language',render);render();
}
