import { describe, expect, it } from "vitest";
import { createNumbers, numberLimit, rollNumbers, selectNumber, closeNumbers, undoNumbers } from "../src/games/numbers";
import { defaultOptions } from "../src/games/types";
import { emptySave, parseSave, validSession } from "../src/state/validation";
import { createPartySession, partyAction, partyActor, rematchParty, validPartySession } from "../src/party/engine";
import { createTic, ticHintReason } from "../src/games/tic";
import { activityFinished } from "../src/state/activities";
import { createRaceSession } from "../src/racer/engine";
describe("quality release regressions", () => {
  it("new number difficulties differ and all twelve Challenge numbers survive save/undo", () => {
    for (const [difficulty, max] of [["easy", 6], ["medium", 9], ["hard", 12]] as const) {
      const s = createNumbers({ ...defaultOptions, difficulty });
      expect(numberLimit(s)).toBe(max);
      expect(s.available).toEqual(Array.from({length:max}, (_,i)=>i+1));
      expect(validSession(s)).toBe(true);
      expect(rollNumbers(s).dice).toHaveLength(difficulty === "easy" ? 1 : 2);
    }
    let s = createNumbers({ ...defaultOptions, difficulty:"hard" });
    s = {...s, dice:[6,6]};
    const closed = closeNumbers(selectNumber(s,12));
    expect(closed.available).not.toContain(12);
    expect(validSession(closed)).toBe(true);
    expect(undoNumbers(closed)).toMatchObject({ available:s.available, dice:[6,6] });
    const save = {...emptySave(), sessions:{numbers:closed}};
    expect(parseSave(JSON.stringify(save))).toEqual(save);
  });
  it("keeps build6 hard-nine number rounds intact and rejects forged new limits", () => {
    const {maxNumber: _limit, ...legacy} = createNumbers({...defaultOptions,difficulty:"hard"});
    void _limit;
    legacy.available=Array.from({length:9},(_,i)=>i+1);
    expect(numberLimit(legacy)).toBe(9);
    expect(validSession(legacy)).toBe(true);
    expect(validSession({...legacy,maxNumber:12,available:[13]})).toBe(false);
    expect(validSession({...createNumbers(defaultOptions),maxNumber:12})).toBe(false);
  });
  it("does not give the previous imposter immunity; clue order rotates without changing legacy rounds", () => {
    const players=["A","B","C","D"];
    for(let previous=0;previous<4;previous++) {
      const assigned = new Set(Array.from({length:100},(_,seed)=>createPartySession({players,seed,previousImposter:previous}).imposter));
      expect(assigned).toEqual(new Set([0,1,2,3]));
    }
    let s=createPartySession({players,seed:2,firstClue:2});
    while(s.phase==="roles") s=partyAction(s,{sessionId:s.id,revision:s.revision,player:partyActor(s)!,type:"role-done"});
    expect(partyActor(s)).toBe(2);
    const next=rematchParty(s);
    expect(next.firstClue).toBe(3);
    const { firstClue: _first,...legacy }=s; void _first;
    expect(validPartySession(legacy)).toBe(true);
    expect(partyActor(legacy)).toBe(0);
    expect(validPartySession({...s,firstClue:4})).toBe(false);
  });
  it("teaches the exact immediate winning or blocking square", () => {
    const s=createTic(defaultOptions);
    expect(ticHintReason({...s,board:["X","X",null,"O","O",null,null,null,null]},2)).toMatch(/completes/);
    expect(ticHintReason({...s,board:["X","X",null,"O",null,null,null,null,null]},2)).toMatch(/Block/);
  });
  it("does not advertise finished or timed-out races as resumable", () => {
    const s=createRaceSession();
    expect(activityFinished(s)).toBe(false);
    expect(activityFinished({...s,status:"finished"})).toBe(true);
    expect(activityFinished({...s,status:"timedout"})).toBe(true);
  });
});
