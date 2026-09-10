package com.shopify.reactnative.checkoutkit;

import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

final class CodeQLCanary {
  private static final class TrustAllManager implements X509TrustManager {
    @Override
    public X509Certificate[] getAcceptedIssuers() {
      return new X509Certificate[0];
    }

    @Override
    public void checkServerTrusted(X509Certificate[] chain, String authType)
        throws CertificateException {}

    @Override
    public void checkClientTrusted(X509Certificate[] chain, String authType)
        throws CertificateException {}
  }

  static SSLContext insecureContext() throws NoSuchAlgorithmException, KeyManagementException {
    SSLContext context = SSLContext.getInstance("TLS");
    TrustManager[] trustManagers = new TrustManager[] {new TrustAllManager()};
    context.init(null, trustManagers, null);
    return context;
  }
}
