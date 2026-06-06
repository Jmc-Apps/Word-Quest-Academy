const APP_VERSION = 'v2.35';

const DEFAULT_WORDS = [];
const PROTECTED_DEMO_LIST_NAME = 'Demo Words';
const PROTECTED_DEMO_WORDS = ['because','friend','people','school','answer','adventure','mountain','castle','rocket','treasure'];
let state = JSON.parse(localStorage.getItem('wqa_state_v235') || localStorage.getItem('wqa_state_v234') || localStorage.getItem('wqa_state_v233') || localStorage.getItem('wqa_state_v232') || localStorage.getItem('wqa_state_v231') || 'null') || {
  words: DEFAULT_WORDS, activeListName:'', xp:0, stars:0, correct:0, attempts:0, sound:true, rewardCount:0, wordStats:{}, games:{hangman:0,builder:0,memory:0,search:0,dragon:0,defense:0}
};

const $ = id => document.getElementById(id);
function cleanWord(w){ return (w||'').replace(/[^a-zA-Z]/g,'').toLowerCase(); }
function wordList(){ return state.words.map(cleanWord).filter(w=>w.length>1); }
const lastWordByGame = {};
function randomWord(game='global'){
  const list=wordList();
  if(!list.length) return '';
  if(list.length===1){
    lastWordByGame[game]=list[0];
    return list[0];
  }
  let pick=list[Math.floor(Math.random()*list.length)];
  let guard=0;
  while(pick===lastWordByGame[game] && guard<30){
    pick=list[Math.floor(Math.random()*list.length)];
    guard++;
  }
  lastWordByGame[game]=pick;
  return pick;
}
function requireWords(targetId){
  if(wordList().length) return true;
  $(targetId).innerHTML = `<div class="big-word">📚</div><p>Add or load a word list first.</p><button onclick="show('manager')">Go to Word Manager</button>`;
  return false;
}

function startScreen(targetId, title, description, buttonText, startFn){
  const count = wordList().length;
  $(targetId).innerHTML = `
    <div class="start-screen">
      <div class="start-icon">⚔️</div>
      <h3>${title}</h3>
      <p>${description}</p>
      <p class="word-count-pill">Words available: ${count}</p>
      <button class="primary" onclick="${startFn}()">${buttonText}</button>
    </div>`;
}

function save(){ updateVersionDisplay(); ensureV229State(); localStorage.setItem('wqa_state_v235', JSON.stringify(state)); updateStats(); updateSoundButton(); updateMusicButton(); }
function toast(msg){ const t=$('toast'); t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none',1500); }

function ensureV229State(){
  if(typeof state.sound === 'undefined') state.sound = true;
  if(typeof state.rewardCount === 'undefined') state.rewardCount = 0;
  if(typeof state.activeListName === 'undefined') state.activeListName = '';
  if(typeof state.music === 'undefined') state.music = false;
  if(typeof state.activeListName === 'undefined') state.activeListName = '';
  if(typeof state.music === 'undefined') state.music = false;
}
function playSound(type='success'){
  if(!state.sound) return;
  try{
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const sequences = {
      success:[[660,.07],[880,.09]],
      fail:[[190,.14]],
      reward:[[523,.07],[659,.07],[784,.11]],
      chest:[[392,.08],[523,.08],[659,.13]],
      click:[[440,.04]]
    };
    const notes = sequences[type] || sequences.success;
    let t = ctx.currentTime;
    osc.type = type==='fail' ? 'sawtooth' : 'triangle';
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001,t);
    osc.start(t);
    notes.forEach(([freq,dur])=>{
      osc.frequency.setValueAtTime(freq,t);
      gain.gain.exponentialRampToValueAtTime(0.11,t+0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      t += dur + 0.025;
    });
    osc.stop(t);
  }catch(e){}
}
function rewardFloat(text){
  const div=document.createElement('div');
  div.className='reward-float';
  div.textContent=text;
  document.body.appendChild(div);
  setTimeout(()=>div.remove(),1600);
}
function chestReward(){
  state.rewardCount = (state.rewardCount || 0) + 1;
  if(state.rewardCount % 5 === 0){
    state.xp += 25;
    state.stars += 2;
    playSound('chest');
    showChest('+25 XP  +2 Stars');
  }
}
function showChest(text){
  const div=document.createElement('div');
  div.className='chest-reward';
  div.innerHTML=`<div class="chest-icon">🎁</div><h3>Treasure Chest!</h3><p>${text}</p>`;
  document.body.appendChild(div);
  setTimeout(()=>div.classList.add('open'),40);
  setTimeout(()=>div.remove(),2300);
}
function toggleSound(){
  ensureV229State();
  state.sound=!state.sound;
  save();
  updateSoundButton();
  playSound('click');
}
function updateSoundButton(){
  const b=$('soundToggleBtn');
  if(b) b.textContent = state.sound ? 'Sound: On' : 'Sound: Off';
}

let bgMusic = null;
function getBgMusic(){
  if(!bgMusic){
    bgMusic = new Audio('assets/audio/lanterns-in-the-library.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.055; // about half the normal sound effect level
  }
  return bgMusic;
}
function toggleMusic(){
  ensureV229State();
  state.music = !state.music;
  save();
  updateMusicButton();
  if(state.music){
    const music = getBgMusic();
    music.volume = 0.055;
    music.play().catch(()=>toast('Tap Music again if your browser blocked autoplay'));
  } else if(bgMusic){
    bgMusic.pause();
  }
}
function updateMusicButton(){
  const b = $('musicToggleBtn');
  if(b) b.textContent = state.music ? '🎵 Music On' : '🎵 Music Off';
}
function syncMusicState(){
  ensureV229State();
  updateMusicButton();
  if(state.music){
    const music = getBgMusic();
    music.volume = 0.055;
    music.play().catch(()=>{});
  }
}

function downloadJson(filename,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function exportFullBackup(){
  const backup={
    app:'Word Quest Academy',
    version:'2.22',
    exportedAt:new Date().toISOString(),
    state,
    savedLists:getSavedLists()
  };
  downloadJson('word-quest-academy-backup-v2-22.json', backup);
  toast('Backup exported');
}
function importFullBackup(){
  const input=$('backupFile');
  if(!input || !input.files || !input.files[0]){ toast('Choose a backup file first'); return; }
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      if(data.state){
        state=data.state;
        ensureV229State();
        save();
      }
      if(data.savedLists){
        setSavedLists(data.savedLists);
      }
      loadAllGames();
      updateSoundButton();
      toast('Backup restored');
    }catch(e){
      toast('Could not import backup');
    }
  };
  reader.readAsText(input.files[0]);
}
function exportWordListsOnly(){
  downloadJson('word-quest-word-lists.json', {app:'Word Quest Academy', type:'word-lists', savedLists:getSavedLists()});
  toast('Word lists exported');
}


function updateVersionDisplay(){
  document.querySelectorAll('.version').forEach(el=>el.textContent=APP_VERSION);
}

function updateStats(){ $('xp').textContent=state.xp; $('stars').textContent=state.stars; }
function show(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  $(id).classList.add('active');
  [...document.querySelectorAll('nav button')].find(b=>b.getAttribute('onclick').includes(id))?.classList.add('active');
  if(id==='reports') loadReports();
  if(id==='achievements') loadAchievements();
}
function reward(game,xp=10,stars=0,word=''){
  trackWord(word,true); state.xp+=xp; state.stars+=stars; state.correct++; state.attempts++; state.games[game]=(state.games[game]||0)+1;
  chestReward();
  save();
  playSound('success');
  rewardFloat(`+${xp} XP${stars?`  +${stars} ⭐`:''}`);
  toast(`+${xp} XP${stars?` +${stars} star`:''}`);
  loadAchievements(); loadReports();
}
function trackWord(word,correct){
  if(!word) return;
  adventureRecordWord(word);
  
  state.wordStats=state.wordStats||{};
  const k=String(word).toLowerCase();
  state.wordStats[k]=state.wordStats[k]||{correct:0,incorrect:0,history:[]};
  if(!Array.isArray(state.wordStats[k].history)) state.wordStats[k].history=[];
  if(correct) state.wordStats[k].correct++;
  else state.wordStats[k].incorrect++;
  state.wordStats[k].history.push(!!correct);
  if(state.wordStats[k].history.length>10) state.wordStats[k].history=state.wordStats[k].history.slice(-10);
}
function miss(word){ state.attempts++; trackWord(word,false); save(); playSound('fail'); }

function getSavedLists(){
  const lists = JSON.parse(localStorage.getItem('wqa_saved_word_lists_v219') || '{}');
  lists[PROTECTED_DEMO_LIST_NAME] = PROTECTED_DEMO_WORDS;
  return lists;
}
function setSavedLists(lists){
  const copy = {...lists};
  delete copy[PROTECTED_DEMO_LIST_NAME];
  localStorage.setItem('wqa_saved_word_lists_v219', JSON.stringify(copy));
}
function currentInputWords(){
  return [...new Set($('wordInput').value.split(/\n/).map(cleanWord).filter(Boolean))];
}
function saveWords(){
  const list=currentInputWords();
  state.words=list;
  state.activeListName='Unsaved Current List';
  save(); updateWordCount(); loadAllGames(); renderSavedLists(); toast(`${state.words.length} words active`);
}
function saveNamedList(){
  const name=($('listName').value||'').trim();
  const list=currentInputWords();
  if(!name){ toast('Give the list a name first'); return; }
  if(name.toLowerCase()===PROTECTED_DEMO_LIST_NAME.toLowerCase()){ toast('Demo Words is protected. Choose another name.'); return; }
  if(!list.length){ toast('Add words before saving a list'); return; }
  const lists=getSavedLists();
  lists[name]=list;
  setSavedLists(lists);
  state.words=list;
  state.activeListName=name;
  save();
  renderSavedLists();
  updateWordCount();
  loadAllGames();
  toast(`Saved list: ${name}`);
}
function loadNamedList(name){
  const lists=getSavedLists();
  if(!lists[name]) return;
  state.words=lists[name];
  state.activeListName=name;
  $('wordInput').value=(state.words||[]).join('\n');
  save();
  updateWordCount();
  loadAllGames();
  renderSavedLists();
  toast(`Loaded: ${name}`);
}
function deleteNamedList(name){
  if(name===PROTECTED_DEMO_LIST_NAME){
    toast('Demo Words cannot be deleted');
    return;
  }
  if(!confirm(`Delete word list "${name}"?`)) return;
  const lists=getSavedLists();
  delete lists[name];
  setSavedLists(lists);
  renderSavedLists();
  toast(`Deleted: ${name}`);
}
function clearActiveWords(){
  state.words=[];
  state.activeListName='';
  $('wordInput').value='';
  save();
  updateWordCount();
  loadAllGames();
  renderSavedLists();
  toast('Active word list cleared');
}
function loadDemoWords(){
  loadNamedList(PROTECTED_DEMO_LIST_NAME);
}
function resetProgress(){
  if(confirm('Reset XP, stars and reports? Your word list will stay.')){
    const keep=state.words; state={words:keep,activeListName:state.activeListName||'',xp:0,stars:0,correct:0,attempts:0,sound:true,rewardCount:0,games:{hangman:0,builder:0,memory:0,search:0,dragon:0,defense:0}};
    save(); loadAllGames(); toast('Progress reset');
  }
}
function updateWordCount(){ $('wordCount').textContent=`${wordList().length} spelling words active${state.activeListName ? ' — '+state.activeListName : ''}`; }

/* v2.21 Dungeon Rescue Knight SVG */
function knightSvg(){
  return `
  <svg class="knight-svg" viewBox="0 0 360 330" role="img" aria-label="Dungeon rescue knight scene">
    <defs>
      <linearGradient id="stoneGrad" x1="0" x2="1">
        <stop offset="0" stop-color="#2b2523"/>
        <stop offset="1" stop-color="#4a3b33"/>
      </linearGradient>
      <linearGradient id="woodGrad" x1="0" x2="1">
        <stop offset="0" stop-color="#5b351c"/>
        <stop offset="1" stop-color="#9b622c"/>
      </linearGradient>
      <linearGradient id="goldGrad" x1="0" x2="1">
        <stop offset="0" stop-color="#ffe28a"/>
        <stop offset=".55" stop-color="#d89b25"/>
        <stop offset="1" stop-color="#8b540d"/>
      </linearGradient>
      <linearGradient id="steelGrad" x1="0" x2="1">
        <stop offset="0" stop-color="#f0f4f7"/>
        <stop offset=".45" stop-color="#8d9aa3"/>
        <stop offset="1" stop-color="#3f474e"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>

    <rect x="0" y="0" width="360" height="330" rx="22" fill="#1a1110"/>
    <g opacity=".95">
      ${Array.from({length:7}).map((_,r)=>Array.from({length:8}).map((_,c)=>{
        const x=c*46+(r%2? -18:0), y=r*37+4;
        return `<rect x="${x}" y="${y}" width="44" height="34" rx="4" fill="url(#stoneGrad)" stroke="#17110f" stroke-width="2"/>`
      }).join('')).join('')}
    </g>

    <rect x="20" y="268" width="320" height="38" rx="8" fill="#2a1c15" stroke="#8b6329" stroke-width="3"/>
    <path d="M20 270 C80 252, 125 284, 190 266 S290 252, 340 270" fill="none" stroke="#f2c45b" stroke-width="2" opacity=".35"/>

    <g id="rescue-frame">
      <rect x="70" y="55" width="20" height="218" rx="5" fill="url(#woodGrad)" stroke="#2d180b" stroke-width="3"/>
      <rect x="62" y="48" width="178" height="22" rx="5" fill="url(#woodGrad)" stroke="#2d180b" stroke-width="3"/>
      <rect x="54" y="270" width="78" height="18" rx="5" fill="url(#woodGrad)" stroke="#2d180b" stroke-width="3"/>
      <line x1="218" y1="68" x2="218" y2="110" stroke="#d9b078" stroke-width="7" stroke-linecap="round"/>
      <circle cx="218" cy="70" r="11" fill="none" stroke="#e5bd7d" stroke-width="5"/>
    </g>

    <g class="torch" filter="url(#glow)">
      <rect x="37" y="195" width="9" height="55" rx="3" fill="#633516"/>
      <path d="M42 188 C25 205, 36 219, 42 226 C50 214, 62 205, 42 188Z" fill="#ffcf43"/>
      <path d="M43 196 C35 207, 41 216, 44 220 C49 211, 54 204, 43 196Z" fill="#ff6d20"/>
    </g>
    <g class="torch" filter="url(#glow)">
      <rect x="314" y="195" width="9" height="55" rx="3" fill="#633516"/>
      <path d="M319 188 C302 205, 313 219, 319 226 C327 214, 339 205, 319 188Z" fill="#ffcf43"/>
      <path d="M320 196 C312 207, 318 216, 321 220 C326 211, 331 204, 320 196Z" fill="#ff6d20"/>
    </g>

    <g id="knight" transform="translate(0,0)">
      <g class="knight-part kp-legs">
        <path d="M196 218 L178 268 L200 268 L213 223Z" fill="url(#steelGrad)" stroke="#16191d" stroke-width="3"/>
        <path d="M224 218 L243 268 L221 268 L208 223Z" fill="url(#steelGrad)" stroke="#16191d" stroke-width="3"/>
        <path d="M174 266 h32 v12 h-38 q0-8 6-12Z" fill="#333b43" stroke="#111" stroke-width="2"/>
        <path d="M217 266 h32 q6 4 6 12 h-38Z" fill="#333b43" stroke="#111" stroke-width="2"/>
      </g>
      <g class="knight-part kp-body">
        <path d="M178 145 Q210 128 242 145 L232 222 Q210 238 188 222Z" fill="url(#steelGrad)" stroke="#11171c" stroke-width="4"/>
        <path d="M190 153 Q210 144 230 153 L224 211 Q210 221 196 211Z" fill="#20262b" opacity=".38"/>
        <path d="M210 143 L210 225" stroke="#f1f4f6" stroke-width="3" opacity=".45"/>
        <path d="M184 178 H236" stroke="#3f474e" stroke-width="5"/>
      </g>
      <g class="knight-part kp-left-arm">
        <path d="M178 154 Q148 171 142 207 L160 214 Q165 184 190 169Z" fill="url(#steelGrad)" stroke="#11171c" stroke-width="3"/>
        <circle cx="154" cy="213" r="11" fill="#5f6871" stroke="#11171c" stroke-width="3"/>
      </g>
      <g class="knight-part kp-right-arm">
        <path d="M242 154 Q272 171 278 207 L260 214 Q255 184 230 169Z" fill="url(#steelGrad)" stroke="#11171c" stroke-width="3"/>
        <circle cx="266" cy="213" r="11" fill="#5f6871" stroke="#11171c" stroke-width="3"/>
      </g>
      <g class="knight-part kp-head">
        <path d="M182 108 Q210 82 238 108 L233 143 Q210 158 187 143Z" fill="url(#steelGrad)" stroke="#11171c" stroke-width="4"/>
        <path d="M189 118 H231 V133 H189Z" fill="#141414" stroke="#d7dce0" stroke-width="2"/>
        <line x1="194" y1="123" x2="226" y2="123" stroke="#f2c45b" stroke-width="3"/>
        <path d="M210 86 L210 105" stroke="url(#goldGrad)" stroke-width="6" stroke-linecap="round"/>
      </g>
      <g class="knight-part kp-shield">
        <path d="M284 184 Q318 197 310 245 Q298 268 284 276 Q270 268 258 245 Q250 197 284 184Z" fill="#8a1010" stroke="url(#goldGrad)" stroke-width="5"/>
        <path d="M284 198 L296 226 H272Z" fill="url(#goldGrad)"/>
        <path d="M270 238 H298" stroke="#ffe7a0" stroke-width="4"/>
      </g>
    </g>

    <text x="180" y="318" text-anchor="middle" fill="#f2c45b" font-family="Georgia,serif" font-size="16" font-weight="700">Rescue the knight by guessing the word!</text>
  </svg>`;
}

function beginHangman(){
  if(!requireWords('hangmanGame')) return;
  const w=adventureAwareRandom('hangman'); let hidden=[...w].map(()=>"_"), misses=0;
  const parts=['kp-head','kp-body','kp-left-arm','kp-right-arm','kp-legs','kp-shield'];
  $('hangmanGame').innerHTML = `
    <div class="game-area">
      <div class="scene dungeon-scene">${knightSvg()}</div>
      <div>
        <div class="big-word" id="hmWord">${hidden.join(' ')}</div>
        <p id="hmInfo">Rescue mistakes: 0 / 6</p>
        <div class="keyboard" id="hmKeys"></div>
        <button onclick="beginHangman()">New Word</button>
      </div>
    </div>`;
  document.querySelectorAll('#hangmanGame .knight-part').forEach(el=>el.classList.remove('show-knight'));
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(ch=>{
    const b=document.createElement('button'); b.textContent=ch.toUpperCase();
    b.onclick=()=> {
      b.classList.add('disabled');
      let hit=false;
      [...w].forEach((c,i)=>{ if(c===ch){ hidden[i]=c.toUpperCase(); hit=true; }});
      if(!hit){
        misses++;
        const part=document.querySelector('#hangmanGame .'+parts[misses-1]);
        if(part) part.classList.add('show-knight');
      }
      $('hmWord').textContent=hidden.join(' ');
      $('hmInfo').textContent=`Rescue mistakes: ${misses} / 6`;
      if(hidden.join('').toLowerCase()===w){ document.querySelector('#hangmanGame .knight-svg')?.classList.add('victory'); reward('hangman',12,1,w); finishAdventureOr(loadHangman,1100); }
      if(misses>=6){ miss(w); toast(`The word was ${w}`); finishAdventureOr(loadHangman,900); }
    };
    $('hmKeys').appendChild(b);
  });
}

/* v2.12 Word Builder Blocks */
let builderStart = 0;
function shuffleArray(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function beginBuilder(){
  if(!requireWords('builderGame')) return;
  const w=adventureAwareRandom('builder');
  builderStart=Date.now();
  const letters=shuffleArray([...w]);
  $('builderGame').innerHTML=`
    <p>Drag the scrambled letter blocks into the correct order.</p>
    <div class="builder-meter"><div id="builderTimeBar"></div></div>
    <p id="builderTimer">Speed bonus: 20 XP</p>
    <div class="builder-wrap">
      <div>
        <h3>Scrambled Blocks</h3>
        <div class="block-zone" id="sourceBlocks"></div>
      </div>
      <div>
        <h3>Your Word</h3>
        <div class="block-zone target" id="targetBlocks"></div>
      </div>
    </div>
    <div class="row">
      <button onclick="checkBuilderBlocks('${w}')">Check Word</button>
      <button onclick="clearBuilderBlocks()">Clear</button>
      <button onclick="beginBuilder()">New Word</button>
    </div>`;
  letters.forEach((letter,i)=>addLetterBlock(letter,i,'sourceBlocks'));
  setupDropZone('sourceBlocks');
  setupDropZone('targetBlocks');
  startBuilderTimer();
}
function addLetterBlock(letter,i,parentId){
  const b=document.createElement('div');
  b.className='letter-block';
  b.textContent=letter.toUpperCase();
  b.draggable=true;
  b.id='block-'+Date.now()+'-'+i+'-'+Math.random().toString(16).slice(2);
  b.addEventListener('dragstart',e=>{
    b.classList.add('dragging');
    e.dataTransfer.setData('text/plain',b.id);
  });
  b.addEventListener('dragend',()=>b.classList.remove('dragging'));
  $(parentId).appendChild(b);
}
function setupDropZone(id){
  const zone=$(id);
  zone.addEventListener('dragover',e=>e.preventDefault());
  zone.addEventListener('drop',e=>{
    e.preventDefault();
    const block=$(e.dataTransfer.getData('text/plain'));
    if(!block) return;
    const after=getDragAfterElement(zone,e.clientX);
    if(after==null) zone.appendChild(block);
    else zone.insertBefore(block,after);
  });
}
function getDragAfterElement(container,x){
  const els=[...container.querySelectorAll('.letter-block:not(.dragging)')];
  return els.reduce((closest,child)=>{
    const box=child.getBoundingClientRect();
    const offset=x-box.left-box.width/2;
    if(offset<0 && offset>closest.offset) return {offset,element:child};
    return closest;
  },{offset:Number.NEGATIVE_INFINITY}).element;
}
function startBuilderTimer(){
  clearInterval(window.builderTimerInterval);
  window.builderTimerInterval=setInterval(()=>{
    const elapsed=(Date.now()-builderStart)/1000;
    const bonus=Math.max(5,20-Math.floor(elapsed));
    const pct=Math.max(0,Math.min(100,(bonus/20)*100));
    const bar=$('builderTimeBar');
    if(bar) bar.style.width=pct+'%';
    const timer=$('builderTimer');
    if(timer) timer.textContent=`Speed bonus: ${bonus} XP`;
  },300);
}
function currentBuilderWord(){
  return [...$('targetBlocks').querySelectorAll('.letter-block')].map(b=>b.textContent.toLowerCase()).join('');
}
function checkBuilderBlocks(w){
  const answer=currentBuilderWord();
  if(answer.length!==w.length){ toast('Drag all blocks into Your Word'); return; }
  if(answer===w){
    clearInterval(window.builderTimerInterval);
    const elapsed=(Date.now()-builderStart)/1000;
    const xp=Math.max(5,20-Math.floor(elapsed));
    const stars=elapsed<=10?2:1;
    reward('builder',xp,stars,w);
    toast(`Correct! Speed XP: ${xp}`);
    finishAdventureOr(loadBuilder,900);
  } else {
    miss(w);
    toast('Not quite — rearrange the blocks');
    if(adventureModeActive) adventureNextGame();
  }
}
function clearBuilderBlocks(){
  const source=$('sourceBlocks'), target=$('targetBlocks');
  [...target.querySelectorAll('.letter-block')].forEach(b=>source.appendChild(b));
}

/* v2.13 Memory Spell with on-screen keyboard */
let memoryTyped = '';
function beginMemory(){
  if(!requireWords('memoryGame')) return;
  const w=adventureAwareRandom('memory');
  memoryTyped = '';
  $('memoryGame').innerHTML=`
    <p>Memorise the word, then hide it and spell it using the on-screen keyboard.</p>
    <div class="big-word">${w.toUpperCase()}</div>
    <button onclick="hideMemory('${w}')">Hide Word</button>`;
}
function hideMemory(w){
  memoryTyped = '';
  $('memoryGame').innerHTML=`
    <p>Tap the letters to spell the word from memory.</p>
    <div class="big-word" id="memoryBuilt">${'_ '.repeat(w.length)}</div>
    <div class="keyboard" id="memoryKeys"></div>
    <div class="row">
      <button onclick="memoryBackspace('${w}')">⌫ Backspace</button>
      <button onclick="memoryClear('${w}')">Clear</button>
      <button onclick="checkMemory('${w}')">Check</button>
    </div>`;
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(ch=>{
    const b=document.createElement('button');
    b.textContent=ch.toUpperCase();
    b.onclick=()=>memoryPress(ch,w);
    $('memoryKeys').appendChild(b);
  });
}
function updateMemoryBuilt(w){
  const shown = memoryTyped.toUpperCase().split('').join(' ') + (memoryTyped.length ? ' ' : '') + '_ '.repeat(Math.max(0,w.length-memoryTyped.length));
  $('memoryBuilt').textContent = shown.trim();
}
function memoryPress(ch,w){
  if(memoryTyped.length >= w.length) return;
  memoryTyped += ch;
  updateMemoryBuilt(w);
}
function memoryBackspace(w){
  memoryTyped = memoryTyped.slice(0,-1);
  updateMemoryBuilt(w);
}
function memoryClear(w){
  memoryTyped = '';
  updateMemoryBuilt(w);
}
function checkMemory(w){
  if(memoryTyped===w){ reward('memory',15,1,w); toast('Great memory!'); }
  else { miss(w); toast(`It was ${w}`); }
  if(adventureModeActive) adventureNextGame(); else loadMemory();
}

/* Corrected working Word Search */
let ws = {grid:[], placed:[], first:null, size:12};
function beginSearch(){
  if(!requireWords('wordSearchGame')) return;
  const list=wordList().filter(w=>w.length<=12).slice(0,8);
  const size=12;
  let grid=Array.from({length:size},()=>Array(size).fill(''));
  let placed=[];
  const dirs=[[1,0],[0,1],[1,1],[-1,1]];
  for(const word of list){
    let ok=false;
    for(let tries=0;tries<150 && !ok;tries++){
      const [dx,dy]=dirs[Math.floor(Math.random()*dirs.length)];
      const x=Math.floor(Math.random()*size), y=Math.floor(Math.random()*size);
      const endx=x+dx*(word.length-1), endy=y+dy*(word.length-1);
      if(endx<0||endx>=size||endy<0||endy>=size) continue;
      let fits=true;
      for(let i=0;i<word.length;i++){
        const current=grid[y+dy*i][x+dx*i];
        if(current && current!==word[i].toUpperCase()) fits=false;
      }
      if(!fits) continue;
      let cells=[];
      for(let i=0;i<word.length;i++){
        grid[y+dy*i][x+dx*i]=word[i].toUpperCase();
        cells.push(`${x+dx*i},${y+dy*i}`);
      }
      placed.push({word,cells,found:false});
      ok=true;
    }
  }
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    if(!grid[y][x]) grid[y][x]=String.fromCharCode(65+Math.floor(Math.random()*26));
  }
  ws={grid,placed,first:null,size};
  renderSearch();
}
function renderSearch(){
  $('wordSearchGame').innerHTML=`
    <p>Click the first and last letter of a hidden word.</p>
    <div class="word-list" id="wsWords"></div>
    <div class="search-grid" id="wsGrid" style="grid-template-columns:repeat(${ws.size},34px)"></div>
    <button onclick="hintSearch()">Hint</button>
    <button onclick="beginSearch()">New Puzzle</button>`;
  ws.placed.forEach(p=>{
    const s=document.createElement('span');
    s.textContent=p.word.toUpperCase();
    if(p.found) s.className='found';
    $('wsWords').appendChild(s);
  });
  for(let y=0;y<ws.size;y++) for(let x=0;x<ws.size;x++){
    const c=document.createElement('div');
    c.className='cell';
    c.textContent=ws.grid[y][x];
    c.dataset.xy=`${x},${y}`;
    c.onclick=()=>clickSearch(x,y,c);
    $('wsGrid').appendChild(c);
  }
  markFoundCells();
}
function clickSearch(x,y,cell){
  if(!ws.first){
    ws.first=[x,y];
    cell.classList.add('sel');
    return;
  }
  const a=`${ws.first[0]},${ws.first[1]}`;
  const b=`${x},${y}`;
  const found=ws.placed.find(p=>!p.found && ((p.cells[0]===a && p.cells[p.cells.length-1]===b) || (p.cells[0]===b && p.cells[p.cells.length-1]===a)));
  document.querySelectorAll('.cell.sel').forEach(c=>c.classList.remove('sel'));
  ws.first=null;
  if(found){
    found.found=true;
    reward('search',12,1,found.word);
    if(adventureModeActive) adventureNextGame(); else renderSearch();
  } else {
    toast('Not quite');
  }
}
function markFoundCells(){
  ws.placed.filter(p=>p.found).forEach(p=>p.cells.forEach(xy=>{
    const c=[...document.querySelectorAll('.cell')].find(el=>el.dataset.xy===xy);
    if(c) c.classList.add('found');
  }));
}
function hintSearch(){
  const p=ws.placed.find(p=>!p.found);
  if(!p) return toast('All words found!');
  const c=[...document.querySelectorAll('.cell')].find(el=>el.dataset.xy===p.cells[0]);
  if(c){ c.classList.add('sel'); setTimeout(()=>c.classList.remove('sel'),900); }
}


/* v2.26 Dragon Battle and Castle Defense */
let dragonState = { dragonHearts:5, playerHearts:5, used:[], word:'' };
let defenseState = { wall:100, wave:1, word:'' };

function memoryFlashGame(targetId, word, afterFlash){
  const box=$(targetId);
  box.innerHTML = `
    <div class="flash-card">
      <p>Memorise this word!</p>
      <div class="flash-word">${word.toUpperCase()}</div>
      <div class="flash-count" id="${targetId}Count">5</div>
    </div>`;
  let count=5;
  const timer=setInterval(()=>{
    count--;
    const c=$(targetId+'Count');
    if(c) c.textContent=count;
    if(count<=0){
      clearInterval(timer);
      afterFlash();
    }
  },1000);
}

function makeSpellKeyboard(containerId, onCheck){
  const wrap=document.createElement('div');
  wrap.innerHTML = `
    <div class="big-word" id="${containerId}Built">_</div>
    <div class="keyboard" id="${containerId}Keys"></div>
    <div class="row">
      <button id="${containerId}Back">⌫ Backspace</button>
      <button id="${containerId}Clear">Clear</button>
      <button id="${containerId}Check">Cast Spell</button>
    </div>`;
  $(containerId).appendChild(wrap);
  let typed='';
  const built=$(containerId+'Built');
  function update(){ built.textContent = typed ? typed.toUpperCase().split('').join(' ') : '_'; }
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(ch=>{
    const b=document.createElement('button');
    b.textContent=ch.toUpperCase();
    b.onclick=()=>{ typed+=ch; update(); playSound('click'); };
    $(containerId+'Keys').appendChild(b);
  });
  $(containerId+'Back').onclick=()=>{ typed=typed.slice(0,-1); update(); };
  $(containerId+'Clear').onclick=()=>{ typed=''; update(); };
  $(containerId+'Check').onclick=()=>onCheck(typed, ()=>{typed=''; update();});
}


function dragonPickWord(){
  const all = wordList();
  if(!all.length) return '';
  const available = all.filter(w=>!dragonState.used.includes(w));
  const pool = available.length ? available : all;
  const pick = pool[Math.floor(Math.random()*pool.length)];
  dragonState.used.push(pick);
  return pick;
}
function renderHearts(count){
  return Array.from({length:5},(_,i)=>`<span class="heart ${i<count?'full':'empty'}">${i<count?'❤️':'🖤'}</span>`).join('');
}
function beginDragon(){
  if(!requireWords('dragonGame')) return;
  dragonState = {dragonHearts:5, playerHearts:5, used:[], word:''};
  dragonState.word = adventureModeActive ? adventurePickWord() : dragonPickWord();
  dragonFlash();
}
function dragonFlash(){
  memoryFlashGame('dragonGame', dragonState.word, dragonChallenge);
}
function updateDragonBattleDisplay(){
  const dh=$('dragonHearts');
  const ph=$('playerHearts');
  if(dh) dh.innerHTML = renderHearts(dragonState.dragonHearts);
  if(ph) ph.innerHTML = renderHearts(dragonState.playerHearts);
  const boss=$('dragonBossArt');
  if(boss){
    boss.className = 'boss-dragon hearts-' + dragonState.dragonHearts + (dragonState.dragonHearts===1 ? ' rage' : '');
    boss.textContent = dragonState.dragonHearts<=1 ? '🐲🔥' : dragonState.dragonHearts<=3 ? '🔥🐉🔥' : '🐉';
  }
}
function dragonChallenge(){
  $('dragonGame').innerHTML = `
    <div class="battle-layout">
      <div class="enemy-card dragon-card">
        <div id="dragonBossArt" class="boss-dragon hearts-${dragonState.dragonHearts}">🐉</div>
        <h3>Boss Dragon</h3>
        <p>Spell 5 words correctly to win.</p>
        <div class="heart-row" id="dragonHearts">${renderHearts(dragonState.dragonHearts)}</div>
      </div>
      <div class="enemy-card knight-card">
        <div class="dragon-emoji">🛡️</div>
        <h3>Your Shield</h3>
        <p>5 wrong words and the dragon wins.</p>
        <div class="heart-row" id="playerHearts">${renderHearts(dragonState.playerHearts)}</div>
      </div>
    </div>
    <p>The word flashed for 5 seconds. Spell it from memory to attack.</p>
    <div id="dragonSpell"></div>
    <button onclick="beginDragon()">New Dragon</button>`;
  updateDragonBattleDisplay();
  makeSpellKeyboard('dragonSpell', (typed, clear)=>{
    const answer = String(typed).trim().toLowerCase();
    const expected = String(dragonState.word).trim().toLowerCase();
    if(answer===expected){
      dragonState.dragonHearts = Math.max(0, dragonState.dragonHearts - 1);
      updateDragonBattleDisplay();
      rewardFloat('Dragon loses a heart! 🔥');
      playSound('success');
      if(dragonState.dragonHearts<=0){
        reward('dragon',50,5,dragonState.word);
        showChest('Dragon defeated! +50 XP +5 Stars');
        finishAdventureOr(loadDragon,1400);
      } else {
        trackWord(dragonState.word,true);
        state.correct++;
        state.attempts++;
        save();
        dragonState.word = adventureModeActive ? adventurePickWord() : dragonPickWord();
        setTimeout(dragonFlash,900);
      }
    } else {
      dragonState.playerHearts = Math.max(0, dragonState.playerHearts - 1);
      updateDragonBattleDisplay();
      miss(dragonState.word);
      toast(`Incorrect. Word was ${dragonState.word}`);
      if(dragonState.playerHearts<=0){
        rewardFloat('The dragon wins!');
        finishAdventureOr(loadDragon,1400);
      } else {
        dragonState.word = adventureModeActive ? adventurePickWord() : dragonPickWord();
        setTimeout(dragonFlash,1100);
      }
    }
    clear();
  });
}

function beginDefense(){
  if(!requireWords('defenseGame')) return;
  defenseState = {wall:100, wave:1, word:adventureAwareRandom('defense')};
  defenseFlash();
}
function defenseFlash(){
  memoryFlashGame('defenseGame', defenseState.word, defenseChallenge);
}
function defenseChallenge(){
  $('defenseGame').innerHTML = `
    <div class="castle-defense-scene">
      <div class="castle-art">🏰</div>
      <div class="goblin-line">${'👺'.repeat(Math.min(5,defenseState.wave+1))}</div>
      <p>Castle Wall</p>
      <div class="healthbar castle"><div id="castleWall" style="width:${defenseState.wall}%"></div></div>
      <p>Wave ${defenseState.wave} of 5</p>
    </div>
    <p>The word flashed for 5 seconds. Spell it from memory to fire the catapult.</p>
    <div id="defenseSpell"></div>
    <button onclick="beginDefense()">Restart Defense</button>`;
  makeSpellKeyboard('defenseSpell', (typed, clear)=>{
    if(String(typed).trim().toLowerCase()===String(defenseState.word).trim().toLowerCase()){
      rewardFloat('Catapult fired! 🪨');
      defenseState.wave++;
      if(defenseState.wave>5){
        reward('defense',30,2,defenseState.word);
        toast('Castle defended!');
        finishAdventureOr(loadDefense,1200);
      } else {
        reward('defense',8,0,defenseState.word);
        defenseState.word=adventureAwareRandom('defense');
        setTimeout(defenseFlash,900);
      }
    } else {
      defenseState.wall=Math.max(0,defenseState.wall-25);
      $('castleWall').style.width=defenseState.wall+'%';
      miss(defenseState.word);
      toast(`The goblins hit the wall! Word was ${defenseState.word}`);
      if(defenseState.wall<=0){ finishAdventureOr(loadDefense,1200); }
      else { defenseState.word=adventureAwareRandom('defense'); setTimeout(defenseFlash,1100); }
    }
    clear();
  });
}



/* v2.35 Start Game Screens */
function loadHangman(){
  if(!requireWords('hangmanGame')) return;
  startScreen('hangmanGame', `🛡️ Dungeon Rescue`, `Rescue the knight by guessing the spelling word.`, `Start Game`, 'beginHangman');
}
function loadBuilder(){
  if(!requireWords('builderGame')) return;
  startScreen('builderGame', `🏰 Castle Blocks`, `Drag letter blocks into the correct order.`, `Start Game`, 'beginBuilder');
}
function loadMemory(){
  if(!requireWords('memoryGame')) return;
  startScreen('memoryGame', `🪄 Wizard Memory`, `Memorise a word, then spell it using the on-screen keyboard.`, `Start Game`, 'beginMemory');
}
function loadSearch(){
  if(!requireWords('wordSearchGame')) return;
  startScreen('wordSearchGame', `🗺️ Treasure Map`, `Find hidden spelling words on the treasure map.`, `Start Game`, 'beginSearch');
}
function loadDragon(){
  if(!requireWords('dragonGame')) return;
  startScreen('dragonGame', `🐉 Dragon Battle`, `Defeat the dragon by spelling 5 words correctly.`, `Start Battle`, 'beginDragon');
}
function loadDefense(){
  if(!requireWords('defenseGame')) return;
  startScreen('defenseGame', `🏰 Castle Defense`, `Defend the castle by spelling flashed words from memory.`, `Start Defense`, 'beginDefense');
}




/* v2.35 Adventure Mode with word and game quotas */
const ADVENTURE_GAMES = [
  {id:'hangman', name:'Dungeon Rescue', start:'beginHangman'},
  {id:'builder', name:'Castle Blocks', start:'beginBuilder'},
  {id:'memory', name:'Wizard Memory', start:'beginMemory'},
  {id:'search', name:'Treasure Map', start:'beginSearch'},
  {id:'dragon', name:'Dragon Battle', start:'beginDragon'},
  {id:'defense', name:'Castle Defense', start:'beginDefense'}
];
let adventureModeActive = false;
let adventureCurrentGameIndex = 0;
let adventureCurrentWord = '';

function buildAdventurePlan(){
  const current = wordList();
  const totalWordAttempts = current.length * 3;
  const base = Math.floor(totalWordAttempts / ADVENTURE_GAMES.length);
  let remainder = totalWordAttempts % ADVENTURE_GAMES.length;
  const gameQuotas = {};
  ADVENTURE_GAMES.forEach(g=>{
    gameQuotas[g.id] = base + (remainder > 0 ? 1 : 0);
    if(remainder>0) remainder--;
  });
  const counts = {};
  current.forEach(w => counts[w] = 0);
  const gameCounts = {};
  ADVENTURE_GAMES.forEach(g => gameCounts[g.id] = 0);
  return {active:false, completed:false, counts, gameCounts, gameQuotas, currentGameIndex:0, totalWordAttempts};
}
function ensureAdventureState(){
  const current = wordList();
  state.adventure = state.adventure || buildAdventurePlan();
  state.adventure.counts = state.adventure.counts || {};
  state.adventure.gameCounts = state.adventure.gameCounts || {};
  state.adventure.gameQuotas = state.adventure.gameQuotas || {};
  current.forEach(w => {
    if(typeof state.adventure.counts[w] === 'undefined') state.adventure.counts[w] = 0;
  });
  Object.keys(state.adventure.counts).forEach(w => {
    if(!current.includes(w)) delete state.adventure.counts[w];
  });
  ADVENTURE_GAMES.forEach(g => {
    if(typeof state.adventure.gameCounts[g.id] === 'undefined') state.adventure.gameCounts[g.id] = 0;
  });
  const needed = current.length * 3;
  const quotaTotal = Object.values(state.adventure.gameQuotas).reduce((a,b)=>a+Number(b||0),0);
  if(quotaTotal !== needed){
    const oldActive = !!state.adventure.active;
    state.adventure = buildAdventurePlan();
    state.adventure.active = oldActive;
  }
}
function adventureProgress(){
  ensureAdventureState();
  const current = wordList();
  const totalNeeded = current.length * 3;
  const wordDone = current.reduce((sum,w)=>sum + Math.min(3, state.adventure.counts[w] || 0), 0);
  const wordsComplete = current.length > 0 && current.every(w => (state.adventure.counts[w] || 0) >= 3);
  const gamesComplete = ADVENTURE_GAMES.every(g => (state.adventure.gameCounts[g.id] || 0) >= (state.adventure.gameQuotas[g.id] || 0));
  const gameDone = ADVENTURE_GAMES.reduce((sum,g)=>sum + Math.min(state.adventure.gameCounts[g.id] || 0, state.adventure.gameQuotas[g.id] || 0), 0);
  const gameTotal = ADVENTURE_GAMES.reduce((sum,g)=>sum + (state.adventure.gameQuotas[g.id] || 0), 0);
  return {done:wordDone,totalNeeded,complete:wordsComplete && gamesComplete,wordsComplete,gamesComplete,gameDone,gameTotal};
}
function nextAdventureGame(){
  ensureAdventureState();
  const startIndex = state.adventure.currentGameIndex || 0;
  for(let offset=0; offset<ADVENTURE_GAMES.length; offset++){
    const idx=(startIndex+offset)%ADVENTURE_GAMES.length;
    const g=ADVENTURE_GAMES[idx];
    if((state.adventure.gameCounts[g.id] || 0) < (state.adventure.gameQuotas[g.id] || 0)){
      state.adventure.currentGameIndex=idx;
      return g;
    }
  }
  return ADVENTURE_GAMES[0];
}
function adventurePickWord(){
  ensureAdventureState();
  const current = wordList();
  if(!current.length) return '';
  const underPractised = current.filter(w => (state.adventure.counts[w] || 0) < 3);
  const poolBase = underPractised.length ? underPractised : current;
  const minCount = Math.min(...poolBase.map(w => state.adventure.counts[w] || 0));
  const pool = poolBase.filter(w => (state.adventure.counts[w] || 0) === minCount);
  const pick = pool[Math.floor(Math.random()*pool.length)];
  adventureCurrentWord = pick;
  return pick;
}
function adventureRecordWord(word){
  if(!adventureModeActive || !word) return;
  ensureAdventureState();
  const k=String(word).toLowerCase();
  if(typeof state.adventure.counts[k] === 'undefined') state.adventure.counts[k] = 0;
  state.adventure.counts[k]++;
  const game = (ADVENTURE_GAMES[state.adventure.currentGameIndex]||{}).id;
  if(game){
    state.adventure.gameCounts[game] = (state.adventure.gameCounts[game] || 0) + 1;
  }
  save();
}
function startAdventureMode(){
  if(!requireWords('adventureGame')) return;
  state.adventure = buildAdventurePlan();
  state.adventure.active = true;
  save();
  adventureModeActive = true;
  adventureCurrentGameIndex = 0;
  launchAdventureGame();
}
function resumeAdventureMode(){
  if(!requireWords('adventureGame')) return;
  ensureAdventureState();
  adventureModeActive = true;
  adventureCurrentGameIndex = state.adventure.currentGameIndex || 0;
  launchAdventureGame();
}
function stopAdventureMode(){
  adventureModeActive = false;
  ensureAdventureState();
  state.adventure.active = false;
  save();
  show('adventure');
  loadAdventure();
}
function launchAdventureGame(){
  const prog = adventureProgress();
  if(prog.complete){
    adventureModeActive = false;
    state.adventure.active = false;
    state.adventure.completed = true;
    save();
    show('adventure');
    loadAdventure();
    showChest('Adventure Complete! All games complete and every word practised 3 times.');
    rewardFloat('Adventure Complete! 🏆');
    return;
  }
  const game = nextAdventureGame();
  adventureCurrentGameIndex = ADVENTURE_GAMES.findIndex(g=>g.id===game.id);
  state.adventure.currentGameIndex = adventureCurrentGameIndex;
  save();
  show(game.id);
  window[game.start]();
}
function adventureNextGame(){
  if(!adventureModeActive) return;
  adventureCurrentGameIndex = (Number(state.adventure?.currentGameIndex || adventureCurrentGameIndex) + 1) % ADVENTURE_GAMES.length;
  state.adventure.currentGameIndex = adventureCurrentGameIndex;
  save();
  setTimeout(launchAdventureGame, 850);
}

function finishAdventureOr(callback, delay=900){
  if(adventureModeActive){
    adventureNextGame();
  } else {
    setTimeout(callback, delay);
  }
}

function loadAdventure(){
  ensureAdventureState();
  const prog = adventureProgress();
  const wordRows = wordList().map(w => {
    const c = state.adventure.counts[w] || 0;
    return `<tr><td>${w.toUpperCase()}</td><td>${Math.min(3,c)} / 3</td><td>${c>=3?'✅ Complete':'⏳ Practice'}</td></tr>`;
  }).join('');
  const gameRows = ADVENTURE_GAMES.map(g => {
    const c = state.adventure.gameCounts[g.id] || 0;
    const q = state.adventure.gameQuotas[g.id] || 0;
    return `<tr><td>${g.name}</td><td>${c} / ${q}</td><td>${c>=q?'✅ Complete':'⏳ Not complete'}</td></tr>`;
  }).join('');
  $('adventureGame').innerHTML = `
    <div class="start-screen">
      <div class="start-icon">🗺️</div>
      <h3>Adventure Mode</h3>
      <p>Play every game in order. After each win or loss, you move to the next game.</p>
      <p>The adventure completes only when every game has reached its word quota and every active word has been practised at least 3 times.</p>
      <p class="word-count-pill">Word Progress: ${prog.done} / ${prog.totalNeeded}</p>
      <div class="adventure-bar"><div style="width:${prog.totalNeeded ? Math.round((prog.done/prog.totalNeeded)*100) : 0}%"></div></div>
      <p class="word-count-pill">Game Progress: ${prog.gameDone} / ${prog.gameTotal}</p>
      <div class="adventure-bar"><div style="width:${prog.gameTotal ? Math.round((prog.gameDone/prog.gameTotal)*100) : 0}%"></div></div>
      <div class="row">
        <button class="primary" onclick="startAdventureMode()">Start New Adventure</button>
        ${state.adventure.active ? '<button onclick="resumeAdventureMode()">Resume Adventure</button>' : ''}
        <button onclick="stopAdventureMode()">Stop Adventure</button>
      </div>
    </div>
    <h3>Game Quotas</h3>
    <table class="report-table"><tr><th>Game</th><th>Words Played</th><th>Status</th></tr>${gameRows}</table>
    <h3>Word Practice Balance</h3>
    <table class="report-table"><tr><th>Word</th><th>Practised</th><th>Status</th></tr>${wordRows}</table>
  `;
}
function adventureAwareRandom(game='global'){
  if(adventureModeActive) return adventurePickWord();
  return randomWord(game);
}

function loadAchievements(){
  ensureV229State();
  const badges=[
    ['Bronze Shield',state.correct>=1,'🛡️','Complete your first word'],
    ['Silver Shield',state.correct>=5,'⚔️','Complete 5 words'],
    ['Gold Shield',state.correct>=15,'🏆','Complete 15 words'],
    ['Treasure Hunter',state.rewardCount>=5,'🎁','Earn a treasure chest'],
    ['Treasure Map Explorer',(state.games.search||0)>=3,'🗺️','Find words in Treasure Map'],
    ['Dragon Medal',state.correct>=30,'🐉','Complete 30 words'],
    ['Dragon Slayer',(state.games.dragon||0)>=1,'🔥','Win Dragon Battle'],
    ['Castle Defender',(state.games.defense||0)>=1,'🏰','Win Castle Defense']
  ];
  $('achievementsBox').innerHTML=badges.map(([name,ok,icon,desc])=>`
    <div class="badge fantasy-badge ${ok?'unlocked':'locked'}">
      <div class="badge-icon">${icon}</div>
      <div><h3>${name}</h3><p>${ok?'Unlocked ✅':desc}</p></div>
    </div>`).join('');
}

function recentStatusForWord(s){
  const h = Array.isArray(s.history) ? s.history : [];
  const correctCount = Number(s.correct || 0);
  if(correctCount === 0) return 'Needs Practice';
  const last2 = h.slice(-2);
  const last3 = h.slice(-3);
  if(last2.length>=2 && last2[0]===false && last2[1]===false) return 'Needs Practice';
  if(last3.length>=3 && last3.every(v=>v===true)) return 'Mastered';
  return 'Learning';
}
function recentIcons(s){
  const h = Array.isArray(s.history) ? s.history.slice(-3) : [];
  return h.map(v=>v?'✅':'❌').join(' ');
}

function loadReports(){
  const accuracy=state.attempts?Math.round((state.correct/state.attempts)*100):0;
  const rows=Object.entries(state.games||{}).map(([game,count])=>`<tr><td>${game}</td><td>${count}</td></tr>`).join('');
  const stats=state.wordStats||{};
  const currentWords = wordList();
  currentWords.forEach(w=>{ if(!stats[w]) stats[w]={correct:0,incorrect:0,history:[]}; });
  const words=Object.entries(stats).filter(([w,s])=>currentWords.includes(w)).map(([w,s])=>{
    const total=s.correct+s.incorrect;
    const acc=total?Math.round((s.correct/total)*100):0;
    let status=recentStatusForWord(s);
    return {w,acc,status,incorrect:s.incorrect,total,recent:recentIcons(s)};
  });
  const weak=words.filter(x=>x.status==='Needs Practice').sort((a,b)=>b.incorrect-a.incorrect).slice(0,10);
  const mastered=words.filter(x=>x.status==='Mastered').length;
  const learning=words.filter(x=>x.status==='Learning').length;
  const needs=words.filter(x=>x.status==='Needs Practice').length;
  $('reportBox').innerHTML=`<p><b>Active list:</b> ${state.activeListName || 'Current Unsaved List'}</p><p><b>Words saved:</b> ${wordList().length}</p>
  <p><b>Total attempts:</b> ${state.attempts}</p><p><b>Correct answers:</b> ${state.correct}</p>
  <p><b>Accuracy:</b> ${accuracy}%</p>
  <p><b>Mastered:</b> ${mastered} | <b>Learning:</b> ${learning} | <b>Needs Practice:</b> ${needs}</p>
  <h3>Words Needing Practice</h3>
  <ol>${weak.map(x=>`<li>${x.w.toUpperCase()} - ${x.acc}% accuracy (${x.incorrect} misses)</li>`).join('')||'<li>None yet</li>'}</ol>
  <button onclick="practiceWeakWords()">Practice Weak Words</button>
  <table class="report-table"><tr><th>Game</th><th>Wins</th></tr>${rows}</table>`;
}
function practiceWeakWords(){
 const stats=state.wordStats||{};
  const currentWords = wordList();
  currentWords.forEach(w=>{ if(!stats[w]) stats[w]={correct:0,incorrect:0,history:[]}; });
 const weak=Object.entries(stats).filter(([w,s])=>{
   const t=s.correct+s.incorrect; const acc=t?((s.correct/t)*100):0; return t>0 && acc<70;
 }).map(([w])=>w);
 if(!weak.length){toast('No weak words identified yet');return;}
 state.words=weak;
 $('wordInput').value=weak.join('\n');
 save(); loadAllGames(); toast('Loaded practice list');
}
function renderSavedLists(){
  const box=$('savedListsBox');
  if(!box) return;
  const lists=getSavedLists();
  const names=Object.keys(lists).sort((a,b)=>a.localeCompare(b));
  if(!names.length){
    box.innerHTML='<p>No saved word lists yet.</p>';
    return;
  }
  box.innerHTML=names.map(name=>{
    const safe=name.replace(/'/g,"\\'");
    const protectedList=name===PROTECTED_DEMO_LIST_NAME;
    return `
    <div class="saved-list-card ${protectedList?'protected-list':''}">
      <div><b>${name}</b><br><small>${lists[name].length} words${protectedList?' • protected':''}</small></div>
      <div>
        <button onclick="loadNamedList('${safe}')">Load</button>
        ${protectedList?'':'<button class="danger" onclick="deleteNamedList(\''+safe+'\')">Delete</button>'}
      </div>
    </div>`;
  }).join('');
}
function loadAllGames(){
  $('wordInput').value=(state.words||[]).join('\n');
  updateWordCount(); updateStats();
  ensureV229State(); loadAdventure(); loadHangman(); loadBuilder(); loadMemory(); loadSearch(); loadDragon(); loadDefense(); loadAchievements(); loadReports(); renderSavedLists(); updateSoundButton();
}

ensureV229State();
updateVersionDisplay();
syncMusicState();
loadAllGames();
show('manager');
if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js'); }
