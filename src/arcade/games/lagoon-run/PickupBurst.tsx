import React from 'react';
import {Image} from 'react-native';
/** Static high-density +1 glyph and burst; collection only changes its wrapper transform. */
export function PickupBurst(){return <Image accessible={false} source={require('../../../../assets/arcade/lagoon/shell-burst.png')} style={{width:48,height:48}} fadeDuration={0}/>;}
export function MarkerNote(){return <Image accessible={false} source={require('../../../../assets/arcade/lagoon/marker-note.png')} style={{width:80,height:30}} fadeDuration={0}/>;}
