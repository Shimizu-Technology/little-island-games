import React, { memo } from 'react';
import type { PlaceId } from './model';

const ink = '#354E49';
/** Separate small original illustrations: selecting a place never redraws a world-sized SVG. */
export const Building = memo(function Building({ id, color }: { id: PlaceId; color: string }) {
  return <svg viewBox="0 0 160 130" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="80" cy="115" rx="58" ry="9" fill="#637E66" opacity=".18"/>
    <g stroke={ink} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
      {id === 'home' ? <>
        <path d="M32 58H119V111H32Z" fill="#FBE5BE"/>
        <path d="M119 58L138 48V101L119 111Z" fill="#CDB58D"/>
        <path d="M21 59L69 21L127 57H21Z" fill={color}/>
        <path d="M69 21L96 16L143 48L127 57Z" fill="#B46E61"/>
        <path d="M103 29V12H114V37" fill="#FBE5BE"/>
        <path className="smoke" d="M109 5Q100 -3 109 -10" stroke="#FFFDF3" strokeWidth="6"/>
        <path d="M67 111V78Q79 66 91 78V111" fill="#718E80"/>
        <path d="M40 73H57V91H40ZM99 73H113V91H99Z" fill="#B8DCDD"/>
        <path d="M48 74V90M41 82H56M106 74V90"/><circle cx="85" cy="94" r="1"/>
        <path d="M60 112H100L105 118H56Z" fill="#E9D4AF"/>
        <path d="M24 108Q11 93 19 84Q33 88 24 108Z" fill="#88AB83"/>
      </> : id === 'locker' ? <>
        <path d="M43 35L110 25L128 37V110L110 119L43 110Z" fill={color}/>
        <path d="M43 35L110 44V119M110 44L128 37"/>
        <path d="M53 49L99 55V102L53 97Z" fill="#D8E8DC"/>
        <path d="M75 64Q69 55 77 55Q86 57 79 66L92 79L62 75L75 64Z" fill="#FFF1CB"/>
        <path d="M116 70V86M60 108L94 112M55 43L97 49"/>
        <path d="M29 106V81M20 88L29 80L38 88M28 81Q22 72 29 71"/>
      </> : id === 'badges' ? <>
        <path d="M39 112L48 62H112L122 112Z" fill="#EAD9B4"/>
        <path d="M37 61L80 29L124 61Z" fill={color}/>
        <path d="M80 29V12"/><path className="flag" d="M81 12L106 18L81 24" fill="#E09578"/>
        <circle cx="80" cy="80" r="23" fill="#F2CA74"/>
        <path d="M80 62L85 73L97 75L88 83L91 95L80 89L69 95L72 83L63 75L75 73Z" fill="#FFF4CD"/>
        <path d="M56 111V101M104 111V101"/>
      </> : <>
        <path d="M26 56H120V111H26Z" fill={id === 'school' ? '#FBE7BA' : id === 'library' ? '#E5EDDA' : id === 'arcade' ? '#F5CFBF' : '#E3E6C9'}/>
        <path d="M120 56L139 44V101L120 111Z" fill={color}/>
        <path d="M17 56L52 25H115L139 44L120 56Z" fill={color}/>
        <path d="M52 25L75 12L115 25" fill={color}/>
        {id === 'school' && <><path d="M63 43V20L78 8L93 20V43Z" fill="#FFF1CD"/><circle cx="78" cy="28" r="9" fill="#FFFDF3"/><path d="M78 22V28L83 31"/><path className="flag" d="M78 8V-3L99 0L78 5" fill="#D78C76"/></>}
        {id === 'library' && <><path d="M48 33Q62 27 77 34Q92 27 106 33V52Q92 46 77 53Q62 46 48 52Z" fill="#FFF4CF"/><path d="M77 34V53M56 37L68 38M86 38L98 37"/></>}
        {id === 'arcade' && <><path d="M44 33H106V54H44Z" fill="#FFF0CB"/><path d="M57 44H68M62 39V49"/><circle cx="89" cy="42" r="2" fill={ink}/><circle cx="97" cy="46" r="2" fill={ink}/></>}
        {id === 'hall' && <><path d="M54 31L80 22L103 32V51L79 61L54 51Z" fill="#FFF2D0"/><path d="M54 31L79 40L103 32M79 40V61"/><circle cx="66" cy="45" r="2" fill={ink}/><circle cx="91" cy="45" r="2" fill={ink}/></>}
        <path d="M65 111V78Q76 68 87 78V111" fill="#607F72"/>
        <path d="M35 71H53V92H35ZM98 71H113V92H98Z" fill="#B8DADB"/>
        <path d="M44 72V91M36 82H52M105 72V91M99 82H112"/>
        <path d="M59 112H94L99 117H55Z" fill="#E8D3AC"/>
        <circle cx="81" cy="95" r="1"/>
      </>}
    </g>
  </svg>;
});

export const Terrain = memo(function Terrain({ village = false }: { village?: boolean }) {
  return <svg className="terrain" viewBox={village ? '0 0 400 1220' : '0 0 400 520'} preserveAspectRatio="none" aria-hidden="true">
    {village ? <><path d="M0 0H400V1220H0Z" fill="#DDE7C5"/><path d="M200 -20C310 100 90 200 200 320S310 560 200 660S90 900 200 1020S310 1180 200 1250" stroke="#F4E3BC" strokeWidth="65" fill="none"/><path d="M200 -20C310 100 90 200 200 320S310 560 200 660S90 900 200 1020S310 1180 200 1250" stroke="#CEB98E" strokeWidth="2" fill="none" strokeDasharray="2 15"/></> : <>
      <path d="M33 93Q44 8 145 24Q204 -5 260 36Q361 20 374 125Q411 198 362 251Q405 356 334 414Q289 503 205 485Q97 512 61 432Q-5 395 25 302Q-13 210 33 93Z" fill="#A8CED0"/>
      <path d="M33 80Q44 0 145 16Q204 -13 260 28Q361 12 374 117Q411 190 362 243Q405 348 334 406Q289 495 205 477Q97 504 61 424Q-5 387 25 294Q-13 202 33 80Z" fill="#F4E3B9" stroke="#E0CAA0" strokeWidth="2"/>
      <path d="M43 84Q53 17 145 30Q204 1 258 42Q345 27 360 120Q393 192 347 243Q390 344 320 399Q285 479 204 461Q108 487 75 415Q7 384 40 293Q3 201 43 84Z" fill="#D5E2B9"/>
      <path d="M96 100Q203 140 305 100M89 225Q207 162 311 225M90 352Q188 315 310 357M197 110Q180 250 207 444" stroke="#F5E6C6" strokeWidth="23" fill="none" strokeLinecap="round"/>
      <ellipse cx="203" cy="258" rx="26" ry="16" fill="#A6C9B8"/>
      <ellipse cx="203" cy="254" rx="26" ry="16" fill="#C6DFDA" stroke="#6C9D94" strokeWidth="2"/>
      <path d="M191 254Q203 260 216 253" fill="none" stroke="#FFF8E5" strokeWidth="2"/>
      <path className="wave" d="M4 128Q11 133 18 128M369 440Q380 446 392 440M5 464Q18 471 30 464" stroke="#FFF8E5" strokeWidth="3" fill="none"/>
    </>}
    {(village ? [[38,80],[340,260],[35,450],[340,600],[30,800],[345,990],[35,1140]] : [[188,45],[211,35],[45,166],[344,163],[48,344],[344,326],[135,419],[284,440]]).map(([x,y], i) => <g key={i} transform={`translate(${x} ${y})`} stroke="#527C65" strokeWidth="2" strokeLinecap="round"><path d="M0 30Q7 10 1 0" fill="none"/><path d="M1 0Q-25 -14 -20 6Q-6 11 1 0M1 0Q18 -19 23 0Q12 9 1 0M1 0Q-6 -25 8 -19Q16 -10 1 0" fill="#80A881"/></g>)}
  </svg>;
});
