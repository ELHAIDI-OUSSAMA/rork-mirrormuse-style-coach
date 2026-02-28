import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserPreferences,
  LookAnalysis,
  StyleVibe,
  Occasion,
  ModestyLevel,
  BudgetLevel,
  TonePreference,
  Gender,
  ClosetItem,
  ClosetItemPosition,
  PlannedOutfit,
  WeatherSnapshot,
  NotificationSettings,
  CreatorSettings,
  ClosetInsights,
  RecreatedOutfit,
  ComposedOutfit,
  SavedPinterestPin,
  SavedInspiration,
  InspirationItem,
  GamificationState,
  WardrobeCoverageMap,
  InspirationCard,
  SwipeAction,
  SwipeEvent,
  InspirationCalibration,
  InspirationPersistentState,
  DEFAULT_INSPIRE_CALIBRATION,
  DEFAULT_INSPIRE_STATE,
} from '@/types';
import { getColorsForGender, ColorTheme } from '@/constants/colors';
import { setQueueUpdater, resumePendingItems } from '@/lib/processingQueue';
import {
  BADGE_DEFINITIONS,
  DEFAULT_GAMIFICATION_STATE,
  GAMIFICATION_STORAGE_KEY,
  buildWardrobeCoverageMap,
  normalizeGamificationState,
  onClosetItemsAdded as awardClosetItemsAdded,
  onOutfitCheckCompleted as awardOutfitCheckCompleted,
  onOutfitSaved as awardOutfitSaved,
} from '@/utils/gamification';

const PREFERENCES_KEY = 'mirrormuse_preferences';
const LOOKS_KEY = 'mirrormuse_looks';
const USER_KEY = 'mirrormuse_user';
const CLOSET_KEY = 'mirrormuse_closet';
const SAVED_INSPIRATION_KEY = 'mirrormuse_inspiration';
const PLANNED_OUTFITS_KEY = 'mirrormuse_planned_outfits';
const NOTIFICATION_SETTINGS_KEY = 'mirrormuse_notifications';
const CREATOR_SETTINGS_KEY = 'mirrormuse_creator';
const RECREATED_OUTFITS_KEY = 'mirrormuse_recreated';
const COMPOSED_OUTFITS_KEY = 'mirrormuse_composed_outfits';
const SAVED_PINS_KEY = 'mirrormuse_saved_pins';
const SAVED_INSPO_V2_KEY = 'mirrormuse_saved_inspo_v2';
const INSPIRE_STATE_KEY = 'mirrormuse_inspire_state_v1';
const INSPIRE_SWIPES_KEY = 'mirrormuse_inspire_swipes_v1';

const defaultPreferences: UserPreferences = {
  gender: undefined,
  vibes: [],
  occasions: [],
  modestyLevel: 'Medium',
  budgetLevel: '$$',
  tone: 'Gentle',
  onboardingComplete: false,
};

const defaultNotificationSettings: NotificationSettings = {
  dailySuggestionEnabled: true,
  weatherAlertsEnabled: true,
  closetAlertsEnabled: true,
  inspirationAlertsEnabled: true,
};

const defaultCreatorSettings: CreatorSettings = {
  enabled: false,
};

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [savedLooks, setSavedLooks] = useState<LookAnalysis[]>([]);
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [savedInspirations, setSavedInspirations] = useState<string[]>([]);
  const [plannedOutfits, setPlannedOutfits] = useState<PlannedOutfit[]>([]);
  const [recreatedOutfits, setRecreatedOutfits] = useState<RecreatedOutfit[]>([]);
  const [composedOutfits, setComposedOutfits] = useState<ComposedOutfit[]>([]);
  const [savedPins, setSavedPins] = useState<SavedPinterestPin[]>([]);
  const [savedInspirationItems, setSavedInspirationItems] = useState<SavedInspiration[]>([]);
  const [inspirationGender, setInspirationGender] = useState<'men' | 'women'>(DEFAULT_INSPIRE_STATE.gender);
  const [inspirationQueue, setInspirationQueue] = useState<InspirationCard[]>([]);
  const [inspirationSwipes, setInspirationSwipes] = useState<SwipeEvent[]>([]);
  const [inspirationLikes, setInspirationLikes] = useState<string[]>([]);
  const [inspirationSaves, setInspirationSaves] = useState<string[]>([]);
  const [inspirationCalibration, setInspirationCalibration] = useState<InspirationCalibration>(DEFAULT_INSPIRE_CALIBRATION);
  const [inspirationTagWeights, setInspirationTagWeights] = useState<Record<string, number>>({});
  const [inspirationLastFetchTs, setInspirationLastFetchTs] = useState<string | null>(null);
  const [isInspireHydrated, setIsInspireHydrated] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [creatorSettings, setCreatorSettings] = useState<CreatorSettings>(defaultCreatorSettings);
  const [currentWeather, setCurrentWeather] = useState<WeatherSnapshot | null>(null);
  const [gamificationState, setGamificationState] = useState<GamificationState>(DEFAULT_GAMIFICATION_STATE);
  const [isGuest, setIsGuest] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const persistGamification = useCallback(async (nextState: GamificationState) => {
    try {
      await AsyncStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
      console.log('[Gamification] Failed to persist state:', error);
    }
  }, []);

  const trimTagWeights = useCallback((weights: Record<string, number>) => {
    return Object.entries(weights)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 20)
      .reduce<Record<string, number>>((acc, [key, value]) => {
        acc[key] = Math.round(value * 100) / 100;
        return acc;
      }, {});
  }, []);

  const persistInspireState = useCallback(async (state: InspirationPersistentState) => {
    try {
      await AsyncStorage.setItem(INSPIRE_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.log('[Inspire] Failed to persist state:', error);
    }
  }, []);

  const persistInspireSwipes = useCallback(async (swipes: SwipeEvent[]) => {
    try {
      await AsyncStorage.setItem(INSPIRE_SWIPES_KEY, JSON.stringify(swipes.slice(0, 200)));
    } catch (error) {
      console.log('[Inspire] Failed to persist swipes:', error);
    }
  }, []);

  const preferencesQuery = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      return stored ? JSON.parse(stored) : defaultPreferences;
    },
  });

  const looksQuery = useQuery({
    queryKey: ['savedLooks'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(LOOKS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const closetQuery = useQuery({
    queryKey: ['closet'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(CLOSET_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const inspirationQuery = useQuery({
    queryKey: ['savedInspirations'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SAVED_INSPIRATION_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const plannedOutfitsQuery = useQuery({
    queryKey: ['plannedOutfits'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(PLANNED_OUTFITS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const notificationSettingsQuery = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      return stored ? JSON.parse(stored) : defaultNotificationSettings;
    },
  });

  const creatorSettingsQuery = useQuery({
    queryKey: ['creatorSettings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(CREATOR_SETTINGS_KEY);
      return stored ? JSON.parse(stored) : defaultCreatorSettings;
    },
  });

  const recreatedOutfitsQuery = useQuery({
    queryKey: ['recreatedOutfits'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(RECREATED_OUTFITS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const composedOutfitsQuery = useQuery({
    queryKey: ['composedOutfits'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(COMPOSED_OUTFITS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const userQuery = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(USER_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        return user;
      }
      return null;
    },
  });

  useEffect(() => {
    if (preferencesQuery.data) {
      setPreferences(preferencesQuery.data);
    }
  }, [preferencesQuery.data]);

  useEffect(() => {
    if (inspirationSwipes.length > 0 || inspirationLikes.length > 0 || inspirationSaves.length > 0) return;
    if (preferences.gender === 'male') setInspirationGender('men');
    if (preferences.gender === 'female') setInspirationGender('women');
  }, [preferences.gender, inspirationSwipes.length, inspirationLikes.length, inspirationSaves.length]);

  useEffect(() => {
    if (looksQuery.data) {
      setSavedLooks(looksQuery.data);
    }
  }, [looksQuery.data]);

  useEffect(() => {
    if (closetQuery.data) {
      setClosetItems(closetQuery.data);
      resumePendingItems(closetQuery.data);
    }
  }, [closetQuery.data]);

  useEffect(() => {
    if (inspirationQuery.data) {
      setSavedInspirations(inspirationQuery.data);
    }
  }, [inspirationQuery.data]);

  useEffect(() => {
    if (plannedOutfitsQuery.data) {
      setPlannedOutfits(plannedOutfitsQuery.data);
    }
  }, [plannedOutfitsQuery.data]);

  useEffect(() => {
    if (notificationSettingsQuery.data) {
      setNotificationSettings(notificationSettingsQuery.data);
    }
  }, [notificationSettingsQuery.data]);

  useEffect(() => {
    if (creatorSettingsQuery.data) {
      setCreatorSettings(creatorSettingsQuery.data);
    }
  }, [creatorSettingsQuery.data]);

  useEffect(() => {
    if (recreatedOutfitsQuery.data) {
      setRecreatedOutfits(recreatedOutfitsQuery.data);
    }
  }, [recreatedOutfitsQuery.data]);

  useEffect(() => {
    if (composedOutfitsQuery.data) {
      setComposedOutfits(composedOutfitsQuery.data);
    }
  }, [composedOutfitsQuery.data]);

  const savedPinsQuery = useQuery({
    queryKey: ['savedPins'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SAVED_PINS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  useEffect(() => {
    if (savedPinsQuery.data) {
      setSavedPins(savedPinsQuery.data);
    }
  }, [savedPinsQuery.data]);

  const savedInspoV2Query = useQuery({
    queryKey: ['savedInspoV2'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SAVED_INSPO_V2_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  useEffect(() => {
    if (savedInspoV2Query.data) {
      setSavedInspirationItems(savedInspoV2Query.data);
    }
  }, [savedInspoV2Query.data]);

  useEffect(() => {
    if (userQuery.data) {
      setUserId(userQuery.data.id);
      setIsGuest(userQuery.data.isGuest);
    }
  }, [userQuery.data]);

  useEffect(() => {
    let mounted = true;
    let pending = 2;
    const finish = () => {
      pending -= 1;
      if (mounted && pending <= 0) {
        setIsInspireHydrated(true);
      }
    };
    AsyncStorage.getItem(INSPIRE_STATE_KEY)
      .then((stored) => {
        if (!mounted || !stored) return;
        try {
          const parsed = JSON.parse(stored) as Partial<InspirationPersistentState>;
          setInspirationGender(parsed.gender === 'men' ? 'men' : parsed.gender === 'women' ? 'women' : DEFAULT_INSPIRE_STATE.gender);
          setInspirationLikes(Array.isArray(parsed.likes) ? parsed.likes.slice(0, 400) : []);
          setInspirationSaves(Array.isArray(parsed.saves) ? parsed.saves.slice(0, 400) : []);
          const tagWeights = (parsed.tagWeights && typeof parsed.tagWeights === 'object') ? parsed.tagWeights : {};
          setInspirationTagWeights(trimTagWeights(tagWeights));
          setInspirationCalibration({
            isCalibrated: !!parsed.isCalibrated,
            swipesToCalibrate: typeof parsed.swipesToCalibrate === 'number' ? parsed.swipesToCalibrate : 20,
            progress: typeof parsed.progress === 'number' ? parsed.progress : 0,
          });
          setInspirationLastFetchTs(typeof parsed.lastFetchTs === 'string' ? parsed.lastFetchTs : null);
        } catch (error) {
          console.log('[Inspire] Failed to parse persisted state:', error);
        }
      })
      .catch((error) => {
        console.log('[Inspire] Failed to load state:', error);
      })
      .finally(finish);

    AsyncStorage.getItem(INSPIRE_SWIPES_KEY)
      .then((stored) => {
        if (!mounted || !stored) return;
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setInspirationSwipes(parsed.slice(0, 200));
          }
        } catch (error) {
          console.log('[Inspire] Failed to parse swipes:', error);
        }
      })
      .catch((error) => {
        console.log('[Inspire] Failed to load swipes:', error);
      })
      .finally(finish);

    return () => {
      mounted = false;
    };
  }, [trimTagWeights]);

  useEffect(() => {
    if (!isInspireHydrated) return;
    const nextState: InspirationPersistentState = {
      gender: inspirationGender,
      likes: inspirationLikes.slice(0, 400),
      saves: inspirationSaves.slice(0, 400),
      tagWeights: trimTagWeights(inspirationTagWeights),
      isCalibrated: inspirationCalibration.isCalibrated,
      swipesToCalibrate: inspirationCalibration.swipesToCalibrate,
      progress: inspirationCalibration.progress,
      lastFetchTs: inspirationLastFetchTs,
    };
    persistInspireState(nextState);
  }, [
    inspirationCalibration.isCalibrated,
    inspirationCalibration.progress,
    inspirationCalibration.swipesToCalibrate,
    inspirationGender,
    inspirationLastFetchTs,
    inspirationLikes,
    inspirationSaves,
    inspirationTagWeights,
    isInspireHydrated,
    persistInspireState,
    trimTagWeights,
  ]);

  useEffect(() => {
    if (!isInspireHydrated) return;
    persistInspireSwipes(inspirationSwipes);
  }, [inspirationSwipes, isInspireHydrated, persistInspireSwipes]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(GAMIFICATION_STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;
        if (!stored) {
          setGamificationState(DEFAULT_GAMIFICATION_STATE);
          return;
        }
        try {
          const parsed = JSON.parse(stored);
          setGamificationState(normalizeGamificationState(parsed));
        } catch (error) {
          console.log('[Gamification] Failed to parse state:', error);
          setGamificationState(DEFAULT_GAMIFICATION_STATE);
        }
      })
      .catch((error) => {
        console.log('[Gamification] Failed to load state:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const savePreferencesMutation = useMutation({
    mutationFn: async (newPrefs: UserPreferences) => {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
      return newPrefs;
    },
    onSuccess: (data) => {
      setPreferences(data);
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });

  const saveLooksMutation = useMutation({
    mutationFn: async (looks: LookAnalysis[]) => {
      await AsyncStorage.setItem(LOOKS_KEY, JSON.stringify(looks));
      return looks;
    },
    onSuccess: (data) => {
      setSavedLooks(data);
      queryClient.invalidateQueries({ queryKey: ['savedLooks'] });
    },
  });

  const saveInspirationMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await AsyncStorage.setItem(SAVED_INSPIRATION_KEY, JSON.stringify(ids));
      return ids;
    },
    onSuccess: (data) => {
      setSavedInspirations(data);
      queryClient.invalidateQueries({ queryKey: ['savedInspirations'] });
    },
  });

  const savePlannedOutfitsMutation = useMutation({
    mutationFn: async (outfits: PlannedOutfit[]) => {
      await AsyncStorage.setItem(PLANNED_OUTFITS_KEY, JSON.stringify(outfits));
      return outfits;
    },
    onSuccess: (data) => {
      setPlannedOutfits(data);
      queryClient.invalidateQueries({ queryKey: ['plannedOutfits'] });
    },
  });

  const saveNotificationSettingsMutation = useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
      return settings;
    },
    onSuccess: (data) => {
      setNotificationSettings(data);
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
    },
  });

  const saveCreatorSettingsMutation = useMutation({
    mutationFn: async (settings: CreatorSettings) => {
      await AsyncStorage.setItem(CREATOR_SETTINGS_KEY, JSON.stringify(settings));
      return settings;
    },
    onSuccess: (data) => {
      setCreatorSettings(data);
      queryClient.invalidateQueries({ queryKey: ['creatorSettings'] });
    },
  });

  const saveRecreatedOutfitsMutation = useMutation({
    mutationFn: async (outfits: RecreatedOutfit[]) => {
      await AsyncStorage.setItem(RECREATED_OUTFITS_KEY, JSON.stringify(outfits));
      return outfits;
    },
    onSuccess: (data) => {
      setRecreatedOutfits(data);
      queryClient.invalidateQueries({ queryKey: ['recreatedOutfits'] });
    },
  });

  const saveComposedOutfitsMutation = useMutation({
    mutationFn: async (outfits: ComposedOutfit[]) => {
      await AsyncStorage.setItem(COMPOSED_OUTFITS_KEY, JSON.stringify(outfits));
      return outfits;
    },
    onSuccess: (data) => {
      setComposedOutfits(data);
      queryClient.invalidateQueries({ queryKey: ['composedOutfits'] });
    },
  });

  const saveUserMutation = useMutation({
    mutationFn: async (user: { id: string; isGuest: boolean; email?: string }) => {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    },
    onSuccess: (data) => {
      setUserId(data.id);
      setIsGuest(data.isGuest);
    },
  });

  const { mutate: mutatePreferences } = savePreferencesMutation;
  const { mutate: mutateLooks } = saveLooksMutation;
  const { mutate: mutateInspiration } = saveInspirationMutation;
  const { mutate: mutatePlannedOutfits } = savePlannedOutfitsMutation;
  const { mutate: mutateNotificationSettings } = saveNotificationSettingsMutation;
  const { mutate: mutateCreatorSettings } = saveCreatorSettingsMutation;
  const { mutate: mutateRecreatedOutfits } = saveRecreatedOutfitsMutation;
  const { mutate: mutateComposedOutfits } = saveComposedOutfitsMutation;

  const savePinsMutation = useMutation({
    mutationFn: async (pins: SavedPinterestPin[]) => {
      await AsyncStorage.setItem(SAVED_PINS_KEY, JSON.stringify(pins));
      return pins;
    },
    onSuccess: (data) => {
      setSavedPins(data);
      queryClient.invalidateQueries({ queryKey: ['savedPins'] });
    },
  });

  const { mutate: mutatePins } = savePinsMutation;

  const saveInspoV2Mutation = useMutation({
    mutationFn: async (items: SavedInspiration[]) => {
      await AsyncStorage.setItem(SAVED_INSPO_V2_KEY, JSON.stringify(items));
      return items;
    },
    onSuccess: (data) => {
      setSavedInspirationItems(data);
      queryClient.invalidateQueries({ queryKey: ['savedInspoV2'] });
    },
  });

  const { mutate: mutateInspoV2 } = saveInspoV2Mutation;
  const { mutate: mutateUser } = saveUserMutation;

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    const newPrefs = { ...preferences, ...updates };
    mutatePreferences(newPrefs);
  }, [preferences, mutatePreferences]);

  const setGender = useCallback((gender: Gender) => {
    updatePreferences({ gender });
  }, [updatePreferences]);

  const setVibes = useCallback((vibes: StyleVibe[]) => {
    updatePreferences({ vibes });
  }, [updatePreferences]);

  const setOccasions = useCallback((occasions: Occasion[]) => {
    updatePreferences({ occasions });
  }, [updatePreferences]);

  const setModestyLevel = useCallback((modestyLevel: ModestyLevel) => {
    updatePreferences({ modestyLevel });
  }, [updatePreferences]);

  const setBudgetLevel = useCallback((budgetLevel: BudgetLevel) => {
    updatePreferences({ budgetLevel });
  }, [updatePreferences]);

  const setTone = useCallback((tone: TonePreference) => {
    updatePreferences({ tone });
  }, [updatePreferences]);

  const completeOnboarding = useCallback(() => {
    updatePreferences({ onboardingComplete: true });
  }, [updatePreferences]);

  const onOutfitCheckCompleted = useCallback((score10: number, analysisId?: string) => {
    setGamificationState((prev) => {
      const result = awardOutfitCheckCompleted(prev, score10, analysisId);
      const next = normalizeGamificationState(result.next);
      persistGamification(next);
      if (result.leveledUp) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result.newBadges.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return next;
    });
  }, [persistGamification]);

  const onClosetItemsAdded = useCallback((count: number) => {
    if (count <= 0) return;
    setGamificationState((prev) => {
      const result = awardClosetItemsAdded(prev, count);
      const next = normalizeGamificationState(result.next);
      persistGamification(next);
      if (result.leveledUp) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return next;
    });
  }, [persistGamification]);

  const onOutfitSaved = useCallback(() => {
    setGamificationState((prev) => {
      const result = awardOutfitSaved(prev);
      const next = normalizeGamificationState(result.next);
      persistGamification(next);
      if (result.leveledUp) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return next;
    });
  }, [persistGamification]);

  const resetGamification = useCallback(() => {
    setGamificationState(DEFAULT_GAMIFICATION_STATE);
    persistGamification(DEFAULT_GAMIFICATION_STATE);
  }, [persistGamification]);

  const addLook = useCallback((look: LookAnalysis) => {
    const updated = [look, ...savedLooks];
    mutateLooks(updated);
  }, [savedLooks, mutateLooks]);

  const removeLook = useCallback((lookId: string) => {
    const updated = savedLooks.filter(l => l.id !== lookId);
    mutateLooks(updated);
  }, [savedLooks, mutateLooks]);

  const getLookById = useCallback((lookId: string) => {
    return savedLooks.find(l => l.id === lookId);
  }, [savedLooks]);

  const persistCloset = useCallback((items: ClosetItem[]) => {
    queryClient.setQueryData(['closet'], items);
    AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(items));
  }, [queryClient]);

  const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const isDuplicateClosetItem = useCallback((existing: ClosetItem, incoming: ClosetItem) => {
    if (existing.id === incoming.id) return true;

    const sameImage = normalizeText(existing.imageUri) !== '' &&
      normalizeText(existing.imageUri) === normalizeText(incoming.imageUri);

    const sameCategory = normalizeText(existing.category) === normalizeText(incoming.category);
    const sameColor = normalizeText(existing.color) === normalizeText(incoming.color);
    const sameSticker = existing.stickerPngUri &&
      incoming.stickerPngUri &&
      normalizeText(existing.stickerPngUri) === normalizeText(incoming.stickerPngUri);

    if (sameSticker) return true;
    if (sameImage && incoming.source === 'manual') return true;
    if (sameImage && sameCategory && sameColor) return true;
    return false;
  }, []);

  const addClosetItem = useCallback((item: ClosetItem) => {
    const itemWithUsage = { ...item, usageCount: item.usageCount ?? 0 };
    let result: { added: boolean; duplicate: boolean } = { added: false, duplicate: true };

    setClosetItems((prev) => {
      const duplicate = prev.some((existing) => isDuplicateClosetItem(existing, itemWithUsage));
      if (duplicate) {
        result = { added: false, duplicate: true };
        return prev;
      }

      const updated = [itemWithUsage, ...prev];
      result = { added: true, duplicate: false };
      persistCloset(updated);
      return updated;
    });

    if (result.added) {
      onClosetItemsAdded(1);
    }
    return result;
  }, [isDuplicateClosetItem, onClosetItemsAdded, persistCloset]);

  const addClosetItems = useCallback((items: ClosetItem[]) => {
    const itemsWithUsage = items.map(i => ({ ...i, usageCount: i.usageCount ?? 0 }));
    let added = 0;
    let skipped = 0;

    setClosetItems((prev) => {
      const next = [...prev];
      for (const item of itemsWithUsage) {
        const duplicate = next.some((existing) => isDuplicateClosetItem(existing, item));
        if (duplicate) {
          skipped += 1;
          continue;
        }
        next.unshift(item);
        added += 1;
      }
      if (added > 0) {
        persistCloset(next);
      }
      return next;
    });

    if (added > 0) onClosetItemsAdded(added);

    return { added, skipped };
  }, [isDuplicateClosetItem, onClosetItemsAdded, persistCloset]);

  const removeClosetItem = useCallback((itemId: string) => {
    setClosetItems(prev => {
      const updated = prev.filter(i => i.id !== itemId);
      persistCloset(updated);
      return updated;
    });
  }, [persistCloset]);

  const clearCloset = useCallback(() => {
    setClosetItems([]);
    persistCloset([]);
  }, [persistCloset]);

  const updateClosetItem = useCallback((itemId: string, updates: Partial<ClosetItem>) => {
    setClosetItems(prev => {
      const updated = prev.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      persistCloset(updated);
      return updated;
    });
  }, [persistCloset]);

  const updateClosetItemPosition = useCallback((itemId: string, position: ClosetItemPosition) => {
    setClosetItems(prev => {
      const updated = prev.map(item =>
        item.id === itemId ? { ...item, position } : item
      );
      persistCloset(updated);
      return updated;
    });
  }, [persistCloset]);

  const updateClosetItemUsage = useCallback((itemId: string) => {
    setClosetItems(prev => {
      const updated = prev.map(item =>
        item.id === itemId
          ? { ...item, usageCount: (item.usageCount || 0) + 1, lastUsedAt: new Date().toISOString() }
          : item
      );
      persistCloset(updated);
      return updated;
    });
  }, [persistCloset]);

  const getClosetItemsByCategory = useCallback((category: string) => {
    return closetItems.filter(i => i.category === category);
  }, [closetItems]);

  const getClosetItemById = useCallback((id: string) => {
    return closetItems.find(i => i.id === id);
  }, [closetItems]);

  const toggleSaveInspiration = useCallback((id: string) => {
    const updated = savedInspirations.includes(id)
      ? savedInspirations.filter(i => i !== id)
      : [...savedInspirations, id];
    mutateInspiration(updated);
  }, [savedInspirations, mutateInspiration]);

  const isInspirationSaved = useCallback((id: string) => {
    return savedInspirations.includes(id);
  }, [savedInspirations]);

  const savePinterestPin = useCallback((pinUrl: string, queryUsed: string) => {
    const exists = savedPins.some(p => p.pinUrl === pinUrl);
    if (exists) return;
    const pin: SavedPinterestPin = {
      id: `pin-${Date.now()}`,
      pinUrl,
      queryUsed,
      savedAt: new Date().toISOString(),
      source: 'pinterest',
    };
    mutatePins([pin, ...savedPins]);
  }, [savedPins, mutatePins]);

  const removePinterestPin = useCallback((id: string) => {
    mutatePins(savedPins.filter(p => p.id !== id));
  }, [savedPins, mutatePins]);

  const isPinSaved = useCallback((url: string) => {
    return savedPins.some(p => p.pinUrl === url);
  }, [savedPins]);

  const saveInspirationItem = useCallback((item: InspirationItem) => {
    const exists = savedInspirationItems.some(s => s.inspirationId === item.id);
    if (exists) return;
    const saved: SavedInspiration = {
      id: `inspo-${Date.now()}`,
      inspirationId: item.id,
      imageUrl: item.imageUrl,
      thumbnailUrl: item.thumbnailUrl,
      source: item.source,
      author: item.author,
      styleTags: item.styleTags,
      savedAt: new Date().toISOString(),
    };
    mutateInspoV2([saved, ...savedInspirationItems]);
  }, [savedInspirationItems, mutateInspoV2]);

  const removeInspirationItem = useCallback((id: string) => {
    mutateInspoV2(savedInspirationItems.filter(s => s.id !== id));
  }, [savedInspirationItems, mutateInspoV2]);

  const isInspirationItemSaved = useCallback((inspirationId: string) => {
    return savedInspirationItems.some(s => s.inspirationId === inspirationId);
  }, [savedInspirationItems]);

  const setInspirationGenderPreference = useCallback((gender: 'men' | 'women') => {
    setInspirationGender(gender);
    setInspirationQueue([]);
    setInspirationLastFetchTs(new Date().toISOString());
  }, []);

  const setInspirationFeedQueue = useCallback((cards: InspirationCard[]) => {
    setInspirationQueue(cards);
    setInspirationLastFetchTs(new Date().toISOString());
  }, []);

  const appendInspirationFeedQueue = useCallback((cards: InspirationCard[]) => {
    if (cards.length === 0) return;
    setInspirationQueue((prev) => {
      const seen = new Set(prev.map((item) => item.id));
      const merged = [...prev];
      for (const card of cards) {
        if (!seen.has(card.id)) {
          merged.push(card);
          seen.add(card.id);
        }
      }
      return merged;
    });
    setInspirationLastFetchTs(new Date().toISOString());
  }, []);

  const ensureInspirationSavedItem = useCallback((card: InspirationCard) => {
    const exists = savedInspirationItems.some((item) => item.inspirationId === card.id);
    if (exists) return;
    const entry: SavedInspiration = {
      id: `inspo-${Date.now()}-${card.id}`,
      inspirationId: card.id,
      imageUrl: card.imageUrl,
      thumbnailUrl: card.imageUrl,
      source: card.source,
      author: card.title || 'MirrorMuse',
      styleTags: card.tags || [],
      savedAt: new Date().toISOString(),
    };
    mutateInspoV2([entry, ...savedInspirationItems]);
  }, [mutateInspoV2, savedInspirationItems]);

  const toggleInspirationSaved = useCallback((card: InspirationCard) => {
    setInspirationSaves((prev) => {
      const exists = prev.includes(card.id);
      if (exists) {
        return prev.filter((id) => id !== card.id);
      }
      ensureInspirationSavedItem(card);
      return [...prev, card.id];
    });
  }, [ensureInspirationSavedItem]);

  const recordInspirationSwipe = useCallback((card: InspirationCard, action: SwipeAction) => {
    const now = new Date().toISOString();
    const event: SwipeEvent = {
      cardId: card.id,
      action,
      ts: now,
      gender: card.gender,
      tags: card.tags || [],
    };

    setInspirationSwipes((prev) => [event, ...prev].slice(0, 200));

    if (action === 'like') {
      setInspirationLikes((prev) => (prev.includes(card.id) ? prev : [card.id, ...prev].slice(0, 400)));
    }
    if (action === 'dislike') {
      setInspirationLikes((prev) => prev.filter((id) => id !== card.id));
    }
    if (action === 'save') {
      setInspirationSaves((prev) => (prev.includes(card.id) ? prev : [card.id, ...prev].slice(0, 400)));
      ensureInspirationSavedItem(card);
    }

    if (card.tags && card.tags.length > 0) {
      setInspirationTagWeights((prev) => {
        const next = { ...prev };
        const delta = action === 'like' ? 2 : action === 'dislike' ? -1 : action === 'save' ? 3 : 1;
        for (const tag of card.tags || []) {
          const key = tag.trim().toLowerCase();
          if (!key) continue;
          next[key] = (next[key] || 0) + delta;
        }
        return trimTagWeights(next);
      });
    }

    setInspirationCalibration((prev) => {
      const swipesToCalibrate = prev.swipesToCalibrate || 20;
      const progress = Math.min(swipesToCalibrate, prev.progress + 1);
      return {
        ...prev,
        progress,
        isCalibrated: prev.isCalibrated || progress >= swipesToCalibrate,
      };
    });
  }, [ensureInspirationSavedItem, trimTagWeights]);

  const isInspirationLiked = useCallback((id: string) => {
    return inspirationLikes.includes(id);
  }, [inspirationLikes]);

  const isInspirationCardSaved = useCallback((id: string) => {
    return inspirationSaves.includes(id) || savedInspirationItems.some((item) => item.inspirationId === id);
  }, [inspirationSaves, savedInspirationItems]);

  const resetInspirationProfile = useCallback(() => {
    setInspirationQueue([]);
    setInspirationSwipes([]);
    setInspirationLikes([]);
    setInspirationSaves([]);
    setInspirationTagWeights({});
    setInspirationCalibration(DEFAULT_INSPIRE_CALIBRATION);
    setInspirationLastFetchTs(null);
    AsyncStorage.multiRemove([INSPIRE_STATE_KEY, INSPIRE_SWIPES_KEY]).catch((error) => {
      console.log('[Inspire] Failed to reset profile:', error);
    });
  }, []);

  const getSavedStyleTagFrequency = useCallback(() => {
    const freq: Record<string, number> = {};
    for (const item of savedInspirationItems) {
      for (const tag of item.styleTags) {
        freq[tag] = (freq[tag] || 0) + 1;
      }
    }
    return freq;
  }, [savedInspirationItems]);

  const addPlannedOutfit = useCallback((outfit: PlannedOutfit) => {
    const updated = [outfit, ...plannedOutfits];
    mutatePlannedOutfits(updated);
    outfit.items.forEach(item => {
      updateClosetItemUsage(item.closetItemId);
    });
  }, [plannedOutfits, mutatePlannedOutfits, updateClosetItemUsage]);

  const removePlannedOutfit = useCallback((outfitId: string) => {
    const updated = plannedOutfits.filter(o => o.id !== outfitId);
    mutatePlannedOutfits(updated);
  }, [plannedOutfits, mutatePlannedOutfits]);

  const getPlannedOutfitsByDate = useCallback((date: string) => {
    return plannedOutfits.filter(o => o.date === date);
  }, [plannedOutfits]);

  const updateNotificationSetting = useCallback((key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...notificationSettings, [key]: value };
    mutateNotificationSettings(updated);
  }, [notificationSettings, mutateNotificationSettings]);

  const toggleCreatorMode = useCallback((enabled: boolean) => {
    mutateCreatorSettings({ ...creatorSettings, enabled });
  }, [creatorSettings, mutateCreatorSettings]);

  const addRecreatedOutfit = useCallback((outfit: RecreatedOutfit) => {
    const updated = [outfit, ...recreatedOutfits];
    mutateRecreatedOutfits(updated);
  }, [recreatedOutfits, mutateRecreatedOutfits]);

  const addComposedOutfit = useCallback((outfit: ComposedOutfit) => {
    const updated = [outfit, ...composedOutfits];
    mutateComposedOutfits(updated);
    outfit.stickers.forEach(sticker => {
      updateClosetItemUsage(sticker.closetItemId);
    });
    onOutfitSaved();
  }, [composedOutfits, mutateComposedOutfits, onOutfitSaved, updateClosetItemUsage]);

  const updateComposedOutfit = useCallback((outfitId: string, updates: Partial<ComposedOutfit>) => {
    const updated = composedOutfits.map(outfit => 
      outfit.id === outfitId ? { ...outfit, ...updates, updatedAt: new Date().toISOString() } : outfit
    );
    mutateComposedOutfits(updated);
  }, [composedOutfits, mutateComposedOutfits]);

  const removeComposedOutfit = useCallback((outfitId: string) => {
    const updated = composedOutfits.filter(o => o.id !== outfitId);
    mutateComposedOutfits(updated);
  }, [composedOutfits, mutateComposedOutfits]);

  const getComposedOutfitById = useCallback((outfitId: string) => {
    return composedOutfits.find(o => o.id === outfitId);
  }, [composedOutfits]);

  const closetInsights = useMemo<ClosetInsights>(() => {
    if (closetItems.length === 0) {
      return {
        totalItems: 0,
        categoryCounts: {},
      };
    }

    const sortedByUsage = [...closetItems].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    const mostWornItem = sortedByUsage[0];
    
    const itemsWithUsage = closetItems.filter(i => (i.usageCount || 0) > 0);
    const leastUsedItem = itemsWithUsage.length > 1 
      ? sortedByUsage[sortedByUsage.length - 1]
      : closetItems.find(i => (i.usageCount || 0) === 0);

    const today = new Date().toDateString();
    const notUsedToday = closetItems.filter(i => {
      if (!i.lastUsedAt) return true;
      return new Date(i.lastUsedAt).toDateString() !== today;
    });
    const recommendedItemToday = notUsedToday[Math.floor(Math.random() * notUsedToday.length)];

    const categoryCounts: Record<string, number> = {};
    closetItems.forEach(item => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });

    return {
      mostWornItem,
      leastUsedItem,
      recommendedItemToday,
      totalItems: closetItems.length,
      categoryCounts,
    };
  }, [closetItems]);

  const wardrobeCoverageMap = useMemo<WardrobeCoverageMap>(() => {
    return buildWardrobeCoverageMap(closetItems);
  }, [closetItems]);

  useEffect(() => {
    setGamificationState((prev) => {
      const hasExplorer = prev.badges.includes('diversity_starter');
      const hasTops100 = prev.badges.includes('closet_top_100');
      const hasAll60 = prev.badges.includes('closet_all_60');
      const hasAll100 = prev.badges.includes('closet_all_100');

      const topsCoverage = wardrobeCoverageMap.categories.find((c) => c.key === 'tops')?.coveragePct ?? 0;
      const allCoverage = wardrobeCoverageMap.overallCoveragePct;

      const nextBadges = [...prev.badges];
      if (!hasExplorer && closetItems.length >= 10) nextBadges.push('diversity_starter');
      if (!hasTops100 && topsCoverage >= 1) nextBadges.push('closet_top_100');
      if (!hasAll60 && allCoverage >= 0.6) nextBadges.push('closet_all_60');
      if (!hasAll100 && allCoverage >= 1) nextBadges.push('closet_all_100');

      if (nextBadges.length === prev.badges.length) return prev;
      const next = { ...prev, badges: nextBadges };
      persistGamification(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return next;
    });
  }, [closetItems.length, persistGamification, wardrobeCoverageMap]);

  const initializeUser = useCallback((email?: string) => {
    const id = `user_${Date.now()}`;
    mutateUser({
      id,
      isGuest: !email,
      email,
    });
  }, [mutateUser]);

  const clearAllData = useCallback(async () => {
    await AsyncStorage.multiRemove([
      PREFERENCES_KEY, 
      LOOKS_KEY, 
      USER_KEY, 
      CLOSET_KEY, 
      SAVED_INSPIRATION_KEY,
      PLANNED_OUTFITS_KEY,
      NOTIFICATION_SETTINGS_KEY,
      CREATOR_SETTINGS_KEY,
      RECREATED_OUTFITS_KEY,
      COMPOSED_OUTFITS_KEY,
      SAVED_PINS_KEY,
      SAVED_INSPO_V2_KEY,
      GAMIFICATION_STORAGE_KEY,
      INSPIRE_STATE_KEY,
      INSPIRE_SWIPES_KEY,
    ]);
    setPreferences(defaultPreferences);
    setSavedLooks([]);
    setClosetItems([]);
    setSavedInspirations([]);
    setSavedPins([]);
    setSavedInspirationItems([]);
    setInspirationGender(DEFAULT_INSPIRE_STATE.gender);
    setInspirationQueue([]);
    setInspirationSwipes([]);
    setInspirationLikes([]);
    setInspirationSaves([]);
    setInspirationTagWeights({});
    setInspirationCalibration(DEFAULT_INSPIRE_CALIBRATION);
    setInspirationLastFetchTs(null);
    setPlannedOutfits([]);
    setNotificationSettings(defaultNotificationSettings);
    setCreatorSettings(defaultCreatorSettings);
    setRecreatedOutfits([]);
    setComposedOutfits([]);
    setGamificationState(DEFAULT_GAMIFICATION_STATE);
    setUserId(null);
    setIsGuest(true);
    queryClient.invalidateQueries();
  }, [queryClient]);

  const themeColors = useMemo<ColorTheme>(() => {
    return getColorsForGender(preferences.gender);
  }, [preferences.gender]);

  const isLoading = preferencesQuery.isLoading || looksQuery.isLoading || userQuery.isLoading || closetQuery.isLoading;

  setQueueUpdater(updateClosetItem);

  return {
    preferences,
    savedLooks,
    closetItems,
    savedInspirations,
    savedPins,
    savedInspirationItems,
    inspirationGender,
    inspirationQueue,
    inspirationSwipes,
    inspirationLikes,
    inspirationSaves,
    inspirationCalibration,
    inspirationTagWeights,
    inspirationLastFetchTs,
    plannedOutfits,
    recreatedOutfits,
    composedOutfits,
    notificationSettings,
    creatorSettings,
    currentWeather,
    gamificationState,
    wardrobeCoverageMap,
    badgeDefinitions: BADGE_DEFINITIONS,
    closetInsights,
    isGuest,
    userId,
    isLoading,
    themeColors,
    updatePreferences,
    setGender,
    setVibes,
    setOccasions,
    setModestyLevel,
    setBudgetLevel,
    setTone,
    completeOnboarding,
    addLook,
    removeLook,
    getLookById,
    addClosetItem,
    addClosetItems,
    removeClosetItem,
    clearCloset,
    updateClosetItem,
    updateClosetItemPosition,
    updateClosetItemUsage,
    getClosetItemsByCategory,
    getClosetItemById,
    toggleSaveInspiration,
    isInspirationSaved,
    savePinterestPin,
    removePinterestPin,
    isPinSaved,
    saveInspirationItem,
    removeInspirationItem,
    isInspirationItemSaved,
    setInspirationGenderPreference,
    setInspirationFeedQueue,
    appendInspirationFeedQueue,
    toggleInspirationSaved,
    recordInspirationSwipe,
    isInspirationLiked,
    isInspirationCardSaved,
    resetInspirationProfile,
    getSavedStyleTagFrequency,
    addPlannedOutfit,
    removePlannedOutfit,
    getPlannedOutfitsByDate,
    updateNotificationSetting,
    toggleCreatorMode,
    addRecreatedOutfit,
    addComposedOutfit,
    updateComposedOutfit,
    removeComposedOutfit,
    getComposedOutfitById,
    setCurrentWeather,
    onOutfitCheckCompleted,
    onClosetItemsAdded,
    onOutfitSaved,
    resetGamification,
    initializeUser,
    clearAllData,
  };
});
