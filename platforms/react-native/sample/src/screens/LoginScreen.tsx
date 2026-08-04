import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Platform, StyleSheet, View} from 'react-native';
import Config from 'react-native-config';
import {WebView} from 'react-native-webview';
import type {ShouldStartLoadRequest} from 'react-native-webview/lib/WebViewTypes';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {AccountStackParamList} from '../App';
import {useAuth} from '../context/Auth';
import {useConfig} from '../context/Config';
import {BuyerIdentityMode} from '../auth/types';
import {
  CustomerAccountManager,
  customerAccountManager,
} from '../auth/customerAccountManager';
import type {Colors} from '../context/Theme';
import {useTheme} from '../context/Theme';
import {E2ETestIds} from '../e2e/testIds';

type Props = NativeStackScreenProps<AccountStackParamList, 'Login'>;

const ANDROID_VERIFICATION_CODE_INPUT_ID_SCRIPT = `
  (() => {
    const verificationCodeId = '${E2ETestIds.account.verificationCode}';

    const assignVerificationCodeId = () => {
      const verificationCodeInput = document.querySelector(
        'input[autocomplete="one-time-code"]',
      );

      if (!verificationCodeInput) return false;

      verificationCodeInput.id = verificationCodeId;
      return true;
    };

    if (!assignVerificationCodeId()) {
      const observer = new MutationObserver(() => {
        if (assignVerificationCodeId()) observer.disconnect();
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  })();
  true;
`;

function LoginScreen({navigation}: Props) {
  const {handleAuthCallback} = useAuth();
  const {appConfig, setAppConfig} = useConfig();
  const {colors} = useTheme();
  const styles = createStyles(colors);
  const [isProcessing, setIsProcessing] = useState(false);

  const authorizationURL = useMemo(
    () => customerAccountManager.buildAuthorizationURL(),
    [],
  );
  const callbackScheme = CustomerAccountManager.callbackScheme;
  const customUserAgent = Config.CUSTOM_USER_AGENT || undefined;

  const handleNavigationRequest = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      const {url} = request;

      if (url.startsWith(`${callbackScheme}://callback`)) {
        setIsProcessing(true);
        const urlParams = new URL(url);
        const code = urlParams.searchParams.get('code');
        const state = urlParams.searchParams.get('state');

        if (code && state) {
          handleAuthCallback(code, state)
            .then(() => {
              setAppConfig({
                ...appConfig,
                buyerIdentityMode: BuyerIdentityMode.CustomerAccount,
              });
              navigation.goBack();
            })
            .catch(() => {
              setIsProcessing(false);
              navigation.goBack();
            });
        } else {
          navigation.goBack();
        }

        return false;
      }

      return true;
    },
    [appConfig, callbackScheme, handleAuthCallback, navigation, setAppConfig],
  );

  if (isProcessing) {
    return (
      <View testID={E2ETestIds.account.loginProcessing} style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        testID={E2ETestIds.account.loginWebView}
        source={{uri: authorizationURL}}
        applicationNameForUserAgent={customUserAgent}
        injectedJavaScript={
          customUserAgent && Platform.OS === 'android'
            ? ANDROID_VERIFICATION_CODE_INPUT_ID_SCRIPT
            : undefined
        }
        onShouldStartLoadWithRequest={handleNavigationRequest}
        originWhitelist={['https://*', `${callbackScheme}://*`]}
        incognito={true}
        style={styles.webview}
      />
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    webview: {
      flex: 1,
    },
  });
}

export default LoginScreen;
