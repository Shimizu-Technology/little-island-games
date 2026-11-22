import { expect, it } from 'vitest';
import { fitSchoolBoard, measuredBoardSpace, schoolEntryReveal } from '../src/learn/boardGeometry';

// Arithmetic invariants only. Actual port dimensions/targets are tested by rendering
// their components in school-board-ports and replaying recorded native layouts.
it('reserves only measured chrome, grows back, and preserves the legibility floor on an impossible screen',()=>{
 const space={width:333,height:500,large:false};
 expect(fitSchoolBoard(space,280,150,288)).toEqual({height:212,chrome:288,overflow:0,fits:true});
 expect(fitSchoolBoard(space,280,150,100).height).toBe(280);
 expect(fitSchoolBoard(space,280,150,400)).toEqual({height:150,chrome:400,overflow:50,fits:false});
 expect(fitSchoolBoard(null,280,150,900).height).toBe(280);
});
it('uses real viewport, board position, card inset and bottom padding once each',()=>{
 expect(measuredBoardSpace(700,70,14,14)).toBe(602);expect(measuredBoardSpace(300,400,14,14)).toBe(0);
});
it.each([499,500,744,852])('entry reveal at %s keeps the approved strict short-window boundary and scopes AX to ported boards',height=>{
 for(const id of ['crab-commands','shell-math','weather-watch','turtle-tales','turtle-draw']){
  expect(schoolEntryReveal(id,false,height)).toBe(height<500);
  expect(schoolEntryReveal(id,true,height)).toBe(height<500||!['turtle-tales','turtle-draw'].includes(id));
 }
});
it.each([499,500,744,852])('Canoe Seats at %s takes the same strict boundary and the AX reveal of a ported board',height=>{
 expect(schoolEntryReveal('canoe-seats',false,height)).toBe(height<500);
 expect(schoolEntryReveal('canoe-seats',true,height)).toBe(true);
});
