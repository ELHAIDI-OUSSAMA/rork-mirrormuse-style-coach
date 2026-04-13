import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
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
  AvatarProfile,
  VirtualTryOnRender,
  MarketplaceListing,
  MarketplaceSearchQuery,
  DemandNotification,
  ImportedOutfit,
  MarketplaceOrder,
  SellerProfile,
  DemandSignal,
  ClosetSellOpportunity,
} from '@/types';
import {
  InspirationCard,
  SwipeAction,
  SwipeEvent,
  InspirationCalibration,
  InspirationPersistentState,
  DEFAULT_INSPIRE_CALIBRATION,
  DEFAULT_INSPIRE_STATE,
} from '@/types/inspiration';
import { getColorsForGender, ColorTheme } from '@/constants/Colors';
import {
  setQueueUpdater,
  setQueueRemover,
  resumePendingItems,
  setTwinQueueHandlers,
  enqueueAvatarCreateJob,
  enqueueTryOnRenderJob,
} from '@/lib/processingQueue';
import { cleanupOrphanStickerFiles, migrateClosetStorage } from '@/lib/storageMigration';
import { getCleanupCandidates } from '@/lib/cleanupCandidates';
import { estimateResaleValue } from '@/lib/resaleEstimator';
import { computeDemandInsights, runDemandSupplyMatcher } from '@/lib/demandIntelligence';
import { aggregateDemandSignals, demandLevelFromScore } from '@/lib/demandSignals';
import { findSellOpportunities, maybeSendSellOpportunityNotification } from '@/lib/sellOpportunities';
import { getClosetValueInsights, getStylePersonalityInsights } from '@/lib/closetAnalytics';
import { importOutfitFromSharedPayload, getSourceFingerprint } from '@/lib/importedOutfitPipeline';
import { calculateMarketplaceFees, canAutoCompleteOrder } from '@/lib/marketplace';
import { deleteAvatarFiles } from '@/lib/virtualTryOn';
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
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed_v1';
const ONBOARDING_STEP_KEY = 'onboarding_step_index_v1';
const ONBOARDING_ANSWERS_KEY = 'onboarding_answers_v1';
const ONBOARDING_PHOTO_TAKEN_KEY = 'onboarding_photo_taken_v1';
const ONBOARDING_AHA_SHOWN_KEY = 'onboarding_aha_shown_v1';
const ONBOARDING_IMAGE_URI_KEY = 'onboarding_image_uri_v1';
const REVIEW_PROMPTED_KEY = 'review_prompted_v1';
const ONBOARDING_PLAN_KEY = 'mirrormuse_plan_v1';
const AVATAR_PROFILE_KEY = 'mirrormuse_avatar_profile_v1';
const TRYON_RENDERS_KEY = 'mirrormuse_tryon_renders_v1';
const MARKETPLACE_LISTINGS_KEY = 'mirrormuse_marketplace_listings_v1';
const MARKETPLACE_SEARCH_QUERIES_KEY = 'mirrormuse_marketplace_search_queries_v1';
const DEMAND_NOTIFICATIONS_KEY = 'mirrormuse_demand_notifications_v1';
const IMPORTED_OUTFITS_KEY = 'mirrormuse_imported_outfits_v1';
const MARKETPLACE_ORDERS_KEY = 'mirrormuse_marketplace_orders_v1';
const SELLER_PROFILES_KEY = 'mirrormuse_seller_profiles_v1';
const DEMAND_SIGNALS_KEY = 'mirrormuse_demand_signals_v1';
const SELL_OPPORTUNITIES_KEY = 'mirrormuse_sell_opportunities_v1';
const SELL_OPP_LAST_NOTIFICATION_AT_KEY = 'mirrormuse_sell_opp_last_notification_at_v1';

const isBase64Uri = (uri?: string): boolean =>
  !!uri && (uri.startsWith('data:') || uri.length > 5000);

const stripLargeDataForStorage = (items: ClosetItem[]): ClosetItem[] => {
  if (Platform.OS !== 'web') return items;
  return items.map((item) => {
    const next = { ...item };
    if (isBase64Uri(next.imageUri)) {
      next.imageUri = next.imageRemoteUrl || '';
    }
    if (isBase64Uri(next.stickerPngUri)) {
      next.stickerPngUri = undefined;
    }
    return next;
  });
};

const safeSetItem = async (key: string, value: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('quota') || message.includes('Quota') || message.includes('exceeded')) {
      console.log(`[Storage] Quota exceeded for key "${key}"`);
      return false;
    }
    console.log(`[Storage] setItem failed for key "${key}":`, message);
    return false;
  }
};

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
  const closetItemsRef = useRef<ClosetItem[]>([]);
  const [avatarProfile, setAvatarProfile] = useState<AvatarProfile | null>(null);
  const [virtualTryOnRenders, setVirtualTryOnRenders] = useState<VirtualTryOnRender[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
  const [marketplaceSearchQueries, setMarketplaceSearchQueries] = useState<MarketplaceSearchQuery[]>([]);
  const [demandNotifications, setDemandNotifications] = useState<DemandNotification[]>([]);
  const [importedOutfits, setImportedOutfits] = useState<ImportedOutfit[]>([]);
  const [marketplaceOrders, setMarketplaceOrders] = useState<MarketplaceOrder[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfile[]>([]);
  const [demandSignals, setDemandSignals] = useState<DemandSignal[]>([]);
  const [sellOpportunities, setSellOpportunities] = useState<ClosetSellOpportunity[]>([]);
  const [lastSellOpportunityNotificationAt, setLastSellOpportunityNotificationAt] = useState<string | null>(null);
  const normalizeClosetItemState = useCallback((item: ClosetItem): ClosetItem => {
    const next: ClosetItem = { ...item };
    if (!next.lastWornAt && next.lastUsedAt) next.lastWornAt = next.lastUsedAt;
    if (!next.status) next.status = 'active';
    if (!next.estimatedResaleValue) next.estimatedResaleValue = estimateResaleValue(next);
    return next;
  }, []);


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
      const parsed: ClosetItem[] = stored ? JSON.parse(stored) : [];
      return parsed.map(normalizeClosetItemState);
    },
  });

  const marketplaceListingsQuery = useQuery({
    queryKey: ['marketplaceListings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(MARKETPLACE_LISTINGS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const marketplaceSearchQueriesQuery = useQuery({
    queryKey: ['marketplaceSearchQueries'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(MARKETPLACE_SEARCH_QUERIES_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const demandNotificationsQuery = useQuery({
    queryKey: ['demandNotifications'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(DEMAND_NOTIFICATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const importedOutfitsQuery = useQuery({
    queryKey: ['importedOutfits'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(IMPORTED_OUTFITS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const marketplaceOrdersQuery = useQuery({
    queryKey: ['marketplaceOrders'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(MARKETPLACE_ORDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const sellerProfilesQuery = useQuery({
    queryKey: ['sellerProfiles'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SELLER_PROFILES_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const demandSignalsQuery = useQuery({
    queryKey: ['demandSignals'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(DEMAND_SIGNALS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const sellOpportunitiesQuery = useQuery({
    queryKey: ['sellOpportunities'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SELL_OPPORTUNITIES_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const sellOppLastNotificationQuery = useQuery({
    queryKey: ['sellOppLastNotificationAt'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SELL_OPP_LAST_NOTIFICATION_AT_KEY);
      return stored || null;
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
      const normalized = closetQuery.data.map(normalizeClosetItemState);
      setClosetItems(normalized);
      closetItemsRef.current = normalized;
      resumePendingItems(normalized);
    }
  }, [closetQuery.data, normalizeClosetItemState]);

  useEffect(() => {
    if (!closetQuery.data) return;
    let cancelled = false;
    const runMigration = async () => {
      const { items, changed } = await migrateClosetStorage(closetQuery.data);
      const normalized = items.map(normalizeClosetItemState);
      if (cancelled) return;
      if (changed || JSON.stringify(normalized) !== JSON.stringify(closetQuery.data)) {
        setClosetItems(normalized);
        closetItemsRef.current = normalized;
        queryClient.setQueryData(['closet'], normalized);
        const storageItems = stripLargeDataForStorage(normalized);
        await safeSetItem(CLOSET_KEY, JSON.stringify(storageItems));
      }
      cleanupOrphanStickerFiles(normalized).catch(() => {});
    };
    runMigration().catch((error) => {
      console.log('[StorageMigration] closet migration failed:', error);
    });
    return () => {
      cancelled = true;
    };
  }, [closetQuery.data, normalizeClosetItemState, queryClient]);

  useEffect(() => {
    if (marketplaceListingsQuery.data) {
      setMarketplaceListings(marketplaceListingsQuery.data);
    }
  }, [marketplaceListingsQuery.data]);

  useEffect(() => {
    if (marketplaceSearchQueriesQuery.data) {
      setMarketplaceSearchQueries(marketplaceSearchQueriesQuery.data);
    }
  }, [marketplaceSearchQueriesQuery.data]);

  useEffect(() => {
    if (demandNotificationsQuery.data) {
      setDemandNotifications(demandNotificationsQuery.data);
    }
  }, [demandNotificationsQuery.data]);

  useEffect(() => {
    if (importedOutfitsQuery.data) {
      setImportedOutfits(importedOutfitsQuery.data);
    }
  }, [importedOutfitsQuery.data]);

  useEffect(() => {
    if (marketplaceOrdersQuery.data) {
      setMarketplaceOrders(marketplaceOrdersQuery.data);
    }
  }, [marketplaceOrdersQuery.data]);

  useEffect(() => {
    if (sellerProfilesQuery.data) {
      setSellerProfiles(sellerProfilesQuery.data);
    }
  }, [sellerProfilesQuery.data]);

  useEffect(() => {
    if (demandSignalsQuery.data) {
      setDemandSignals(demandSignalsQuery.data);
    }
  }, [demandSignalsQuery.data]);

  useEffect(() => {
    if (sellOpportunitiesQuery.data) {
      setSellOpportunities(sellOpportunitiesQuery.data);
    }
  }, [sellOpportunitiesQuery.data]);

  useEffect(() => {
    if (sellOppLastNotificationQuery.data !== undefined) {
      setLastSellOpportunityNotificationAt(sellOppLastNotificationQuery.data);
    }
  }, [sellOppLastNotificationQuery.data]);

  useEffect(() => {
    closetItemsRef.current = closetItems;
  }, [closetItems]);

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

  const avatarProfileQuery = useQuery({
    queryKey: ['avatarProfile'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(AVATAR_PROFILE_KEY);
      return stored ? JSON.parse(stored) : null;
    },
  });

  useEffect(() => {
    if (avatarProfileQuery.data !== undefined) {
      setAvatarProfile(avatarProfileQuery.data);
    }
  }, [avatarProfileQuery.data]);

  const tryOnRendersQuery = useQuery({
    queryKey: ['virtualTryOnRenders'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(TRYON_RENDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  useEffect(() => {
    if (tryOnRendersQuery.data) {
      setVirtualTryOnRenders(tryOnRendersQuery.data);
    }
  }, [tryOnRendersQuery.data]);

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

  const saveAvatarProfileMutation = useMutation({
    mutationFn: async (profile: AvatarProfile | null) => {
      if (!profile) {
        await AsyncStorage.removeItem(AVATAR_PROFILE_KEY);
        return profile;
      }
      await AsyncStorage.setItem(AVATAR_PROFILE_KEY, JSON.stringify(profile));
      return profile;
    },
    onSuccess: (data) => {
      setAvatarProfile(data);
      queryClient.invalidateQueries({ queryKey: ['avatarProfile'] });
    },
  });

  const saveTryOnRendersMutation = useMutation({
    mutationFn: async (renders: VirtualTryOnRender[]) => {
      await AsyncStorage.setItem(TRYON_RENDERS_KEY, JSON.stringify(renders));
      return renders;
    },
    onSuccess: (data) => {
      setVirtualTryOnRenders(data);
      queryClient.invalidateQueries({ queryKey: ['virtualTryOnRenders'] });
    },
  });

  const { mutate: mutateInspoV2 } = saveInspoV2Mutation;
  const { mutate: mutateAvatarProfile } = saveAvatarProfileMutation;
  const { mutate: mutateTryOnRenders } = saveTryOnRendersMutation;
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

  const persistCloset = useCallback(async (items: ClosetItem[]) => {
    const normalized = items.map(normalizeClosetItemState);
    queryClient.setQueryData(['closet'], normalized);
    const storageItems = stripLargeDataForStorage(normalized);
    const json = JSON.stringify(storageItems);
    const ok = await safeSetItem(CLOSET_KEY, json);
    if (!ok) {
      const half = storageItems.slice(0, Math.max(1, Math.floor(storageItems.length / 2)));
      const ok2 = await safeSetItem(CLOSET_KEY, JSON.stringify(half));
      if (!ok2) {
        console.log('[Storage] Still over quota after halving closet items');
      }
    }
  }, [normalizeClosetItemState, queryClient]);

  const persistMarketplaceListings = useCallback((items: MarketplaceListing[]) => {
    queryClient.setQueryData(['marketplaceListings'], items);
    AsyncStorage.setItem(MARKETPLACE_LISTINGS_KEY, JSON.stringify(items));
  }, [queryClient]);

  const persistMarketplaceSearchQueries = useCallback((items: MarketplaceSearchQuery[]) => {
    queryClient.setQueryData(['marketplaceSearchQueries'], items);
    AsyncStorage.setItem(MARKETPLACE_SEARCH_QUERIES_KEY, JSON.stringify(items));
  }, [queryClient]);

  const persistDemandNotifications = useCallback((items: DemandNotification[]) => {
    queryClient.setQueryData(['demandNotifications'], items);
    AsyncStorage.setItem(DEMAND_NOTIFICATIONS_KEY, JSON.stringify(items));
  }, [queryClient]);

  const persistImportedOutfits = useCallback((items: ImportedOutfit[]) => {
    queryClient.setQueryData(['importedOutfits'], items);
    AsyncStorage.setItem(IMPORTED_OUTFITS_KEY, JSON.stringify(items));
  }, [queryClient]);

  const persistMarketplaceOrders = useCallback((items: MarketplaceOrder[]) => {
    queryClient.setQueryData(['marketplaceOrders'], items);
    AsyncStorage.setItem(MARKETPLACE_ORDERS_KEY, JSON.stringify(items));
  }, [queryClient]);

  const persistSellerProfiles = useCallback((items: SellerProfile[]) => {
    queryClient.setQueryData(['sellerProfiles'], items);
    AsyncStorage.setItem(SELLER_PROFILES_KEY, JSON.stringify(items));
  }, [queryClient]);

  const persistDemandSignals = useCallback((items: DemandSignal[]) => {
    queryClient.setQueryData(['demandSignals'], items);
    AsyncStorage.setItem(DEMAND_SIGNALS_KEY, JSON.stringify(items));
  }, [queryClient]);

  const persistSellOpportunities = useCallback((items: ClosetSellOpportunity[]) => {
    queryClient.setQueryData(['sellOpportunities'], items);
    AsyncStorage.setItem(SELL_OPPORTUNITIES_KEY, JSON.stringify(items));
  }, [queryClient]);

  const persistSellOpportunityNotificationAt = useCallback((iso: string | null) => {
    queryClient.setQueryData(['sellOppLastNotificationAt'], iso);
    if (!iso) {
      AsyncStorage.removeItem(SELL_OPP_LAST_NOTIFICATION_AT_KEY);
      return;
    }
    AsyncStorage.setItem(SELL_OPP_LAST_NOTIFICATION_AT_KEY, iso);
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
    const itemWithUsage = normalizeClosetItemState({ ...item, usageCount: item.usageCount ?? 0 });
    const current = closetItemsRef.current;
    const duplicate = current.some((existing) => isDuplicateClosetItem(existing, itemWithUsage));
    if (duplicate) {
      return { added: false, duplicate: true };
    }

    const updated = [itemWithUsage, ...current];
    closetItemsRef.current = updated;
    setClosetItems(updated);
    persistCloset(updated);
    onClosetItemsAdded(1);

    return { added: true, duplicate: false };
  }, [isDuplicateClosetItem, onClosetItemsAdded, persistCloset]);

  const addClosetItems = useCallback((items: ClosetItem[]) => {
    const itemsWithUsage = items.map(i => normalizeClosetItemState({ ...i, usageCount: i.usageCount ?? 0 }));
    let added = 0;
    let skipped = 0;
    const next = [...closetItemsRef.current];
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
      closetItemsRef.current = next;
      setClosetItems(next);
      persistCloset(next);
    }

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
        item.id === itemId ? normalizeClosetItemState({ ...item, ...updates }) : item
      );
      persistCloset(updated);
      return updated;
    });
  }, [normalizeClosetItemState, persistCloset]);

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
          ? {
              ...item,
              usageCount: (item.usageCount || 0) + 1,
              lastUsedAt: new Date().toISOString(),
              lastWornAt: new Date().toISOString(),
              status: item.status === 'cleanup_candidate' ? 'active' : item.status,
              cleanupDismissedUntil: undefined,
            }
          : item
      );
      persistCloset(updated);
      return updated;
    });
  }, [persistCloset]);

  const createMarketplaceListing = useCallback((listing: Omit<MarketplaceListing, 'id' | 'createdAt' | 'updatedAt'>) => {
    const nextListing: MarketplaceListing = {
      ...listing,
      id: `listing_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextListings = [nextListing, ...marketplaceListings];
    setMarketplaceListings(nextListings);
    persistMarketplaceListings(nextListings);
    updateClosetItem(nextListing.closetItemId, {
      status: 'listed_for_sale',
      marketplaceListingId: nextListing.id,
      cleanupDismissedUntil: undefined,
      lifecycleUpdatedAt: new Date().toISOString(),
    });
    const nextOpportunities = sellOpportunities.filter((item) => item.closetItemId !== nextListing.closetItemId);
    if (nextOpportunities.length !== sellOpportunities.length) {
      setSellOpportunities(nextOpportunities);
      persistSellOpportunities(nextOpportunities);
    }
    return nextListing;
  }, [marketplaceListings, persistMarketplaceListings, persistSellOpportunities, sellOpportunities, updateClosetItem]);

  const updateMarketplaceListing = useCallback((listingId: string, updates: Partial<MarketplaceListing>) => {
    const nextListings = marketplaceListings.map((listing) =>
      listing.id === listingId ? { ...listing, ...updates, updatedAt: new Date().toISOString() } : listing
    );
    setMarketplaceListings(nextListings);
    persistMarketplaceListings(nextListings);
  }, [marketplaceListings, persistMarketplaceListings]);

  const getSellerProfileByUserId = useCallback((profileUserId: string) => {
    return sellerProfiles.find((profile) => profile.userId === profileUserId);
  }, [sellerProfiles]);

  const upsertSellerProfile = useCallback((profile: SellerProfile) => {
    const exists = sellerProfiles.some((row) => row.userId === profile.userId);
    const next = exists
      ? sellerProfiles.map((row) => (row.userId === profile.userId ? { ...row, ...profile } : row))
      : [profile, ...sellerProfiles];
    setSellerProfiles(next);
    persistSellerProfiles(next);
  }, [persistSellerProfiles, sellerProfiles]);

  const createMarketplaceOrder = useCallback((listingId: string) => {
    const listing = marketplaceListings.find((row) => row.id === listingId && row.status === 'active');
    if (!listing) return null;
    const buyer = userId || `guest_${Date.now()}`;
    const { platformFee, sellerPayout } = calculateMarketplaceFees(listing.price);
    const order: MarketplaceOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      listingId: listing.id,
      buyerId: buyer,
      sellerId: listing.sellerId,
      price: listing.price,
      platformFee,
      sellerPayout,
      status: 'pending_payment',
      paymentIntentId: `pi_mock_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const next = [order, ...marketplaceOrders];
    setMarketplaceOrders(next);
    persistMarketplaceOrders(next);
    return order;
  }, [marketplaceListings, marketplaceOrders, persistMarketplaceOrders, userId]);

  const updateMarketplaceOrder = useCallback((orderId: string, updates: Partial<MarketplaceOrder>) => {
    const next = marketplaceOrders.map((order) =>
      order.id === orderId ? { ...order, ...updates } : order
    );
    setMarketplaceOrders(next);
    persistMarketplaceOrders(next);
  }, [marketplaceOrders, persistMarketplaceOrders]);

  const processMarketplacePayment = useCallback((orderId: string) => {
    updateMarketplaceOrder(orderId, { status: 'awaiting_shipment' });
    const order = marketplaceOrders.find((row) => row.id === orderId);
    if (!order) return;
    updateMarketplaceListing(order.listingId, { status: 'sold' });
    const listing = marketplaceListings.find((row) => row.id === order.listingId);
    if (listing) {
      updateClosetItem(listing.closetItemId, {
        status: 'sold',
        lifecycleUpdatedAt: new Date().toISOString(),
      });
    }
  }, [marketplaceListings, marketplaceOrders, updateClosetItem, updateMarketplaceListing, updateMarketplaceOrder]);

  const addTrackingToOrder = useCallback((orderId: string, trackingNumber: string) => {
    updateMarketplaceOrder(orderId, {
      trackingNumber,
      status: 'shipped',
    });
  }, [updateMarketplaceOrder]);

  const confirmMarketplaceDelivery = useCallback((orderId: string) => {
    updateMarketplaceOrder(orderId, { status: 'completed' });
    const order = marketplaceOrders.find((row) => row.id === orderId);
    if (!order) return;
    const profile = sellerProfiles.find((row) => row.userId === order.sellerId);
    if (!profile) {
      upsertSellerProfile({
        userId: order.sellerId,
        rating: 4.8,
        totalSales: 1,
        responseTime: '< 12h',
        joinDate: new Date().toISOString(),
      });
      return;
    }
    upsertSellerProfile({
      ...profile,
      totalSales: profile.totalSales + 1,
    });
  }, [marketplaceOrders, sellerProfiles, updateMarketplaceOrder, upsertSellerProfile]);

  const getMarketplaceOrderById = useCallback((orderId: string) => {
    return marketplaceOrders.find((order) => order.id === orderId);
  }, [marketplaceOrders]);

  const trackMarketplaceSearch = useCallback((query: string, filters?: {
    category?: string;
    brand?: string;
    size?: string;
    color?: string;
    userId?: string;
  }) => {
    if (!query.trim()) return;
    const entry: MarketplaceSearchQuery = {
      id: `demand_query_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      query: query.trim(),
      timestamp: new Date().toISOString(),
      category: filters?.category,
      brand: filters?.brand,
      size: filters?.size,
      color: filters?.color,
      userId: filters?.userId || userId || undefined,
    };
    const next = [entry, ...marketplaceSearchQueries].slice(0, 1200);
    setMarketplaceSearchQueries(next);
    persistMarketplaceSearchQueries(next);
  }, [marketplaceSearchQueries, persistMarketplaceSearchQueries, userId]);

  const trackMarketplaceSearchQuery = useCallback((input: {
    query: string;
    category?: string;
    brand?: string;
    size?: string;
    color?: string;
    userId?: string;
  }) => {
    trackMarketplaceSearch(input.query, input);
  }, [trackMarketplaceSearch]);

  const markDemandNotificationSeen = useCallback((notificationId: string) => {
    const next = demandNotifications.map((item) =>
      item.id === notificationId ? { ...item, seen: true } : item
    );
    setDemandNotifications(next);
    persistDemandNotifications(next);
  }, [demandNotifications, persistDemandNotifications]);

  const saveImportedOutfit = useCallback((outfit: ImportedOutfit) => {
    const existing = importedOutfits.find((item) => item.sourceFingerprint === outfit.sourceFingerprint);
    if (existing) return existing;
    const next = [outfit, ...importedOutfits].slice(0, 300);
    setImportedOutfits(next);
    persistImportedOutfits(next);
    return outfit;
  }, [importedOutfits, persistImportedOutfits]);

  const importOutfitFromShare = useCallback(async (payload: {
    sourceUrl: string;
    mediaUrl?: string;
    postUrl?: string;
    thumbnailUrl?: string;
  }) => {
    const fingerprint = getSourceFingerprint(payload.sourceUrl);
    const existing = importedOutfits.find((item) => item.sourceFingerprint === fingerprint);
    if (existing) return existing;
    const imported = await importOutfitFromSharedPayload(payload);
    return saveImportedOutfit(imported);
  }, [importedOutfits, saveImportedOutfit]);

  const getImportedOutfitById = useCallback((id: string) => {
    return importedOutfits.find((item) => item.id === id);
  }, [importedOutfits]);

  const cleanupCandidates = useMemo(() => getCleanupCandidates(closetItems), [closetItems]);
  const demandInsights = useMemo(() => computeDemandInsights(marketplaceSearchQueries), [marketplaceSearchQueries]);
  const highDemandSellOpportunities = useMemo(
    () => sellOpportunities.filter((item) => item.demandLevel === 'high' && (!item.dismissedUntil || new Date(item.dismissedUntil).getTime() <= Date.now())),
    [sellOpportunities]
  );
  const closetValueInsights = useMemo(
    () => getClosetValueInsights(closetItems, cleanupCandidates, demandNotifications),
    [cleanupCandidates, closetItems, demandNotifications]
  );
  const stylePersonalityInsights = useMemo(
    () => getStylePersonalityInsights(closetItems),
    [closetItems]
  );

  const getClosetItemsByCategory = useCallback((category: string) => {
    return closetItems.filter(i => i.category === category && i.status !== 'sold' && i.status !== 'donated');
  }, [closetItems]);

  const getClosetItemById = useCallback((id: string) => {
    return closetItems.find(i => i.id === id);
  }, [closetItems]);

  const getMarketplaceListingById = useCallback((id: string) => {
    return marketplaceListings.find((listing) => listing.id === id);
  }, [marketplaceListings]);

  const getSellOpportunityForItem = useCallback((closetItemId: string) => {
    const now = Date.now();
    return sellOpportunities.find((item) =>
      item.closetItemId === closetItemId &&
      (!item.dismissedUntil || new Date(item.dismissedUntil).getTime() <= now)
    );
  }, [sellOpportunities]);

  const dismissSellOpportunity = useCallback((opportunityId: string, days = 30) => {
    const next = sellOpportunities.map((item) =>
      item.id === opportunityId
        ? { ...item, dismissedUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() }
        : item
    );
    setSellOpportunities(next);
    persistSellOpportunities(next);
  }, [persistSellOpportunities, sellOpportunities]);

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
      author: card.vibeTags[0] || 'MirrorMuse',
      styleTags: card.vibeTags || [],
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
      tags: card.vibeTags || [],
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

    if (card.vibeTags && card.vibeTags.length > 0) {
      setInspirationTagWeights((prev) => {
        const next = { ...prev };
        const delta = action === 'like' ? 2 : action === 'dislike' ? -1 : action === 'save' ? 3 : 1;
        for (const tag of card.vibeTags || []) {
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

  const createDigitalTwin = useCallback(async (faceImageUri: string, bodyImageUri: string) => {
    const placeholder: AvatarProfile = {
      id: `avatar-${Date.now()}`,
      createdAt: new Date().toISOString(),
      faceImageUri,
      bodyImageUri,
      status: 'creating',
    };
    setAvatarProfile(placeholder);
    mutateAvatarProfile(placeholder);
    enqueueAvatarCreateJob(placeholder.id, faceImageUri, bodyImageUri);
    return placeholder;
  }, [mutateAvatarProfile]);

  const renderDigitalTryOn = useCallback(async (options: {
    outfitId?: string;
    closetItemIds?: string[];
    source: 'outfit_builder' | 'fit_check';
  }) => {
    if (!avatarProfile || avatarProfile.status !== 'ready') {
      throw new Error('Digital Twin is not ready');
    }

    const selectedItems = options.closetItemIds
      ? closetItems.filter((item) => options.closetItemIds?.includes(item.id))
      : [];

    const placeholder: VirtualTryOnRender = {
      id: `render-${Date.now()}`,
      avatarId: avatarProfile.id,
      outfitId: options.outfitId,
      closetItemIds: options.closetItemIds,
      source: options.source,
      createdAt: new Date().toISOString(),
      renderImageUri: '',
      status: 'processing',
    };
    const nextRenders = [placeholder, ...virtualTryOnRenders].slice(0, 30);
    setVirtualTryOnRenders(nextRenders);
    mutateTryOnRenders(nextRenders);

    enqueueTryOnRenderJob(
      placeholder.id,
      avatarProfile,
      options.source,
      selectedItems,
      options.outfitId
    );
    return placeholder;
  }, [avatarProfile, closetItems, mutateTryOnRenders, virtualTryOnRenders]);

  const deleteDigitalTwin = useCallback(async () => {
    await deleteAvatarFiles(avatarProfile, virtualTryOnRenders);
    setAvatarProfile(null);
    setVirtualTryOnRenders([]);
    mutateAvatarProfile(null);
    mutateTryOnRenders([]);
  }, [avatarProfile, mutateAvatarProfile, mutateTryOnRenders, virtualTryOnRenders]);

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
      ONBOARDING_COMPLETED_KEY,
      ONBOARDING_STEP_KEY,
      ONBOARDING_ANSWERS_KEY,
      ONBOARDING_PHOTO_TAKEN_KEY,
      ONBOARDING_AHA_SHOWN_KEY,
      ONBOARDING_IMAGE_URI_KEY,
      REVIEW_PROMPTED_KEY,
      ONBOARDING_PLAN_KEY,
      AVATAR_PROFILE_KEY,
      TRYON_RENDERS_KEY,
      MARKETPLACE_LISTINGS_KEY,
      MARKETPLACE_SEARCH_QUERIES_KEY,
      DEMAND_NOTIFICATIONS_KEY,
      IMPORTED_OUTFITS_KEY,
      MARKETPLACE_ORDERS_KEY,
      SELLER_PROFILES_KEY,
      DEMAND_SIGNALS_KEY,
      SELL_OPPORTUNITIES_KEY,
      SELL_OPP_LAST_NOTIFICATION_AT_KEY,
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
    setAvatarProfile(null);
    setVirtualTryOnRenders([]);
    setMarketplaceListings([]);
    setMarketplaceSearchQueries([]);
    setDemandNotifications([]);
    setImportedOutfits([]);
    setMarketplaceOrders([]);
    setSellerProfiles([]);
    setDemandSignals([]);
    setSellOpportunities([]);
    setLastSellOpportunityNotificationAt(null);
    setUserId(null);
    setIsGuest(true);
    queryClient.invalidateQueries();
  }, [queryClient]);

  useEffect(() => {
    if (marketplaceSearchQueries.length === 0) return;
    const signals = aggregateDemandSignals(marketplaceSearchQueries);
    setDemandSignals(signals);
    persistDemandSignals(signals);
  }, [marketplaceSearchQueries, persistDemandSignals]);

  useEffect(() => {
    if (demandSignals.length === 0) {
      if (sellOpportunities.length === 0) return;
      setSellOpportunities([]);
      persistSellOpportunities([]);
      return;
    }

    const computed = findSellOpportunities(closetItems, demandSignals);
    const dismissedByKey = new Map(
      sellOpportunities.map((item) => [`${item.closetItemId}:${item.demandSignalId || ''}`, item.dismissedUntil])
    );
    const merged = computed.map((item) => ({
      ...item,
      dismissedUntil: dismissedByKey.get(`${item.closetItemId}:${item.demandSignalId || ''}`) || item.dismissedUntil,
    }));
    const hasChanged = JSON.stringify(merged) !== JSON.stringify(sellOpportunities);
    if (!hasChanged) return;
    setSellOpportunities(merged);
    persistSellOpportunities(merged);
  }, [closetItems, demandSignals, persistSellOpportunities, sellOpportunities]);

  useEffect(() => {
    if (sellOpportunities.length === 0) return;
    const topOpportunity = sellOpportunities.find((item) => item.demandLevel === 'high');
    if (!topOpportunity) return;
    const closetItem = closetItems.find((item) => item.id === topOpportunity.closetItemId);
    const shouldNotify = maybeSendSellOpportunityNotification({
      opportunity: topOpportunity,
      closetItem,
      lastNotificationAt: lastSellOpportunityNotificationAt || undefined,
    });
    if (!shouldNotify || !closetItem) return;
    const signal = demandSignals.find((entry) => entry.id === topOpportunity.demandSignalId);
    const queryKey = signal?.normalizedQuery || `${closetItem.id}:sell-opportunity`;
    const exists = demandNotifications.some((item) => item.queryKey === queryKey && item.closetItemId === closetItem.id);
    if (!exists) {
      const nextNotifications = [
        {
          id: `sell_alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          closetItemId: closetItem.id,
          queryKey,
          message: 'High demand alert: users are looking for an item you own.',
          demandLevel: demandLevelFromScore(signal?.demandScore || 100),
          estimatedResaleValue: topOpportunity.estimatedResaleValue || closetItem.estimatedResaleValue || estimateResaleValue(closetItem),
          seen: false,
        },
        ...demandNotifications,
      ].slice(0, 100);
      setDemandNotifications(nextNotifications);
      persistDemandNotifications(nextNotifications);
    }
    const nowIso = new Date().toISOString();
    setLastSellOpportunityNotificationAt(nowIso);
    persistSellOpportunityNotificationAt(nowIso);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [
    closetItems,
    demandNotifications,
    demandSignals,
    lastSellOpportunityNotificationAt,
    persistDemandNotifications,
    persistSellOpportunityNotificationAt,
    sellOpportunities,
  ]);

  useEffect(() => {
    if (marketplaceSearchQueries.length === 0) return;
    const newNotifications = runDemandSupplyMatcher({
      demandInsights,
      listings: marketplaceListings,
      closetItems,
      existingNotifications: demandNotifications,
    });
    if (newNotifications.length === 0) return;
    const next = [...newNotifications, ...demandNotifications].slice(0, 100);
    setDemandNotifications(next);
    persistDemandNotifications(next);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [
    closetItems,
    demandInsights,
    closetValueInsights,
    stylePersonalityInsights,
    demandNotifications,
    marketplaceListings,
    marketplaceSearchQueries.length,
    persistDemandNotifications,
  ]);

  useEffect(() => {
    const staleShipped = marketplaceOrders.filter((order) => canAutoCompleteOrder(order));
    if (staleShipped.length === 0) return;
    const staleIds = new Set(staleShipped.map((order) => order.id));
    const next = marketplaceOrders.map((order) =>
      staleIds.has(order.id) ? { ...order, status: 'completed' as const } : order
    );
    setMarketplaceOrders(next);
    persistMarketplaceOrders(next);
  }, [marketplaceOrders, persistMarketplaceOrders]);

  const themeColors = useMemo<ColorTheme>(() => {
    return getColorsForGender(preferences.gender);
  }, [preferences.gender]);

  const isLoading = preferencesQuery.isLoading || looksQuery.isLoading || userQuery.isLoading || closetQuery.isLoading;

  useEffect(() => {
    setQueueUpdater(updateClosetItem);
    setQueueRemover(removeClosetItem);
  }, [removeClosetItem, updateClosetItem]);

  useEffect(() => {
    setTwinQueueHandlers({
      onAvatarJobSuccess: (_, avatar) => {
        setAvatarProfile(avatar);
        mutateAvatarProfile(avatar);
      },
      onAvatarJobError: (avatarId, message) => {
        setAvatarProfile((prev) => {
          if (!prev || prev.id !== avatarId) return prev;
          const failed: AvatarProfile = { ...prev, status: 'error', errorMessage: message };
          mutateAvatarProfile(failed);
          return failed;
        });
      },
      onTryOnJobSuccess: (renderId, render) => {
        setVirtualTryOnRenders((prev) => {
          const updated = prev
            .map((item): VirtualTryOnRender => (
              item.id === renderId ? { ...render, status: 'ready' } : item
            ))
            .slice(0, 30);
          mutateTryOnRenders(updated);
          return updated;
        });
        setAvatarProfile((prev) => {
          if (!prev) return prev;
          const nextAvatar = { ...prev, lastRenderAt: render.createdAt };
          mutateAvatarProfile(nextAvatar);
          return nextAvatar;
        });
      },
      onTryOnJobError: (renderId, message) => {
        setVirtualTryOnRenders((prev) => {
          const updated = prev
            .map((item): VirtualTryOnRender => (
              item.id === renderId ? { ...item, status: 'error', errorMessage: message } : item
            ))
            .slice(0, 30);
          mutateTryOnRenders(updated);
          return updated;
        });
      },
    });
  }, [mutateAvatarProfile, mutateTryOnRenders]);

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
    avatarProfile,
    virtualTryOnRenders,
    marketplaceListings,
    marketplaceSearchQueries,
    demandNotifications,
    demandSignals,
    sellOpportunities,
    highDemandSellOpportunities,
    demandInsights,
    closetValueInsights,
    stylePersonalityInsights,
    importedOutfits,
    marketplaceOrders,
    sellerProfiles,
    cleanupCandidates,
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
    createMarketplaceListing,
    updateMarketplaceListing,
    getMarketplaceListingById,
    getSellerProfileByUserId,
    trackMarketplaceSearch,
    trackMarketplaceSearchQuery,
    getSellOpportunityForItem,
    dismissSellOpportunity,
    markDemandNotificationSeen,
    saveImportedOutfit,
    importOutfitFromShare,
    getImportedOutfitById,
    upsertSellerProfile,
    createMarketplaceOrder,
    updateMarketplaceOrder,
    processMarketplacePayment,
    addTrackingToOrder,
    confirmMarketplaceDelivery,
    getMarketplaceOrderById,
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
    createDigitalTwin,
    renderDigitalTryOn,
    deleteDigitalTwin,
    clearAllData,
  };
});
