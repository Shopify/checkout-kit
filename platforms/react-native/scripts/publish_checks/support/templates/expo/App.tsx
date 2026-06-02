/* eslint-disable eslint-comments/no-unlimited-disable */
// @ts-nocheck
/* eslint-disable */

import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckoutProtocol,
  ShopifyCheckoutProvider,
  useShopifyCheckout,
} from '@shopify/checkout-kit-react-native';
import type {ProtocolHandlers} from '@shopify/checkout-kit-react-native';

const smokeConfig = require('./smoke.config.json') as {
  storefrontDomain: string;
  storefrontAccessToken: string;
  storefrontVersion: string;
  checkoutUrl: string;
};

const STOREFRONT_DOMAIN = smokeConfig.storefrontDomain;
const STOREFRONT_ACCESS_TOKEN = smokeConfig.storefrontAccessToken;
const STOREFRONT_VERSION = smokeConfig.storefrontVersion;
const HARDCODED_CHECKOUT_URL = smokeConfig.checkoutUrl;

function appendLog(setLogs: React.Dispatch<React.SetStateAction<string[]>>, message: string) {
  const line = `${new Date().toISOString()}  ${message}`;
  console.log(line);
  setLogs(previous => [line, ...previous].slice(0, 40));
}

async function storefrontGraphql(query: string, variables: Record<string, unknown> = {}) {
  if (!STOREFRONT_DOMAIN || !STOREFRONT_ACCESS_TOKEN) {
    throw new Error('Set STOREFRONT_DOMAIN and STOREFRONT_ACCESS_TOKEN, or set CHECKOUT_URL, before launching checkout.');
  }

  const response = await fetch(
    `https://${STOREFRONT_DOMAIN}/api/${STOREFRONT_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({query, variables}),
    },
  );

  const json = await response.json();
  if (!response.ok || json.errors?.length) {
    throw new Error(JSON.stringify(json.errors ?? json, null, 2));
  }
  return json.data;
}

async function createCheckoutUrl() {
  if (HARDCODED_CHECKOUT_URL.length > 0) {
    return HARDCODED_CHECKOUT_URL;
  }

  const productData = await storefrontGraphql(`
    query FirstAvailableVariant {
      products(first: 10) {
        edges {
          node {
            title
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  availableForSale
                }
              }
            }
          }
        }
      }
    }
  `);

  const variant = productData.products.edges
    .flatMap((edge: any) => edge.node.variants.edges.map((variantEdge: any) => ({
      productTitle: edge.node.title,
      ...variantEdge.node,
    })))
    .find((node: any) => node.availableForSale);

  if (!variant?.id) {
    throw new Error(`No available variants found for ${STOREFRONT_DOMAIN}`);
  }

  const cartData = await storefrontGraphql(
    `mutation CreateCheckoutKitSmokeCart($lines: [CartLineInput!]!) {
      cartCreate(input: {lines: $lines}) {
        cart {
          id
          checkoutUrl
          totalQuantity
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {lines: [{merchandiseId: variant.id, quantity: 1}]},
  );

  const errors = cartData.cartCreate.userErrors;
  if (errors?.length) {
    throw new Error(JSON.stringify(errors, null, 2));
  }

  const checkoutUrl = cartData.cartCreate.cart?.checkoutUrl;
  if (!checkoutUrl) {
    throw new Error('cartCreate did not return checkoutUrl');
  }

  return checkoutUrl;
}

function SmokeScreen() {
  const checkout = useShopifyCheckout();
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const protocolSummary = useMemo(
    () => Object.entries(CheckoutProtocol).map(([name, method]) => `${name}: ${method}`).join('\n'),
    [],
  );

  const launchCheckout = useCallback(async () => {
    setBusy(true);
    try {
      appendLog(setLogs, `CheckoutProtocol.start = ${CheckoutProtocol.start}`);
      appendLog(setLogs, 'Creating checkout URL');
      const checkoutUrl = await createCheckoutUrl();
      appendLog(setLogs, `Presenting checkout: ${checkoutUrl}`);

      const protocolHandlers: ProtocolHandlers = {
        [CheckoutProtocol.start]: payload => appendLog(setLogs, `protocol start: ${JSON.stringify(payload).slice(0, 300)}`),
        [CheckoutProtocol.complete]: payload => appendLog(setLogs, `protocol complete: ${JSON.stringify(payload).slice(0, 300)}`),
        [CheckoutProtocol.error]: payload => appendLog(setLogs, `protocol error: ${JSON.stringify(payload).slice(0, 300)}`),
        [CheckoutProtocol.lineItemsChange]: payload => appendLog(setLogs, `protocol lineItemsChange: ${JSON.stringify(payload).slice(0, 300)}`),
        [CheckoutProtocol.messagesChange]: payload => appendLog(setLogs, `protocol messagesChange: ${JSON.stringify(payload).slice(0, 300)}`),
        [CheckoutProtocol.totalsChange]: payload => appendLog(setLogs, `protocol totalsChange: ${JSON.stringify(payload).slice(0, 300)}`),
      };

      checkout.present(
        checkoutUrl,
        {
          onClose: () => appendLog(setLogs, 'checkout closed'),
          onFail: error => appendLog(setLogs, `checkout failed: ${error.message}`),
        },
        protocolHandlers,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendLog(setLogs, `ERROR: ${message}`);
      Alert.alert('Checkout smoke error', message);
    } finally {
      setBusy(false);
    }
  }, [checkout]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Checkout Kit Expo Tarball Smoke</Text>
        <Text style={styles.body}>This app was created with Expo CLI, installed the packed tarball, and imports CheckoutProtocol through the installed package.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Protocol methods resolved at runtime</Text>
          <Text style={styles.mono}>{protocolSummary}</Text>
        </View>

        <TouchableOpacity disabled={busy} style={[styles.button, busy && styles.buttonDisabled]} onPress={launchCheckout}>
          {busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Create cart + launch checkout</Text>}
        </TouchableOpacity>

        <Text style={styles.label}>Logs</Text>
        {logs.map((line, index) => (
          <Text key={`${line}-${index}`} style={styles.log}>{line}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ShopifyCheckoutProvider>
      <SmokeScreen />
    </ShopifyCheckoutProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#0b1020'},
  content: {gap: 16, padding: 20},
  title: {color: 'white', fontSize: 24, fontWeight: '700'},
  body: {color: '#cbd5e1', fontSize: 16, lineHeight: 22},
  card: {backgroundColor: '#111827', borderRadius: 12, padding: 16},
  label: {color: '#93c5fd', fontSize: 14, fontWeight: '700', marginBottom: 8},
  mono: {color: '#e5e7eb', fontFamily: 'Courier', fontSize: 13, lineHeight: 20},
  button: {alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 12, padding: 16},
  buttonDisabled: {opacity: 0.6},
  buttonText: {color: 'white', fontSize: 16, fontWeight: '700'},
  log: {color: '#d1d5db', fontFamily: 'Courier', fontSize: 12, marginBottom: 6},
});
