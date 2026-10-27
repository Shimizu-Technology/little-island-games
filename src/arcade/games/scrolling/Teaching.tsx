import React, { useEffect, useMemo, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { Text } from "../../../components/Text";
import { Button } from "../../../components/ui";
import { nativeDriver, useReducedMotion } from "../../../components/motion";
import { Fruit, Hazard, ScrollHero } from "./Art";
import { createFlight, flightStep, flightTransition } from "../fruit-bat-flight/engine";
import { createRun, runStep, runTransition } from "../lagoon-run/engine";
import { flightLevels, runLevels, type ScrollGame } from "./content";
const ink = "#29314C";
/** A safe rehearsal driven by the same pure movement rules as the full game. */
export function Rehearsal({ game, onTone }: { game: ScrollGame; onTone: (key: string) => void }) {
  const bat = game === "fruit-bat-flight", reduced = useReducedMotion(), [motion] = useState(() => new Animated.Value(0)), [duck, setDuck] = useState(false);
  const trajectory = useMemo(() => {
    let flight = flightTransition(createFlight(flightLevels[0], 1), { type: "flap" });
    let run = runTransition(createRun(runLevels[0], 1), { type: "jump" });
    const y: number[] = [], t: number[] = [];
    for (let i = 0; i <= 66; i++) {
      t.push(i / 66); y.push(bat ? (flight.y - .5) * 170 : -(run.jump > 0 ? Math.sin((.55 - run.jump) / .55 * Math.PI) : 0) * 54);
      flight = flightStep(flight, { type: "idle" }, 1 / 60); run = runStep(run, { type: "idle" }, 1 / 60);
    }
    return { y, t };
  }, [bat]);
  useEffect(() => () => motion.stopAnimation(), [motion]);
  function tryMove(down = false) { setDuck(down); motion.stopAnimation(); motion.setValue(0); onTone(down ? "shell-1" : "shell-4"); Animated.timing(motion, { toValue: 1, duration: bat ? 1100 : down ? 600 : 550, easing: Easing.linear, useNativeDriver: nativeDriver }).start(); }
  return <View style={{ width: "100%", gap: 10 }}><View style={{ height: 150, borderRadius: 25, overflow: "hidden", backgroundColor: bat ? "#263C5C" : "#A6DED9" }}>
    <Animated.View style={{ position: "absolute", left: "28%", top: 55, transform: [{ translateY: reduced ? 0 : duck ? 25 : motion.interpolate({ inputRange: trajectory.t, outputRange: trajectory.y }) }, { scale: duck ? .65 : 1 }] }}><ScrollHero game={game} size={80}/></Animated.View>
    <View style={{ position: "absolute", left: "66%", top: 56 }}>{bat ? <Fruit size={65}/> : <Hazard kind={duck ? "frond" : "coconut"} size={75}/>}</View>
    <Text style={{ position: "absolute", left: 14, top: 12, color: bat ? "#FFF2CD" : ink, fontWeight: "800" }}>{bat ? "Tap ↑ then glide" : duck ? "↓ Duck under" : "↑ Jump over"}</Text>
  </View><View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}><Button quiet compact onPress={() => tryMove()}>{bat ? "Try a flap ↑" : "Try a jump ↑"}</Button>{!bat && <Button quiet compact onPress={() => tryMove(true)}>Try a duck ↓</Button>}</View></View>;
}
