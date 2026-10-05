'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../supabase';
import s from './Learning.module.css';
export default function PublicNote({artworkId}){
 const [note,setNote]=useState(null);
 useEffect(()=>{let active=true;supabase.rpc('get_learning_public_v1',{p_artwork_id:String(artworkId)}).then(({data,error})=>{if(active&&!error)setNote(data);}).catch(()=>{});return()=>{active=false;};},[artworkId]);
 if(!note)return null;
 return <section className={s.panel}><span className={s.eyebrow}>MY DISCOVERY</span><h2>작가가 확인한 생각과 발견</h2>{[['intent','내가 표현하고 싶었던 것'],['request','내가 AI에게 요청한 것'],['discovery','결과를 보고 발견한 것']].map(([k,label])=><div key={k}><h3>{label}</h3><p className={s.public}>{note[k]}</p></div>)}</section>;
}
