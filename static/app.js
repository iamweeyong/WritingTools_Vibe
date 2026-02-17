const state = { projectId: null, sceneId: null, noteId: null, outputId: null, topicId: null, briefId: null };
const api = (url, method='GET', body) => fetch(url,{method, headers:{'Content-Type':'application/json'}, body: body?JSON.stringify(body):undefined}).then(r=>r.json());

const tabs = document.querySelectorAll('nav button');
tabs.forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.getElementById(btn.dataset.tab).classList.add('active');});

function confirmModal(text){
  return new Promise(resolve=>{
    const d=document.getElementById('confirmDialog');
    document.getElementById('confirmText').textContent=text;
    d.showModal();
    document.getElementById('confirmYes').onclick=()=>{d.close();resolve(true)};
    document.getElementById('confirmNo').onclick=()=>{d.close();resolve(false)};
  })
}

async function initProject(){
  const projects = await api('/api/projects');
  if(projects.length===0){
    const p = await api('/api/projects','POST',{name:'Main Screenplay'});
    state.projectId = p.id;
  } else state.projectId = projects[0].id;
  await loadScenes();
}

document.getElementById('newProjectBtn').onclick = async()=>{
  const p = await api('/api/projects','POST',{name:'Screenplay '+Date.now()});
  state.projectId = p.id;
  await api(`/api/projects/${p.id}/bootstrap-screenplay`,'POST',{});
  loadScenes();
}

document.getElementById('addSceneBtn').onclick = async()=>{ await api(`/api/projects/${state.projectId}/scenes`,'POST',{title:'New Scene'}); loadScenes(); }

async function loadScenes(){
  const scenes = await api(`/api/projects/${state.projectId}/scenes`);
  const ul = document.getElementById('sceneList'); ul.innerHTML='';
  scenes.forEach((s,i)=>{
    const li=document.createElement('li'); li.textContent=`${i+1}. ${s.title}`; if(s.id===state.sceneId) li.classList.add('active');
    li.onclick=()=>selectScene(s);
    li.draggable=true;
    li.ondragstart=e=>e.dataTransfer.setData('text/plain',s.id);
    li.ondragover=e=>e.preventDefault();
    li.ondrop=async e=>{e.preventDefault(); const dragId=Number(e.dataTransfer.getData('text/plain')); const ids=scenes.map(x=>x.id); const from=ids.indexOf(dragId), to=ids.indexOf(s.id); ids.splice(to,0,ids.splice(from,1)[0]); await api(`/api/projects/${state.projectId}/scenes/reorder`,'POST',{ids}); loadScenes();};
    ul.appendChild(li);
  });
  if(scenes[0] && !state.sceneId) selectScene(scenes[0]);
}

async function selectScene(scene){
  state.sceneId=scene.id;
  document.getElementById('sceneTitle').value=scene.title||'';
  document.getElementById('sceneSlugline').value=scene.slugline||'';
  document.getElementById('sceneBody').value=scene.body||'';
  loadScenes();
  loadContext();
}

let saveTimer;
['sceneTitle','sceneSlugline','sceneBody'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{
  clearTimeout(saveTimer);
  document.getElementById('autosaveStatus').textContent='자동 저장 중...';
  saveTimer=setTimeout(saveScene,500);
}));
async function saveScene(){
  if(!state.sceneId) return;
  await api(`/api/scenes/${state.sceneId}`,'PUT',{title:sceneTitle.value, slugline:sceneSlugline.value, body:sceneBody.value});
  document.getElementById('autosaveStatus').textContent='자동 저장 완료';
  loadScenes(); loadContext();
}

const snippets={1:'INT. LOCATION - DAY\n',2:'Action: ',3:'CHARACTER\n',4:'(beat)\nDialogue\n',5:'CUT TO:\n'};
document.querySelectorAll('[data-snippet]').forEach(b=>b.onclick=()=>insertSnippet(b.dataset.snippet));
function insertSnippet(k){const ta=sceneBody; const start=ta.selectionStart; ta.setRangeText(snippets[k],start,start,'end'); ta.dispatchEvent(new Event('input'));}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['1','2','3','4','5'].includes(e.key)){e.preventDefault();insertSnippet(e.key);}})

async function loadContext(){
  if(!state.sceneId) return;
  const c = await api(`/api/scenes/${state.sceneId}/context`);
  contextNotes.innerHTML='<h4>연결 노트</h4>'+c.notes.map(n=>`<div class="chip">${n.title}</div>`).join('');
  contextBriefs.innerHTML='<h4>연결 브리핑</h4>'+c.briefs.map(b=>`<div class="chip">${b.title}</div>`).join('');
}

function exportText(ext){
  api(`/api/projects/${state.projectId}/scenes`).then(scenes=>{
    const body=scenes.map(s=>`${s.slugline||''}\n${s.body||''}`).join('\n\n');
    const blob=new Blob([body],{type:'text/plain'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`script${ext}`; a.click();
  });
}
exportFountain.onclick=()=>exportText('.fountain'); exportTxt.onclick=()=>exportText('.txt');

async function loadNotes(){
  const notes = await api('/api/notes'); noteList.innerHTML='';
  notes.forEach(n=>{const li=document.createElement('li'); li.textContent=n.title; li.onclick=()=>selectNote(n); if(n.id===state.noteId)li.classList.add('active'); noteList.appendChild(li);});
}
async function selectNote(n){
  state.noteId=n.id; noteTitle.value=n.title; noteBody.value=n.body||''; isMoc.checked=!!n.is_moc; makeOutputBtn.style.display=isMoc.checked?'inline-block':'none';
  const bl=await api(`/api/notes/backlinks/${n.id}`); backlinks.innerHTML=bl.map(x=>`<li>${x.title}</li>`).join(''); loadNotes();
}
addNoteBtn.onclick=async()=>{const n=await api('/api/notes','POST',{title:'Note '+Date.now(),body:''}); selectNote(n); loadNotes();}
saveNoteBtn.onclick=async()=>{const n=await api(`/api/notes/${state.noteId}`,'PUT',{title:noteTitle.value,body:noteBody.value,is_moc:isMoc.checked}); selectNote(n);}
deleteNoteBtn.onclick=async()=>{if(await confirmModal('삭제할까요?')){await api(`/api/notes/${state.noteId}`,'DELETE'); state.noteId=null; loadNotes();}}
isMoc.onchange=()=>makeOutputBtn.style.display=isMoc.checked?'inline-block':'none';
makeOutputBtn.onclick=async()=>{const out=await api(`/api/outputs/from-moc/${state.noteId}`,'POST',{}); await loadOutputs(); selectOutput(out); tabs[2].click();}

async function loadOutputs(){ const outs=await api('/api/outputs'); outputList.innerHTML=''; outs.forEach(o=>{const li=document.createElement('li'); li.textContent=o.title; li.onclick=()=>selectOutput(o); outputList.appendChild(li);}); }
async function selectOutput(o){ state.outputId=o.id; const full=await api(`/api/outputs/${o.id}`); outputTitle.textContent=full.title; outputBody.textContent=full.body; sourceChips.innerHTML=full.sources.map(s=>`<span class="chip">${s.section}: ${s.title}</span>`).join(''); }
makeScreenplayBtn.onclick=async()=>{ if(!state.outputId)return; const p=await api('/api/projects','POST',{name:'From Output '+state.outputId,type:'screenplay'}); await api(`/api/projects/${p.id}/bootstrap-screenplay`,'POST',{}); state.projectId=p.id; tabs[0].click(); loadScenes(); }

async function loadTopics(){ const ts=await api('/api/research/topics'); topicList.innerHTML=''; ts.forEach(t=>{const li=document.createElement('li'); li.textContent=t.name; li.onclick=()=>{state.topicId=t.id; loadBriefs();}; topicList.appendChild(li);}); }
async function loadBriefs(){ if(!state.topicId)return; const bs=await api(`/api/research/topics/${state.topicId}/briefs`); briefList.innerHTML=''; bs.forEach(b=>{const li=document.createElement('li'); li.textContent=b.title; li.onclick=()=>{state.briefId=b.id; briefTitle.value=b.title; briefSummary.value=b.summary||''; briefIdeas.value=b.ideas_json; briefUrls.value=b.source_urls_json; briefStatus.value=b.status;}; briefList.appendChild(li);}); }
addTopicBtn.onclick=async()=>{await api('/api/research/topics','POST',{name:'Topic '+Date.now()}); loadTopics();}
saveBriefBtn.onclick=async()=>{
  const payload={topic_id:state.topicId,title:briefTitle.value,summary:briefSummary.value,ideas_json:JSON.parse(briefIdeas.value||'[]'),source_urls_json:JSON.parse(briefUrls.value||'[]'),status:briefStatus.value};
  if(state.briefId) await api(`/api/research/briefs/${state.briefId}`,'PUT',payload); else await api('/api/research/briefs','POST',payload);
  loadBriefs();
}
clipBtn.onclick=async()=>{if(state.briefId) await api(`/api/research/briefs/${state.briefId}/clip_to_note`,'POST',{}); loadNotes();}
attachSceneBtn.onclick=async()=>{if(state.briefId) await api(`/api/research/briefs/${state.briefId}/attach_scene`,'POST',{scene_id:Number(attachSceneId.value)}); loadContext();}

initProject(); loadNotes(); loadOutputs(); loadTopics();
