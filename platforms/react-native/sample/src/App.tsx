import type {PropsWithChildren, ReactNode} from 'react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import {
  NavigationContainer,
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ApolloClient, InMemoryCache, ApolloProvider} from '@apollo/client';
import Icon from 'react-native-vector-icons/Entypo';

import CatalogScreen from './screens/CatalogScreen';
import SettingsScreen from './screens/SettingsScreen';
import AccountScreen from './screens/AccountScreen';
import LoginScreen from './screens/LoginScreen';

import type {Configuration, Features} from '@shopify/checkout-kit-react-native';
import {
  ApplePayContactField,
  ColorScheme,
  LogLevel,
  ShopifyCheckoutProvider,
  useShopifyCheckout,
} from '@shopify/checkout-kit-react-native';
import {ConfigProvider, useConfig} from './context/Config';
import {BuyerIdentityMode} from './auth/types';
import {
  ThemeProvider,
  getCheckoutKitColors,
  getNavigationTheme,
  useTheme,
} from './context/Theme';
import {CartProvider, useCart} from './context/Cart';
import {useAuth} from './context/Auth';
import CartScreen from './screens/CartScreen';
import ProductDetailsScreen from './screens/ProductDetailsScreen';
import type {ProductVariant, ShopifyProduct} from '../@types';
import ErrorBoundary from './ErrorBoundary';
import env from 'react-native-config';
import {createDebugLogger} from './utils';
import {useShopifyEventHandlers} from './hooks/useCheckoutEventHandlers';
import {useE2ECartBootstrap} from './hooks/useE2ECartBootstrap';
import {E2ETestIds} from './e2e/testIds';

const log = createDebugLogger('ENV');

function configured(value: string | undefined) {
  return value ? 'configured' : 'missing';
}

const storefrontApiVersion = env.API_VERSION ?? env.STOREFRONT_VERSION;

console.groupCollapsed('ENV');
log('STOREFRONT_DOMAIN:', configured(env.STOREFRONT_DOMAIN));
log('STOREFRONT_ACCESS_TOKEN:', configured(env.STOREFRONT_ACCESS_TOKEN));
log('API_VERSION:', configured(storefrontApiVersion));
log(
  'STOREFRONT_MERCHANT_IDENTIFIER:',
  configured(env.STOREFRONT_MERCHANT_IDENTIFIER),
);
log('EMAIL:', configured(env.EMAIL));
log('PHONE:', configured(env.PHONE));
console.groupEnd();

export type RootStackParamList = {
  Catalog: undefined;
  CatalogScreen: undefined;
  ProductDetails: {product: ShopifyProduct; variant?: ProductVariant};
  Cart: undefined;
  CartModal: undefined;
  Account: undefined;
  Settings: undefined;
};

export type AccountStackParamList = {
  AccountHome: undefined;
  Login: undefined;
};

const Tab = createBottomTabNavigator<RootStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const AccountStack = createNativeStackNavigator<AccountStackParamList>();

const styles = StyleSheet.create({
  routes: {
    flex: 1,
  },
});

export const cache = new InMemoryCache();

const client = new ApolloClient({
  uri: `https://${env.STOREFRONT_DOMAIN}/api/${storefrontApiVersion}/graphql.json`,
  cache,
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': env.STOREFRONT_ACCESS_TOKEN ?? '',
  },
  connectToDevTools: __DEV__,
});

function AppWithTheme({children}: PropsWithChildren) {
  const {colorScheme} = useTheme();

  return (
    <ThemeProvider cornerRadius={30} defaultValue={colorScheme}>
      {children}
    </ThemeProvider>
  );
}

const createNavigationIcon =
  (name: string) =>
  ({
    color,
    size,
  }: {
    color: string;
    size: number;
    focused?: boolean;
  }): ReactNode => {
    return <Icon name={name} color={color} size={size} />;
  };

type InitialURLState = {
  url: string | null;
  resolved: boolean;
};

// See https://reactnative.dev/docs/linking#get-the-deep-link for more information
const useInitialURL = (): InitialURLState => {
  const [state, setState] = useState<InitialURLState>({
    url: null,
    resolved: false,
  });

  useEffect(() => {
    let isMounted = true;

    const getUrlAsync = async () => {
      let initialUrl: string | null = null;

      try {
        // Get the deep link used to open the app
        initialUrl = await Linking.getInitialURL();
      } catch (error) {
        console.warn('Failed to get initial URL', error);
      } finally {
        if (isMounted) {
          setState({
            url: initialUrl,
            resolved: true,
          });
        }
      }
    };

    getUrlAsync();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
};

// This code is meant as example only.
class StorefrontURL {
  readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  isThankYouPage(): boolean {
    return /thank[-_]you/i.test(this.url);
  }

  isCheckout(): boolean {
    return this.url.includes('/checkout');
  }

  isCart() {
    return this.url.includes('/cart');
  }
}

const checkoutKitConfigDefaults: Configuration = {
  logLevel: LogLevel.debug,
  colorScheme: ColorScheme.light,
};

function AppWithContext({children}: PropsWithChildren) {
  return (
    <ApolloProvider client={client}>
      <CartProvider>
        <StatusBar barStyle="default" />
        {children}
      </CartProvider>
    </ApolloProvider>
  );
}

function CatalogStack() {
  return (
    <Stack.Navigator
      screenOptions={({navigation}) => ({
        headerBackTitle: 'Back',
        // eslint-disable-next-line react/no-unstable-nested-components
        headerRight: () => (
          <CartIcon
            onPress={() =>
              navigation.getParent()?.navigate('Catalog', {screen: 'CartModal'})
            }
          />
        ),
      })}>
      <Stack.Screen
        name="CatalogScreen"
        component={CatalogScreen}
        options={{
          headerShown: true,
          headerTitle: __DEV__ ? 'Development' : 'Production',
        }}
      />
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
        options={({route}) => ({
          headerTitle: route.params.product.title,
          headerShown: true,
          headerBackVisible: true,
          headerBackTitle: 'Back',
        })}
      />
      <Stack.Screen
        name="CartModal"
        component={CartScreen}
        options={{
          title: 'Cart',
          presentation: 'modal',
          headerRight: undefined,
        }}
      />
    </Stack.Navigator>
  );
}

function CartIcon({onPress}: {onPress: () => void}) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} testID={E2ETestIds.catalog.headerCartIcon}>
      <Icon name="shopping-basket" size={24} color={theme.colors.secondary} />
    </Pressable>
  );
}

function AccountStackScreen() {
  return (
    <AccountStack.Navigator>
      <AccountStack.Screen
        name="AccountHome"
        component={AccountScreen}
        options={{headerTitle: 'Account'}}
      />
      <AccountStack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Sign In',
          presentation: 'modal',
        }}
      />
    </AccountStack.Navigator>
  );
}

function AppWithCheckoutKit({children}: PropsWithChildren) {
  const {appConfig} = useConfig();
  const {isAuthenticated, getValidAccessToken} = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const fetchAccessToken = useCallback(async () => {
    if (
      appConfig.buyerIdentityMode === BuyerIdentityMode.CustomerAccount &&
      isAuthenticated
    ) {
      const token = await getValidAccessToken();
      setAccessToken(token);
    } else {
      setAccessToken(null);
    }
  }, [appConfig.buyerIdentityMode, isAuthenticated, getValidAccessToken]);

  useEffect(() => {
    fetchAccessToken();
  }, [fetchAccessToken]);

  const osColorScheme = useColorScheme();

  const checkoutKitThemeConfig: Configuration = useMemo(
    () =>
      appConfig.colorScheme === ColorScheme.automatic
        ? {colorScheme: ColorScheme.automatic}
        : {
            colorScheme: appConfig.colorScheme,
            colors: getCheckoutKitColors(
              appConfig.colorScheme,
              osColorScheme,
            ),
          },
    [appConfig.colorScheme, osColorScheme],
  );

  const checkoutKitConfig: Configuration = useMemo(() => {
    const customer =
      appConfig.buyerIdentityMode === BuyerIdentityMode.Hardcoded
        ? {
            email: env.EMAIL!,
            phoneNumber: env.PHONE!,
          }
        : appConfig.buyerIdentityMode === BuyerIdentityMode.CustomerAccount &&
            isAuthenticated &&
            accessToken
          ? {
              accessToken,
            }
          : undefined;

    return {
      ...checkoutKitConfigDefaults,
      ...checkoutKitThemeConfig,
      preloading: appConfig.checkoutPreloadingEnabled,
      colors: checkoutKitThemeConfig.colors,
      acceleratedCheckouts: {
        storefrontDomain: env.STOREFRONT_DOMAIN!,
        storefrontAccessToken: env.STOREFRONT_ACCESS_TOKEN!,
        /**
         * We're reading the hardcoded customer email and phone number from the
         * environment variables here, but in a real app you would derive these
         * values from your backend. Customer Account mode provides only the
         * authenticated access token.
         */
        customer,
        wallets: {
          applePay: {
            contactFields: [
              ApplePayContactField.email,
              ApplePayContactField.phone,
            ],
            merchantIdentifier: env.STOREFRONT_MERCHANT_IDENTIFIER!,
          },
        },
      },
    } as Configuration;
  }, [appConfig, checkoutKitThemeConfig, isAuthenticated, accessToken]);

  return (
    <ShopifyCheckoutProvider
      configuration={checkoutKitConfig}
      features={checkoutKitFeatures}>
      {children}
    </ShopifyCheckoutProvider>
  );
}

function AppWithNavigation(props: {children: React.ReactNode}) {
  const {colorScheme, preference} = useTheme();
  return (
    <NavigationContainer theme={getNavigationTheme(colorScheme, preference)}>
      {props.children}
    </NavigationContainer>
  );
}

function Routes() {
  const {totalQuantity} = useCart();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {url: initialUrl, resolved: initialUrlResolved} = useInitialURL();
  const handledInitialUrlRef = useRef<string | null>(null);
  const [linkingReady, setLinkingReady] = useState(false);
  const shopify = useShopifyCheckout();
  const eventHandlers = useShopifyEventHandlers('UniversalLink');
  const navigateToCart = useCallback(() => {
    navigation.navigate('Cart');
  }, [navigation]);
  const handleE2ECartBootstrap = useE2ECartBootstrap({
    onCartReady: navigateToCart,
  });

  useEffect(() => {
    async function handleUniversalLink(url: string) {
      if (await handleE2ECartBootstrap(url)) {
        return;
      }

      const storefrontUrl = new StorefrontURL(url);

      switch (true) {
        // Checkout URLs
        case storefrontUrl.isCheckout() && !storefrontUrl.isThankYouPage():
          shopify.present(url, {
            onClose: () => eventHandlers.onCancel?.(),
            onFail: error => eventHandlers.onFail?.(error),
          });
          return;
        // Cart URLs
        case storefrontUrl.isCart():
          navigateToCart();
          return;
      }

      // Open everything else in a mobile browser
      const canOpenUrl = await Linking.canOpenURL(url);

      if (canOpenUrl) {
        await Linking.openURL(url);
      }
    }

    let isMounted = true;

    // Subscribe to universal links
    const subscription = Linking.addEventListener('url', ({url}) => {
      handleUniversalLink(url);
    });

    const prepareInitialLinking = async () => {
      if (!initialUrlResolved) {
        return;
      }

      if (initialUrl && handledInitialUrlRef.current !== initialUrl) {
        handledInitialUrlRef.current = initialUrl;
        await handleUniversalLink(initialUrl);
      }

      if (isMounted) {
        setLinkingReady(true);
      }
    };

    prepareInitialLinking();

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [
    initialUrl,
    initialUrlResolved,
    shopify,
    navigation,
    eventHandlers,
    handleE2ECartBootstrap,
    navigateToCart,
  ]);

  return (
    <View
      style={styles.routes}
      testID={linkingReady ? E2ETestIds.appReady : undefined}>
      <Tab.Navigator>
        <Tab.Screen
          name="Catalog"
          component={CatalogStack}
          options={{
            headerShown: false,
            tabBarButtonTestID: E2ETestIds.tabs.catalog,
            tabBarIcon: createNavigationIcon('shop'),
          }}
        />
        <Tab.Screen
          name="Cart"
          component={CartScreen}
          options={{
            tabBarButtonTestID: E2ETestIds.tabs.cart,
            tabBarIcon: createNavigationIcon('shopping-bag'),
            tabBarBadge: totalQuantity > 0 ? totalQuantity : undefined,
          }}
        />
        <Tab.Screen
          name="Account"
          component={AccountStackScreen}
          options={{
            headerShown: false,
            tabBarButtonTestID: E2ETestIds.tabs.account,
            tabBarIcon: createNavigationIcon('user'),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarButtonTestID: E2ETestIds.tabs.settings,
            tabBarIcon: createNavigationIcon('cog'),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const checkoutKitFeatures: Partial<Features> = {
  handleGeolocationRequests: true,
};

function App() {
  return (
    <ErrorBoundary>
      <AppWithTheme>
        <ConfigProvider
          config={{
            colorScheme:
              checkoutKitConfigDefaults.colorScheme ?? ColorScheme.automatic,
            buyerIdentityMode: BuyerIdentityMode.Guest,
            checkoutPreloadingEnabled: true,
          }}>
          <AppWithCheckoutKit>
            <AppWithContext>
              <AppWithNavigation>
                <Routes />
              </AppWithNavigation>
            </AppWithContext>
          </AppWithCheckoutKit>
        </ConfigProvider>
      </AppWithTheme>
    </ErrorBoundary>
  );
}

export default App;
