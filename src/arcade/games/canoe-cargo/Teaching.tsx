import React, { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { Button, Copy, Heading } from "../../../components/ui";
import { nativeDriver, useReducedMotion } from "../../../components/motion";
import { CargoCaptain, CargoCanoe, CargoTile } from "./Art";
export function CargoTeaching({ learning, onHear, onPlay }: { learning: boolean; onHear: () => void; onPlay: () => void }) {
  const reduced = useReducedMotion(), [drop] = useState(() => new Animated.Value(0)), [replay, setReplay] = useState(0);
  useEffect(() => { drop.setValue(reduced ? 1 : 0); const animation = Animated.timing(drop, { toValue: 1, duration: 950, delay: 300, useNativeDriver: nativeDriver }); if (!reduced) animation.start(); return () => animation.stop(); }, [drop, reduced, replay]);
  return <View style={{ alignItems: "center", gap: 16 }}><CargoCaptain size={110}/><Heading style={{ textAlign: "center" }}>{learning ? "Make the sum. Sail twice!" : "Pack it. Drop it. Sail!"}</Heading>
    <View style={{ width: 288, height: 158, backgroundColor: "#1E4755", borderRadius: 18, overflow: "hidden" }}>
      {[0, 1, 2, 6, 7, 8].map(c => <View key={c} style={{ position: "absolute", left: c * 32, top: 92 }}><CargoTile kind="crate" value={learning ? 1 : 0}/></View>)}
      <Animated.View style={{ position: "absolute", left: 96, top: 0, flexDirection: "row", transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [5, 92] }) }] }}>{[0, 1, 2].map(i => <CargoTile key={i} kind="coconut" value={learning ? 1 : 0}/>)}</Animated.View><View style={{ position: "absolute", right: 4, top: 4 }}><CargoCanoe size={72}/></View>
    </View>
    <Copy style={{ textAlign: "center" }}>{learning ? "Nine parcels of 1 make 9. A full row always sails; matching the target sends a bonus canoe." : "Fill all nine spaces in a row. The cargo sails away and makes room for your next delivery."}</Copy>
    <Copy style={{ textAlign: "center" }}>Tap the sides or drag to move. Tap the cargo to turn. Swipe down to drop. The buttons work too.</Copy>
    {learning && <Copy style={{ textAlign: "center" }}>Helper stops the falling clock. Count, then drop when ready.</Copy>}
    <Button quiet onPress={() => { setReplay(n => n + 1); onHear(); }}>Show & tell me again</Button><Button onPress={onPlay}>I’m ready · let’s play</Button>
  </View>;
}
