import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, View } from 'react-native';
import { Text } from '../components/Text';
import { Copy, Heading } from '../components/ui';
import { nativeDriver, useReducedMotion } from '../components/motion';
import { HuntBoard } from './HuntBoard';
import { solveBoard, traceTile, type HuntSize } from './wordHuntEngine';
import {
  changeSelection,
  createWordSession,
  finishRound,
  rematch,
  resumeRound,
  selectedWord,
  startSecondPlayer,
  submitWord,
  wordStatus,
  type WordMode,
} from './session';
import { useWordRound, type WordScreenProps } from './useWordRound';
import {
  Button,
  FinishSummary,
  FoundRibbon,
  foundWords,
  missedWords,
  ModePicker,
  PrivacyCard,
  RoundBar,
  SetupCopy,
  W,
  WordHeader,
  WordList,
  WordOptionsSheet,
} from './WordGameUI';
import { wordScore } from './scoring';

export function WordHuntScreen(props: WordScreenProps) {
  const { round, change, live, pause } = useWordRound(props);
  const [mode, setMode] = useState<WordMode>(round?.mode ?? 'chill');
  const [size, setSize] = useState<HuntSize>(round?.game === 'word-hunt' ? round.size : 4);
  const [tapMode, setTapMode] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [hint, setHint] = useState<number>();
  const [review, setReview] = useState('');
  const [feedback, setFeedback] = useState('');
  const [motion] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  const feedbackId = useRef(0);

  useEffect(() => {
    // React Native Web reports screen-reader support, not whether a reader is running.
    // Keep drag as the web default and offer the explicit, keyboard-accessible tap switch.
    if (Platform.OS === 'web') return;
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled()
      .then(enabled => {
        if (mounted && enabled) setTapMode(true);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', enabled => {
      if (enabled) setTapMode(true);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const [response, setResponse] = useState<'new' | 'found' | 'invalid'>('new');

  const start = () => {
    const run = () => {
      const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
      change(createWordSession('word-hunt', size, mode, seed, round?.best));
      setHint(undefined);
      setReview('');
      setFeedback('');
      setOptionsOpen(false);
    };
    if (props.beforeNewRound) props.beforeNewRound(run);
    else run();
  };

  const replay = () => {
    const run = () => {
      if (round) {
        change(rematch(round));
        setReview('');
        setFeedback('');
        setOptionsOpen(false);
      }
    };
    if (props.beforeNewRound) props.beforeNewRound(run);
    else run();
  };

  const toggleOptions = () => {
    if (optionsOpen) {
      setOptionsOpen(false);
      if (round?.phase === 'paused') change(resumeRound(round));
      return;
    }
    if (round?.phase === 'playing') pause();
    if (round?.game === 'word-hunt') {
      setMode(round.mode);
      setSize(round.size);
    }
    setOptionsOpen(true);
  };

  const submit = () => {
    const current = live.current;
    if (!current || current.game !== 'word-hunt' || current.phase !== 'playing') return;
    const word = selectedWord(current),
      status = wordStatus(current);
    setResponse(status === 'building' ? 'invalid' : status);
    setFeedback(
      status === 'new'
        ? `${word} +${wordScore(word)}`
        : status === 'found'
          ? `${word} · Already found`
          : word.length < 3
            ? 'Try 3 or more letters'
            : `${word} · Not in island word list`,
    );
    if (status === 'new' && props.sound !== false) props.onFeedback?.('word');
    change(submitWord(current));
    setHint(undefined);
    const id = ++feedbackId.current;
    motion.stopAnimation();
    motion.setValue(0);
    if (!reduced)
      Animated.timing(motion, {
        toValue: 1,
        duration: status === 'new' ? 260 : 180,
        useNativeDriver: nativeDriver,
      }).start(() => {
        if (id === feedbackId.current) motion.setValue(0);
      });
  };

  const tile = (index: number) => {
    const current = live.current;
    if (!current || current.game !== 'word-hunt' || current.phase !== 'playing') return;
    if (tapMode && current.selection.at(-1) === index) {
      submit();
      return;
    }
    const selection = traceTile(current.selection, index, current.size);
    if (selection.join(',') !== current.selection.join(',')) change(changeSelection(current, selection));
  };

  if (round && round.game !== 'word-hunt') return null;
  const boardWidth = Math.max(270, Math.min(props.width ?? 350, 420));
  const status = round ? wordStatus(round) : 'building';
  const solutions = round ? solveBoard(round.tiles) : new Map<string, readonly number[]>();
  const reviewPath = solutions.get(review) ?? [];

  const sizeButtons = (
    <View style={W.row}>
      <Button small selected={size === 4} tone={size === 4 ? 'primary' : 'quiet'} onPress={() => setSize(4)}>
        4 × 4 Classic
      </Button>
      <Button small selected={size === 5} tone={size === 5 ? 'primary' : 'quiet'} onPress={() => setSize(5)}>
        5 × 5 Big Board
      </Button>
    </View>
  );

  return (
    <View style={W.screen}>
      <WordHeader
        game="word-hunt"
        onBack={() => {
          pause();
          props.onBack();
        }}
        onOptions={round ? toggleOptions : undefined}
        optionsOpen={optionsOpen}
      />
      {!round ? (
        <View style={W.panel}>
          <Heading>Find your island pace</Heading>
          <ModePicker mode={mode} setMode={setMode} />
          {sizeButtons}
          <SetupCopy game="word-hunt" mode={mode} />
          <Copy>
            Slide through neighboring letters, including diagonals. Each tile can be used once per word. Slide back one tile to undo.
          </Copy>
          <Button onPress={start}>Start Word Hunt</Button>
        </View>
      ) : optionsOpen ? (
        <WordOptionsSheet
          game="word-hunt"
          mode={mode}
          setMode={setMode}
          sizeContent={sizeButtons}
          onStartFresh={start}
          onResume={() => {
            setOptionsOpen(false);
            if (round.phase === 'paused') change(resumeRound(round));
          }}
          onLeave={() => {
            setOptionsOpen(false);
            pause();
            props.onBack();
          }}
          extraControls={
            <Button
              small
              tone="quiet"
              onPress={() => {
                setTapMode(!tapMode);
                change(changeSelection(round, []));
              }}
            >
              {tapMode ? 'Switch to finger drag' : 'Switch to tap tracing'}
            </Button>
          }
        />
      ) : round.phase === 'handoff' || round.phase === 'paused' ? (
        <PrivacyCard
          round={round}
          onReady={() => change(round.phase === 'handoff' ? startSecondPlayer(round) : resumeRound(round))}
          onOptions={toggleOptions}
          onBack={props.onBack}
        />
      ) : round.phase === 'finished' ? (
        <>
          <FinishSummary round={round} onAgain={start} onRematch={replay} onBack={props.onBack} />
          <Copy>Tap a found or missed word to see its trail.</Copy>
          <HuntBoard tiles={round.tiles} size={round.size} path={reviewPath} width={Math.min(boardWidth, 280)} />
          <Text style={W.label}>{review || 'Choose a word below'}</Text>
          <WordList title="Found Words" words={foundWords(round)} selected={review} onWord={setReview} />
          <WordList title="Best Words You Missed" words={missedWords(round, [...solutions.keys()])} selected={review} onWord={setReview} />
          <View style={W.panel}>
            <Heading>Next round</Heading>
            <ModePicker mode={mode} setMode={setMode} />
            <View style={W.row}>
              <Button small selected={size === 4} tone={size === 4 ? 'primary' : 'quiet'} onPress={() => setSize(4)}>
                4 × 4
              </Button>
              <Button small selected={size === 5} tone={size === 5 ? 'primary' : 'quiet'} onPress={() => setSize(5)}>
                5 × 5
              </Button>
            </View>
            <Button onPress={start}>Start with these choices</Button>
          </View>
        </>
      ) : (
        <>
          <RoundBar round={round} />
          <Animated.View
            style={[
              W.pill,
              {
                backgroundColor: status === 'new' ? '#1F7A5A' : status === 'found' ? '#B87A1E' : '#FFF5DF',
                transform: [
                  {
                    translateX:
                      response === 'invalid'
                        ? motion.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -4, 4, -3, 0] })
                        : 0,
                  },
                ],
              },
            ]}
          >
            <Text
              accessibilityLiveRegion="polite"
              style={[W.word, status === 'new' ? { color: '#FFFDF8' } : status === 'found' ? { color: '#20160F' } : undefined]}
            >
              {selectedWord(round) || 'Your word trail'}
            </Text>
            <Text
              style={[W.label, status === 'new' ? { color: '#FFFDF8' } : status === 'found' ? { color: '#20160F' } : undefined]}
            >
              {status === 'new' ? `+${wordScore(selectedWord(round))}` : status === 'found' ? 'Found' : ''}
            </Text>
          </Animated.View>
          <HuntBoard
            tiles={round.tiles}
            size={round.size}
            path={round.selection}
            hint={hint}
            width={boardWidth}
            interactive
            tapMode={tapMode}
            onTracingChange={props.onTracingChange}
            onTile={tile}
            onRelease={submit}
            onCancel={() => {
              const current = live.current;
              if (current) change(changeSelection(current, []));
            }}
          />
          <Animated.View
            style={{
              minHeight: 26,
              opacity: response === 'found' ? motion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.55, 1] }) : 1,
              transform: [{ translateY: response === 'new' ? motion.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) : 0 }],
            }}
          >
            <Text accessibilityLiveRegion="polite" style={W.label}>
              {feedback || (tapMode ? 'Tap adjacent tiles. Tap the last tile to enter.' : 'Slide a word, then lift your finger.')}
            </Text>
          </Animated.View>
          <View style={W.row}>
            {tapMode && (
              <>
                <Button small onPress={submit}>
                  Submit
                </Button>
                <Button
                  small
                  tone="quiet"
                  onPress={() => {
                    change(changeSelection(round, []));
                    setHint(undefined);
                  }}
                >
                  Clear
                </Button>
              </>
            )}
            <Button
              small
              tone="quiet"
              onPress={() => {
                setTapMode(!tapMode);
                change(changeSelection(round, []));
              }}
            >
              {tapMode ? 'Use finger drag' : 'Use tap tracing'}
            </Button>
            {round.mode === 'chill' && (
              <Button
                small
                tone="quiet"
                onPress={() => {
                  const next = [...solutions].find(([word]) => !round.found[round.player].includes(word));
                  setHint(next?.[1][0]);
                  setFeedback(next ? 'A new word starts on the green tile' : 'You found every word!');
                }}
              >
                Hint
              </Button>
            )}
            <Button small tone="quiet" onPress={pause}>
              Pause
            </Button>
            <Button
              small
              tone="quiet"
              onPress={() => {
                change(finishRound(round));
                if (props.sound !== false) props.onFeedback?.('finish');
              }}
            >
              Finish round
            </Button>
          </View>
          <FoundRibbon round={round} />
          <WordList title="Found Words" words={foundWords(round)} />
        </>
      )}
    </View>
  );
}
