import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';
import { illustratedRooms } from './art/illustrated';
import { roomIds, roomNames, type RoomId } from './catalogMore';
import { gamesHere, isGuamPlace, type GuamPlaceId, type PlaceGame } from './locations';

export function PlacesSheet({ room, discoveredPlaces = [], onRoom, onGame, onMarket, onClose }: {
  onMarket?: () => void;
  room: RoomId; discoveredPlaces?: readonly GuamPlaceId[]; onRoom: (room: RoomId) => void; onGame: (route: PlaceGame['route']) => void; onClose: () => void;
}) {
  const cocosUnlocked = room === 'cocos-island' || discoveredPlaces.includes('cocos-island');
  const visibleGuamPlaces: readonly GuamPlaceId[] = cocosUnlocked
    ? (['tumon-beach', 'chamorro-village', 'cocos-island'] as const)
    : (['tumon-beach', 'chamorro-village'] as const);
  return <Sheet visible title="Places" closeLabel="Close Places" onClose={onClose} mode="large" heightRatio={.76} scroll compactHeader>
    <View testID="home-places-sheet" style={{ gap: 14, paddingBottom: 20 }}>
      {isGuamPlace(room) && <View testID="home-games-here-rail" style={{ gap: 6 }}>
        <Text variant="title" style={{ fontSize: 19 }}>Games here</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {gamesHere[room].map(game => <Pressable key={game.name} accessibilityRole="button" accessibilityLabel={`Play ${game.name}`} onPress={() => onGame(game.route)}
            style={({ pressed }) => ({ minHeight: 48, flexBasis: "46%", flexGrow: 1, padding: 12, borderRadius: 14, backgroundColor: pressed ? '#E4D5B4' : '#F6E9CF' })}>
            <Text variant="caption" style={{ color: '#315C56' }}>{game.name}</Text>
          </Pressable>)}
        </View>
      </View>}
      <Text variant="title" style={{ fontSize: 19 }}>Our House</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{roomIds.map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Visit ${roomNames[id]}`} accessibilityState={{ selected: room === id }} onPress={() => onRoom(id)}
        style={{ minHeight: 48, flexBasis: "46%", flexGrow: 1, padding: 12, borderRadius: 14, backgroundColor: room === id ? '#DAEAE0' : '#F2EBDD' }}>
        <Text variant="caption">{id === 'beach' ? 'Beach deck' : roomNames[id]}</Text>
      </Pressable>)}</View>
      <Pressable testID="places-card-island-market" accessibilityRole="button" accessibilityLabel="Visit Little Island Market" onPress={onMarket}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, minHeight: 84, borderRadius: 18, backgroundColor: '#F2EBDD' }}>
        <Image source={require('../../assets/art/home/places/island-market.webp')} resizeMode="cover" style={{ width: 88, height: 64, borderRadius: 12 }}/>
        <View style={{ flex: 1 }}><Text variant="caption">Little Island Market</Text><Text variant="small">Shop · Carry Home · Cook</Text></View>
      </Pressable>
      {visibleGuamPlaces.map(id => <Pressable key={id} testID={`places-card-${id}`} accessibilityRole="button" accessibilityLabel={`Visit ${roomNames[id]}`} accessibilityState={{ selected: room === id }} onPress={() => onRoom(id)}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, minHeight: 84, borderRadius: 18, backgroundColor: pressed || room === id ? '#DAEAE0' : '#F2EBDD' })}>
        <Image source={illustratedRooms[id]()} resizeMode="cover" style={{ width: 88, height: 64, borderRadius: 12 }}/>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text variant="caption">{roomNames[id]}</Text>
            {id === 'cocos-island' && <View testID="places-secret-badge" style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: '#F6DC8C' }}>
              <Text variant="small" style={{ fontSize: 11, color: '#4A3328' }}>★ Secret</Text>
            </View>}
          </View>
          <Text variant="small" style={{ fontSize: 12 }}>
            {id === 'tumon-beach' ? 'Beach & Ocean' : id === 'cocos-island' ? 'Secret Lagoon · Islan Danò' : 'Night Market · Fiesta'}
          </Text>
        </View>
      </Pressable>)}
    </View>
  </Sheet>;
}
