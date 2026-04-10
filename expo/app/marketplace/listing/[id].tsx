import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Truck } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { palette, radius, space, type as typo } from '@/constants/theme';

export default function MarketplaceListingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const {
    getMarketplaceListingById,
    getSellerProfileByUserId,
    createMarketplaceOrder,
    processMarketplacePayment,
    marketplaceOrders,
    userId,
    addTrackingToOrder,
    confirmMarketplaceDelivery,
  } = useApp();
  const listing = params.id ? getMarketplaceListingById(params.id) : undefined;
  const sellerProfile = useMemo(
    () => (listing ? getSellerProfileByUserId(listing.sellerId) : undefined),
    [getSellerProfileByUserId, listing]
  );
  const [trackingNumber, setTrackingNumber] = useState('');

  const currentOrder = useMemo(
    () => (listing ? marketplaceOrders.find((order) => order.listingId === listing.id) : undefined),
    [listing, marketplaceOrders]
  );

  if (!listing) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <IconButton icon={<ArrowLeft size={18} color={palette.ink} />} onPress={() => router.back()} size={38} />
          </View>
          <Card style={styles.emptyCard}><Text style={styles.emptyTitle}>Listing not found</Text></Card>
        </SafeAreaView>
      </View>
    );
  }

  const isSeller = listing.sellerId === userId;

  const handleBuy = () => {
    const order = createMarketplaceOrder(listing.id);
    if (!order) return;
    processMarketplacePayment(order.id);
    Alert.alert('Payment successful', 'Your order is now awaiting shipment.');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={<ArrowLeft size={18} color={palette.ink} />} onPress={() => router.back()} size={38} />
          <Text style={styles.headerTitle}>Listing</Text>
          <View style={{ width: 38 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Image source={{ uri: listing.images[0] }} style={styles.hero} contentFit="cover" />

          <Card>
            <Text style={styles.price}>${listing.price}</Text>
            <Text style={styles.title}>{listing.title}</Text>
            <Text style={styles.meta}>{listing.brand || 'Unbranded'} · {listing.condition} · {listing.category}</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </Card>

          <Card variant="flat">
            <Text style={styles.sectionLabel}>Seller</Text>
            <Text style={styles.sellerLine}>Rating {sellerProfile?.rating?.toFixed(1) || '4.8'}</Text>
            <Text style={styles.sellerLine}>Sales {sellerProfile?.totalSales || 0}</Text>
            <Text style={styles.sellerLine}>Ship speed {sellerProfile?.responseTime || '< 24h'}</Text>
          </Card>

          {currentOrder ? (
            <Card>
              <Text style={styles.sectionLabel}>Order tracking</Text>
              <Text style={styles.orderStatus}>{currentOrder.status.replaceAll('_', ' ')}</Text>
              {currentOrder.trackingNumber ? <Text style={styles.orderLine}>Tracking: {currentOrder.trackingNumber}</Text> : null}
              <Text style={styles.orderLine}>Platform fee: ${currentOrder.platformFee}</Text>
              <Text style={styles.orderLine}>Seller payout: ${currentOrder.sellerPayout}</Text>

              {isSeller && currentOrder.status === 'awaiting_shipment' ? (
                <View style={styles.trackingWrap}>
                  <TextInput
                    value={trackingNumber}
                    onChangeText={setTrackingNumber}
                    style={styles.input}
                    placeholder="Add tracking number"
                    placeholderTextColor={palette.inkMuted}
                  />
                  <Button
                    title="Mark as shipped"
                    variant="secondary"
                    leftIcon={<Truck size={16} color={palette.white} />}
                    onPress={() => {
                      if (!trackingNumber.trim()) return;
                      addTrackingToOrder(currentOrder.id, trackingNumber.trim());
                      setTrackingNumber('');
                    }}
                  />
                </View>
              ) : null}

              {!isSeller && currentOrder.status === 'shipped' ? (
                <Button title="Confirm delivery" variant="secondary" onPress={() => confirmMarketplaceDelivery(currentOrder.id)} />
              ) : null}
            </Card>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {!isSeller && listing.status === 'active' && !currentOrder ? (
        <View style={styles.buyBar}>
          <Button title="Buy now" variant="secondary" size="large" onPress={handleBuy} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screen,
    paddingBottom: space.sm,
  },
  headerTitle: { ...typo.sectionHeader, color: palette.ink },
  content: { paddingHorizontal: space.screen, paddingBottom: 120, gap: space.md },
  hero: { width: '100%', height: 360, borderRadius: radius.lg, backgroundColor: palette.warmWhiteDark },
  price: { ...typo.heroValue, color: palette.accentDark },
  title: { ...typo.sectionHeader, color: palette.ink, marginTop: 4 },
  meta: { ...typo.small, color: palette.inkMuted, marginTop: 4 },
  description: { ...typo.body, color: palette.inkLight, marginTop: 8 },
  sectionLabel: { ...typo.bodyMedium, color: palette.ink },
  sellerLine: { ...typo.body, color: palette.inkLight, marginTop: 4 },
  orderStatus: { ...typo.bodyMedium, color: palette.secondary, marginTop: 6, textTransform: 'capitalize' },
  orderLine: { ...typo.body, color: palette.inkLight, marginTop: 4 },
  trackingWrap: { marginTop: 12, gap: 10 },
  input: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.borderLight,
    backgroundColor: palette.white,
    paddingHorizontal: 12,
    color: palette.ink,
    ...typo.body,
  },
  buyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.screen,
    paddingTop: space.sm,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
    backgroundColor: palette.white,
  },
  emptyCard: { margin: space.screen },
  emptyTitle: { ...typo.bodyMedium, color: palette.ink },
});
