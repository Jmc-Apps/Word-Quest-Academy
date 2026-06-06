
const DEFAULT_WORDS = [];
const PROTECTED_DEMO_LIST_NAME = 'Demo Words';
const PROTECTED_DEMO_WORDS = ['because','friend','people','school','answer','adventure','mountain','castle','rocket','treasure'];
let state = JSON.parse(localStorage.getItem('wqa_state_v223') || 'null') || {
  words: DEFAULT_WORDS, xp:0, stars:0, correct:0, attempts:0, sound:true, rewardCount:0, games:{hangman:0,builder:0,memory:0,search:0,dragon:0,defense:0}
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
function save(){ ensureV222State(); localStorage.setItem('wqa_state_v223', JSON.stringify(state)); updateStats(); updateSoundButton(); }
function toast(msg){ const t=$('toast'); t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none',1500); }

function ensureV222State(){
  if(typeof state.sound === 'undefined') state.sound = true;
  if(typeof state.rewardCount === 'undefined') state.rewardCount = 0;
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
  ensureV222State();
  state.sound=!state.sound;
  save();
  updateSoundButton();
  playSound('click');
}
function updateSoundButton(){
  const b=$('soundToggleBtn');
  if(b) b.textContent = state.sound ? 'Sound: On' : 'Sound: Off';
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
        ensureV222State();
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

function updateStats(){ $('xp').textContent=state.xp; $('stars').textContent=state.stars; }
function show(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  $(id).classList.add('active');
  [...document.querySelectorAll('nav button')].find(b=>b.getAttribute('onclick').includes(id))?.classList.add('active');
  if(id==='reports') loadReports();
  if(id==='achievements') loadAchievements();
}
function reward(game,xp=10,stars=0){
  state.xp+=xp; state.stars+=stars; state.correct++; state.attempts++; state.games[game]=(state.games[game]||0)+1;
  chestReward();
  save();
  playSound('success');
  rewardFloat(`+${xp} XP${stars?`  +${stars} ⭐`:''}`);
  toast(`+${xp} XP${stars?` +${stars} star`:''}`);
  loadAchievements(); loadReports();
}
function miss(){ state.attempts++; save(); playSound('fail'); }

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
  $('wordInput').value=state.words.join('\n');
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
    const keep=state.words; state={words:keep,xp:0,stars:0,correct:0,attempts:0,sound:true,rewardCount:0,games:{hangman:0,builder:0,memory:0,search:0,dragon:0,defense:0}};
    save(); loadAllGames(); toast('Progress reset');
  }
}
function updateWordCount(){ $('wordCount').textContent=`${wordList().length} spelling words saved`; }

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

function loadHangman(){
  if(!requireWords('hangmanGame')) return;
  const w=randomWord('hangman'); let hidden=[...w].map(()=>"_"), misses=0;
  const parts=['kp-head','kp-body','kp-left-arm','kp-right-arm','kp-legs','kp-shield'];
  $('hangmanGame').innerHTML = `
    <div class="game-area">
      <div class="scene dungeon-scene">${knightSvg()}</div>
      <div>
        <div class="big-word" id="hmWord">${hidden.join(' ')}</div>
        <p id="hmInfo">Rescue mistakes: 0 / 6</p>
        <div class="keyboard" id="hmKeys"></div>
        <button onclick="loadHangman()">New Word</button>
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
      if(hidden.join('').toLowerCase()===w){ document.querySelector('#hangmanGame .knight-svg')?.classList.add('victory'); reward('hangman',12,1); setTimeout(loadHangman,1100); }
      if(misses>=6){ miss(); toast(`The word was ${w}`); setTimeout(loadHangman,900); }
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
function loadBuilder(){
  if(!requireWords('builderGame')) return;
  const w=randomWord('builder');
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
      <button onclick="loadBuilder()">New Word</button>
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
    reward('builder',xp,stars);
    toast(`Correct! Speed XP: ${xp}`);
    setTimeout(loadBuilder,700);
  } else {
    miss();
    toast('Not quite — rearrange the blocks');
  }
}
function clearBuilderBlocks(){
  const source=$('sourceBlocks'), target=$('targetBlocks');
  [...target.querySelectorAll('.letter-block')].forEach(b=>source.appendChild(b));
}

/* v2.13 Memory Spell with on-screen keyboard */
let memoryTyped = '';
function loadMemory(){
  if(!requireWords('memoryGame')) return;
  const w=randomWord('memory');
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
  if(memoryTyped===w){ reward('memory',15,1); toast('Great memory!'); }
  else { miss(); toast(`It was ${w}`); }
  loadMemory();
}

/* Corrected working Word Search */
let ws = {grid:[], placed:[], first:null, size:12};
function loadSearch(){
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
    <button onclick="loadSearch()">New Puzzle</button>`;
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
    reward('search',12,1);
    renderSearch();
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


/* v2.23 Dragon Battle and Castle Defense */
let dragonState = { hp:100, player:100, word:'' };
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

function loadDragon(){
  if(!requireWords('dragonGame')) return;
  dragonState = {hp:100, player:100, word:randomWord('dragon')};
  dragonFlash();
}
function dragonFlash(){
  memoryFlashGame('dragonGame', dragonState.word, dragonChallenge);
}
function dragonChallenge(){
  $('dragonGame').innerHTML = `
    <div class="battle-layout">
      <div class="enemy-card">
        <div class="dragon-emoji">🐉</div>
        <h3>Fire Dragon</h3>
        <p>Dragon Health</p>
        <div class="healthbar"><div id="dragonHP" style="width:${dragonState.hp}%"></div></div>
      </div>
      <div class="enemy-card">
        <div class="dragon-emoji">🛡️</div>
        <h3>Your Shield</h3>
        <p>Shield Strength</p>
        <div class="healthbar player"><div id="playerHP" style="width:${dragonState.player}%"></div></div>
      </div>
    </div>
    <p>The word flashed for 5 seconds. Spell it from memory to attack.</p>
    <div id="dragonSpell"></div>
    <button onclick="loadDragon()">New Dragon</button>`;
  makeSpellKeyboard('dragonSpell', (typed, clear)=>{
    if(typed===dragonState.word){
      dragonState.hp=Math.max(0,dragonState.hp-50);
      $('dragonHP').style.width=dragonState.hp+'%';
      rewardFloat('Dragon hit! 🔥');
      if(dragonState.hp<=0){
        reward('dragon',25,2);
        setTimeout(loadDragon,900);
      } else {
        dragonState.word=randomWord('dragon');
        setTimeout(dragonFlash,800);
      }
    } else {
      dragonState.player=Math.max(0,dragonState.player-35);
      $('playerHP').style.width=dragonState.player+'%';
      miss();
      toast(`Dragon blocked it! Word was ${dragonState.word}`);
      if(dragonState.player<=0) setTimeout(loadDragon,1000);
      else { dragonState.word=randomWord('dragon'); setTimeout(dragonFlash,1100); }
    }
    clear();
  });
}

function loadDefense(){
  if(!requireWords('defenseGame')) return;
  defenseState = {wall:100, wave:1, word:randomWord('defense')};
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
    <button onclick="loadDefense()">Restart Defense</button>`;
  makeSpellKeyboard('defenseSpell', (typed, clear)=>{
    if(typed===defenseState.word){
      rewardFloat('Catapult fired! 🪨');
      defenseState.wave++;
      if(defenseState.wave>5){
        reward('defense',30,2);
        toast('Castle defended!');
        setTimeout(loadDefense,1000);
      } else {
        reward('defense',8,0);
        defenseState.word=randomWord('defense');
        setTimeout(defenseFlash,900);
      }
    } else {
      defenseState.wall=Math.max(0,defenseState.wall-25);
      $('castleWall').style.width=defenseState.wall+'%';
      miss();
      toast(`The goblins hit the wall! Word was ${defenseState.word}`);
      if(defenseState.wall<=0) setTimeout(loadDefense,1000);
      else { defenseState.word=randomWord('defense'); setTimeout(defenseFlash,1100); }
    }
    clear();
  });
}


function loadAchievements(){
  ensureV222State();
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
function loadReports(){
  const accuracy=state.attempts?Math.round((state.correct/state.attempts)*100):0;
  const rows=Object.entries(state.games||{}).map(([game,count])=>`<tr><td>${game}</td><td>${count}</td></tr>`).join('');
  $('reportBox').innerHTML=`<p><b>Words saved:</b> ${wordList().length}</p><p><b>Total attempts:</b> ${state.attempts}</p><p><b>Correct answers:</b> ${state.correct}</p><p><b>Accuracy:</b> ${accuracy}%</p><table class="report-table"><tr><th>Game</th><th>Wins</th></tr>${rows}</table>`;
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
  $('wordInput').value=state.words.join('\n');
  updateWordCount(); updateStats();
  ensureV222State(); loadHangman(); loadBuilder(); loadMemory(); loadSearch(); loadDragon(); loadDefense(); loadAchievements(); loadReports(); renderSavedLists(); updateSoundButton();
}

ensureV222State();
loadAllGames();
show('manager');
if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js'); }
