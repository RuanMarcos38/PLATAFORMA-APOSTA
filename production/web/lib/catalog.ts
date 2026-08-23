export type CasinoGame={id:string;name:string;provider:string;category:'slot'|'crash'|'live';image:string;featured?:boolean;live?:boolean};
export const casinoGames:CasinoGame[]=[
{id:'pgsoft-fortune-tiger',name:'Fortune Tiger',provider:'PG Soft',category:'slot',featured:true,image:'https://static.casino.guru/pict/1164238/fortune-tiger-pgsoft-win.png?imageDataId=1253774&maxWidth=1200&timestamp=1743075321000'},
{id:'pgsoft-fortune-rabbit',name:'Fortune Rabbit',provider:'PG Soft',category:'slot',featured:true,image:'https://fortunerabbitsite.com/wp-content/uploads/2025/05/fortune-rabbit-main.webp'},
{id:'spribe-aviator',name:'Aviator',provider:'SPRIBE',category:'crash',featured:true,image:'https://igamingafrika.com/wp-content/uploads/2023/05/aviator-game-on-hollywoodbets-mobile-the-gambler.jpg'},
{id:'pragmatic-big-bass-bonanza-1000',name:'Big Bass Bonanza 1000',provider:'Pragmatic Play',category:'slot',featured:true,image:'https://big-bass-bonanza-1000.com/wp-content/uploads/2025/07/big-bass-bonanza-1000-2.webp'},
{id:'pragmatic-sugar-rush-1000',name:'Sugar Rush 1000',provider:'Pragmatic Play',category:'slot',featured:true,image:'https://casinorange.com/wp-content/uploads/2024/4/Sugar_Rush_1000_Pragmatic_Play_1.width-1696.webp'},
{id:'pragmatic-sweet-bonanza-super-scatter',name:'Sweet Bonanza Super Scatter',provider:'Pragmatic Play',category:'slot',featured:true,image:'https://gamblerid.com/storage/files/shares/slots/sweet-bonanza-super-scatter/new/win-base-game-sweet-bonanza-super-scatter.jpg'},
{id:'evolution-crazy-time',name:'Crazy Time',provider:'Evolution',category:'live',live:true,image:'https://pbs.twimg.com/media/Eb0xWBaWkAIPYyp.jpg'},
{id:'evolution-lightning-roulette',name:'Lightning Roulette',provider:'Evolution',category:'live',live:true,image:'https://happy-happy-casino.com/wp-content/uploads/2021/03/FirstPersonLightningRoulette-Evolution.jpg'},
{id:'evolution-dream-catcher',name:'Dream Catcher',provider:'Evolution',category:'live',live:true,image:'https://dreamcatcherlive.casino/wp-content/uploads/2024/10/Dream-catcher-live-game-show-scaled-1.jpg'},
{id:'evolution-mega-ball',name:'Mega Ball',provider:'Evolution',category:'live',live:true,image:'https://casinoble.com.br/wp-content/uploads/2020/11/megaball-live-studio.jpg'},
{id:'evolution-monopoly-live',name:'MONOPOLY Live',provider:'Evolution',category:'live',live:true,image:'https://www.casino2k.com/images/giochi-live/monopoly/monopoly-bonus.jpg'}
];
export const featuredGames=casinoGames.filter(g=>g.featured);
export const liveGames=casinoGames.filter(g=>g.live);
