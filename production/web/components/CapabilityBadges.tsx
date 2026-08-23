'use client';
import{AlertCircle,CheckCircle2,LoaderCircle}from'lucide-react';
import{API}from'../lib/api';
import{useEffect,useState}from'react';

type Capabilities={kycMandatory:boolean;ledgerTransactional:boolean;pixBySignedWebhook:boolean};
type State={loading:boolean;data:Capabilities|null;error:boolean};
export default function CapabilityBadges(){const[s,setS]=useState<State>({loading:true,data:null,error:false});useEffect(()=>{let active=true;fetch(`${API}/api/system/capabilities`,{credentials:'include'}).then(async r=>{if(!r.ok)throw new Error('capabilities_unavailable');const j=await r.json();if(active)setS({loading:false,data:j.software,error:false})}).catch(()=>{if(active)setS({loading:false,data:null,error:true})});return()=>{active=false}},[]);const items:[keyof Capabilities,string][]=[['kycMandatory','KYC obrigatório'],['ledgerTransactional','Ledger transacional'],['pixBySignedWebhook','PIX por webhook']];return <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-[#aeb8c2]" aria-label="Capacidades do backend">{items.map(([key,label])=>{const ok=Boolean(s.data?.[key]);return <span key={key} className="inline-flex items-center gap-1.5" title={s.error?'Não foi possível consultar o backend agora.':ok?'Implementado e validado pelo backend':'Capacidade indisponível'}>{s.loading?<LoaderCircle size={14} className="text-muted animate-spin"/>:ok?<CheckCircle2 size={14} className="text-green"/>:<AlertCircle size={14} className="text-accent"/>}{label}</span>})}</div>}
