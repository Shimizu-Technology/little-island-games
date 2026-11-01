import React, { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Islander } from '../islander';
import { personFor } from '../personalization/model';
import { LearnerChip } from '../personalization/LearnerChip';
import { activeLearner } from '../learn/learners';
import { useStore } from '../state/Store';
import { Settings } from '../components/Settings';
import { Recovery } from '../components/Recovery';
import { SaveStatus } from '../components/SaveStatus';
import { openShelfGame } from '../components/GameShelf';
import { arcadeIds, type ArcadeId } from '../arcade';
import { dailySuggestions, homeContinue, shelfGames, type ShelfGame, type ShelfId } from '../learn/home';
import { Building, Terrain } from './MapArt';
import { directionOf, places, placeGames, subjects, subjectGames, type PlaceId, type SubjectId } from './model';
import { labStyles } from './styles';

function openGame(id: ShelfId) {
  if (arcadeIds.includes(id as ArcadeId)) router.push({ pathname: '/arcade', params: { game: id } });
  else openShelfGame(id);
}
function ListIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 6H21M8 12H21M8 18H21M3 6H4M3 12H4M3 18H4"/></svg>; }
type Panel = PlaceId | 'pocket' | null;

export default function IslandMapLab() {
  const store = useStore();
  const params = useLocalSearchParams<{ direction?: string; text?: string }>();
  const direction = directionOf(params.direction), large = params.text === 'large';
  const [list, setList] = useState(false), [panel, setPanel] = useState<Panel>(null);
  const [subject, setSubject] = useState<SubjectId | null>(null), [settings, setSettings] = useState(false), [shuffle, setShuffle] = useState(0);
  const learner = activeLearner(store.save.learning), look = personFor(store.save).look;
  const resume = homeContinue(store.save), favorites = store.save.favoriteGames ?? [];
  const suggestions = dailySuggestions(store.save, undefined, shuffle).map(id => shelfGames.find(game => game.id === id)!);
  const dialog = useRef<HTMLDialogElement>(null), worldScroll = useRef<HTMLDivElement>(null), closeButton = useRef<HTMLButtonElement>(null), panelTitle = useRef<HTMLHeadingElement>(null);
  const mapPosition = useRef({ a: { top: 0, left: 0 }, b: { top: 0, left: 0 } });
  const trigger = useRef<HTMLElement | null>(null);
  function show(next: Panel) { trigger.current = document.activeElement as HTMLElement; setSubject(null); setPanel(next); }
  const close = useCallback(() => { dialog.current?.close(); setPanel(null); setSubject(null); }, []);
  useEffect(() => {
    const node = dialog.current;
    if (panel && node && !node.open) { node.showModal(); closeButton.current?.focus(); }
    return () => { if (node?.open) node.close(); if (panel) trigger.current?.focus(); };
  }, [panel]);
  useEffect(() => { worldScroll.current?.scrollTo(mapPosition.current[direction]); }, [direction, list]);
  useEffect(() => { if (subject) panelTitle.current?.focus(); }, [subject]);
  const games = (items: ShelfGame[], editable = false) => items.map(game => <div className="favorite-row" key={game.id}>
    <button className="list-row" onClick={() => { close(); openGame(game.id); }}><span><strong>{game.name}</strong><small>{game.description}</small></span><b aria-hidden="true">→</b></button>
    {editable && <button className="favorite-button" aria-label={`${favorites.includes(game.id) ? 'Unfavorite' : 'Favorite'} ${game.name}`} aria-pressed={favorites.includes(game.id)} onClick={() => store.toggleGameFavorite(game.id)}>{favorites.includes(game.id) ? 'Saved' : 'Save'}</button>}
  </div>);
  const pocket = <>
    <section className="list-section"><h2>Continue</h2>{resume ? games([shelfGames.find(game => game.id === resume)!]) : <p className="empty">Your next adventure starts wherever you like. Saved games appear here.</p>}</section>
    <section className="list-section"><div className="sheet-head"><h2>Try today</h2><button className="plain" onClick={() => setShuffle(value => value + 1)}>Shuffle</button></div>{games(suggestions, true)}</section>
    <section className="list-section"><h2>Favorites</h2>{favorites.length ? games(shelfGames.filter(game => favorites.includes(game.id)), true) : <p className="empty">Save a favorite from Try today or any game list.</p>}</section>
  </>;
  const selected = places.find(place => place.id === panel);
  return <div className={`hub-lab ${direction === 'b' ? 'village' : 'postcard'} ${large ? 'large-text' : ''}`}>
    <style>{labStyles}</style>
    <header className="lab-top"><div className="lab-brand">little island<small>Home map · design study</small></div><div className="top-actions"><LearnerChip compact/><button className="plain grown" aria-label="Open existing grown-up settings" onClick={() => setSettings(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M7 9V7a5 5 0 0110 0v2M5 9h14v12H5Z"/><circle cx="12" cy="15" r="1.5"/></svg></button></div></header>
    <main className="lab-content">
      <nav className="direction-tabs" aria-label="Prototype direction"><button aria-pressed={direction === 'a'} onClick={() => { close(); router.setParams({ direction: 'a' }); }}>A · Island postcard</button><button aria-pressed={direction === 'b'} onClick={() => { close(); router.setParams({ direction: 'b' }); }}>B · Village walk</button></nav>
      {!store.ready ? <h1>Getting your island ready…</h1> : store.recovery ? <Recovery/> : <>
        <div className="intro"><div><p className="eyebrow">{learner.id === 'family' ? 'Our little corner of the world' : `${learner.name}’s little corner of the world`}</p><h1>{list ? 'Everything, right here.' : 'Where shall we go?'}</h1><p>{list ? 'Your places, games and saved favorites.' : direction === 'a' ? 'A little place for every kind of day.' : 'Take a wander. There’s a place for you.'}</p></div><button className="list-toggle" aria-pressed={list} onClick={() => setList(value => !value)}><ListIcon/>{list ? 'Map' : 'Everything'}</button></div>
        <SaveStatus/>
        {list ? <div className="list-page">{pocket}<section className="list-section"><h2>Places</h2>{places.map(place => <button className="list-row" key={place.id} onClick={() => show(place.id)}><span><strong>{place.name}</strong><small>{place.hint}</small></span><b aria-hidden="true">→</b></button>)}</section><section className="list-section"><h2>All games</h2>{games(shelfGames, true)}</section><button className="list-row" onClick={() => setSettings(true)}>Sound, learners and grown-up settings →</button></div> : <>
          <div className="map-viewport" ref={worldScroll} onScroll={event => { mapPosition.current[direction] = { top: event.currentTarget.scrollTop, left: event.currentTarget.scrollLeft }; }} aria-label={direction === 'a' ? 'Island postcard map' : 'Scrollable village map'} tabIndex={direction === 'b' ? 0 : undefined}>
            <div className="world"><Terrain village={direction === 'b'}/>
              {places.map((place, index) => <button key={place.id} className="place" aria-label={`Visit ${place.name}`} style={{ left: `${direction === 'a' ? place.x : index % 2 ? 73 : 27}%`, top: direction === 'a' ? `${place.y}%` : `${95 + index * 166}px`, '--street-x': `${150 + index * 165}px`, '--street-y': `${index % 2 ? 280 : 115}px` } as React.CSSProperties} onClick={() => show(place.id)}><Building id={place.id} color={place.color}/><span className="place-label">{place.name}</span></button>)}
              <div className="islander-map" aria-label={`${learner.name}’s Islander`} role="img"><Islander view="front" pose="idle" look={look} size={direction === 'a' ? 86 : 110}/><small>You are here</small></div>
            </div><span className="map-note">{direction === 'a' ? 'OUR ISLAND · YOUR OWN PACE' : 'Follow the path · scroll to explore'}</span>
          </div>
          <div className="dock">{resume && <button className="continue" onClick={() => openGame(resume)}><strong>Continue →</strong><span>{shelfGames.find(game => game.id === resume)?.name}</span></button>}<button onClick={() => show('pocket')}><strong>Try today →</strong><span>Three ideas, whenever you like</span></button><button onClick={() => { setList(true); }}><strong>Favorites →</strong><span>{favorites.length ? `${favorites.length} saved favorites` : 'Keep the things you love'}</span></button></div>
        </>}
        <p className="design-caption">Private prototype · {direction === 'a' ? 'A / Island postcard' : 'B / Village walk'} · <button className="plain" onClick={() => router.setParams({ text: large ? 'default' : 'large' })} aria-pressed={large}>{large ? 'Default text' : 'Larger text study'}</button></p>
      </>}
    </main>
    {panel && <dialog ref={dialog} className="hub-dialog" aria-labelledby="place-title" onCancel={close} onClose={close}>
      <div className="sheet-head"><p className="eyebrow">{panel === 'pocket' ? 'Your island pocket' : 'A place on your island'}</p><button ref={closeButton} className="plain" onClick={close}>{list ? 'Back to list' : 'Back to map'}</button></div>
      <div className="sheet-heading">{selected && <Building id={selected.id} color={selected.color}/>}<h2 id="place-title" ref={panelTitle} tabIndex={-1}>{subject ? subjects.find(item => item.id === subject)?.name : selected?.name ?? 'A little inspiration'}</h2></div>
      {panel === 'pocket' ? <div className="sheet-copy">{pocket}</div> : panel === 'school' ? <>
        {subject ? <><button className="plain" onClick={() => setSubject(null)}>← All six subjects</button><p className="sheet-copy">Choose something to try. Take all the time you need.</p>{games(subjectGames(subject), true)}</> : <><p className="sheet-copy">What are you curious about?</p><div className="subject-grid">{subjects.map(item => <button key={item.id} onClick={() => setSubject(item.id)}><span aria-hidden="true" style={{ background: item.color }}>{item.mark}</span>{item.name}</button>)}</div></>}
      </> : panel === 'home' ? <><p className="sheet-copy">A home for your Islander. Make up a story, move things around, and leave it just your way.</p><div className="preview-house"><Building id="home" color="#DD977E"/><Islander view="front" pose="idle" look={look} size={100}/></div><button className="primary" onClick={() => { close(); router.push('/island-home'); }}>Open Island Home →</button></> : panel === 'arcade' || panel === 'hall' ? <><p className="sheet-copy">{selected?.hint}. Choose a game.</p>{games(placeGames(panel), true)}</> : <><p className="sheet-copy">{panel === 'library' ? 'Explore today: fifty wonders and five hands-on activities. The Library name is a place on the map; the content is today’s Explore.' : selected?.hint}</p><button className="primary" onClick={() => { close(); router.push(panel === 'library' ? '/explore' : panel === 'locker' ? '/locker' : '/badges'); }}>{panel === 'library' ? 'Open Explore' : panel === 'locker' ? 'Open My Locker' : 'Open My Badges'} →</button></>}
      <p className="dialog-meta">Design preview · opening an activity uses your current offline app and saves.</p>
    </dialog>}
    <Settings visible={settings} onClose={() => setSettings(false)}/>
  </div>;
}
