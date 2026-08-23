'use client';
export const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
function accessToken(){return typeof window!=='undefined'?localStorage.getItem('accessToken'):null}
export async function apiFetch(path:string,init:RequestInit={},retry=true){const token=accessToken();const headers=new Headers(init.headers||{});if(token)headers.set('authorization',`Bearer ${token}`);if(init.body&&!headers.has('content-type'))headers.set('content-type','application/json');let r=await fetch(`${API}${path}`,{...init,headers,credentials:'include'});if(r.status===401&&retry&&typeof window!=='undefined'){const rr=await fetch(`${API}/api/auth/refresh`,{method:'POST',credentials:'include'});if(rr.ok){const d=await rr.json();if(d.accessToken)localStorage.setItem('accessToken',d.accessToken);return apiFetch(path,init,false)}}return r}
export async function jsonOrMessage(r:Response){let d:any={};try{d=await r.json()}catch{}return{data:d,message:d?.message||d?.error||d?.code||`Erro ${r.status}`}}
export function clearSession(){if(typeof window!=='undefined')localStorage.removeItem('accessToken')}
