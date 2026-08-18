import React, {useCallback, useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  StyleSheet,
  Text,
  Image,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Entypo';

import {
  CheckoutProtocol,
  useShopifyCheckout,
  AcceleratedCheckoutButtons,
  ApplePayLabel,
  AcceleratedCheckoutWallet,
} from '@shopify/checkout-kit-react-native';
import type {PreloadState} from '@shopify/checkout-kit-react-native';
import {useIsFocused} from '@react-navigation/native';
import {useConfig} from '../context/Config';
import useShopify from '../hooks/useShopify';
import type {CartLineItem} from '../../@types';
import type {Colors} from '../context/Theme';
import {useTheme} from '../context/Theme';
import {useCart} from '../context/Cart';
import {currency} from '../utils';
import {
  useShopifyEventHandlers,
  useShopifyProtocolEventHandlers,
} from '../hooks/useCheckoutEventHandlers';
import {AccessibilityIdentifiers} from '../accessibility/accessibilityIdentifiers';

function CartScreen(): React.JSX.Element {
  const {present, preload} = useShopifyCheckout();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = React.useState(false);
  const [preloadState, setPreloadState] = React.useState<PreloadState>({
    type: 'idle',
  });
  const {
    cartId,
    checkoutURL,
    totalQuantity,
    removeFromCart,
    addingToCart,
    clearCart,
  } = useCart();
  const {queries} = useShopify();
  const {appConfig} = useConfig();
  // Separate handler instances so debug logs are labelled with the actual
  // surface that emitted the event. Otherwise an `onClose` from the
  // `ShopifyCheckout.present()` sheet would log under the
  // `AcceleratedCheckoutButtons` namespace and confuse anyone debugging.
  const sheetEventHandlers = useShopifyEventHandlers('Cart - CheckoutSheet');
  const sheetProtocolEventHandlers = useShopifyProtocolEventHandlers(
    'Cart - CheckoutSheet Protocol',
    {
      [CheckoutProtocol.complete]: () => {
        clearCart();
      },
    },
  );
  const acceleratedCheckoutEventHandlers = useShopifyEventHandlers(
    'Cart - AcceleratedCheckoutButtons',
  );
  const acceleratedCheckoutProtocolEventHandlers =
    useShopifyProtocolEventHandlers(
      'Cart - AcceleratedCheckoutButtons Protocol',
    );

  const [fetchCart, {data, loading, error}] = queries.cart;

  const {colors, cornerRadius} = useTheme();
  const styles = createStyles(colors, cornerRadius);
  const cartMutationInProgress = addingToCart.size > 0;

  useEffect(() => {
    if (cartId) {
      fetchCart({
        variables: {
          cartId,
        },
      });
    }
  }, [fetchCart, cartId]);

  useEffect(() => {
    if (
      !isFocused ||
      !appConfig.checkoutPreloadingEnabled ||
      !checkoutURL ||
      totalQuantity === 0
    ) {
      setPreloadState({type: 'idle'});
      return;
    }

    const subscription = preload(checkoutURL, {
      onStateChange: setPreloadState,
    });

    // Each call observes one preload request. Stop observing it when the cart
    // changes or leaves focus; this does not invalidate the preloaded checkout.
    return () => subscription?.remove();
  }, [
    preload,
    isFocused,
    appConfig.checkoutPreloadingEnabled,
    checkoutURL,
    totalQuantity,
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCart({
      variables: {
        cartId,
      },
    }).then(() => setRefreshing(false));
  }, [cartId, fetchCart]);

  const presentCheckout = async () => {
    if (checkoutURL) {
      present(
        checkoutURL,
        {
          onClose: () => {
            sheetEventHandlers.onCancel?.();
          },
          onFail: error => {
            sheetEventHandlers.onFail?.(error);
          },
        },
        sheetProtocolEventHandlers,
      );
    }
  };

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>
          An error occurred while fetching the cart
        </Text>
        <Text style={styles.loadingText}>
          {error?.name} {error?.message}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  if (!data || !data.cart || data.cart.lines.edges.length === 0 || !cartId) {
    return (
      <View style={styles.loading}>
        <Icon name="shopping-bag" size={60} color="#bbc1d6" />
        <Text
          testID={AccessibilityIdentifiers.cart.emptyMessage}
          style={styles.loadingText}>
          Your cart is empty.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.productList}>
          {data?.cart.lines.edges.map(({node}) => (
            <CartItem
              key={node.merchandise.id}
              item={node}
              quantity={node.quantity}
              loading={addingToCart.has(node.id)}
              onRemove={() => removeFromCart(node.id)}
            />
          ))}
        </View>

        <View style={styles.costContainer}>
          <View style={styles.costBlock}>
            <Text style={styles.costBlockText}>Subtotal</Text>
            <Text style={styles.costBlockText}>
              {price(data.cart.cost.subtotalAmount)}
            </Text>
          </View>

          <View style={styles.costBlock}>
            <Text style={styles.costBlockText}>Taxes</Text>
            <Text style={styles.costBlockText}>Estimated at checkout</Text>
          </View>

          <View style={styles.costBlock}>
            <Text style={styles.costBlockTextStrong}>Total</Text>
            <Text style={styles.costBlockTextStrong}>
              {price(data.cart.cost.totalAmount)}
            </Text>
          </View>
        </View>

        {totalQuantity > 0 && cartId && (
          <View>
            <View style={styles.checkoutContainer}>
              <AcceleratedCheckoutButtons
                {...acceleratedCheckoutEventHandlers}
                applePayLabel={ApplePayLabel.checkout}
                applePayStyle={appConfig.applePayStyle}
                cartId={cartId}
                wallets={[
                  AcceleratedCheckoutWallet.applePay,
                  AcceleratedCheckoutWallet.shopPay,
                ]}
                cornerRadius={cornerRadius}
                events={acceleratedCheckoutProtocolEventHandlers}
              />

              <Pressable
                testID={AccessibilityIdentifiers.cart.checkoutButton}
                style={[
                  styles.cartButton,
                  cartMutationInProgress ? styles.cartButtonDisabled : null,
                ]}
                disabled={totalQuantity === 0 || cartMutationInProgress}
                onPress={presentCheckout}>
                <Text
                  testID={AccessibilityIdentifiers.cart.checkoutReady}
                  style={styles.cartButtonText}>
                  Checkout
                </Text>
                <Text style={styles.cartButtonTextSubtitle}>
                  {price(data.cart.cost.totalAmount)}
                </Text>
              </Pressable>

              {appConfig.checkoutPreloadingEnabled && (
                <Text
                  testID={AccessibilityIdentifiers.cart.preloadState}
                  style={styles.preloadState}>
                  Checkout preload: {formatPreloadState(preloadState)}
                </Text>
              )}

              {/* Empty wallets, should not render anything */}
              <AcceleratedCheckoutButtons
                {...acceleratedCheckoutEventHandlers}
                applePayLabel={ApplePayLabel.checkout}
                cartId={cartId}
                wallets={[]}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function price(value: {amount: string; currencyCode: string}) {
  if (!value) {
    return '-';
  }

  const {amount, currencyCode} = value;
  return currency(amount, currencyCode);
}

function formatPreloadState(state: PreloadState) {
  if (state.type === 'failed') {
    const statusCode = state.statusCode ? ` (${state.statusCode})` : '';
    return `Failed: ${state.reason}${statusCode}`;
  }

  return state.type.charAt(0).toUpperCase() + state.type.slice(1);
}

function CartItem({
  item,
  quantity,
  onRemove,
  loading,
}: {
  item: CartLineItem;
  quantity: number;
  loading?: boolean;
  onRemove: () => void;
}) {
  const {colors, cornerRadius} = useTheme();
  const styles = createStyles(colors, cornerRadius);

  return (
    <View
      key={item.id}
      style={{
        ...styles.productItem,
        ...(loading ? styles.productItemLoading : {}),
      }}>
      {item.merchandise.image?.thumbnailUrl && (
        <Image
          resizeMethod="resize"
          resizeMode="cover"
          style={styles.productImage}
          alt={item.merchandise.image?.altText}
          source={{
            uri: item.merchandise.image?.thumbnailUrl,
          }}
        />
      )}
      <View style={styles.productText}>
        <View style={styles.productTextContainer}>
          <Text style={styles.productTitle}>
            {item.merchandise.product.title}
          </Text>
          <Text style={styles.productDescription}>Quantity: {quantity}</Text>
        </View>
        <View>
          <Text style={styles.productPrice}>
            {price(item.cost?.totalAmount)}
          </Text>
          <Pressable style={styles.removeButton} onPress={onRemove}>
            {loading ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={styles.removeButtonText}>Remove</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: Colors, cornerRadius: number) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      padding: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginVertical: 20,
      color: colors.text,
    },
    scrollView: {
      paddingBottom: 10,
    },
    checkoutContainer: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      gap: 8,
    },
    cartButton: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: 'auto',
      height: 48,
      borderRadius: cornerRadius,
      paddingHorizontal: 30,
      paddingVertical: 2,
      backgroundColor: colors.secondary,
      fontWeight: 'bold',
    },
    cartButtonDisabled: {
      opacity: 0.6,
    },
    cartButtonText: {
      fontSize: 22,
      lineHeight: 24,
      textAlign: 'center',
      color: colors.secondaryText,
      fontWeight: 'bold',
    },
    cartButtonTextSubtitle: {
      fontSize: 12,
      textAlign: 'center',
      color: colors.textSubdued,
      fontWeight: 'bold',
    },
    preloadState: {
      color: colors.textSubdued,
      fontSize: 12,
      textAlign: 'center',
    },
    productList: {
      marginVertical: 20,
      paddingHorizontal: 16,
    },
    productItem: {
      display: 'flex',
      flexDirection: 'row',
      marginBottom: 10,
      padding: 10,
      backgroundColor: colors.backgroundSubdued,
      borderRadius: 5,
    },
    productItemLoading: {
      opacity: 0.6,
    },
    productTextContainer: {
      flex: 1,
    },
    productText: {
      paddingLeft: 10,
      display: 'flex',
      flex: 1,
      color: colors.textSubdued,
      justifyContent: 'center',
      flexDirection: 'row',
      alignItems: 'center',
    },
    productTitle: {
      fontSize: 16,
      marginBottom: 5,
      fontWeight: 'bold',
      lineHeight: 20,
      color: colors.text,
    },
    productDescription: {
      fontSize: 14,
      color: colors.textSubdued,
    },
    productPrice: {
      fontSize: 15,
      alignSelf: 'flex-start',
      paddingTop: 10,
      paddingHorizontal: 10,
      paddingBottom: 2,
      fontWeight: 'bold',
      color: colors.text,
    },
    removeButton: {
      alignSelf: 'flex-end',
      marginRight: 10,
      marginTop: 2,
    },
    removeButtonText: {
      color: colors.textSubdued,
    },
    productImage: {
      width: 60,
      height: 60,
      borderRadius: 6,
    },
    costContainer: {
      marginBottom: 10,
      marginHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 65,
      paddingHorizontal: 2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    costBlock: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 5,
      paddingVertical: 5,
    },
    costBlockText: {
      fontSize: 14,
      color: colors.textSubdued,
    },
    costBlockTextStrong: {
      fontSize: 16,
      color: colors.text,
      fontWeight: 'bold',
    },
  });
}

export default CartScreen;
