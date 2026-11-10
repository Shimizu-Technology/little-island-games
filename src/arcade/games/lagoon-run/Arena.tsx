import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { WorldId } from '../../types';
import { lagoonLook } from './look';
import { stageLayout } from './camera';
import { StageContext } from './stage';
import { RunAmbient, RunBackdrop, RunForeground } from './Backdrop';

/**
 * Full-bleed Lagoon arena (no letterbox). The 390-wide track is fitted to the arena and the
 * world extends to every edge; sky, hills, water and the frame are drawn at the arena's real
 * size so they stay sharp on the iPad. The camera stage is scaled once from its top-left.
 */
export function RunArena({ world, children, hud, overlay, controls, active }: { world: WorldId; children: React.ReactNode; hud: React.ReactNode; overlay?: React.ReactNode; controls: React.ReactNode; active: boolean }) {
  const [size, setSize] = useState({ w: 390, h: 660 });
  const layout = useMemo(() => stageLayout(size.w, size.h), [size.w, size.h]);
  const look = lagoonLook(world);
  return <View testID="run-field" style={{ flex: 1, overflow: 'hidden', backgroundColor: look.water[1] }} onLayout={e => { const { width, height } = e.nativeEvent.layout; if (width && height && (width !== size.w || height !== size.h)) setSize({ w: width, h: height }); }}>
    <RunBackdrop world={world} layout={layout} width={size.w} height={size.h}/>
    <StageContext.Provider value={layout}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: layout.width, height: layout.height, transform: [{ scale: layout.scale }], transformOrigin: [0, 0, 0], overflow: 'hidden' }}>{children}</View>
    </StageContext.Provider>
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: layout.width, height: layout.height, transform: [{ scale: layout.scale }], transformOrigin: [0, 0, 0] }}><RunAmbient world={world} layout={layout} active={active}/></View>
    <RunForeground world={world} layout={layout} width={size.w} height={size.h}/>
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>{hud}</View>
    {overlay}
    <View pointerEvents="box-none" testID="run-controls" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 }}>{controls}</View>
  </View>;
}
