import React, { useEffect } from "react";
import { Pressable, Text as PlainText, View } from "react-native";
import { router, useNavigationContainerRef, type ErrorBoundaryProps } from "expo-router";
import { noteLaunch } from "../state/launchLog";

/** Plain views only: this must not depend on the providers or components that may have failed. */
function LaunchErrorView({ onRetry, onMap }: { onRetry: () => void; onMap: () => void }) {
  return (
    <View accessibilityRole="alert" style={{ flex: 1, backgroundColor: "#FCFAF4", justifyContent: "center", padding: 28, gap: 18 }}>
      <PlainText style={{ fontSize: 26, fontWeight: "800", color: "#183F39" }}>Little Island needs another try.</PlainText>
      <PlainText style={{ fontSize: 18, lineHeight: 26, color: "#183F39" }}>Something stopped this screen from opening. Your saved work is kept.</PlainText>
      <Pressable accessibilityRole="button" onPress={onRetry} style={{ minHeight: 52, borderRadius: 26, backgroundColor: "#246858", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
        <PlainText style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>Try again</PlainText>
      </Pressable>
      {/* A screen that keeps failing needs a way out. */}
      <Pressable accessibilityRole="button" onPress={onMap} style={{ minHeight: 52, borderRadius: 26, borderWidth: 2, borderColor: "#246858", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
        <PlainText style={{ fontSize: 18, fontWeight: "700", color: "#183F39" }}>Back to the map</PlainText>
      </Pressable>
    </View>
  );
}

/**
 * The root route's error boundary (exported from app/_layout as ErrorBoundary). Only a failure above the
 * UI boundary gets here: the Store itself or the providers around it. It never mounts another Store and
 * writes nothing, so the durable save and recovery copies stay as they are. Writes the Store had already
 * accepted still finish. A cold start then opens the last durable save the normal way.
 * expo-updates isn't in this build, so restarting is an instruction rather than a button.
 */
export function StoreFailure({ error }: ErrorBoundaryProps) {
  useEffect(() => { noteLaunch("store", error); }, [error]);
  return (
    <View accessibilityRole="alert" style={{ flex: 1, backgroundColor: "#FCFAF4", justifyContent: "center", padding: 28, gap: 18 }}>
      <PlainText style={{ fontSize: 26, fontWeight: "800", color: "#183F39" }}>Little Island needs a restart.</PlainText>
      <PlainText style={{ fontSize: 18, lineHeight: 26, color: "#183F39" }}>Something went wrong while it was looking after your saved games. Your saved work is kept.</PlainText>
      <PlainText style={{ fontSize: 20, fontWeight: "700", color: "#183F39" }}>Restart Little Island</PlainText>
      <PlainText style={{ fontSize: 18, lineHeight: 26, color: "#183F39" }}>Swipe up from the bottom of the screen and pause to see your open apps. Swipe Little Island up to close it, then tap Little Island to open it again.</PlainText>
    </View>
  );
}

/** A screen that can be opened again from its route name and plain URL params alone. */
export type Place = { name: string; params?: Record<string, string | string[]> };
const placeKey = (place: Place | null) => (place ? JSON.stringify(place) : null);
/** Null for the map itself, internal routes, or params that aren't plain strings: those go back to the map. */
export function rebuildable(route: { name: string; params?: unknown } | undefined): Place | null {
  if (!route || route.name === "index" || !/^[a-z][a-z0-9-]*$/.test(route.name)) return null;
  const params = route.params ?? {};
  if (typeof params !== "object" || params === null || Array.isArray(params)) return null;
  const entries = Object.entries(params);
  if (!entries.every(([, v]) => typeof v === "string" || (Array.isArray(v) && v.every(x => typeof x === "string")))) return null;
  if (JSON.stringify(params).length > 2000) return null;
  return entries.length ? { name: route.name, params: params as Place["params"] } : { name: route.name };
}

/** The parts of the navigation container the UI boundary uses. */
export type UINavigation = {
  isReady: () => boolean;
  getCurrentRoute: () => { name: string; params?: object } | undefined;
  navigate: (name: string, params?: object) => void;
  addListener: (event: "state", listener: () => void) => () => void;
};

/** Opens a place once the navigator below has mounted again. */
function Reopen({ nav, place, done }: { nav: UINavigation; place: Place; done: () => void }) {
  useEffect(() => {
    let tries = 0, timer: ReturnType<typeof setTimeout> | undefined;
    const go = () => {
      if (nav.isReady()) {
        try { nav.navigate(place.name, place.params); } catch (error) { noteLaunch("ui-reopen", error); }
        done();
      } else if (++tries < 40) timer = setTimeout(go, 50);
      else done(); // The map is still a safe place to be.
    };
    go();
    return () => clearTimeout(timer);
  }, [nav, place, done]);
  return null;
}

type UIState = { error: unknown; reopen: Place | null };
/**
 * Everything under the Store: the navigator, its screens and the status bar. A render error here replaces
 * only this UI. The Store above keeps its accepted state and its write queue; it is never remounted.
 * Try again mounts the navigator fresh on the island map, then reopens the screen the child was on, unless
 * that screen can't be rebuilt from its route or already failed again right after being reopened.
 */
class UIBoundaryView extends React.Component<{ nav: UINavigation; children: React.ReactNode }, UIState> {
  state: UIState = { error: null, reopen: null };
  private place: Place | null = null;
  private reopened: string | null = null;
  private target: Place | null = null;
  private unsubscribe?: () => void;
  static getDerivedStateFromError(error: unknown): Partial<UIState> { return { error, reopen: null }; }
  componentDidMount() { this.unsubscribe = this.props.nav.addListener("state", this.track); this.track(); }
  componentWillUnmount() { this.unsubscribe?.(); }
  componentDidCatch(error: unknown) {
    noteLaunch("ui", error);
    // Failing again on the screen Try again just reopened: go to the map this time.
    this.target = placeKey(this.place) === this.reopened ? null : this.place;
  }
  private track = () => {
    // While the error screen shows, the navigator is unmounting; keep where the child was.
    if (this.state.error !== null || !this.props.nav.isReady()) return;
    const route = this.props.nav.getCurrentRoute();
    if (!route) return;
    this.place = rebuildable(route);
    // Once the child moves on to another screen, a later failure there is a new one.
    if (route.name !== "index" && placeKey(this.place) !== this.reopened) this.reopened = null;
  };
  private clearReopen = () => this.setState({ reopen: null });
  private retry = () => {
    const target = this.target;
    this.reopened = placeKey(target); this.place = target;
    this.setState({ error: null, reopen: target });
  };
  private map = () => {
    this.reopened = null; this.place = null;
    this.setState({ error: null, reopen: null });
  };
  render() {
    if (this.state.error !== null) return <LaunchErrorView onRetry={this.retry} onMap={this.map} />;
    return <>
      {this.props.children}
      {this.state.reopen && <Reopen nav={this.props.nav} place={this.state.reopen} done={this.clearReopen} />}
    </>;
  }
}
export function UIBoundary({ children }: { children: React.ReactNode }) {
  const nav = useNavigationContainerRef() as unknown as UINavigation;
  return <UIBoundaryView nav={nav}>{children}</UIBoundaryView>;
}
export { UIBoundaryView };

/**
 * Wraps each screen inside the Stack (its `screenLayout`), below the Store. A failing screen shows this
 * instead, and Try again renders only that screen again: the Store, its accepted state and its write
 * queue are never unmounted, so nothing waiting to be saved can be lost.
 */
export class ScreenBoundary extends React.Component<{ children: React.ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  componentDidCatch(error: unknown) { noteLaunch("screen", error); }
  render() {
    if (this.state.error === null) return this.props.children;
    return <LaunchErrorView onRetry={() => this.setState({ error: null })} onMap={() => {
      try { router.dismissTo("/"); } catch { /* the map may be this screen; trying again still runs */ }
      this.setState({ error: null });
    }} />;
  }
}
