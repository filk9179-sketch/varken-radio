'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const el = {
    audio:$('audio'),coverGrid:$('coverGrid'),collectionCount:$('collectionCount'),collectionBottom:$('collectionBottom'),
    featureCover:$('featureCover'),featurePlay:$('featurePlay'),featureNumber:$('featureNumber'),
    tiktokLink:$('tiktokLink'),searchToggle:$('searchToggle'),searchWrap:$('searchWrap'),searchInput:$('searchInput'),searchClose:$('searchClose'),
    miniPlayer:$('miniPlayer'),miniArt:$('miniArt'),miniTitle:$('miniTitle'),miniArtist:$('miniArtist'),miniToggle:$('miniToggle'),miniNext:$('miniNext'),miniPrevious:$('miniPrevious'),miniProgressFill:$('miniProgressFill'),expandPlayer:$('expandPlayer'),
    sheetBackdrop:$('sheetBackdrop'),playerSheet:$('playerSheet'),closeSheet:$('closeSheet'),sheetArtwork:$('sheetArtwork'),sheetTitle:$('sheetTitle'),sheetArtist:$('sheetArtist'),sheetIndex:$('sheetIndex'),
    sheetToggle:$('sheetToggle'),previous:$('previous'),next:$('next'),shuffle:$('shuffle'),repeat:$('repeat'),seek:$('seek'),elapsed:$('elapsed'),duration:$('duration'),volume:$('volume'),volumePct:$('volumePct'),shareTrack:$('shareTrack'),shareStation:$('shareStation'),toast:$('toast')
  };
  const state = { tracks:[],current:-1,featured:-1,site:{name:'VΛRKËN RADIO',artist:'VΛRKËN'},shuffle:false,repeat:'all',sheet:false,lastFocus:null };
  const audio = el.audio;
  const yearsMin = Date.UTC(2015,0,1), yearsMax=Date.now()+2*86400000;
  // Fin de l'import initial des 95 morceaux : les prochains ajouts passent en tete.
  const initialImportEnd = Date.parse('2026-11-19T18:04:21Z');
  const elapsed = seconds => {const n=Math.floor(Math.max(0,Number(seconds)||0));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`};
  const number = n => String(state.tracks.length - n).padStart(2,'0');
  const clean = v => String(v ?? '').replace(/\s+/g,' ').trim();
  function isPlaceholder(t){return !t || /^(?:tiktok\s*(?:video)?(?:\s*#?\d+)?|original\s*(?:audio|sound)|sans titre|untitled|video|vidéo|publication du \d{2}\/\d{2}\/\d{4}|\d{10,22})$/i.test(t)}
  function displayTitle(track, pos){const t=clean(track.title);return isPlaceholder(t)?`Pièce ${number(pos)}`:t}
  function artist(track){const a=clean(track?.artist);return !a || /^(?:mon univers musical|artiste inconnu|unknown)$/i.test(a)?'VΛRKËN':a}
  function mediaPath(value,folder){const s=clean(value);if(!s || s.includes('..') || s.includes('\\') || s[0]=='/' || !s.startsWith(folder+'/') || /[?#]/.test(s))return '';return s}
  function icon(name){return `<svg aria-hidden="true"><use href="#ic-${name}"></use></svg>`}
  function showToast(msg){el.toast.textContent=msg;el.toast.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.toast.hidden=true,2300)}
  function dateMs(value){const n=Date.parse(value || '');return Number.isFinite(n)?n:null}
  function timestampFromId(raw){
    if(!/^\d{17,21}$/.test(clean(raw)))return null;
    try{const ms=Number(BigInt(raw)>>32n)*1000;return ms>=yearsMin&&ms<=yearsMax?ms:null}catch{return null}
  }
  function tiktokId(url){const match=clean(url).match(/(?:tiktok\.com\/[^\s]*?\/video\/|\/video\/)(\d{17,21})(?:\D|$)/i);return match?.[1]||''}
  function chronology(t,manifest){
    const newlyAdded=dateMs(t.added_at);
    if(newlyAdded && newlyAdded>initialImportEnd)return {sort:newlyAdded,precision:true};
    const known=manifest?.items?.[String(t.id)];
    const published=typeof known==='number'?known:(typeof known==='object'?Number(known.timestamp):NaN);
    if(Number.isFinite(published)&&published>0)return {sort:published*1000,precision:true};
    const source=timestampFromId(tiktokId(t.source_url));
    if(source)return {sort:source,precision:true};
    const explicit=dateMs(t.published_at||t.create_time||t.upload_date);
    if(explicit)return {sort:explicit,precision:true};
    return {sort:dateMs(t.added_at)||0,precision:false};
  }
  async function loadOptional(url){try{const r=await fetch(url,{cache:'no-store'});return r.ok?await r.json():null}catch{return null}}
  function setArt(node,cover,position){
    node.querySelectorAll('img').forEach(img=>img.remove());
    const found=node.querySelector('.fallback-art');if(found)found.hidden=false;
    const src=mediaPath(cover,'covers');
    if(!src)return;
    const img=document.createElement('img');img.alt='';img.decoding='async';img.loading=position==='feature'?'eager':'lazy';img.src=src;
    img.addEventListener('load',()=>{if(found)found.hidden=true},{once:true});
    img.addEventListener('error',()=>img.remove(),{once:true});
    node.prepend(img);
  }
  function setCurrentArt(){
    const track=state.tracks[state.current];if(!track)return;
    setArt(el.miniArt,track.cover,'mini');setArt(el.sheetArtwork,track.cover,'sheet');
  }
  function currentTrack(){return state.tracks[state.current]}
  function updateURL(){const tr=currentTrack();if(!tr)return;try{const url=new URL(location.href);url.searchParams.set('track',String(tr.id));history.replaceState(null,'',url.toString())}catch{}}
  function renderGrid(filter=''){
    el.coverGrid.replaceChildren();const term=clean(filter).toLocaleLowerCase('fr');let count=0;
    const fragment=document.createDocumentFragment();
    state.tracks.forEach((track,i)=>{
      if(term && !(displayTitle(track,i)+' '+artist(track)).toLocaleLowerCase('fr').includes(term))return;
      count++;
      const article=document.createElement('article');article.className='cover-item';article.dataset.index=String(i);if(i===state.current)article.classList.add('active');
      const button=document.createElement('button');button.type='button';button.className='cover-button';button.setAttribute('aria-label',`Écouter la pièce ${number(i)} : ${displayTitle(track,i)}`);button.title=displayTitle(track,i);
      const fallback=document.createElement('span');fallback.className='fallback-art';fallback.textContent='VΛ';button.appendChild(fallback);
      setArt(button,track.cover,'grid');
      const iconHolder=document.createElement('span');iconHolder.className='cover-play-indicator';iconHolder.innerHTML=icon('play');button.appendChild(iconHolder);
      button.addEventListener('click',()=>selectTrack(i,true));
      const cap=document.createElement('div');cap.className='cover-caption';
      const n=document.createElement('span');n.className='cover-index';n.textContent=number(i);
      const arrow=document.createElement('span');arrow.className='tiny-triangle';arrow.setAttribute('aria-hidden','true');arrow.textContent='▶';
      cap.append(n,arrow);article.append(button,cap);fragment.appendChild(article);
    });
    if(!count){const p=document.createElement('p');p.className='empty';p.textContent=term?'Aucun morceau trouvé.':'Aucun morceau publié pour le moment.';fragment.appendChild(p)}
    el.coverGrid.appendChild(fragment);
  }
  function updateButtons(){
    const playing=!audio.paused && !audio.ended && !!audio.currentSrc;
    for(const btn of [el.miniToggle,el.sheetToggle]){btn.innerHTML=icon(playing?'pause':'play');btn.setAttribute('aria-label',playing?'Pause':'Lecture')}
    el.shuffle.classList.toggle('active',state.shuffle);el.shuffle.setAttribute('aria-pressed',String(state.shuffle));
    el.repeat.classList.toggle('active',state.repeat!=='off');el.repeat.dataset.mode=state.repeat;el.repeat.setAttribute('aria-pressed',String(state.repeat!=='off'));
    el.repeat.setAttribute('aria-label',state.repeat==='one'?'Répéter le morceau':state.repeat==='all'?'Répéter la collection':'Répétition désactivée');
  }
  function updatePlayer(){
    const track=currentTrack();if(!track){el.miniPlayer.hidden=true;return}
    el.miniPlayer.hidden=false;
    const title=displayTitle(track,state.current);
    el.miniTitle.textContent=title;el.miniArtist.textContent=artist(track);el.sheetTitle.textContent=title;el.sheetArtist.textContent=artist(track);el.sheetIndex.textContent='PIÈCE '+number(state.current);
    setCurrentArt();updateButtons();
    for(const item of document.querySelectorAll('.cover-item'))item.classList.toggle('active',Number(item.dataset.index)===state.current);
    if('mediaSession' in navigator && 'MediaMetadata' in window){
      try{navigator.mediaSession.metadata=new MediaMetadata({title,artist:artist(track),album:'VΛRKËN RADIO',artwork:track.cover?[{src:new URL(track.cover,location.href).href,sizes:'512x512',type:'image/jpeg'}]:[]})}catch{}
    }
  }
  function selectTrack(i,play=true){
    const track=state.tracks[i];if(!track)return;
    const src=mediaPath(track.file,'audio');if(!src){showToast('Fichier MP3 invalide');return}
    const changed=i!==state.current;
    state.current=i;
    if(changed||!audio.currentSrc){audio.src=src;audio.load()}
    updatePlayer();updateURL();
    if(play)audio.play().catch(()=>showToast('Lecture indisponible : vérifie le MP3'));
  }
  function nextIndex(){
    const size=state.tracks.length;if(!size)return -1;
    if(state.shuffle && size>1){let k=state.current;while(k===state.current)k=Math.floor(Math.random()*size);return k}
    return state.current+1>=size?(state.repeat==='off'?-1:0):state.current+1;
  }
  function next(){const i=nextIndex();if(i<0){audio.pause();return}selectTrack(i,true)}
  function previous(){if(audio.currentTime>3){audio.currentTime=0;return}const size=state.tracks.length;if(!size)return;selectTrack((state.current-1+size)%size,true)}
  function toggle(){if(state.current<0){if(state.tracks.length)selectTrack(0,true);return}if(audio.paused)audio.play().catch(()=>showToast('Impossible de lancer la lecture'));else audio.pause()}
  // seek-mobile-v1 : sur mobile, ne jamais réécrire la position du curseur pendant le glissement.
  let userScrubbing=false;
  let lastSeekTarget=null;
  function audioDuration(){return Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:0}
  function seekPreview(){
    const dur=audioDuration();if(!dur)return;
    const fraction=Math.max(0,Math.min(1,Number(el.seek.value)/1000));
    el.elapsed.textContent=elapsed(fraction*dur);
    el.duration.textContent=elapsed(dur);
    el.miniProgressFill.style.width=(fraction*100)+'%';
  }
  function commitSeek(){
    if(!userScrubbing)return;
    userScrubbing=false;
    const dur=audioDuration();if(!dur)return;
    const desired=Math.min(dur,Math.max(0,Number(el.seek.value)/1000*dur));
    lastSeekTarget=desired;
    try{audio.currentTime=desired}catch{lastSeekTarget=null;showToast('Déplacement indisponible')}
    seekPreview();
  }
  function timeUpdate(){
    const dur=audioDuration();
    el.duration.textContent=elapsed(dur);
    if(userScrubbing || (audio.seeking && lastSeekTarget!==null))return;
    const value=dur?Math.max(0,Math.min(1000,audio.currentTime/dur*1000)):0;
    el.seek.value=String(value);
    el.elapsed.textContent=elapsed(audio.currentTime);
    el.miniProgressFill.style.width=(value/10)+'%';
  }
  function openSheet(){if(state.current<0 && state.tracks.length)selectTrack(0,false);state.lastFocus=document.activeElement;state.sheet=true;el.sheetBackdrop.hidden=false;el.playerSheet.classList.add('open');el.playerSheet.setAttribute('aria-hidden','false');requestAnimationFrame(()=>el.sheetBackdrop.classList.add('visible'));document.body.style.overflow='hidden';el.closeSheet.focus();}
  function closeSheet(){state.sheet=false;el.playerSheet.classList.remove('open');el.playerSheet.setAttribute('aria-hidden','true');el.sheetBackdrop.classList.remove('visible');el.sheetBackdrop.hidden=true;document.body.style.overflow='';if(state.lastFocus?.focus)state.lastFocus.focus()}
  async function share(url,title){
    try{if(navigator.share){await navigator.share({title,url});return}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);showToast('Lien copié');return}}catch(e){if(e.name==='AbortError')return}
    window.prompt('Copie ce lien :',url);
  }
  function shareSong(){const track=currentTrack();if(!track)return;const url=new URL(location.href);url.searchParams.set('track',String(track.id));share(url.toString(),displayTitle(track,state.current)+' · VΛRKËN RADIO')}
  function setup(){
    el.featurePlay.addEventListener('click',()=>selectTrack(state.featured,true));el.featureCover.addEventListener('click',()=>selectTrack(state.featured,true));
    el.shareStation.addEventListener('click',()=>share(location.origin+location.pathname,'VΛRKËN RADIO'));
    el.miniToggle.addEventListener('click',toggle);el.sheetToggle.addEventListener('click',toggle);
    el.miniPrevious.addEventListener('click',previous);el.previous.addEventListener('click',previous);
    el.miniNext.addEventListener('click',next);el.next.addEventListener('click',next);
    el.expandPlayer.addEventListener('click',openSheet);el.closeSheet.addEventListener('click',closeSheet);el.sheetBackdrop.addEventListener('click',closeSheet);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.sheet)closeSheet()});
    el.shareTrack.addEventListener('click',shareSong);
    el.shuffle.addEventListener('click',()=>{state.shuffle=!state.shuffle;updateButtons()});
    el.repeat.addEventListener('click',()=>{state.repeat=state.repeat==='all'?'one':state.repeat==='one'?'off':'all';updateButtons()});
    // Déplacement fluide au doigt : aperçu pendant le geste, seek réel à la fin.
    // Chrome Android déclenche change au relâchement ; pointerup est un filet de sécurité.
    el.seek.style.touchAction='none';
    el.seek.addEventListener('pointerdown',()=>{userScrubbing=true});
    el.seek.addEventListener('input',()=>{userScrubbing=true;seekPreview()});
    el.seek.addEventListener('change',commitSeek);
    el.seek.addEventListener('pointerup',commitSeek);
    el.seek.addEventListener('pointercancel',commitSeek);
    audio.addEventListener('seeked',()=>{lastSeekTarget=null;timeUpdate()});
    // Démarrage systématique à 100 % : ne pas reprendre l'ancien volume sauvegardé.
    const vol=1;
    audio.muted=false;audio.volume=vol;el.volume.value='1';el.volumePct.textContent='100%';
    el.volume.addEventListener('input',()=>{const v=Math.max(0,Math.min(1,Number(el.volume.value)||0));audio.muted=false;audio.volume=v;el.volumePct.textContent=Math.round(v*100)+'%';});
    el.searchToggle.addEventListener('click',()=>{const opening=el.searchWrap.hidden;el.searchWrap.hidden=!opening;el.searchToggle.setAttribute('aria-expanded',String(opening));if(opening)el.searchInput.focus();else{el.searchInput.value='';renderGrid()}});
    el.searchClose.addEventListener('click',()=>{el.searchWrap.hidden=true;el.searchToggle.setAttribute('aria-expanded','false');el.searchInput.value='';renderGrid()});
    el.searchInput.addEventListener('input',()=>renderGrid(el.searchInput.value));
    audio.addEventListener('play',updateButtons);audio.addEventListener('pause',updateButtons);audio.addEventListener('ended',()=>{if(state.repeat==='one'){audio.currentTime=0;audio.play().catch(()=>{})}else next()});
    audio.addEventListener('timeupdate',timeUpdate);audio.addEventListener('loadedmetadata',timeUpdate);
    audio.addEventListener('error',()=>{if(audio.src)showToast('Ce MP3 ne peut pas être chargé')});
    if('mediaSession' in navigator){
      for(const [name,fn] of [['play',()=>audio.play()],['pause',()=>audio.pause()],['previoustrack',previous],['nexttrack',next],['seekto',e=>{if(Number.isFinite(e.seekTime))audio.currentTime=e.seekTime}]]){
        try{navigator.mediaSession.setActionHandler(name,fn)}catch{}
      }
    }
  }
  async function start(){
    setup();
    try{
      const [response,order]=await Promise.all([fetch('catalog.json?ts='+Date.now(),{cache:'no-store'}),loadOptional('radio-order.json?ts='+Date.now())]);
      if(!response.ok)throw new Error('HTTP '+response.status);
      const catalog=await response.json();state.site=catalog.site||state.site;
      const raw=Array.isArray(catalog.tracks)?catalog.tracks:[];
      let verified=0,unresolved=0;
      state.tracks=raw.filter(t=>t && t.file && t.published!==false && !t.deleted && !t.purged && mediaPath(t.file,'audio')).map((track,i)=>{
        const date=chronology(track,order);if(date.precision)verified++;else unresolved++;
        return {...track,_origin:i,_sort:date.sort,_precision:date.precision};
      }).sort((a,b)=>b._sort-a._sort || a._origin-b._origin);
      el.collectionCount.textContent=String(state.tracks.length).padStart(2,'0');
      el.collectionBottom.textContent=unresolved?`Classement chronologique estimé pour ${unresolved} morceau(x) sans date de publication vérifiable.`:'Du dernier ajout aux premières publications.';
      if(state.tracks.length){
        state.featured=0;
        const feat=state.tracks[state.featured];el.featureNumber.textContent=number(state.featured)+' / '+String(state.tracks.length).padStart(2,'0');
        setArt(el.featureCover,feat.cover,'feature');
        el.featureCover.setAttribute('aria-label','Écouter '+displayTitle(feat,state.featured));
        const deep=new URLSearchParams(location.search).get('track');const deepIdx=state.tracks.findIndex(t=>String(t.id)===deep);
        if(deepIdx>=0)selectTrack(deepIdx,false);
      }else{el.featurePlay.disabled=true;el.featureCover.disabled=true;el.featureNumber.textContent='—';}
      renderGrid();
    }catch(e){el.coverGrid.replaceChildren();const p=document.createElement('p');p.className='empty';p.textContent='Le catalogue ne répond pas. Vérifie que le serveur de la radio est démarré.';el.coverGrid.appendChild(p);console.error('VΛRKËN RADIO',e)}
  }
  start();
})();
