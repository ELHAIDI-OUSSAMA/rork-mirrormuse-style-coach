import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  X,
  Save,
  Trash2,
  Sparkles,
  ArrowLeft,
  Plus,
  UserRound,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { buildPersonalizationContext, getUserStyleProfile } from '@/lib/preferenceModel';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { ClosetItem, StickerPlacement, OutfitAIReview } from '@/types';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { palette, radius, space, shadow } from '@/constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STICKER_SIZE = 120;
const DRAWER_COLLAPSED = 56;
const DRAWER_EXPANDED = 170;

const AIReviewSchema = z.object({
  overallScore: z.number().min(1).max(10),
  summary: z.string(),
  whatWorks: z.array(z.string()),
  improvements: z.array(z.string()),
  missingPieceSuggestions: z.array(z.string()),
  swapFromClosetSuggestions: z.array(
    z.object({
      reason: z.string(),
      replace: z.string(),
      withCategory: z.string(),
      closetMatches: z.array(z.string()),
    })
  ),
  styleDirection: z.array(z.string()),
  occasionFit: z.object({
    bestOccasions: z.array(z.string()),
    avoidOccasions: z.array(z.string()),
  }),
});

interface CanvasSticker extends StickerPlacement {
  item: ClosetItem;
}

function getInitialY(category: string, canvasH: number): number {
  const tops = ['T-shirt', 'Shirt', 'Hoodie', 'Sweater'];
  const outer = ['Jacket', 'Blazer', 'Coat'];
  const bottoms = ['Jeans', 'Pants', 'Shorts', 'Skirt', 'Dress'];
  const shoes = ['Sneakers', 'Shoes', 'Boots'];

  if (outer.includes(category)) return canvasH * 0.1;
  if (tops.includes(category)) return canvasH * 0.18;
  if (bottoms.includes(category)) return canvasH * 0.45;
  if (shoes.includes(category)) return canvasH * 0.72;
  return canvasH * 0.35;
}

/* ─── Draggable Sticker ──────────────────────────────── */

interface StickerProps {
  sticker: CanvasSticker;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (u: Partial<StickerPlacement>) => void;
  canvasScaleRef: React.MutableRefObject<number>;
  canvasPan: { x: number; y: number };
  canvasZoom: number;
}

const HANDLE_SIZE = 28;
const ROTATION_SNAP = 15;

function ResizeHandle({ corner, onDrag }: {
  corner: 'tl' | 'tr' | 'bl' | 'br';
  onDrag: (dx: number, dy: number, done: boolean) => void;
}) {
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gs) => onDrag(gs.dx, gs.dy, false),
      onPanResponderRelease: (_, gs) => onDrag(gs.dx, gs.dy, true),
      onPanResponderTerminate: (_, gs) => onDrag(gs.dx, gs.dy, true),
    })
  ).current;

  const posStyle: any = {};
  if (corner.includes('t')) posStyle.top = -HANDLE_SIZE / 2;
  else posStyle.bottom = -HANDLE_SIZE / 2;
  if (corner.includes('l')) posStyle.left = -HANDLE_SIZE / 2;
  else posStyle.right = -HANDLE_SIZE / 2;

  return (
    <View
      {...responder.panHandlers}
      style={[styles.resizeHandle, posStyle]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    />
  );
}

function DraggableSticker({ sticker, isSelected, onSelect, onUpdate, canvasScaleRef, canvasPan, canvasZoom }: StickerProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const rotAnim = useRef(new Animated.Value(sticker.rotation)).current;

  const liveRot = useRef(sticker.rotation);
  const liveX = useRef(sticker.x);
  const liveY = useRef(sticker.y);

  const initDist = useRef(0);
  const initAngle = useRef(0);
  const initScale = useRef(sticker.scale);
  const initRot = useRef(sticker.rotation);
  const isPinching = useRef(false);
  const moved = useRef(false);
  const lastSnappedRot = useRef(sticker.rotation);
  const dragScaleBase = useRef(sticker.scale);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,

      onPanResponderGrant: (evt) => {
        onSelect();
        pan.setOffset({ x: 0, y: 0 });
        pan.setValue({ x: 0, y: 0 });
        moved.current = false;

        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          startPinch(touches as any);
        } else {
          isPinching.current = false;
        }
      },

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length >= 2) {
          if (!isPinching.current) startPinch(touches as any);
          handlePinchMove(touches as any);
          return;
        }

        if (isPinching.current) return;

        moved.current = true;
        const s = canvasScaleRef.current;
        pan.setValue({ x: gs.dx / s, y: gs.dy / s });
      },

      onPanResponderRelease: (_, gs) => {
        if (isPinching.current) {
          isPinching.current = false;
          onUpdate({
            scale: liveScale.current,
            rotation: liveRot.current,
          });
          return;
        }

        pan.flattenOffset();
        const s = canvasScaleRef.current;
        const newX = liveX.current + gs.dx / s;
        const newY = liveY.current + gs.dy / s;
        liveX.current = newX;
        liveY.current = newY;
        pan.setValue({ x: 0, y: 0 });
        onUpdate({ x: newX, y: newY });

        if (!moved.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
    })
  ).current;

  const liveScale = useRef(sticker.scale);

  function startPinch(touches: { pageX: number; pageY: number }[]) {
    isPinching.current = true;
    const t0 = touches[0], t1 = touches[1];
    initDist.current = Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
    initAngle.current = Math.atan2(t1.pageY - t0.pageY, t1.pageX - t0.pageX) * (180 / Math.PI);
    initScale.current = liveScale.current;
    initRot.current = liveRot.current;
  }

  function handlePinchMove(touches: { pageX: number; pageY: number }[]) {
    const t0 = touches[0], t1 = touches[1];
    const dist = Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
    const angle = Math.atan2(t1.pageY - t0.pageY, t1.pageX - t0.pageX) * (180 / Math.PI);

    const newScale = Math.max(0.3, Math.min(3, initScale.current * (dist / initDist.current)));
    const rawRot = initRot.current + (angle - initAngle.current);
    const snappedRot = Math.round(rawRot / ROTATION_SNAP) * ROTATION_SNAP;

    if (snappedRot !== lastSnappedRot.current) {
      lastSnappedRot.current = snappedRot;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    liveScale.current = newScale;
    liveRot.current = snappedRot;
    rotAnim.setValue(snappedRot);
    onUpdate({ scale: newScale, rotation: snappedRot });
  }

  const handleCornerDrag = useCallback((dx: number, dy: number, done: boolean) => {
    const diagonal = (dx + dy) * 0.008 / canvasScaleRef.current;
    const newScale = Math.max(0.3, Math.min(3, dragScaleBase.current + diagonal));

    liveScale.current = newScale;
    onUpdate({ scale: newScale });

    if (done) {
      dragScaleBase.current = newScale;
    }
  }, [onUpdate, canvasScaleRef]);

  liveX.current = sticker.x;
  liveY.current = sticker.y;
  liveScale.current = sticker.scale;
  if (Math.abs(liveRot.current - sticker.rotation) > 0.01) {
    liveRot.current = sticker.rotation;
    rotAnim.setValue(sticker.rotation);
  }
  dragScaleBase.current = sticker.scale;

  const zoom = canvasZoom;
  const panX = canvasPan.x;
  const panY = canvasPan.y;
  const size = STICKER_SIZE * sticker.scale * zoom;
  const half = size / 2;
  const baseLeft = (sticker.x - panX) * zoom - half;
  const baseTop = (sticker.y - panY) * zoom - half;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        left: baseLeft,
        top: baseTop,
        width: size,
        height: size,
        zIndex: sticker.zIndex,
        transform: [
          { translateX: Animated.multiply(pan.x, zoom) },
          { translateY: Animated.multiply(pan.y, zoom) },
          {
            rotate: rotAnim.interpolate({
              inputRange: [-360, 0, 360],
              outputRange: ['-360deg', '0deg', '360deg'],
              extrapolate: 'extend',
            }),
          },
        ],
      }}
    >
      <View
        style={[
          styles.stickerWrap,
          isSelected && styles.stickerSelected,
        ]}
      >
        <Image
          source={{ uri: sticker.item.stickerPngUri }}
          style={styles.stickerImg}
          contentFit="contain"
          allowDownscaling={false}
          recyclingKey={`canvas-${sticker.closetItemId}`}
        />
      </View>

      {isSelected && (
        <>
          <ResizeHandle corner="tl" onDrag={handleCornerDrag} />
          <ResizeHandle corner="tr" onDrag={handleCornerDrag} />
          <ResizeHandle corner="bl" onDrag={handleCornerDrag} />
          <ResizeHandle corner="br" onDrag={handleCornerDrag} />
        </>
      )}
    </Animated.View>
  );
}

/* ─── Main Screen ────────────────────────────────────── */

export default function OutfitBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ closetItemId?: string }>();
  const {
    closetItems,
    addComposedOutfit,
    preferences,
    themeColors,
    avatarProfile,
    renderDigitalTryOn,
  } = useApp();

  const [stickers, setStickers] = useState<CanvasSticker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [outfitName, setOutfitName] = useState('');
  const [showName, setShowName] = useState(false);
  const [aiReview, setAiReview] = useState<OutfitAIReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const preloadedItemRef = useRef<string | null>(null);
  const canvasRef = useRef<View>(null);
  const [canvasLayout, setCanvasLayout] = useState({ y: 0, h: 0 });

  /* Canvas pan/zoom — state so stickers re-render at correct screen size (no scale transform = no blur) */
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [canvasZoom, setCanvasZoom] = useState(1);
  const cvPanXRef = useRef(0);
  const cvPanYRef = useRef(0);
  const cvScaleRef = useRef(1);
  const cvInitDist = useRef(0);
  const cvInitScale = useRef(1);
  const cvPinching = useRef(false);
  const cvMoved = useRef(false);

  const setCanvasPanRef = useRef(setCanvasPan);
  const setCanvasZoomRef = useRef(setCanvasZoom);
  setCanvasPanRef.current = setCanvasPan;
  setCanvasZoomRef.current = setCanvasZoom;

  const canvasPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,

      onPanResponderGrant: (evt) => {
        cvMoved.current = false;
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          cvPinching.current = true;
          const t0 = touches[0], t1 = touches[1];
          cvInitDist.current = Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
          cvInitScale.current = cvScaleRef.current;
        } else {
          cvPinching.current = false;
        }
      },

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length >= 2) {
          if (!cvPinching.current) {
            cvPinching.current = true;
            const t0 = touches[0], t1 = touches[1];
            cvInitDist.current = Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
            cvInitScale.current = cvScaleRef.current;
          }
          const t0 = touches[0], t1 = touches[1];
          const dist = Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
          const newScale = Math.max(0.5, Math.min(3, cvInitScale.current * (dist / cvInitDist.current)));
          cvScaleRef.current = newScale;
          setCanvasZoomRef.current(newScale);
          return;
        }

        if (cvPinching.current) return;

        cvMoved.current = true;
        setCanvasPanRef.current({
          x: cvPanXRef.current + gs.dx,
          y: cvPanYRef.current + gs.dy,
        });
      },

      onPanResponderRelease: (_, gs) => {
        if (cvPinching.current) {
          cvPinching.current = false;
          return;
        }

        if (cvMoved.current) {
          cvPanXRef.current += gs.dx;
          cvPanYRef.current += gs.dy;
          setCanvasPanRef.current({ x: cvPanXRef.current, y: cvPanYRef.current });
        } else {
          setSelectedId(null);
        }
      },
    })
  ).current;

  const resetCanvasView = useCallback(() => {
    cvPanXRef.current = 0;
    cvPanYRef.current = 0;
    cvScaleRef.current = 1;
    setCanvasPan({ x: 0, y: 0 });
    setCanvasZoom(1);
  }, []);

  const stickerItems = useMemo(
    () => closetItems.filter(i => i.stickerPngUri && i.processingStatus !== 'queued' && i.processingStatus !== 'processing'),
    [closetItems]
  );

  useEffect(() => {
    const initialItemId = params.closetItemId ? String(params.closetItemId) : '';
    if (!initialItemId || preloadedItemRef.current === initialItemId) return;
    const item = stickerItems.find((candidate) => candidate.id === initialItemId);
    if (!item) return;
    addSticker(item);
    preloadedItemRef.current = initialItemId;
  }, [addSticker, params.closetItemId, stickerItems]);

  const sorted = useMemo(
    () => [...stickers].sort((a, b) => a.zIndex - b.zIndex),
    [stickers]
  );

  /* ── Actions ── */

  const addSticker = useCallback(
    (item: ClosetItem) => {
      if (stickers.some(s => s.closetItemId === item.id)) {
        setSelectedId(item.id);
        bringToFront(item.id);
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const maxZ = stickers.length > 0 ? Math.max(...stickers.map(s => s.zIndex)) : 0;
      const centerX = SCREEN_W / 2;
      const yPos = getInitialY(item.category, canvasLayout.h || SCREEN_H * 0.55);

      const s: CanvasSticker = {
        closetItemId: item.id,
        item,
        x: centerX,
        y: yPos,
        rotation: 0,
        scale: 1,
        zIndex: maxZ + 1,
      };

      setStickers(prev => [...prev, s]);
      setSelectedId(item.id);
    },
    [stickers, canvasLayout.h]
  );

  const bringToFront = useCallback((id: string) => {
    setStickers(prev => {
      const maxZ = Math.max(...prev.map(s => s.zIndex));
      return prev.map(s => (s.closetItemId === id ? { ...s, zIndex: maxZ + 1 } : s));
    });
  }, []);

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStickers(prev => prev.filter(s => s.closetItemId !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const updateSticker = useCallback(
    (id: string, updates: Partial<StickerPlacement>) => {
      setStickers(prev =>
        prev.map(s => (s.closetItemId === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  /* ── Save ── */

  const handleSave = useCallback(() => {
    if (stickers.length === 0) {
      Alert.alert('Empty Outfit', 'Add at least one item to save.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!showName) {
      setShowName(true);
      return;
    }

    const outfit = {
      id: `outfit_${Date.now()}`,
      name: outfitName || 'Untitled Outfit',
      stickers: stickers.map(s => ({
        closetItemId: s.closetItemId,
        x: s.x,
        y: s.y,
        rotation: s.rotation,
        scale: s.scale,
        zIndex: s.zIndex,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiReview: aiReview || undefined,
    };

    addComposedOutfit(outfit);
    Alert.alert('Outfit Saved', 'Your outfit has been saved!', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [stickers, outfitName, showName, aiReview, addComposedOutfit, router]);

  /* ── AI Review ── */

  const handleReview = useCallback(async () => {
    if (stickers.length < 2) {
      Alert.alert('Add More Items', 'Add at least 2 items to get an AI review.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReviewing(true);
    setShowReview(true);

    try {
      const items = stickers.map(s => ({
        category: s.item.category,
        color: s.item.color,
        tags: s.item.styleTags,
      }));
      const styleProfile = await getUserStyleProfile();
      const personalizationContext = buildPersonalizationContext(styleProfile);

      const prompt = `Analyze this outfit composition and provide detailed fashion feedback.

User preferences:
- Gender: ${preferences.gender || 'Not specified'}
- Vibes: ${preferences.vibes.join(', ') || 'Not specified'}
- Occasions: ${preferences.occasions.join(', ') || 'Not specified'}

PERSONALIZATION CONTEXT:
${personalizationContext}

Outfit items:
${items.map((it, i) => `${i + 1}. ${it.category} - ${it.color}${it.tags.length > 0 ? ` (${it.tags.join(', ')})` : ''}`).join('\n')}

Provide:
1. Overall score (1-10)
2. Brief summary
3. What works well (2-3 points)
4. Improvements (2-3 specific suggestions)
5. Missing pieces
6. Swap suggestions
7. Style direction
8. Best and worst occasions

Prioritize suggestions that align with the personalization context when it is strong.`;

      const result = await generateObject({
        messages: [{ role: 'user', content: prompt }],
        schema: AIReviewSchema,
      });

      setAiReview({ ...result, analyzedAt: new Date().toISOString() });
    } catch {
      Alert.alert('Review Failed', 'Could not analyze outfit. Try again.');
      setShowReview(false);
    } finally {
      setReviewing(false);
    }
  }, [stickers, preferences]);

  const handleTryOnTwin = useCallback(async () => {
    if (stickers.length < 2) return;
    if (!avatarProfile || avatarProfile.status !== 'ready') {
      router.push('/ai-twin/setup' as any);
      return;
    }
    try {
      await renderDigitalTryOn({
        source: 'outfit_builder',
        closetItemIds: stickers.map((sticker) => sticker.closetItemId),
      });
      router.push('/ai-twin/status' as any);
    } catch {
      Alert.alert('Try-on failed', 'Could not start your try-on preview. Please retry.');
    }
  }, [avatarProfile, renderDigitalTryOn, router, stickers]);

  /* ── Render ── */

  const drawerH = drawerOpen ? DRAWER_EXPANDED : DRAWER_COLLAPSED;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.hdrBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={palette.ink} />
          </TouchableOpacity>

          <Text style={styles.hdrTitle}>Outfit Builder</Text>

          <View style={styles.hdrActions}>
            <TouchableOpacity
              style={[styles.hdrBtn, { backgroundColor: palette.info }]}
              onPress={handleTryOnTwin}
              disabled={stickers.length < 2}
            >
              <UserRound size={17} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.hdrBtn, { backgroundColor: palette.secondary }]}
              onPress={handleReview}
              disabled={stickers.length < 2}
            >
              <Sparkles size={17} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.hdrBtn, { backgroundColor: palette.accent }]}
              onPress={handleSave}
            >
              <Save size={17} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Name input */}
        {showName && (
          <View style={styles.nameRow}>
            <TextInput
              style={styles.nameInput}
              placeholder="Name this outfit…"
              placeholderTextColor={palette.inkMuted}
              value={outfitName}
              onChangeText={setOutfitName}
              autoFocus
              onSubmitEditing={handleSave}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={() => setShowName(false)}>
              <X size={18} color={palette.inkMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Canvas */}
        <View
          ref={canvasRef}
          style={styles.canvas}
          onLayout={e => {
            const { y, height } = e.nativeEvent.layout;
            setCanvasLayout({ y, h: height });
          }}
        >
          {/* Background touch layer for canvas pan/zoom */}
          <View
            {...canvasPanResponder.panHandlers}
            style={styles.canvasTouchLayer}
          />

          {/* Stickers in screen space — position/size from pan+zoom so we never scale the image = no blur */}
          <View style={styles.canvasInner} pointerEvents="box-none">
            {sorted.map(s => (
              <DraggableSticker
                key={s.closetItemId}
                sticker={s}
                isSelected={selectedId === s.closetItemId}
                onSelect={() => {
                  setSelectedId(s.closetItemId);
                  bringToFront(s.closetItemId);
                }}
                onUpdate={u => updateSticker(s.closetItemId, u)}
                canvasScaleRef={cvScaleRef}
                canvasPan={canvasPan}
                canvasZoom={canvasZoom}
              />
            ))}
          </View>

          {/* Empty state */}
          {stickers.length === 0 && (
            <View style={styles.emptyCanvas} pointerEvents="none">
              <View style={styles.emptyCircle}>
                <Plus size={32} color={palette.inkFaint} />
              </View>
              <Text style={styles.emptyText}>
                Tap items below to start building
              </Text>
              <Text style={styles.emptyHint}>
                Drag, pinch & zoom the canvas freely
              </Text>
            </View>
          )}

          {/* Reset zoom */}
          {canvasZoom !== 1 && (
            <TouchableOpacity
              style={styles.resetZoomBtn}
              onPress={resetCanvasView}
              activeOpacity={0.8}
            >
              <Text style={styles.resetZoomText}>Reset</Text>
            </TouchableOpacity>
          )}

          {/* Floating delete */}
          {selectedId && (
            <TouchableOpacity
              style={styles.floatingDelete}
              onPress={removeSelected}
              activeOpacity={0.8}
            >
              <Trash2 size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* AI Review overlay */}
        {showReview && (reviewing || aiReview) && (
          <View style={styles.reviewOverlay}>
            {reviewing ? (
              <View style={styles.reviewLoading}>
                <ActivityIndicator size="large" color={palette.accent} />
                <Text style={styles.reviewLoadingText}>Analyzing outfit…</Text>
              </View>
            ) : aiReview ? (
              <ScrollView
                style={styles.reviewScroll}
                contentContainerStyle={styles.reviewScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.reviewHead}>
                  <Text style={styles.reviewTitle}>AI Review</Text>
                  <TouchableOpacity onPress={() => setShowReview(false)}>
                    <X size={20} color={palette.inkMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.scoreCard}>
                  <Text style={styles.scoreNum}>{aiReview.overallScore}/10</Text>
                  <Text style={styles.scoreSummary}>{aiReview.summary}</Text>
                </View>

                {aiReview.whatWorks.length > 0 && (
                  <View style={styles.reviewSec}>
                    <Text style={[styles.secLabel, { color: palette.success }]}>What works</Text>
                    {aiReview.whatWorks.map((p, i) => (
                      <Text key={i} style={styles.bullet}>• {p}</Text>
                    ))}
                  </View>
                )}

                {aiReview.improvements.length > 0 && (
                  <View style={styles.reviewSec}>
                    <Text style={[styles.secLabel, { color: palette.warning }]}>Improvements</Text>
                    {aiReview.improvements.map((p, i) => (
                      <Text key={i} style={styles.bullet}>• {p}</Text>
                    ))}
                  </View>
                )}

                {aiReview.styleDirection.length > 0 && (
                  <View style={styles.reviewSec}>
                    <Text style={[styles.secLabel, { color: palette.secondary }]}>Style tips</Text>
                    {aiReview.styleDirection.map((p, i) => (
                      <Text key={i} style={styles.bullet}>• {p}</Text>
                    ))}
                  </View>
                )}

                {aiReview.occasionFit.bestOccasions.length > 0 && (
                  <View style={styles.reviewSec}>
                    <Text style={styles.secLabel}>Best for</Text>
                    <Text style={styles.occasionList}>
                      {aiReview.occasionFit.bestOccasions.join(' · ')}
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        )}

        {/* Drawer */}
        <View style={[styles.drawer, { height: drawerH }]}>
          <TouchableOpacity
            style={styles.drawerHandle}
            onPress={() => setDrawerOpen(p => !p)}
            activeOpacity={0.7}
          >
            <View style={styles.handleBar} />
            <Text style={styles.drawerLabel}>
              Closet · {stickerItems.length} items
            </Text>
          </TouchableOpacity>

          {drawerOpen && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.drawerList}
              keyboardShouldPersistTaps="always"
            >
              {stickerItems.map(item => {
                const onCanvas = stickers.some(s => s.closetItemId === item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.drawerItem,
                      onCanvas && styles.drawerItemActive,
                    ]}
                    onPress={() => addSticker(item)}
                    activeOpacity={0.75}
                  >
                    <Image
                      source={{ uri: item.stickerPngUri }}
                      style={styles.drawerThumb}
                      contentFit="contain"
                    />
                    {onCanvas && <View style={styles.drawerCheck} />}
                  </TouchableOpacity>
                );
              })}

              {stickerItems.length === 0 && (
                <View style={styles.drawerEmpty}>
                  <Text style={styles.drawerEmptyText}>
                    No stickers yet — add items to your closet first
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.warmWhite },
  safe: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screen,
    paddingVertical: 10,
  },
  hdrBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.warmWhiteDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hdrTitle: { fontSize: 18, fontWeight: '700', color: palette.ink },
  hdrActions: { flexDirection: 'row', gap: 8 },

  /* Name */
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.screen,
    marginBottom: 8,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    ...shadow.soft,
  },
  nameInput: { flex: 1, fontSize: 15, color: palette.ink, paddingVertical: 2 },

  /* Canvas */
  canvas: {
    flex: 1,
    backgroundColor: palette.warmWhite,
    position: 'relative',
    overflow: 'hidden',
  },
  canvasTouchLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  canvasInner: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.warmWhiteDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: palette.inkMuted },
  emptyHint: { fontSize: 13, color: palette.inkFaint },

  /* Sticker */
  stickerWrap: {
    width: '100%',
    height: '100%',
  },
  stickerSelected: {
    borderWidth: 1.5,
    borderColor: palette.accent,
    borderRadius: 6,
    borderStyle: 'dashed',
  },
  stickerImg: { width: '100%', height: '100%' },

  /* Resize handles */
  resizeHandle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: palette.white,
    borderWidth: 2,
    borderColor: palette.accent,
    zIndex: 999,
  },

  /* Reset zoom */
  resetZoomBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: palette.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    ...shadow.soft,
  },
  resetZoomText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.inkMuted,
  },

  /* Floating delete */
  floatingDelete: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    left: SCREEN_W / 2 - space.screen - 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },

  /* Review overlay */
  reviewOverlay: {
    position: 'absolute',
    top: 100,
    left: space.screen,
    right: space.screen,
    maxHeight: SCREEN_H * 0.5,
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    ...shadow.card,
    overflow: 'hidden',
  },
  reviewLoading: {
    padding: 32,
    alignItems: 'center',
    gap: 14,
  },
  reviewLoadingText: { fontSize: 15, fontWeight: '500', color: palette.inkMuted },
  reviewScroll: { maxHeight: SCREEN_H * 0.5 },
  reviewScrollContent: { padding: 20 },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewTitle: { fontSize: 20, fontWeight: '700', color: palette.ink },
  scoreCard: {
    backgroundColor: palette.accentLight,
    borderRadius: radius.md,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
  },
  scoreNum: { fontSize: 30, fontWeight: '700', color: palette.accent, marginBottom: 6 },
  scoreSummary: { fontSize: 14, color: palette.ink, textAlign: 'center', lineHeight: 21 },
  reviewSec: { marginBottom: 16 },
  secLabel: { fontSize: 15, fontWeight: '600', color: palette.ink, marginBottom: 6 },
  bullet: { fontSize: 14, color: palette.inkLight, lineHeight: 21, marginBottom: 3 },
  occasionList: { fontSize: 14, color: palette.inkMuted, lineHeight: 21 },

  /* Drawer */
  drawer: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  drawerHandle: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
    marginBottom: 6,
  },
  drawerLabel: { fontSize: 13, fontWeight: '600', color: palette.inkMuted },
  drawerList: {
    paddingHorizontal: space.screen,
    paddingBottom: 18,
    gap: 12,
  },
  drawerItem: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: palette.warmWhiteDark,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemActive: {
    borderWidth: 2,
    borderColor: palette.accent,
  },
  drawerThumb: { width: '100%', height: '100%' },
  drawerCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.accent,
  },
  drawerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  drawerEmptyText: { fontSize: 13, color: palette.inkMuted, textAlign: 'center' },
});
