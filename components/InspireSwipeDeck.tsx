import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { palette, radius, space, type as typo } from '@/constants/theme';
import { durations, easings, useReduceMotion, withSoftSpring } from '@/lib/motion';
import { InspirationCard, SwipeAction } from '@/types/inspiration';
import { InspireCard } from '@/components/InspireCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_X_THRESHOLD = SCREEN_WIDTH * 0.28;
const SWIPE_UP_THRESHOLD = -SCREEN_HEIGHT * 0.18;
const SWIPE_DOWN_THRESHOLD = SCREEN_HEIGHT * 0.14;

export type InspireSwipeDeckHandle = {
  swipeLeft: () => void;
  swipeRight: () => void;
  swipeUp: () => void;
};

type Props = {
  cards: InspirationCard[];
  activeIndex: number;
  onSwipe: (action: SwipeAction, card: InspirationCard) => void;
  onCardPress: (card: InspirationCard) => void;
  height?: number;
};

function swipeFromOffset(x: number, y: number): SwipeAction | null {
  if (x >= SWIPE_X_THRESHOLD) return 'like';
  if (x <= -SWIPE_X_THRESHOLD) return 'dislike';
  if (y <= SWIPE_UP_THRESHOLD) return 'save';
  if (y >= SWIPE_DOWN_THRESHOLD) return 'similar';
  return null;
}

export const InspireSwipeDeck = forwardRef<InspireSwipeDeckHandle, Props>(function InspireSwipeDeck(
  { cards, activeIndex, onSwipe, onCardPress, height = SCREEN_HEIGHT * 0.67 },
  ref,
) {
  const reduceMotion = useReduceMotion();
  const pan = useRef(new Animated.ValueXY()).current;
  const deckOpacity = useRef(new Animated.Value(0)).current;
  const deckScale = useRef(new Animated.Value(0.98)).current;

  const card = cards[activeIndex];
  const second = cards[activeIndex + 1];
  const third = cards[activeIndex + 2];

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(deckOpacity, {
        toValue: 1,
        duration: reduceMotion ? durations.fast : durations.normal,
        useNativeDriver: true,
        easing: easings.outCubic,
      }),
      Animated.timing(deckScale, {
        toValue: 1,
        duration: reduceMotion ? durations.fast : durations.normal,
        useNativeDriver: true,
        easing: easings.outCubic,
      }),
    ]).start();
  }, [activeIndex, deckOpacity, deckScale, reduceMotion]);

  const resetPan = React.useCallback(() => {
    Animated.spring(pan, {
      ...withSoftSpring(0),
      toValue: { x: 0, y: 0 },
    }).start();
  }, [pan]);

  const completeSwipe = React.useCallback((action: SwipeAction, current: InspirationCard) => {
    const toValue =
      action === 'like'
        ? { x: SCREEN_WIDTH * 1.2, y: 0 }
        : action === 'dislike'
          ? { x: -SCREEN_WIDTH * 1.2, y: 0 }
          : action === 'save'
            ? { x: 0, y: -SCREEN_HEIGHT * 0.8 }
            : { x: 0, y: SCREEN_HEIGHT * 0.6 };

    Animated.timing(pan, {
      toValue,
      duration: reduceMotion ? durations.fast : durations.slow,
      useNativeDriver: true,
      easing: easings.outExpo,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      onSwipe(action, current);
    });
  }, [onSwipe, pan, reduceMotion]);

  const triggerSwipe = React.useCallback((action: SwipeAction) => {
    if (!card) return;
    completeSwipe(action, card);
  }, [card, completeSwipe]);

  useImperativeHandle(ref, () => ({
    swipeLeft: () => triggerSwipe('dislike'),
    swipeRight: () => triggerSwipe('like'),
    swipeUp: () => triggerSwipe('save'),
  }), [triggerSwipe]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: pan.x, translationY: pan.y } }],
    { useNativeDriver: true },
  );

  const onHandlerStateChange = ({ nativeEvent }: { nativeEvent: { oldState: number; translationX: number; translationY: number } }) => {
    if (!card) return;
    if (nativeEvent.oldState !== State.ACTIVE) return;
    const action = swipeFromOffset(nativeEvent.translationX, nativeEvent.translationY);
    if (!action) {
      resetPan();
      return;
    }
    completeSwipe(action, card);
  };

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: reduceMotion ? ['-2deg', '0deg', '2deg'] : ['-8deg', '0deg', '8deg'],
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_X_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const passOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_X_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const saveOpacity = pan.y.interpolate({
    inputRange: [SWIPE_UP_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (!card) {
    return (
      <View style={[styles.deck, { height }]}>
        <View style={[styles.card, styles.emptyCard]}>
          <Text style={styles.emptyTitle}>No more looks right now</Text>
          <Text style={styles.emptySub}>Pull to refresh your inspiration feed.</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.deck, { height, opacity: deckOpacity, transform: [{ scale: deckScale }] }]}>
      {third ? (
        <View style={[styles.cardWrap, styles.third]}>
          <InspireCard card={third} muted onPress={onCardPress} />
        </View>
      ) : null}
      {second ? (
        <View style={[styles.cardWrap, styles.second]}>
          <InspireCard card={second} muted onPress={onCardPress} />
        </View>
      ) : null}

      <PanGestureHandler
        enabled={!!card}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.cardWrap,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { rotateZ: rotate },
              ],
            },
          ]}
        >
          <InspireCard card={card} onPress={onCardPress} />
          <Animated.View pointerEvents="none" style={[styles.badge, styles.badgeRight, { opacity: likeOpacity }]}>
            <Text style={styles.badgeText}>Like</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.badge, styles.badgeLeft, { opacity: passOpacity }]}>
            <Text style={styles.badgeText}>Pass</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.badge, styles.badgeTop, { opacity: saveOpacity }]}>
            <Text style={styles.badgeText}>Save</Text>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  deck: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 430,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignSelf: 'center',
  },
  second: {
    transform: [{ scale: 0.96 }, { translateY: 12 }],
    opacity: 0.9,
  },
  third: {
    transform: [{ scale: 0.92 }, { translateY: 24 }],
    opacity: 0.8,
  },
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: palette.white,
  },
  badge: {
    position: 'absolute',
    paddingHorizontal: space.md,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(44, 40, 37, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typo.caption,
    color: palette.white,
    fontWeight: '600',
  },
  badgeLeft: {
    left: space.lg,
    top: space.lg,
  },
  badgeRight: {
    right: space.lg,
    top: space.lg,
  },
  badgeTop: {
    top: space.lg,
    alignSelf: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  emptyTitle: {
    ...typo.sectionHeader,
    color: palette.ink,
  },
  emptySub: {
    ...typo.body,
    color: palette.inkMuted,
    marginTop: space.sm,
  },
});
