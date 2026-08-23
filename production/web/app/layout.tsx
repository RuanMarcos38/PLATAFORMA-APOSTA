import './globals.css';
export const metadata={title:`${process.env.NEXT_PUBLIC_BRAND_NAME||'PLATAFORMA APOSTA'} — Esportes e Cassino`,description:'Plataforma de apostas esportivas e jogos online.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
