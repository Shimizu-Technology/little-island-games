import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button, C, Copy, PressableScale } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { Basket, Crate, Mango, MarketArt, NumberPieces } from "../../kit/NumberParts";
import { pieceTotal, splitNumber } from "../../kit/numbers";
import {
  chooseOrder,
  marketMax,
  marketOrder,
  nextCustomer,
  openOrder,
  packPiece,
  serve,
  shopkeeper,
  type MarketState,
} from "./engine";

export function Board({ session, update, practice, sound, active, width }: BoardProps<MarketState>) {
  const s = session.state,
    o = session.options,
    order = marketOrder(s),
    money = order?.kind === "change";
  const total = pieceTotal(s.pieces, money),
    [feedback, setFeedback] = useState("");
  const keeper = shopkeeper(s),
    packer = 1 - keeper;
  const name = (seat: number) => session.names?.[seat] ?? `Player ${seat + 1}`;
  const phaseAudio =
    s.phase === "done"
      ? "island-market-finish"
      : s.phase === "served"
      ? "island-market-served"
      : `island-market-${order!.id}`;
  useEffect(() => {
    if (active) sound(phaseAudio);
  }, [active, phaseAudio, sound]);
  function adjust(part: "tens" | "ones" | 0 | 1 | 2 | 3, delta: 1 | -1) {
    if (!active) return;
    const next = packPiece(s, o, part, delta);
    if (next !== s) {
      update(next);
      setFeedback("");
      sound(`reef-race-number-${pieceTotal(next.pieces, money)}`);
    }
  }
  function deliver(choice?: number) {
    if (!active || !order) return;
    const next = serve(s, choice);
    practice(order.skill, next !== s);
    if (next === s) {
      const key = order.kind === "compare" ? "compare-try" : total < order.target ? "under" : "over";
      setFeedback(
        order.kind === "compare"
          ? "Compare the tens, then the ones. Which amount is bigger?"
          : total < order.target
          ? "The basket needs more. Add pieces and try again."
          : "There are too many. Take pieces out and try again."
      );
      sound(`island-market-${key}`);
    } else {
      setFeedback("");
      update(next);
    }
  }
  if (s.phase === "done")
    return (
      <View style={{ gap: 14, alignItems: "center", padding: 16 }}>
        <MarketArt size={Math.min(260, width)} />
        <Copy style={{ fontSize: 22, fontWeight: "800", textAlign: "center" }}>Everyone has their order!</Copy>
        <Copy style={{ textAlign: "center" }}>The market is ready for a rest. Thank you for packing together.</Copy>
        <Button compact quiet icon="sound-on" label="Hear the market ending" onPress={() => sound(phaseAudio)}>
          Hear
        </Button>
      </View>
    );
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <View accessibilityLabel="An island customer at the mango stall">
          <MarketArt size={122} customer={s.index} />
        </View>
        <View style={{ flex: 1 }}>
          <Copy style={{ fontSize: 13 }}>
            Customer {s.index + 1} of {s.orders.length}
          </Copy>
          {o.mode === "together" && (
            <Copy style={{ fontSize: 13, fontWeight: "800" }}>
              {s.phase === "order" ? `${name(keeper)} · shopkeeper` : `${name(packer)} · packer`}
            </Copy>
          )}
        </View>
        <Button compact quiet icon="sound-on" label="Hear the customer order" onPress={() => sound(phaseAudio)}>
          Hear
        </Button>
      </View>
      <Copy style={{ fontSize: 17, fontWeight: "800", minHeight: 58 }}>
        {s.phase === "served" ? "Thank you! Your order is ready." : order!.prompt}
      </Copy>
      {s.phase === "order" && (
        <>
          <Copy style={{ fontSize: 14 }}>
            {o.mode === "together"
              ? `${name(keeper)}, hear or choose the order. Then pass to ${name(packer)} to pack.`
              : "Hear the order, then build it with pieces."}
          </Copy>
          <Button
            disabled={!active}
            onPress={() => {
              update(openOrder(s));
              sound(money ? "island-market-change" : "island-market-pack");
            }}
          >
            {o.mode === "together"
              ? "Pass to the packer"
              : order!.kind === "compare"
              ? "Compare the orders"
              : "Pack this order"}
          </Button>
          {o.mode === "together" && s.index + 1 < s.orders.length && (
            <Button compact quiet disabled={!active} onPress={() => update(chooseOrder(s))}>
              Choose the next customer instead
            </Button>
          )}
        </>
      )}
      {s.phase === "pack" &&
        (order!.kind === "compare" ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[order!.a, order!.b].map((n, i) => {
              const parts = splitNumber(n);
              return (
                <PressableScale
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`${i === 0 ? "Auntie" : "Kiko"} wants ${n} mangoes`}
                  disabled={!active}
                  onPress={() => deliver(n)}
                  style={{
                    flex: 1,
                    minHeight: 128,
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor: "#D2B279",
                    backgroundColor: C.cream,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                  }}
                >
                  <Copy style={{ fontSize: 15 }}>{i === 0 ? "Auntie" : "Kiko"}</Copy>
                  <Text style={{ fontSize: 34, fontWeight: "900", color: C.ink }}>{n}</Text>
                  <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
                    <Crate size={30} />
                    <Copy style={{ fontSize: 13 }}>{parts.tens}</Copy>
                    <Mango size={21} />
                    <Copy style={{ fontSize: 13 }}>{parts.ones}</Copy>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        ) : (
          <>
            <Basket pieces={s.pieces} total={total} target={order!.target} money={money} />
            <NumberPieces
              pieces={s.pieces}
              total={total}
              max={marketMax(o)}
              money={money}
              disabled={!active}
              adjust={adjust}
            />
            <Button compact disabled={!active} onPress={() => deliver()}>
              {money ? "Give the change" : "Serve the basket"}
            </Button>
          </>
        ))}
      {s.phase === "served" && (
        <>
          <View style={{ alignItems: "center", padding: 10, backgroundColor: C.cream, borderRadius: 16 }}>
            <Crate size={70} />
            <Copy style={{ fontSize: 22, fontWeight: "800" }}>
              {order!.target} {money ? "shells in change" : "mangoes"}
            </Copy>
          </View>
          <Button disabled={!active} onPress={() => update(nextCustomer(s))}>
            {s.index + 1 === s.orders.length
              ? "Close the market"
              : o.mode === "together"
              ? "Swap roles · next customer"
              : "Next customer"}
          </Button>
        </>
      )}
      <Copy style={{ fontSize: 13, minHeight: 34 }}>
        {feedback ||
          (s.phase === "pack"
            ? money
              ? "Pretend shell coins: 1, 5, 10, 25. Select a coin, then add or take away."
              : order!.kind === "compare"
              ? "Who wants more? Tap the bigger order."
              : "A crate holds 10. A loose mango is 1. You can always adjust."
            : "Take your time. There is no clock.")}
      </Copy>
    </View>
  );
}
export function Art({ size }: { size: number }) {
  return (
    <View
      accessibilityLabel="An island market with mangoes and a friendly customer"
      style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}
    >
      <MarketArt size={size} />
    </View>
  );
}
