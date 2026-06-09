const DEFAULT_TIMEOUT_MS = 45_000;

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function envBoolean(name, fallback = false) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw === "1" || raw === "true";
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function normalizeCheckoutUrl(rawUrl, ecAuth) {
  let normalized = rawUrl.trim().replaceAll("\\", "").replaceAll("&amp;", "&");

  if (normalized.startsWith("ttps://")) {
    normalized = `h${normalized}`;
  }

  const url = new URL(normalized);

  if (ecAuth) {
    url.searchParams.set("ec_auth", ecAuth);
  }

  return url.href;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCheckoutElement(commands) {
  await commands.wait("shopify-checkout", { timeout: DEFAULT_TIMEOUT_MS });
}

async function setCheckoutUrl(commands, checkoutUrl) {
  await commands.js.run(`
    const input = document.querySelector('input[name="src"]');
    const target = document.querySelector('select[name="target"]');
    if (!input) throw new Error('input[name="src"] not found');
    if (!target) throw new Error('select[name="target"] not found');

    input.value = ${JSON.stringify(checkoutUrl)};
    target.value = 'popup';

    input.dispatchEvent(new Event('input', {bubbles: true}));
    target.dispatchEvent(new Event('change', {bubbles: true}));
  `);
}

async function installMetricHooks(commands) {
  await commands.js.run(`
    window.__checkoutKitBenchmark = {
      openAt: 0,
      openWallTime: 0,
      checkoutStartAt: 0,
      checkoutCompleteAt: 0,
      checkoutErrorAt: 0,
      checkoutCloseAt: 0,
      openedWindow: false
    };

    const checkout = document.querySelector('shopify-checkout');
    if (!checkout) throw new Error('shopify-checkout element not found');

    const originalOpen = window.open;
    window.open = function patchedOpen(...args) {
      window.__checkoutKitBenchmark.openedWindow = true;
      window.__checkoutKitBenchmark.windowOpenAt = performance.now();
      window.__checkoutKitBenchmark.windowOpenWallTime = Date.now();
      return originalOpen.apply(this, args);
    };

    checkout.addEventListener('checkout:start', () => {
      window.__checkoutKitBenchmark.checkoutStartAt = performance.now();
    });
    checkout.addEventListener('checkout:complete', () => {
      window.__checkoutKitBenchmark.checkoutCompleteAt = performance.now();
    });
    checkout.addEventListener('checkout:error', () => {
      window.__checkoutKitBenchmark.checkoutErrorAt = performance.now();
    });
    checkout.addEventListener('checkout:close', () => {
      window.__checkoutKitBenchmark.checkoutCloseAt = performance.now();
    });
  `);
}

async function prepareArm(commands, arm, leadTimeMs) {
  if (arm !== "none") {
    const speculationRules = arm === "preload_speculation";
    await commands.js.run(`
      const checkout = document.querySelector('shopify-checkout');
      if (!checkout) throw new Error('shopify-checkout element not found');
      checkout.preload({speculationRules: ${JSON.stringify(speculationRules)}});
    `);
  }

  if (leadTimeMs > 0) {
    await commands.js.run(
      `return new Promise((resolve) => setTimeout(resolve, ${JSON.stringify(leadTimeMs)}));`,
    );
  }
}

async function collectPreloadState(commands) {
  return commands.js.run(`
    const links = [
      ...document.head.querySelectorAll('link[data-shopify-checkout-preload=""]')
    ].map((link) => ({
      rel: link.rel,
      href: link.href,
      as: link.as
    }));
    const resources = performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      startTime: entry.startTime,
      responseEnd: entry.responseEnd,
      transferSize: entry.transferSize
    }));
    const preloadEndpointResource = resources.find((entry) =>
      entry.name.includes('/checkouts/internal/preloads.js')
    );

    return {
      linkCount: links.length,
      preconnectCount: links.filter((link) => link.rel.includes('preconnect')).length,
      dnsPrefetchCount: links.filter((link) => link.rel.includes('dns-prefetch')).length,
      prefetchCount: links.filter((link) => link.rel.includes('prefetch')).length,
      speculationRulesCount: document.head.querySelectorAll(
        'script[type="speculationrules"][data-shopify-checkout-preload=""]'
      ).length,
      speculationRulesSupported:
        HTMLScriptElement.supports?.('speculationrules') === true,
      preloadEndpointRequestedBeforeOpen: Boolean(preloadEndpointResource),
      preloadEndpointResponseEndBeforeOpenMs: preloadEndpointResource?.responseEnd
    };
  `);
}

async function openCheckout(commands) {
  await commands.js.run(`
    const checkout = document.querySelector('shopify-checkout');
    if (!checkout) throw new Error('shopify-checkout element not found');
    window.__checkoutKitBenchmark.openAt = performance.now();
    window.__checkoutKitBenchmark.openWallTime = Date.now();
    checkout.open();
  `);
}

async function waitForCheckoutStart(commands) {
  await commands.js.run(`
    return new Promise((resolve) => {
      const started = () => window.__checkoutKitBenchmark?.checkoutStartAt > 0;
      if (started()) {
        resolve(true);
        return;
      }
      const startedAt = performance.now();
      const timer = setInterval(() => {
        if (started() || performance.now() - startedAt > ${DEFAULT_TIMEOUT_MS}) {
          clearInterval(timer);
          resolve(started());
        }
      }, 100);
    });
  `);
}

async function collectPostOpenMetrics(commands) {
  return commands.js.run(`
    const metrics = window.__checkoutKitBenchmark;
    const resources = performance.getEntriesByType('resource');
    const preloadEndpointResource = resources.find((entry) =>
      entry.name.includes('/checkouts/internal/preloads.js')
    );

    return {
      openedWindow: metrics.openedWindow ? 1 : 0,
      openWallTime: metrics.openWallTime,
      openToWindowOpenMs:
        metrics.windowOpenAt > 0 ? metrics.windowOpenAt - metrics.openAt : undefined,
      openToWindowOpenWallMs:
        metrics.windowOpenWallTime > 0
          ? metrics.windowOpenWallTime - metrics.openWallTime
          : undefined,
      openToCheckoutStartMs:
        metrics.checkoutStartAt > 0 ? metrics.checkoutStartAt - metrics.openAt : undefined,
      openToCheckoutCompleteMs:
        metrics.checkoutCompleteAt > 0
          ? metrics.checkoutCompleteAt - metrics.openAt
          : undefined,
      openToCheckoutErrorMs:
        metrics.checkoutErrorAt > 0 ? metrics.checkoutErrorAt - metrics.openAt : undefined,
      openToCheckoutCloseMs:
        metrics.checkoutCloseAt > 0 ? metrics.checkoutCloseAt - metrics.openAt : undefined,
      preloadEndpointRequested: preloadEndpointResource ? 1 : 0,
      preloadEndpointStartBeforeOpenMs:
        preloadEndpointResource && metrics.openAt > 0
          ? metrics.openAt - preloadEndpointResource.startTime
          : undefined,
      preloadEndpointResponseBeforeOpenMs:
        preloadEndpointResource && metrics.openAt > 0
          ? metrics.openAt - preloadEndpointResource.responseEnd
          : undefined
    };
  `);
}

async function waitForNewWindow(context, previousHandles, timeoutMs) {
  const startedAt = Date.now();
  const previous = new Set(previousHandles);

  while (Date.now() - startedAt < timeoutMs) {
    const handles = await context.selenium.driver.getAllWindowHandles();
    const newHandle = handles.find((handle) => !previous.has(handle));
    if (newHandle) return newHandle;
    await sleep(100);
  }

  return undefined;
}

async function waitForPopupNavigationComplete(driver, timeoutMs) {
  const startedAt = Date.now();
  let sawTargetNavigation = false;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const state = await driver.executeScript(`
        return {
          isInitialBlank: location.href === 'about:blank',
          readyState: document.readyState
        };
      `);

      if (!state.isInitialBlank) {
        sawTargetNavigation = true;
      }

      if (sawTargetNavigation && state.readyState === "complete") return;
    } catch {
      // The popup can be between documents while navigation is in flight.
    }

    await sleep(100);
  }
}

async function collectPopupMetrics(
  context,
  previousHandles,
  openerHandle,
  openWallTime,
  timeoutMs,
) {
  const popupHandle = await waitForNewWindow(context, previousHandles, timeoutMs);

  if (!popupHandle || !openWallTime) {
    return { popupWindowDetected: popupHandle ? 1 : 0 };
  }

  const driver = context.selenium.driver;
  let switchedToPopup = false;

  try {
    await driver.switchTo().window(popupHandle);
    switchedToPopup = true;
    await waitForPopupNavigationComplete(driver, timeoutMs);

    const popup = await driver.executeScript(`
      const navigation = performance.getEntriesByType('navigation')[0];
      const paints = performance.getEntriesByType('paint');
      const fcp = paints.find((entry) => entry.name === 'first-contentful-paint');
      const lcps = performance.getEntriesByType('largest-contentful-paint');
      const lcp = lcps.length > 0 ? lcps[lcps.length - 1] : undefined;
      const firstEntry = (name, type) => performance.getEntriesByName(name, type)[0];
      const checkoutVisible = firstEntry('checkout:visible', 'mark');
      const checkoutHydrated = firstEntry('checkout:hydrated', 'mark');
      const checkoutBeforeHydrate = firstEntry('checkout:before-hydrate', 'measure');
      const checkoutHydrate = firstEntry('checkout:hydrate', 'measure');

      return {
        readyState: document.readyState,
        timeOrigin: performance.timeOrigin,
        redirectCount: navigation?.redirectCount,
        redirectStart: navigation?.redirectStart,
        redirectEnd: navigation?.redirectEnd,
        fetchStart: navigation?.fetchStart,
        domainLookupStart: navigation?.domainLookupStart,
        domainLookupEnd: navigation?.domainLookupEnd,
        connectStart: navigation?.connectStart,
        connectEnd: navigation?.connectEnd,
        requestStart: navigation?.requestStart,
        domContentLoadedEventEnd: navigation?.domContentLoadedEventEnd,
        loadEventEnd: navigation?.loadEventEnd,
        responseStart: navigation?.responseStart,
        responseEnd: navigation?.responseEnd,
        firstContentfulPaint: fcp?.startTime,
        largestContentfulPaint: lcp?.startTime,
        checkoutVisible: checkoutVisible?.startTime,
        checkoutHydrated: checkoutHydrated?.startTime,
        checkoutBeforeHydrateStart: checkoutBeforeHydrate?.startTime,
        checkoutBeforeHydrateDuration: checkoutBeforeHydrate?.duration,
        checkoutHydrateStart: checkoutHydrate?.startTime,
        checkoutHydrateDuration: checkoutHydrate?.duration,
        transferSize: navigation?.transferSize,
        encodedBodySize: navigation?.encodedBodySize,
        decodedBodySize: navigation?.decodedBodySize
      };
    `);

    const toOpen = (value) =>
      typeof value === "number" && Number.isFinite(value)
        ? popup.timeOrigin + value - openWallTime
        : undefined;

    return {
      popupWindowDetected: 1,
      popupRedirectCount: popup.redirectCount,
      popupRedirectStartMs: popup.redirectStart,
      popupRedirectEndMs: popup.redirectEnd,
      popupRedirectDurationMs:
        typeof popup.redirectStart === "number" && popup.redirectStart > 0
          ? popup.redirectEnd - popup.redirectStart
          : undefined,
      popupFetchStartMs: popup.fetchStart,
      popupDomainLookupDurationMs:
        typeof popup.domainLookupStart === "number"
          ? popup.domainLookupEnd - popup.domainLookupStart
          : undefined,
      popupConnectDurationMs:
        typeof popup.connectStart === "number" ? popup.connectEnd - popup.connectStart : undefined,
      popupRequestStartMs: popup.requestStart,
      popupDomContentLoadedMs: popup.domContentLoadedEventEnd,
      popupLoadEventEndMs: popup.loadEventEnd,
      popupResponseStartMs: popup.responseStart,
      popupResponseEndMs: popup.responseEnd,
      popupRequestToResponseStartMs:
        typeof popup.requestStart === "number"
          ? popup.responseStart - popup.requestStart
          : undefined,
      popupResponseDurationMs:
        typeof popup.responseStart === "number"
          ? popup.responseEnd - popup.responseStart
          : undefined,
      popupFirstContentfulPaintMs: popup.firstContentfulPaint,
      popupLargestContentfulPaintMs: popup.largestContentfulPaint,
      popupCheckoutVisibleMs: popup.checkoutVisible,
      popupCheckoutHydratedMs: popup.checkoutHydrated,
      popupCheckoutBeforeHydrateStartMs: popup.checkoutBeforeHydrateStart,
      popupCheckoutBeforeHydrateDurationMs: popup.checkoutBeforeHydrateDuration,
      popupCheckoutHydrateStartMs: popup.checkoutHydrateStart,
      popupCheckoutHydrateDurationMs: popup.checkoutHydrateDuration,
      popupCheckoutBootDurationMs:
        typeof popup.checkoutHydrated === "number" && typeof popup.responseStart === "number"
          ? popup.checkoutHydrated - popup.responseStart
          : undefined,
      popupCheckoutInertDurationMs:
        typeof popup.checkoutHydrated === "number" && typeof popup.checkoutVisible === "number"
          ? popup.checkoutHydrated - popup.checkoutVisible
          : undefined,
      popupCheckoutVisibleToFirstContentfulPaintMs:
        typeof popup.firstContentfulPaint === "number" && typeof popup.checkoutVisible === "number"
          ? popup.firstContentfulPaint - popup.checkoutVisible
          : undefined,
      popupTransferSize: popup.transferSize,
      popupEncodedBodySize: popup.encodedBodySize,
      popupDecodedBodySize: popup.decodedBodySize,
      openToPopupRedirectStartMs: toOpen(popup.redirectStart),
      openToPopupRedirectEndMs: toOpen(popup.redirectEnd),
      openToPopupFetchStartMs: toOpen(popup.fetchStart),
      openToPopupRequestStartMs: toOpen(popup.requestStart),
      openToPopupDomContentLoadedMs: toOpen(popup.domContentLoadedEventEnd),
      openToPopupLoadEventEndMs: toOpen(popup.loadEventEnd),
      openToPopupResponseStartMs: toOpen(popup.responseStart),
      openToPopupResponseEndMs: toOpen(popup.responseEnd),
      openToPopupFirstContentfulPaintMs: toOpen(popup.firstContentfulPaint),
      openToPopupLargestContentfulPaintMs: toOpen(popup.largestContentfulPaint),
      openToPopupCheckoutVisibleMs: toOpen(popup.checkoutVisible),
      openToPopupCheckoutHydratedMs: toOpen(popup.checkoutHydrated),
    };
  } catch (error) {
    context.log.warn(`Could not collect popup metrics: ${error.message}`);
    return { popupWindowDetected: 1, popupMetricsError: 1 };
  } finally {
    if (switchedToPopup) {
      try {
        await driver.close();
      } catch {
        // Ignore cleanup failures; the next iteration starts from a cleared browser context.
      }
    }

    try {
      await driver.switchTo().window(openerHandle);
    } catch {
      // If the opener was already gone, let Browsertime surface the session state.
    }
  }
}

function numericMetricsOnly(metrics) {
  return Object.fromEntries(
    Object.entries(metrics).filter(
      ([, value]) => typeof value === "number" && Number.isFinite(value),
    ),
  );
}

module.exports = async function checkoutPreloadBenchmark(context, commands) {
  const checkoutUrl = normalizeCheckoutUrl(
    getRequiredEnv("CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL"),
    process.env.CHECKOUT_KIT_BENCHMARK_EC_AUTH,
  );
  const sampleUrl = process.env.CHECKOUT_KIT_BENCHMARK_SAMPLE_URL ?? "http://localhost:5173";
  const arm = process.env.CHECKOUT_KIT_BENCHMARK_ARM ?? "none";
  const leadTimeMs = envNumber("CHECKOUT_KIT_BENCHMARK_LEAD_TIME_MS", 2_000);
  const equalizeLeadTime = envBoolean("CHECKOUT_KIT_BENCHMARK_EQUALIZE_LEAD_TIME", true);
  const waitForStart = envBoolean("CHECKOUT_KIT_BENCHMARK_WAIT_FOR_START", true);
  const collectPopup = envBoolean("CHECKOUT_KIT_BENCHMARK_COLLECT_POPUP", true);
  const popupTimeoutMs = envNumber("CHECKOUT_KIT_BENCHMARK_POPUP_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);

  if (!["none", "preload", "preload_speculation"].includes(arm)) {
    throw new Error(
      `Unsupported CHECKOUT_KIT_BENCHMARK_ARM=${arm}. Expected none, preload, or preload_speculation.`,
    );
  }

  await commands.cache.clear();
  await commands.measure.start(sampleUrl, `${arm}-${leadTimeMs}ms`);
  await waitForCheckoutElement(commands);
  await setCheckoutUrl(commands, checkoutUrl);
  await installMetricHooks(commands);

  await prepareArm(commands, arm, arm === "none" && !equalizeLeadTime ? 0 : leadTimeMs);

  const preloadState = await collectPreloadState(commands);
  const openerHandle = await context.selenium.driver.getWindowHandle();
  const windowHandlesBeforeOpen = await context.selenium.driver.getAllWindowHandles();
  await openCheckout(commands);

  if (waitForStart) {
    await waitForCheckoutStart(commands);
  }

  const postOpenMetrics = await collectPostOpenMetrics(commands);
  const openWallTime = postOpenMetrics.openWallTime;
  delete postOpenMetrics.openWallTime;
  const popupMetrics = collectPopup
    ? await collectPopupMetrics(
        context,
        windowHandlesBeforeOpen,
        openerHandle,
        openWallTime,
        popupTimeoutMs,
      )
    : {};

  const metrics = {
    arm,
    leadTimeMs,
    equalizeLeadTime: equalizeLeadTime ? 1 : 0,
    iteration: context.index,
    ...preloadState,
    ...postOpenMetrics,
    ...popupMetrics,
  };

  commands.measure.addObject(numericMetricsOnly(metrics));

  // eslint-disable-next-line no-console
  console.log(`checkout-kit-preload-benchmark ${JSON.stringify(metrics)}`);
};
