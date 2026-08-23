import './globals.css';
export const metadata={title:`${process.env.NEXT_PUBLIC_BRAND_NAME||'PLATAFORMA APOSTA'} — Esportes, Cassino e Ao Vivo`,description:'Plataforma de apostas esportivas e cassino preparada para operação regulada, com carteira, KYC e jogo responsável.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
