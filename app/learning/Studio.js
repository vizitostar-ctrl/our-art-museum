'use client';
import {useState,useRef,useEffect} from 'react';
import {supabase} from '../supabase';
import {goals,emptyLearning,nextQuestion,makePrompt,hesitant} from './model.mjs';
import s from './Learning.module.css';
async function compressed(file){
 const bitmap=await createImageBitmap(file);const ratio=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL('image/jpeg',.85);
}
export default function Studio({identity,parodyFile,aiImage,onGenerated,onChange,onBusy,disabled}){
 const [value,setValue]=useState(emptyLearning),[version,setVersion]=useState(0),[loaded,setLoaded]=useState(false),[answer,setAnswer]=useState(''),[question,setQuestion]=useState(nextQuestion([],[])),[mode,setMode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[revision,setRevision]=useState(''),[imageId,setImageId]=useState(null);
 const lock=useRef(false),latest=useRef(value),imageRequest=useRef(null);
 const auth={p_class_no:identity.classNo,p_student_no:identity.studentNo,p_access_code:identity.accessCode};
 function update(v,ver=version){latest.current=v;setValue(v);onChange({payload:v,version:ver});}
 async function load(){setError('');setBusy(true);try{const {data,error}=await supabase.rpc('get_my_learning_v1',auth);if(error)throw error;const v=data.payload?{...emptyLearning(),...data.payload}:emptyLearning();setVersion(data.version);update(v,data.version);setQuestion(nextQuestion(v.turns,v.covered));setLoaded(true);setMessage(data.payload?'저장한 생각 기록을 불러왔어요. 사진은 다시 선택해 주세요.':'한 문장으로 시작해도 좋아요.');}catch{setError('생각 기록을 불러오지 못했습니다. 선생님께 알려 주세요.');}finally{setBusy(false);}}
 useEffect(()=>{load();},[]);
 useEffect(()=>{onBusy(busy);},[busy,onBusy]);
 async function save(v=latest.current){const {data,error}=await supabase.rpc('save_my_learning_v1',{...auth,p_payload:v,p_version:version});if(error)throw error;setVersion(data);onChange({payload:v,version:data});setMessage('생각 기록을 저장했어요. 사진은 최종 제출할 때 저장됩니다.');return data;}
 async function run(fn){if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');try{await fn();}catch(e){setError(e.message||'저장하지 못했습니다. 입력 내용은 유지됩니다.');}finally{lock.current=false;setBusy(false);}}
 async function send(){if(!answer.trim())return;await run(async()=>{
 const turn={...question,answer:answer.trim()};const v={...value,turns:[...value.turns,turn],confirmed:false};
 const covered=[...new Set([...value.covered,...(!hesitant(answer)?[question.goal]:[])])];v.covered=covered;
 // Preserve the student's answer even if the AI request fails.
 update(v);setAnswer('');const savedVersion=await save(v);
 const response=await fetch('/api/curator',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...identity,requestId:crypto.randomUUID(),learning:v})});const result=await response.json();
 if(!response.ok){setQuestion(nextQuestion(v.turns,covered));throw new Error(result.error);}
 const updated={...v,covered:result.covered,summary:result.summary||v.summary};
 update(updated,savedVersion);setQuestion(result);setMode(result.mode);
 // AI summary is a draft until the student reviews it; next save/submission persists it.
 });}
 function editSummary(k,text){update({...value,summary:{...value.summary,[k]:text},confirmed:false});}
 async function generate(retry=false){await run(async()=>{
 if(!parodyFile)throw new Error('손으로 그린 패러디 사진을 먼저 선택해 주세요.');
 if(!value.confirmed)throw new Error('유지할 부분과 바꿀 표현을 확인해 주세요.');
 if(aiImage&&!revision.trim()&&!retry)throw new Error('다시 바꿀 부분과 이유를 적어 주세요.');
 const id=retry&&imageId?imageId:crypto.randomUUID();setImageId(id);
 await save();
 if(!retry||!imageRequest.current)imageRequest.current={...identity,requestId:id,summary:{...value.summary},confirmed:value.confirmed,revision,image:await compressed(parodyFile)};
 const response=await fetch('/api/transform',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(imageRequest.current)});const result=await response.json();if(!response.ok)throw new Error(result.error);
 const bytes=Uint8Array.from(atob(result.image),c=>c.charCodeAt(0));onGenerated(new File([bytes],'my-ai-artwork.jpg',{type:result.type}));setMessage('결과를 원작·손그림과 비교하고, 아래에 발견한 점을 남겨 주세요.');
 });}
 const readySummary=Object.values(value.summary).every(t=>typeof t==='string'&&t.trim());
 return <section className={s.panel} aria-label="생각을 펼치는 작업실"><span className={s.eyebrow}>MY THINKING STUDIO</span><h2>내 생각을 작품으로 이어가기</h2><p>대화와 성찰은 나와 선생님이 봅니다. 공개할 글은 직접 확인해 주세요.</p>
 {error&&<p role="alert" className={s.error}>{error}</p>}<p role="status" className={s.saved}>{busy?'진행 중입니다. 잠시 기다려 주세요…':message}</p>
 {!loaded?<button type="button" disabled={busy} onClick={load}>다시 불러오기</button>:<fieldset disabled={busy||disabled} style={{border:0,padding:0,minWidth:0}}>
 <details><summary>지금까지 나눈 이야기 ({value.turns.length})</summary>{value.turns.map((t,i)=><div key={i} className={s.turn}><strong>{t.question}</strong><p>{t.answer}</p></div>)}</details>
 {!question.done&&value.turns.length<8&&<><span className={s.badge}>{goals.find(g=>g[0]===question.goal)?.[1]} · {value.turns.length+1}번째 질문</span><h3>{question.question}</h3>{question.easy&&<div className={s.actions}>{['색','선','질감','이야기'].map(x=><button type="button" className={s.secondary} key={x} onClick={()=>setAnswer(`${x}이 눈에 띄어요. 그 이유는 `)}>{x}부터 생각하기</button>)}</div>}<label>내 생각<textarea value={answer} maxLength={1000} onChange={e=>setAnswer(e.target.value)} placeholder="작가 이름이나 어려운 용어 없이, 눈에 보인 것을 내 말로 적어 보세요."/></label><div className={s.actions}><button type="button" onClick={send} disabled={!answer.trim()}>답하고 다음으로</button><button type="button" className={s.secondary} onClick={()=>setQuestion({done:true})}>내 생각 직접 정리하기</button></div></>}
 <p className={s.note}>{mode==='ai'?'학생의 답변에 맞춰 AI가 질문합니다.':'기본 질문으로도 활동할 수 있습니다. AI가 연결되면 답변에 맞춰 질문을 조절합니다.'} AI 연결 시 답변은 질문 생성에, 패러디 사진은 이미지 변환에 사용됩니다. 이름·연락처는 적지 마세요.</p>
 <h3>당신의 생각을 이렇게 정리했어요</h3><p>빈칸은 직접 채우고, 내 생각과 다른 문장은 고쳐 주세요.</p><div className={s.grid}>{[['observation','원작에서 관찰한 색·선·질감'],['intent','내가 표현하고 싶었던 것'],['keep','그대로 유지할 부분'],['change','바꾸고 싶은 표현']].map(([k,label])=><label key={k}>{label}<textarea value={value.summary[k]} maxLength={1000} onChange={e=>editSummary(k,e.target.value)}/></label>)}</div>
 <label>작품 제목<input value={value.title} maxLength={100} onChange={e=>update({...value,title:e.target.value})}/></label>
 <div className={s.actions}><button type="button" disabled={!readySummary} onClick={()=>run(async()=>{const v={...value,confirmed:true};update(v);await save(v);})}>{value.confirmed?'✓ 내 생각 확인됨':'이 내용이 내 생각과 맞아요'}</button><button type="button" className={s.secondary} onClick={()=>run(()=>save())}>생각 기록 저장</button></div>
 <details><summary>AI에게 전달할 요청문 보기 · 복사</summary><blockquote>{makePrompt(value.summary,revision)}</blockquote><button type="button" onClick={()=>run(async()=>{await navigator.clipboard.writeText(makePrompt(value.summary,revision));setMessage('요청문을 복사했어요. 외부 AI에서 만든 이미지는 위의 AI 재해석 칸에 올려 주세요.');})}>요청문 복사</button></details>
 <label>다시 변환할 때: 바꿀 부분과 이유<textarea value={revision} maxLength={1000} onChange={e=>setRevision(e.target.value)} placeholder="예: 시험지가 사라졌어요. 시험지는 유지하고 하늘의 선만 바꾸고 싶어요."/></label>
 <div className={s.actions}><button type="button" disabled={!value.confirmed||!parodyFile} onClick={()=>generate(false)}>내 작품 변화시키기</button>{imageId&&<button type="button" className={s.secondary} onClick={()=>generate(true)}>같은 요청 결과 확인</button>}</div><p className={s.note}>사이트 내 변환은 선생님의 AI 연결 후 사용할 수 있어요. 기본 2회까지이며, 실패로 횟수가 소진되면 선생님께 알려 주세요. 외부 AI에서 만든 사진을 올려도 활동을 이어갈 수 있습니다.</p>
 {aiImage&&<img className={s.image} src={aiImage} alt="변환 결과 비교"/>}
 <h3>결과를 보고 무엇을 발견했나요?</h3><label>내 의도가 반영된 정도<select value={value.reflection.match} onChange={e=>update({...value,reflection:{...value.reflection,match:e.target.value}})}><option value="">선택해 주세요</option><option value="well">잘 반영됨</option><option value="partly">일부 반영됨</option><option value="different">많이 다름</option></select></label>
 <label>어느 부분을 보고 그렇게 생각했나요?<textarea value={value.reflection.evidence} maxLength={1000} onChange={e=>update({...value,reflection:{...value.reflection,evidence:e.target.value}})}/></label>
 <label>다시 요청한다면 무엇을 바꿀까요? 그대로 두고 싶다면 그 이유는요?<textarea value={value.reflection.next} maxLength={1000} onChange={e=>update({...value,reflection:{...value.reflection,next:e.target.value}})}/></label>
 <label>관람자에게 공개할 ‘결과에서 발견한 점’<textarea value={value.publicNote} maxLength={500} onChange={e=>update({...value,publicNote:e.target.value})} placeholder="위 성찰에서 공개하고 싶은 내용을 직접 적어 주세요."/></label><p className={s.note}>표현 의도·유지할 부분·바꿀 표현과 이 글은 선생님의 요약 승인 후 공개됩니다. 대화 원문과 비공개 성찰은 공개되지 않습니다.</p>
 </fieldset>}
 </section>;
}
