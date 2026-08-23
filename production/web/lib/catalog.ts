export type CasinoGame={id:string;name:string;provider:string;category:'slot'|'crash'|'live';image:string;featured?:boolean;live?:boolean};
export const casinoGames:CasinoGame[]=[
{id:'pgsoft-fortune-tiger',name:'Fortune Tiger',provider:'PG Soft',category:'slot',featured:true,image:'https://betjara.ng/Img/Games/PG%20Soft/10baedba-676b-43ce-82f3-6fbbedf462d7_Fortune-Tiger.webp'},
{id:'pgsoft-fortune-rabbit',name:'Fortune Rabbit',provider:'PG Soft',category:'slot',featured:true,image:'https://cohenbrayhouse.info/wp-content/uploads/2024/04/1.Fortune-Rabbit.png'},
{id:'spribe-aviator',name:'Aviator',provider:'SPRIBE',category:'crash',featured:true,image:'https://betjara.ng/Img/Games/Spribe/Aviator.webp'},
{id:'pragmatic-big-bass-bonanza-1000',name:'Big Bass Bonanza 1000',provider:'Pragmatic Play',category:'slot',featured:true,image:'https://media.slotspod.com/wp-content/uploads/2024/12/big-bass-bonanza-1000-slot-.png'},
{id:'pragmatic-sugar-rush-1000',name:'Sugar Rush 1000',provider:'Pragmatic Play',category:'slot',featured:true,image:'https://cms.realprize.com/wp-content/uploads/2025/03/RP_Games_Thumbs-Sugar-Rush-1000-1.webp'},
{id:'pragmatic-sweet-bonanza-super-scatter',name:'Sweet Bonanza Super Scatter',provider:'Pragmatic Play',category:'slot',featured:true,image:'https://joseph-games.b-cdn.net/pragmatic/vs20swbonsup.png'},
{id:'evolution-crazy-time',name:'Crazy Time',provider:'Evolution',category:'live',live:true,image:'https://pbs.twimg.com/media/Eb0xWBaWkAIPYyp.jpg'},
{id:'evolution-lightning-roulette',name:'Lightning Roulette',provider:'Evolution',category:'live',live:true,image:'https://happy-happy-casino.com/wp-content/uploads/2021/03/FirstPersonLightningRoulette-Evolution.jpg'},
{id:'evolution-dream-catcher',name:'Dream Catcher',provider:'Evolution',category:'live',live:true,image:'https://dreamcatcherlive.casino/wp-content/uploads/2024/10/Dream-catcher-live-game-show-scaled-1.jpg'},
{id:'evolution-mega-ball',name:'Mega Ball',provider:'Evolution',category:'live',live:true,image:'https://casinoble.com.br/wp-content/uploads/2020/11/megaball-live-studio.jpg'},
{id:'evolution-monopoly-live',name:'MONOPOLY Live',provider:'Evolution',category:'live',live:true,image:'https://www.casino2k.com/images/giochi-live/monopoly/monopoly-bonus.jpg'}
];
export const featuredGames=casinoGames.filter(g=>g.featured);
export const liveGames=casinoGames.filter(g=>g.live);
