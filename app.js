'use strict';

const FIRST_YEAR = 1776;
const LAST_YEAR = 2026;
const PAGE_SIZE = 100;
const DATA_REVISION = '20261107-modern-gap-review';
const TYPE_NAMES = {battle:'Battle',siege:'Siege',skirmish:'Skirmish',naval:'Naval action',air:'Air action',operation:'Operation',development:'Development',massacre:'Massacre'};
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BLOCKS = [{start:1776,end:1799}, ...Array.from({length:10},(_,i)=>({start:1800+i*25,end:Math.min(1824+i*25,LAST_YEAR)}))];
const state = {year:FIRST_YEAR, block:0, view:'all', type:'all', query:'', scope:'year', page:1};
let events = [];
let research = {years:[],candidates:[],guides:[]};
let researchPanelKey = '';
let ready = false;
let sceneKey = '';
const allMilestones = () => state.view==='development' && state.scope==='all';

function openMilestones(){state.view='development';state.scope='all';state.type='all';state.query='';state.page=1;syncHash();render();scrollToDirectory();}
function updateScene(){
  const scenes=typeof ARCHIVE_SCENES==='undefined'?[]:ARCHIVE_SCENES;
  const scene=scenes.find(item=>state.year<=item.through)||scenes.at(-1);
  if(!scene)return;
  if(sceneKey!==scene.id){$('year-scene').src=scene.src;$('year-scene').style.objectPosition=scene.position||'50% 50%';sceneKey=scene.id;}
  $('scene-caption').textContent=scene.label;
}
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yearOf = date => Number(date.slice(0,4));
const inYear = (event,year) => yearOf(event.startDate)<=year && yearOf(event.endDate || event.startDate)>=year;
const isDevelopment = event => event.category === 'development';
const countWord = n => `${n} ${n===1?'entry':'entries'}`;
const safeURL = url => {try {const parsed=new URL(url);return parsed.protocol==='https:'?parsed.href:null;}catch{return null;}};
const referenceLabel = event => event.researchStatus==='listed'?'Listed · research pending':event.researchStatus==='references-located'?'References located':'Starter entry';
const normalizeSearch = value => String(value).normalize('NFKD').replace(/\p{M}/gu,'').replace(/[‘’]/g,"'").replace(/[\u2010-\u2015-]/g,' ').replace(/\s+/g,' ').toLocaleLowerCase();

function renderResearch(yearEvents) {
  const panel=$('year-research');
  const key=state.year+'-'+state.scope;
  if(key===researchPanelKey)return;
  researchPanelKey=key;
  const yearResearch=research.years.find(item=>item.year===state.year);
  panel.hidden=state.scope==='all'||!yearResearch;
  if(panel.hidden)return;
  const sources=yearResearch.sources.filter(source=>safeURL(source.url));
  const candidates=research.candidates.filter(item=>item.year===state.year);
  const kinds={'year-overview':'Overview','engagement':'Engagement','primary-source':'Primary source','institutional':'Military development'};
  panel.innerHTML=`<details ${yearEvents.length?'':'open'}><summary><span><span class="source-symbol" aria-hidden="true">↗</span> Sources & research leads for ${state.year}</span><span class="source-count">${sources.length} links <span aria-hidden="true">+</span></span></summary><div class="year-research-body"><p class="source-stage">Discovery pass · coverage is still incomplete</p><p class="year-research-summary">${escapeHTML(yearResearch.summary)}</p><ul class="year-sources">${sources.map(source=>`<li><span class="source-kind">${escapeHTML(kinds[source.kind]||'Research lead')} <span aria-hidden="true">/</span> ${escapeHTML(source.publisher)}</span><a href="${escapeHTML(safeURL(source.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.title)} <span aria-hidden="true">↗</span></a><p>${escapeHTML(source.note)}</p></li>`).join('')}</ul>${yearResearch.gaps?.length?`<details class="research-gaps"><summary>Still to investigate <span>${yearResearch.gaps.length} research gaps</span></summary><ul>${yearResearch.gaps.map(gap=>`<li>${escapeHTML(gap)}</li>`).join('')}</ul></details>`:''}${candidates.length?`<details class="candidate-leads"><summary>Engagement leads awaiting verification <span>${candidates.length} candidates</span></summary><ul>${candidates.map(candidate=>`<li><strong>${escapeHTML(candidate.title)}</strong><p>${escapeHTML(candidate.note)}</p>${safeURL(candidate.sourceUrl)?`<a href="${escapeHTML(safeURL(candidate.sourceUrl))}" target="_blank" rel="noopener noreferrer">Open discovery source ↗</a>`:''}</li>`).join('')}</ul></details>`:''}<p class="source-disclaimer">These links are starting points, not a completed bibliography. Some relevance checks used indexed text when full-page access was unavailable. Context sources are labeled and are not counted as battles; detailed verification follows.</p></div></details>`;
}

function era(year) {
  if(year<=1783) return ['The Revolutionary era','Revolution & independence','Explore the founding years of the American military. The starter entries below are only the beginning of this year’s record.'];
  if(year<=1815) return ['The early republic','Building a military','Follow the early republic through overseas engagements and the formation of enduring military institutions.'];
  if(year<=1860) return ['The expanding republic','Expansion & conflict','A starting point for documenting conflicts, expeditions, and military developments in the nineteenth century.'];
  if(year<=1865) return ['The Civil War era','A nation divided','Explore a growing directory of Civil War actions and simultaneous frontier conflicts. Names and listed dates lead to sources; coverage remains incomplete.'];
  if(year<=1880) return ['Reconstruction & western conflicts','A contested peace','Explore frontier warfare, Indigenous resistance, Reconstruction violence, domestic interventions and overseas operations. Approximate dates and research leads remain visible; coverage is incomplete.'];
  if(year<=1895) return ['The late nineteenth century','Conflict at home & overseas','Explore Indigenous resistance and forced removals, frontier campaigns, overseas operations and domestic military interventions. Listed dates and source pointers remain provisional; coverage is incomplete.'];
  if(year<=1910) return ['The turn of the twentieth century','Overseas wars & resistance','Explore the Spanish-American and Philippine-American wars, Moro resistance, operations in China and the Caribbean, and domestic and Indigenous conflicts. Catalogue listings and approximate dates are starting points; coverage remains incomplete.'];
  if(year<=1916) return ['Interventions & border conflicts','A changing military','Explore the Mexican border, Caribbean interventions, continued Moro resistance, Indigenous conflicts and domestic military operations. Approximate dates and discovery links remain provisional; coverage is incomplete.'];
  if(year<=1918) return ['The First World War era','The First World War','Explore American land, naval and air actions alongside continuing border, overseas and domestic operations. Campaigns overlap their component contacts; this growing directory is not a complete or verified battle count.'];
  if(year<=1925) return ['The early interwar years','Intervention & resistance','Explore Russia and Siberia, Caribbean occupations, continued overseas operations and conflict at home. Battles, raids, policing and coercive detention are labeled separately; dates and source leads remain subject to review.'];
  if(year<=1940) return ['The interwar years','Intervention & mobilization','Explore Nicaragua and China, coastal enforcement, domestic military operations, American volunteers in foreign service, and preparations for global war. Names, dates and source pointers remain provisional; coverage is incomplete.'];
  if(year<=1945) return ['The Second World War era','A global conflict','Explore land, naval and air actions across the European and Pacific theaters, alongside domestic military operations and forced removals. This provisional inventory includes overlapping campaigns and components; many smaller contacts remain to be found.'];
  if(year<=1960) return ['The early Cold War','Korea & a wider military role','Explore Korean land, naval and air actions, Cold War encounters, domestic interventions, Indigenous armed defense and continuing overseas operations. Dates and source pointers remain provisional; the inventory is incomplete.'];
  if(year<=1975) return ['Vietnam & a changing military','Wars abroad, confrontations at home','Explore Vietnam and wider Cold War engagements, air-base attacks, Caribbean interventions, domestic deployments and Indigenous armed confrontations. This provisional directory distinguishes whole operations from their components and holds uncertain incidents for further research.'];
  if(year<=1990) return ['Late Cold War','Interventions, maritime conflict & armed confrontations','Explore military operations in Grenada, Panama, Lebanon and the Persian Gulf, Korean confrontations, air incidents and domestic security operations. Campaigns overlap their components; uncertain dates and participant identities remain open for research.'];
  if(year<=1991) return ['The Cold War era','A worldwide military role','Explore a growing index of combat actions, operations, and institutional developments across the Cold War years.'];
  if(year<=2000) return ['The post–Cold War era','Gulf War, interventions & contested peace','Explore the Gulf War, Somalia, Haiti, the Balkans, Iraq no-fly-zone encounters and domestic armed confrontations. These provisional records separate whole campaigns from their components and identify the services, civilian agencies and other participants involved.'];
  if(year<=2010) return ['The early twenty-first century','Afghanistan, Iraq & wider operations','Explore American engagements in Afghanistan and Iraq, maritime contacts, wider overseas operations and homeland security missions. Whole campaigns overlap individual actions; dates, civilian effects and disputed accounts remain open for research.'];
  if(year<=2026) return ['The contemporary record','Recent engagements & military development','Explore selected American combat, protective operations, interceptions and military-development milestones through November 7, 2026. Exact dates and service roles remain open where the sources differ. Coverage is incomplete, and campaigns overlap their individual actions.'];
  return ['The contemporary record','Research continues','This year is open for indexing. No conclusion about military activity can be drawn from the number of entries shown.'];
}

function dateText(date) {
  if(date.length===4) return `${date} (month and day to verify)`;
  const [year,month,day]=date.split('-');
  if(!day) return `${MONTHS[Number(month)-1]} ${year} (day to verify)`;
  return `${MONTHS[Number(month)-1]} ${Number(day)}, ${year}`;
}

function compareEvents(a,b) {
  const yearDifference=yearOf(a.startDate)-yearOf(b.startDate);
  if(yearDifference) return yearDifference;
  const preciseA=a.startDate.length>4, preciseB=b.startDate.length>4;
  if(preciseA!==preciseB) return preciseA?-1:1;
  return a.startDate.localeCompare(b.startDate)||a.title.localeCompare(b.title);
}

function dateColumn(event) {
  const date=event.startDate;
  if(state.scope==='year' && yearOf(date)<state.year) return `<strong class="date-year-only">${state.year}</strong><small>Continued</small>`;
  if(date.length===4) return `<strong class="date-year-only">${date}</strong><small>Date to verify</small>`;
  const [,month,day]=date.split('-');
  return `${MONTHS[Number(month)-1]}<strong>${day?Number(day):'—'}</strong>${state.scope==='all'?`<small>${yearOf(date)}</small>`:''}`;
}

function renderYearGrid() {
  const block=BLOCKS[state.block];
  $('year-block').value=String(state.block);
  $('prev-block').disabled=state.block===0;
  $('next-block').disabled=state.block===BLOCKS.length-1;
  $('year-grid').innerHTML=Array.from({length:block.end-block.start+1},(_,i)=>{
    const year=block.start+i;
    const count=events.filter(e=>inYear(e,year)&&(state.view!=='development'||isDevelopment(e))).length;
    return `<button class="year-cell ${count?'has-entries':''} ${year===state.year&&state.scope==='year'?'selected':''}" data-year="${year}" ${year===state.year&&state.scope==='year'?'aria-current="date"':''} aria-label="${year}, ${count?countWord(count)+(state.view==='development'?' in the milestone index':' in the directory'):'indexing pending'}">${year}</button>`;
  }).join('');
}

function filteredBase() {
  const query=normalizeSearch(state.query).trim();
  return events.filter(e=>(state.scope==='all'||inYear(e,state.year)) && (!query||normalizeSearch([e.title,e.conflict,e.location,e.summary,...e.branches,...(e.aliases||[])].join(' ')).includes(query)));
}

function render() {
  if(allMilestones())state.type='all';
  const yearEvents=events.filter(e=>inYear(e,state.year));
  const yearEngagements=yearEvents.filter(e=>!isDevelopment(e)).length;
  const yearDevelopments=yearEvents.length-yearEngagements;
  const currentEra=era(state.year);
  const milestoneCollection=allMilestones(),milestoneTotal=events.filter(isDevelopment).length;
  $('directory-title').textContent=milestoneCollection?'Development milestones':'Year index';
  $('milestone-intro').hidden=!milestoneCollection;
  $('collection-index').classList.toggle('active',!milestoneCollection);$('collection-index').setAttribute('aria-pressed',String(!milestoneCollection));
  $('collection-milestones').classList.toggle('active',milestoneCollection);$('collection-milestones').setAttribute('aria-pressed',String(milestoneCollection));
  document.body.classList.toggle('milestones-mode',milestoneCollection);
  $('sidebar-title').textContent=state.view==='development'?'Milestone years':'Year index';
  $('jump-year-label').textContent=state.view==='development'?'Browse milestones by year':'Jump to a year';
  $('year-key-label').textContent=state.view==='development'?'Has milestones':'Has entries';
  $('jump-year').querySelector('[value="all"]').hidden=state.view!=='development';
  $('jump-year').value=milestoneCollection?'all':String(state.year);
  $('year-arrows').hidden=state.scope==='all';
  document.querySelector('.year-footer').hidden=state.scope==='all';
  document.querySelector('.filter-row').hidden=milestoneCollection;
  $('search').placeholder=state.view==='development'?'Search milestones, institutions, or technology…':'Search by engagement, conflict, or place…';
  updateScene();
  renderYearGrid();
  $('active-year').textContent=milestoneCollection?'Milestones':state.scope==='all'?'1776–2026':state.year;
  $('active-year').style.fontSize=state.scope==='all'?'clamp(38px,4vw,56px)':'';
  $('year-era').textContent=milestoneCollection?'Military development':state.scope==='all'?'Across the full directory':currentEra[0];
  $('year-label').textContent=milestoneCollection?'1776–2026 · all years':state.scope==='all'?'251 calendar years':`Year ${state.year-FIRST_YEAR+1} of the record`;
  $('year-heading')?.setAttribute('aria-label',`Year ${state.year}`);
  $('footer-year').textContent=state.year;
  $('context-title').textContent=currentEra[1];
  $('context-text').textContent=currentEra[2];
  $('context-engagements').textContent=yearEngagements;
  $('context-development').textContent=yearDevelopments;
  $('context-primary-label').textContent=milestoneCollection?'Milestones':'Engagement entries';
  $('context-secondary-label').textContent=milestoneCollection?'Calendar years':'Development entries';
  if(milestoneCollection){$('context-title').textContent='How the military changed';$('context-text').textContent='Explore organizational change, leadership, institutions, technology and service policy across the full chronology. Open a milestone for its notes and research links.';$('context-engagements').textContent=milestoneTotal;$('context-development').textContent=LAST_YEAR-FIRST_YEAR+1;}
  document.querySelector('.context-sidebar>.context-card>.eyebrow').textContent=milestoneCollection?'The milestone collection':`${state.year} at a glance`;
  document.querySelector('.context-status').innerHTML=`<span class="status-dot"></span> ${yearEvents.length?'Partial starter index':'Indexing pending'}`;
  const yearResearch=research.years.find(item=>item.year===state.year);
  if(milestoneCollection)document.querySelector('.context-status').innerHTML='<span class="status-dot"></span> Collection · research in progress';
  else if(yearResearch)document.querySelector('.context-status').innerHTML='<span class="status-dot"></span> Source discovery · incomplete';
  renderResearch(yearEvents);
  $('search-scope').value=state.scope;
  $('entry-type').value=state.type;
  $('search').value=state.query;
  const base=filteredBase();
  $('count-all').textContent=base.length;
  $('count-engagements').textContent=base.filter(e=>!isDevelopment(e)).length;
  $('count-development').textContent=base.filter(isDevelopment).length;
  document.querySelectorAll('[data-view]').forEach(button=>{
    const selected=button.dataset.view===state.view;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  $('nav-index').classList.toggle('active',state.view!=='development');
  $('nav-developments').classList.toggle('active',state.view==='development');
  const shown=base.filter(e=>(state.view==='all'||(state.view==='development'?isDevelopment(e):!isDevelopment(e)))&&(state.type==='all'||e.category===state.type)).sort(compareEvents);
  const pageCount=Math.max(1,Math.ceil(shown.length/PAGE_SIZE));
  state.page=Math.max(1,Math.min(state.page,pageCount));
  const pageEvents=shown.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE);
  document.querySelectorAll('[data-pagination]').forEach(panel=>panel.hidden=pageCount<=1);
  document.querySelectorAll('[data-page-dir]').forEach(button=>button.disabled=Number(button.dataset.pageDir)<0?state.page===1:state.page===pageCount);
  document.querySelectorAll('.record-page-label').forEach(label=>label.textContent='Page '+state.page+' of '+pageCount+' · '+PAGE_SIZE+' per page');
  $('results-count').textContent=`${state.view==='development'?shown.length+' milestone'+(shown.length===1?'':'s'):countWord(shown.length)}${state.query?' matching your search':''} · ${state.scope==='all'?'all years':state.year}`;
  document.querySelector('.results-meta>span:last-child').textContent='By date · year-only entries last ↓';
  $('record-list').setAttribute('aria-busy','false');
  $('record-list').innerHTML=shown.length?pageEvents.map(event=>`<button class="record" data-entry="${escapeHTML(event.id)}" aria-label="Open ${escapeHTML(event.title)}"><span class="record-date">${dateColumn(event)}</span><span class="record-body"><span class="record-topline"><span class="record-type ${isDevelopment(event)?'development':''}">${TYPE_NAMES[event.category]||'Engagement'}</span><span class="record-conflict">${escapeHTML(event.conflict)}</span></span><span class="record-title">${escapeHTML(event.title)}</span><span class="record-location"><svg viewBox="0 0 14 16" aria-hidden="true"><path d="M12 6c0 4-5 8-5 8S2 10 2 6a5 5 0 1 1 10 0Z"/><circle cx="7" cy="6" r="1.5"/></svg>${escapeHTML(event.location)}</span><span class="record-tag"><span class="status-dot"></span> ${referenceLabel(event)}${event.sources.length?' · '+event.sources.length+' reference'+(event.sources.length===1?'':'s'):''}</span></span><span class="record-arrow" aria-hidden="true">↗</span></button>`).join(''):emptyState(yearEvents.length);
  ['prev-year','footer-prev'].forEach(id=>$(id).disabled=state.year===FIRST_YEAR);
  ['next-year','footer-next'].forEach(id=>$(id).disabled=state.year===LAST_YEAR);
  $('footer-prev').textContent=state.year===FIRST_YEAR?'Beginning of the record':`← ${state.year-1}`;
  $('footer-next').textContent=state.year===LAST_YEAR?'Current year':`${state.year+1} →`;
  document.title=`${milestoneCollection?'Development milestones':state.scope==='all'?'All years':state.year} · The American Military Record`;
}

function emptyState(yearCount) {
  if(state.view==='development'&&state.scope==='year'&&!state.query&&state.type==='all')return `<div class="empty-state"><span class="mini-star" aria-hidden="true">✦</span><h3>No milestones indexed for ${state.year} yet.</h3><p>Development research is still in progress. Explore the milestones already listed across the full chronology.</p><button class="text-link" data-all-milestones>Browse all milestones →</button></div>`;
  const filtered=state.query || state.type!=='all' || state.view!=='all';
  const hasSourceLeads=research.years.some(item=>item.year===state.year);
  const title=filtered?'No matching indexed entries':hasSourceLeads?'Source leads are ready. Engagement indexing continues.':'This year is ready for research.';
  const description=filtered?'Try a different term or filter, or search across all years. The index is still growing.':hasSourceLeads?'The sources above give this year a research starting point. Named engagements are still being identified; an empty list does not mean no fighting occurred.':'Indexing is pending for '+state.year+'. Engagements and military developments will appear here as they are identified. This is not a claim that no activity occurred.';
  return `<div class="empty-state"><span class="mini-star" aria-hidden="true">✦</span><h3>${title}</h3><p>${description}</p>${filtered?'<button class="text-link" data-reset>Clear search & filters →</button>':'<button class="text-link" data-about>About the research process ↗</button>'}</div>`;
}

function hashFor(entryId) {
  if(allMilestones()){const filters=new URLSearchParams();if(state.query)filters.set('q',state.query);if(state.page>1)filters.set('page',String(state.page));if(entryId)filters.set('entry',entryId);return '#milestones'+(filters.size?'?'+filters.toString():'');}
  const params=new URLSearchParams({year:String(state.year)});
  if(state.view!=='all') params.set('view',state.view);
  if(state.scope!=='year') params.set('scope',state.scope);
  if(state.type!=='all') params.set('type',state.type);
  if(state.query) params.set('q',state.query);
  if(state.page>1)params.set('page',String(state.page));
  if(entryId) params.set('entry',entryId);
  return '#'+params.toString();
}

function syncHash(replace=false,entryId) {
  const next=hashFor(entryId);
  if(location.hash!==next) history[replace?'replaceState':'pushState'](null,'',next);
}

function selectYear(year) {
  if(!Number.isInteger(year)||year<FIRST_YEAR||year>LAST_YEAR)return;
  state.year=year;
  state.block=BLOCKS.findIndex(b=>year>=b.start&&year<=b.end);
  state.scope='year';state.query='';
  state.page=1;syncHash();render();
}

function openEntry(id,fromHash=false) {
  const event=events.find(e=>e.id===id);
  if(!event)return;
  if(!fromHash) syncHash(false,event.id);
  const sources=event.sources.filter(s=>safeURL(s.url));
  const eventNotes=Array.isArray(event.researchNotes)?event.researchNotes:event.researchNotes?[event.researchNotes]:[];
  $('entry-detail').innerHTML=`<p class="eyebrow">${TYPE_NAMES[event.category]||'Engagement'} <span aria-hidden="true">/</span> ${escapeHTML(event.conflict)}</p><h2>${escapeHTML(event.title)}</h2><p class="detail-summary">${escapeHTML(event.summary)}</p><dl class="detail-facts"><div><dt>${event.researchStatus==='listed'?'Date as listed':'Date'+(event.endDate?'s':'')}</dt><dd>${escapeHTML(dateText(event.startDate))}${event.endDate?' – '+escapeHTML(dateText(event.endDate)):''}</dd></div><div><dt>Location</dt><dd>${escapeHTML(event.location)}</dd></div><div><dt>Participants / services</dt><dd>${escapeHTML(event.branches.length?event.branches.join(', '):'Participants to be detailed')}</dd></div><div><dt>Research status</dt><dd>${event.researchStatus==='listed'?'Listed from a discovery source · verification pending':event.researchStatus==='references-located'?'Initial references located · detailed verification pending':'Indexed · further verification pending'}</dd></div></dl><h3 class="detail-section-title">The research file</h3><p class="detail-note">This is an initial index record. Dates, terminology, participants, and context remain open for further verification. A full account, related engagements, and additional source links can be added here.</p><h3 class="detail-section-title">${sources.length?(event.researchStatus==='listed'?'Discovery pointers':'Initial references'):'Sources to be added'}</h3>${sources.length?`<ul class="source-list">${sources.map(source=>`<li><a href="${escapeHTML(safeURL(source.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.title)} ↗</a></li>`).join('')}</ul><p class="detail-summary" style="font-size:10px">References are initial research leads. Their presence does not certify every field in this starter record.</p>`:'<p class="detail-summary">No reference is attached to this starter record yet. Source research is a later phase of the archive.</p>'}<div class="detail-actions"><button class="outline-button" id="copy-entry">Copy entry link ↗</button><button class="outline-button" id="download-entry">Export this record ↓</button><span class="copy-status" role="status" id="copy-status"></span></div>`;
  $('copy-entry').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(location.origin+location.pathname+hashFor(event.id));$('copy-status').textContent='Link copied';}
    catch{$('copy-status').textContent='Copy this page’s URL from your browser.';}
  });
  $('download-entry').addEventListener('click',()=>downloadJSON(event,`${event.id}.json`));
  if(eventNotes.length){
    const note=document.createElement('div');
    note.className='detail-event-notes';
    note.innerHTML='<h3 class="detail-section-title">Open research questions</h3><ul>'+eventNotes.map(text=>'<li>'+escapeHTML(text)+'</li>').join('')+'</ul>';
    $('entry-detail').querySelector('.detail-note').after(note);
  }
  if(!$('entry-dialog').open) $('entry-dialog').showModal();
  $('entry-dialog').scrollTop=0;
}

function currentRouteParams(){
  const raw=location.hash.slice(1);
  return new URLSearchParams(raw==='milestones'?'':raw.startsWith('milestones?')?raw.slice('milestones?'.length):raw);
}

function applyHash() {
  const raw=location.hash.slice(1),milestoneRoute=raw==='milestones'||raw.startsWith('milestones?');
  const params=currentRouteParams();
  if(milestoneRoute){state.view='development';state.scope='all';state.type='all';state.query=params.get('q')||'';state.page=Math.max(1,Number.parseInt(params.get('page')||'1',10)||1);render();if(params.get('entry'))openEntry(params.get('entry'),true);else if($('entry-dialog').open)$('entry-dialog').close();return;}
  if(!params.has('year')&&!params.has('view')&&!params.has('scope')) {
    if($('entry-dialog').open)$('entry-dialog').close();
    if(location.hash==='' || location.hash==='#')state.year=FIRST_YEAR;
    state.page=1;syncHash(true);render();return;
  }
  const year=Number(params.get('year'));
  state.year=Number.isInteger(year)&&year>=FIRST_YEAR&&year<=LAST_YEAR?year:FIRST_YEAR;
  state.block=BLOCKS.findIndex(b=>state.year>=b.start&&state.year<=b.end);
  state.view=['all','development','engagements'].includes(params.get('view'))?params.get('view'):'all';
  state.scope=params.get('scope')==='all'?'all':'year';
  state.type=params.get('type') in TYPE_NAMES?params.get('type'):'all';
  state.query=params.get('q')||'';
  state.page=Math.max(1,Number.parseInt(params.get('page')||'1',10)||1);
  render();
  if(params.get('entry'))openEntry(params.get('entry'),true);
  else if($('entry-dialog').open)$('entry-dialog').close();
}

function downloadJSON(data,filename) {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob), anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function showAbout(){$('about-dialog').showModal();}
function scrollToDirectory(){ $('directory').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }

async function initialize() {
  try {
    const [response,yearResearch]=await Promise.all([fetch('events.json?v='+DATA_REVISION),fetch('research.json?v='+DATA_REVISION).then(async r=>r.ok?await r.json():null).catch(()=>null)]);
    if(!response.ok)throw new Error('The starter index could not be loaded.');
    events=await response.json();
    if(yearResearch && Array.isArray(yearResearch.years))research=yearResearch;
    if(research.guides?.length){
      const guides=document.createElement('section');
      guides.className='discovery-guides';
      guides.innerHTML='<h3>Broader discovery collections</h3><ul class="source-list">'+research.guides.filter(source=>safeURL(source.url)).map(source=>'<li><a href="'+escapeHTML(source.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHTML(source.title)+' ↗</a><p>'+escapeHTML(source.note)+'</p></li>').join('')+'</ul>';
      $('about-dialog').append(guides);
    }
    if(!Array.isArray(events))throw new Error('The index format is invalid.');
    $('total-entries').textContent=events.length;
    $('total-milestones').textContent=events.filter(isDevelopment).length;
    $('nav-milestone-count').textContent=events.filter(isDevelopment).length;
    $('collection-milestone-count').textContent=events.filter(isDevelopment).length;
    $('jump-year').innerHTML='<option value="all" hidden>All milestone years</option>'+Array.from({length:LAST_YEAR-FIRST_YEAR+1},(_,i)=>`<option value="${FIRST_YEAR+i}">${FIRST_YEAR+i}</option>`).join('');
    $('year-block').innerHTML=BLOCKS.map((b,i)=>`<option value="${i}">${b.start}–${b.end}</option>`).join('');
    ready=true;
    applyHash();syncHash(true,$('entry-dialog').open?currentRouteParams().get('entry'):undefined);render();
    $('jump-year').addEventListener('change',e=>e.target.value==='all'?openMilestones():selectYear(Number(e.target.value)));
    $('year-grid').addEventListener('click',e=>{const button=e.target.closest('[data-year]');if(button){const year=Number(button.dataset.year);selectYear(year);$('year-grid').querySelector(`[data-year="${year}"]`)?.focus({preventScroll:true});}});
    document.querySelectorAll('[data-page-dir]').forEach(button=>button.addEventListener('click',()=>{
      state.page+=Number(button.dataset.pageDir);syncHash();render();
      document.querySelector('.results-meta').scrollIntoView({behavior:'auto',block:'start'});
      document.querySelector('[data-pagination]:not([hidden]) [data-page-dir="'+button.dataset.pageDir+'"]').focus({preventScroll:true});
    }));
    $('year-block').addEventListener('change',e=>{state.block=Number(e.target.value);renderYearGrid();});
    $('prev-block').addEventListener('click',()=>{if(state.block>0){state.block--;renderYearGrid();}});
    $('next-block').addEventListener('click',()=>{if(state.block<BLOCKS.length-1){state.block++;renderYearGrid();}});
    ['prev-year','footer-prev'].forEach(id=>$(id).addEventListener('click',()=>selectYear(state.year-1)));
    ['next-year','footer-next'].forEach(id=>$(id).addEventListener('click',()=>selectYear(state.year+1)));
    document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{state.view=button.dataset.view;state.type='all';state.page=1;syncHash();render();if(allMilestones())$('collection-milestones').focus({preventScroll:true});}));
    $('entry-type').addEventListener('change',e=>{state.type=e.target.value;state.view='all';state.page=1;syncHash();render();});
    $('search-scope').addEventListener('change',e=>{state.scope=e.target.value;state.page=1;syncHash();render();});
    $('search').addEventListener('input',e=>{state.query=e.target.value;state.page=1;syncHash(true);render();});
    $('search-shortcut').addEventListener('click',()=>{state.scope='all';state.page=1;syncHash();render();scrollToDirectory();$('search').focus({preventScroll:true});});
    ['nav-developments','collection-milestones','milestone-stat'].forEach(id=>$(id).addEventListener('click',openMilestones));
    $('collection-index').addEventListener('click',()=>{state.view='all';state.scope='year';state.type='all';state.query='';state.page=1;syncHash();render();scrollToDirectory();});
    $('nav-index').addEventListener('click',e=>{e.preventDefault();state.view='all';state.scope='year';state.type='all';state.query='';state.page=1;syncHash();render();scrollToDirectory();});
    $('record-list').addEventListener('click',e=>{
      if(e.target.closest('[data-all-milestones]')){openMilestones();return;}
      const record=e.target.closest('[data-entry]');if(record)openEntry(record.dataset.entry);
      if(e.target.closest('[data-about]'))showAbout();
      if(e.target.closest('[data-reset]')){state.query='';if(state.view!=='development')state.view='all';state.type='all';state.page=1;syncHash();render();}
    });
    $('download-index').addEventListener('click',()=>downloadJSON({title:'The American Military Record — Index & Sources',edition:'Source discovery',coverageStart:FIRST_YEAR,coverageEnd:LAST_YEAR,asOf:'2026-11-07',coverageStatus:'Incomplete index and source discovery; all years require further research.',events,research},'american-military-record-index-and-sources.json'));
    window.addEventListener('hashchange',applyHash);
  } catch(error) {
    $('record-list').setAttribute('aria-busy','false');
    $('record-list').innerHTML='<div class="error-state"><h3>The index could not be loaded.</h3><p>Refresh this page to try again. <a href="events.json">Download the starter data directly.</a></p></div>';
    $('results-count').textContent='Index unavailable';
    console.error(error);
  }
}
document.querySelectorAll('[data-image-credits]').forEach(button=>button.addEventListener('click',()=>$('image-credits-dialog').showModal()));
['nav-about','scope-button','research-button','footer-about'].forEach(id=>$(id).addEventListener('click',showAbout));
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{const box=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom))dialog.close();});
});
$('entry-dialog').addEventListener('close',()=>{if(ready && currentRouteParams().has('entry'))syncHash(true);});
initialize();
