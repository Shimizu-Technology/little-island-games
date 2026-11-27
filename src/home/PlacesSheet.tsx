import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';
import { illustratedRooms } from './art/illustrated';
import { roomIds, roomNames, type RoomId } from './catalogMore';
import { gamesHere, isGuamPlace, type PlaceGame } from './locations';

export function PlacesSheet({ room, onRoom, onGame, onClose }: {
  room: RoomId; onRoom: (room: RoomId) => void; onGame: (route: PlaceGame['route']) => void; onClose: () => void;
}) {
  return <Sheet visible title="Places" closeLabel="Close Places" onClose={onClose} mode="large" heightRatio={.76} scroll compactHeader>
    <View testID="home-places-sheet" style={{ gap: 14, paddingBottom: 20 }}>
      {isGuamPlace(room) && <View testID="home-games-here-rail" style={{ gap: 6 }}>
        <Text variant="title" style={{ fontSize: 19 }}>Games here</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {gamesHere[room].map(game => <Pressable key={game.name} accessibilityRole="button" accessibilityLabel={`Play ${game.name}`} onPress={() => onGame(game.route)}
            style={({ pressed }) => ({ minHeight: 48, flexGrow: 1, padding: 12, borderRadius: 14, backgroundColor: pressed ? '#E4D5B4' : '#F6E9CF' })}>
            <Text variant="caption" style={{ color: '#315C56' }}>{game.name}</Text>
          </Pressable>)}
        </View>
      </View>}
      <Text variant="title" style={{ fontSize: 19 }}>Our House</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{roomIds.map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Visit ${roomNames[id]}`} accessibilityState={{ selected: room === id }} onPress={() => onRoom(id)}
        style={{ minHeight: 48, flexGrow: 1, padding: 12, borderRadius: 14, backgroundColor: room === id ? '#DAEAE0' : '#F2EBDD' }}>
        <Text variant="caption">{id === 'beach' ? 'Beach deck' : roomNames[id]}</Text>
      </Pressable>)}</View>
      {(['tumon-beach', 'chamorro-village'] as const).map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Visit ${roomNames[id]}`} accessibilityState={{ selected: room === id }} onPress={() => onRoom(id)}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, minHeight: 84, borderRadius: 18, backgroundColor: pressed || room === id ? '#DAEAE0' : '#F2EBDD' })}>
        <Image source={illustratedRooms[id]()} resizeMode="cover" style={{ width: 88, height: 64, borderRadius: 12 }}/>
        <View style={{ flex: 1, gap: 3 }}><Text variant="caption">{roomNames[id]}</Text><Text variant="small" style={{ fontSize: 12 }}>{id === 'tumon-beach' ? 'Beach & Reef' : 'Night Market · Fiesta'}</Text></View>
      </Pressable>)}
    </View>
  </Sheet>;
}
