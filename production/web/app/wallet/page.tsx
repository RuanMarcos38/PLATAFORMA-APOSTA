'use client';

import Script from 'next/script';
import {useEffect,useRef,useState} from 'react';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import {apiFetch,jsonOrMessage} from '../../lib/api';
import {WalletCards,ArrowDownToLine,ArrowUpFromLine,Clock3,ExternalLink,ShieldCheck} from 'lucide-react';

declare global { interface Window { MercadoPago?: any } }

type CheckoutState={preferenceId:string;publicKey:string;checkoutUrl:string;mode:'test'|'production';depositId:string};

export default function Wallet(){
  const[s,setS]=useState<any>(null);
  const[amount,setAmount]=useState(20);
  const[withdrawAmount,setWithdrawAmount]=useState(50);
  const[checkout,setCheckout]=useState<CheckoutState|null>(null);
  const[mpReady,setMpReady]=useState(false);
  const[deposits,setDeposits]=useState<any[]>([]);
  const[withdrawals,setWithdrawals]=useState<any[]>([]);
  const[msg,setMsg]=useState('');
  const brickRef=useRef<any>(null);

  async function load(){
    const[a,b,c]=await Promise.all([apiFetch('/api/wallet'),apiFetch('/api/payments/deposits'),apiFetch('/api/payments/withdrawals')]);
    if(a.status===401){location.href='/login';return}
    const ja=await jsonOrMessage(a),jb=await jsonOrMessage(b),jc=await jsonOrMessage(c);
    if(a.ok)setS(ja.data?.wallet||ja.data);
    if(b.ok)setDeposits(jb.data);
    if(c.ok)setWithdrawals(jc.data);
  }

  useEffect(()=>{
    load();
    const status=new URLSearchParams(window.location.search).get('mp');
    if(status==='success')setMsg('Retorno recebido do Mercado Pago. O saldo só é atualizado após a confirmação segura do webhook.');
    if(status==='pending')setMsg('Pagamento pendente no Mercado Pago. A confirmação será processada automaticamente pelo webhook.');
    if(status==='failure')setMsg('O pagamento não foi concluído. Você pode gerar uma nova preferência quando quiser.');
  },[]);

  useEffect(()=>{
    if(!checkout||!mpReady||!window.MercadoPago)return;
    let active=true;
    (async()=>{
      try{
        if(brickRef.current?.unmount)await brickRef.current.unmount();
        const mp=new window.MercadoPago(checkout.publicKey,{locale:'pt-BR'});
        const bricks=mp.bricks();
        const controller=await bricks.create('wallet','walletBrick_container',{
          initialization:{preferenceId:checkout.preferenceId,redirectMode:'self'},
          callbacks:{onError:()=>setMsg('Não foi possível carregar o botão do Mercado Pago. Use o link alternativo abaixo.')}
        });
        if(active)brickRef.current=controller;else if(controller?.unmount)await controller.unmount();
      }catch{setMsg('Não foi possível carregar o botão do Mercado Pago. Use o link alternativo abaixo.')}
    })();
    return()=>{active=false};
  },[checkout,mpReady]);

  async function deposit(){
    setMsg('');setCheckout(null);
    const r=await apiFetch('/api/payments/checkout-pro/deposit',{method:'POST',body:JSON.stringify({amount})});
    const{data,message}=await jsonOrMessage(r);
    if(!r.ok){setMsg(message);return}
    setCheckout(data);
    setMsg(data.mode==='test'?'Checkout Pro preparado em ambiente de TESTE. Nenhum saldo real será creditado.':'Checkout Pro preparado. O saldo será creditado somente após webhook aprovado.');
    load();
  }

  async function withdraw(){
    setMsg('');
    const r=await apiFetch('/api/payments/withdrawals',{method:'POST',body:JSON.stringify({amount:withdrawAmount})});
    const{message}=await jsonOrMessage(r);
    setMsg(r.ok?'Solicitação de saque criada e enviada para revisão.':message);
    if(r.ok)load();
  }

  return <main className="min-h-screen pb-20 lg:pb-0">
    <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onLoad={()=>setMpReady(true)}/>
    <Header/>
    <div className="app-shell py-5 max-w-6xl">
      <div className="page-head"><div><div className="eyebrow">Financeiro</div><h1>Carteira</h1><p>Saldo, Mercado Pago, saques e histórico conciliados pelo backend.</p></div><WalletCards size={34} className="text-brand hidden sm:block"/></div>
      <section className="grid md:grid-cols-3 gap-4">
        <div className="panel p-6 md:col-span-1">
          <span className="text-xs text-muted">Saldo disponível</span><strong className="display text-5xl block mt-1">R$ {Number(s?.balance||0).toFixed(2)}</strong><p className="text-xs text-muted mt-2">Em processamento: R$ {Number(s?.held_balance||0).toFixed(2)}</p>
          <div className="soft-panel p-4 mt-6 flex gap-3"><ShieldCheck size={18} className="text-green shrink-0"/><p className="text-xs text-muted">O retorno do navegador nunca libera saldo. Créditos entram somente após webhook validado, consulta do pagamento e conciliação idempotente.</p></div>
        </div>
        <div className="panel p-6">
          <div className="flex items-center gap-2"><ArrowDownToLine className="text-green"/><h2 className="text-2xl font-bold">Depositar com Mercado Pago</h2></div>
          <p className="text-xs text-muted mt-2">Checkout Pro abre o ambiente seguro do Mercado Pago e pode oferecer Pix e outros meios habilitados na aplicação.</p>
          <label className="text-xs text-muted block mt-5">Valor do depósito<input type="number" min={1} value={amount} onChange={e=>setAmount(Number(e.target.value)||20)} className="field"/></label>
          <button onClick={deposit} className="primary-btn w-full mt-4">Preparar pagamento</button>
          {checkout&&<div className="soft-panel p-4 mt-4">
            <div className="flex items-center justify-between gap-3"><div><div className="text-xs text-muted">Ambiente</div><strong className="text-sm uppercase">{checkout.mode}</strong></div><span className="text-xs text-muted">Preferência criada</span></div>
            <div id="walletBrick_container" className="mt-4 min-h-12"/>
            <a href={checkout.checkoutUrl} className="secondary-btn w-full mt-3 inline-flex items-center justify-center gap-2">Abrir Checkout Pro <ExternalLink size={14}/></a>
            <p className="text-[11px] text-muted mt-3">O link alternativo redireciona para o mesmo checkout hospedado pelo Mercado Pago.</p>
          </div>}
        </div>
        <div className="panel p-6">
          <div className="flex items-center gap-2"><ArrowUpFromLine className="text-accent"/><h2 className="text-2xl font-bold">Solicitar saque</h2></div>
          <label className="text-xs text-muted block mt-5">Valor do saque<input type="number" min={1} value={withdrawAmount} onChange={e=>setWithdrawAmount(Number(e.target.value)||1)} className="field"/></label>
          <button onClick={withdraw} className="secondary-btn w-full mt-4">Enviar para revisão</button>
          <p className="text-xs text-muted mt-3">KYC aprovado é obrigatório. O valor fica reservado enquanto a operação processa o payout.</p>
        </div>
      </section>
      {msg&&<div className="panel p-4 mt-4 text-sm text-accent">{msg}</div>}
      <section className="section-gap grid lg:grid-cols-2 gap-4"><History title="Depósitos" icon={<ArrowDownToLine/>} rows={deposits.map(x=>({id:x.id,amount:x.amount,status:x.status,date:x.created_at}))}/><History title="Saques" icon={<ArrowUpFromLine/>} rows={withdrawals.map(x=>({id:x.id,amount:x.amount,status:x.status,date:x.created_at}))}/></section>
    </div><BottomNav/>
  </main>
}

function History({title,icon,rows}:{title:string;icon:any;rows:any[]}){return <div className="panel overflow-hidden"><div className="p-5 border-b border-line flex items-center gap-2 text-brand">{icon}<h2 className="text-2xl font-bold text-white">{title}</h2></div><div>{rows.slice(0,8).map(r=><div key={r.id} className="p-4 border-b border-line last:border-0 flex items-center justify-between gap-3"><div><strong>R$ {Number(r.amount).toFixed(2)}</strong><div className="text-xs text-muted mt-1 flex items-center gap-1"><Clock3 size={11}/>{new Date(r.date).toLocaleString('pt-BR')}</div></div><span className="text-xs uppercase text-muted">{String(r.status).replaceAll('_',' ')}</span></div>)}{rows.length===0&&<div className="p-7 text-center text-sm text-muted">Nenhum registro ainda.</div>}</div></div>}
