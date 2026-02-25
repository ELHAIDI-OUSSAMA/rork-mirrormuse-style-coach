import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@/types';
import { getColorsForGender, ColorTheme } from '@/constants/colors';
import { setQueueUpdater, resumePendingItems } from '@/lib/processingQueue';

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
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [creatorSettings, setCreatorSettings] = useState<CreatorSettings>(defaultCreatorSettings);
  const [currentWeather, setCurrentWeather] = useState<WeatherSnapshot | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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

  const saveClosetMutation = useMutation({
    mutationFn: async (items: ClosetItem[]) => {
      await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(items));
      return items;
    },
    onSuccess: (data) => {
      setClosetItems(data);
      queryClient.invalidateQueries({ queryKey: ['closet'] });
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
  const { mutate: mutateCloset } = saveClosetMutation;
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

  const addClosetItem = useCallback((item: ClosetItem) => {
    const itemWithUsage = { ...item, usageCount: item.usageCount ?? 0 };
    setClosetItems(prev => {
      const updated = [itemWithUsage, ...prev];
      persistCloset(updated);
      return updated;
    });
  }, [persistCloset]);

  const addClosetItems = useCallback((items: ClosetItem[]) => {
    const itemsWithUsage = items.map(i => ({ ...i, usageCount: i.usageCount ?? 0 }));
    setClosetItems(prev => {
      const updated = [...itemsWithUsage, ...prev];
      persistCloset(updated);
      return updated;
    });
  }, [persistCloset]);

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
  }, [composedOutfits, mutateComposedOutfits, updateClosetItemUsage]);

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
    ]);
    setPreferences(defaultPreferences);
    setSavedLooks([]);
    setClosetItems([]);
    setSavedInspirations([]);
    setSavedPins([]);
    setSavedInspirationItems([]);
    setPlannedOutfits([]);
    setNotificationSettings(defaultNotificationSettings);
    setCreatorSettings(defaultCreatorSettings);
    setRecreatedOutfits([]);
    setComposedOutfits([]);
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
    plannedOutfits,
    recreatedOutfits,
    composedOutfits,
    notificationSettings,
    creatorSettings,
    currentWeather,
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
    initializeUser,
    clearAllData,
  };
});
