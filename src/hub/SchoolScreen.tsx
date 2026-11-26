import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LearnSubjectArt } from '../art/illustrated';
import { Button, Copy, Heading, PressableScale } from '../components/ui';
import { CHROME_MAX, LARGE_TEXT, TITLE_MAX, atLarge, sharedWordFit, wordFitMultiplier } from '../components/wordFit';
import { useNunitoLoaded } from '../ui/fonts';
import { theme } from '../ui/theme';
import { subjects } from './model';
import { Landmark } from './Landmarks';

const TILE_PADDING = 16;
const TILE_BORDER = 1;
const NAME_SIZE = 21;
const SUBJECT_ART = 104;

const schoolCanvas = '#FFF6E5';
const schoolPaper = '#FFFDF7';
const schoolBorder = '#E4D5BF';
const schoolInk = theme.colors.frame;
const schoolMuted = '#5E4B3E';

export default function SchoolScreen() {
  const { width, fontScale } = useWindowDimensions();
  const nunitoLoaded = useNunitoLoaded();
  const columns = fontScale > 1.5 || width < 340 ? 1 : width > 650 ? 3 : 2;
  const large = fontScale >= LARGE_TEXT;
  const stackHero = large || width < 380;
  const line = Math.min(width - 40, 900);
  const tile = (line - (columns - 1) * 12) / columns;

  const schoolHeading = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily['800'], fontWeight: 'normal', color: schoolInk } as const)
    : ({ fontWeight: '800', color: schoolInk } as const);
  const schoolBody = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily['600'], fontWeight: 'normal' } as const)
    : undefined;

  // Every subject name shares one size that stops where its longest word still fits its tile (never past 2x), so no name breaks mid-word.
  // Below the accessibility threshold every cap is absent, so default and standard sizes are drawn exactly as before.
  const nameMax = atLarge(fontScale, sharedWordFit(subjects.map(subject => subject.name), NAME_SIZE, tile - 2 * TILE_PADDING - 2 * TILE_BORDER, TITLE_MAX));
  const fit = (text: string, size: number, room = line, ceiling = CHROME_MAX) => atLarge(fontScale, wordFitMultiplier(text, size, room, ceiling));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: schoolCanvas }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, maxWidth: 940, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <Button
            quiet
            compact
            maxFontSizeMultiplier={atLarge(fontScale, 1.3)}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            label="Back to map"
            style={{ backgroundColor: schoolPaper, borderColor: schoolBorder }}
            textStyle={{ color: schoolInk }}
          >
            ← Map
          </Button>
          <Heading maxFontSizeMultiplier={fit('School', 27)} style={{ ...schoolHeading, fontSize: 27 }}>
            School
          </Heading>
        </View>

        <View
          style={{
            flexDirection: stackHero ? 'column' : 'row',
            alignItems: 'center',
            gap: 16,
            padding: 18,
            borderRadius: 28,
            backgroundColor: schoolPaper,
            borderWidth: 1,
            borderColor: schoolBorder,
            borderBottomWidth: 3,
            borderBottomColor: theme.colors.rim,
            boxShadow: '0 4px 0 rgba(61, 43, 36, 0.14), 0 8px 18px rgba(61, 43, 36, 0.10)',
          }}
        >
          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: 22,
              backgroundColor: theme.pastels.learn,
              borderWidth: 1,
              borderColor: 'rgba(61, 43, 36, 0.12)',
              padding: 6,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Landmark id="school" />
          </View>
          <View style={{ flex: 1, gap: 4, ...(stackHero ? { alignSelf: 'stretch' as const } : {}) }}>
            <Heading
              maxFontSizeMultiplier={fit('What are you curious about?', 24, stackHero ? line - 38 : line - 166)}
              style={{ ...schoolHeading, fontSize: 24, textAlign: stackHero ? 'center' : 'left' }}
            >
              What are you curious about?
            </Heading>
            <Copy
              maxFontSizeMultiplier={atLarge(fontScale, CHROME_MAX)}
              style={{ ...schoolBody, color: schoolMuted, textAlign: stackHero ? 'center' : 'left' }}
            >
              Six little islands. Take your time.
            </Copy>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {subjects.map(subject => (
            <PressableScale
              key={subject.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${subject.name} island`}
              onPress={() =>
                subject.id === 'chamoru'
                  ? router.push({ pathname: '/learn', params: { game: 'hafa-adai' } })
                  : router.push({ pathname: '/shelf', params: { island: subject.id } })
              }
              style={{
                width: tile,
                minHeight: 164,
                padding: TILE_PADDING,
                gap: 10,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 26,
                backgroundColor: subject.color,
                borderColor: '#3D2B2433',
                borderWidth: TILE_BORDER,
                borderBottomWidth: 4,
                borderBottomColor: 'rgba(61, 43, 36, 0.20)',
                boxShadow: '0 4px 0 rgba(61, 43, 36, 0.14), 0 8px 16px rgba(61, 43, 36, 0.08)',
              }}
            >
              <LearnSubjectArt id={subject.id} size={SUBJECT_ART} />
              <Heading maxFontSizeMultiplier={nameMax} style={{ ...schoolHeading, fontSize: NAME_SIZE, textAlign: 'center' }}>
                {subject.name}
              </Heading>
            </PressableScale>
          ))}
        </View>

        <Copy
          maxFontSizeMultiplier={atLarge(fontScale, CHROME_MAX)}
          style={{ ...schoolBody, textAlign: 'center', color: theme.colors.lagoon }}
        >
          Choose a place to begin. Your work will be here when you return.
        </Copy>
      </ScrollView>
    </SafeAreaView>
  );
}
