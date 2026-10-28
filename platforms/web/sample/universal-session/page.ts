import { hostOpenLabel } from "./state";
export interface SamplePage {
  readonly tag: "shop-pay" | "shopify-universal-checkout";
  readonly productName: string;
  readonly storagePrefix: string;
  readonly button: boolean;
}

/**
 * Renders the shared sample layout into the given container.
 * The layout is the same for both Shop Pay and Universal Checkout samples.
 */
export function renderLayout(page: SamplePage): string {
  const prepareLabel = page.button ? `Prepare ${page.productName}` : "Prepare session";
  const buyLabel = hostOpenLabel(page);
  const placeholderText = `${page.productName}'s button appears here when a session is ready.`;
  const buttonHelpOn = page.button
    ? `On: <code>&lt;${page.tag}&gt;</code> shows ${page.productName}'s button, and a tap calls <code>open()</code>.`
    : "";
  const buttonHelpOff = `Off: the page's own button calls <code>open()</code>.`;
  const buttonHelp = page.button ? `${buttonHelpOn} ${buttonHelpOff}` : buttonHelpOff;
  const eventEmptyText = `Open ${page.productName} and interact; start, update, complete, error, blocked and close events appear here.`;

  return `
<section class="panel settings-panel" aria-labelledby="settings-heading">
  <div class="panel-header settings-header">
    <h2 id="settings-heading">Settings</h2>
  </div>

  <form id="options-form" autocomplete="off">
    <fieldset class="source-group source-switcher">
      <legend>Flow</legend>
      <label class="radio-card">
        <input type="radio" name="source-mode" value="build" checked />
        <span>
          <strong>Build a cart</strong>
          <small>Load storefront products and prepare a Universal session</small>
        </span>
      </label>
      <label class="radio-card">
        <input type="radio" name="source-mode" value="manual" />
        <span>
          <strong>Use an existing session</strong>
          <small>Paste a Universal session URL</small>
        </span>
      </label>
    </fieldset>

    <fieldset id="storefront-fields" class="source-group source-fields">
      <legend>Stores</legend>
      <label for="storefront-domain">Storefront domain</label>
      <div class="add-store-row">
        <input
          id="storefront-domain"
          type="text"
          name="storefront-domain"
          placeholder="your-store.myshopify.com"
          inputmode="url"
          aria-describedby="storefront-domain-help add-store-error"
        />
        <button type="button" id="add-store-button" class="secondary-action">
          Add store
        </button>
      </div>
      <p id="storefront-domain-help" class="field-help">
        Add each store separately. Its public products load from <code>/products.json</code>.
      </p>
      <p id="add-store-error" class="notice" data-tone="error" role="alert" hidden></p>
      <ol id="stores-list" class="stores-list"></ol>
    </fieldset>

    <fieldset id="session-fields" class="source-group source-fields">
      <legend>Session</legend>
      <label>
        <span>Environment</span>
        <select id="session-environment" name="environment">
          <option value="production">Production</option>
          <option value="development">Local development</option>
        </select>
      </label>
      <label>
        <span>Buyer country</span>
        <select id="buyer-country" name="buyer-country">
          <option value="">Storefront default</option>
          <option value="CA">Canada</option>
          <option value="US">United States</option>
          <option value="DE">Germany</option>
          <option value="GB">United Kingdom</option>
          <option value="AU">Australia</option>
          <option value="NZ">New Zealand</option>
          <option value="JP">Japan</option>
        </select>
      </label>
      <p class="field-help">
        The local sample server creates a Storefront cart for each store, then one Universal
        session from those carts, and returns only the Universal session URL.
      </p>
    </fieldset>

    <fieldset class="source-group source-fields">
      <legend>Presentation</legend>
      ${
        page.button
          ? `<label class="checkbox">
        <input id="shop-pay-button" type="checkbox" name="button" checked />
        <span>button</span>
      </label>
      <p class="field-help">${buttonHelp}</p>`
          : ""
      }

      <label>
        <span>target</span>
        <select id="checkout-target" name="target">
          <option value="popup" selected>popup (window)</option>
          <option value="auto">auto (new tab)</option>
        </select>
      </label>

      <label>
        <span>log-level</span>
        <select id="checkout-log-level" name="log-level">
          <option value="debug">debug</option>
          <option value="warn" selected>warn</option>
          <option value="error">error</option>
          <option value="none">none</option>
        </select>
      </label>
    </fieldset>
  </form>

  <button
    type="button"
    id="toggle-settings"
    class="panel-collapse-toggle"
    aria-expanded="true"
    aria-controls="options-form"
    aria-label="Hide settings panel"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill-rule="evenodd"
        d="M7.22 14.47L9.69 12 7.22 9.53a.75.75 0 111.06-1.06l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 01-1.06-1.06z"
      />
      <path
        fill-rule="evenodd"
        d="M3.75 2A1.75 1.75 0 002 3.75v16.5c0 .966.784 1.75 1.75 1.75h16.5A1.75 1.75 0 0022 20.25V3.75A1.75 1.75 0 0020.25 2H3.75zM3.5 3.75a.25.25 0 01.25-.25H15v17H3.75a.25.25 0 01-.25-.25V3.75zm13 16.75v-17h3.75a.25.25 0 01.25.25v16.5a.25.25 0 01-.25.25H16.5z"
      />
    </svg>
  </button>
</section>

<div
  class="col-resizer"
  id="resize-left"
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize the settings panel"
  tabindex="0"
></div>

<section class="panel storefront" aria-label="Storefront workspace">
  <div id="workspace" class="workspace" data-mode="build" data-ready="false">
    <section class="cart-banner checkout-card" aria-labelledby="checkout-heading">
      <div class="cart-banner-header">
        <div>
          <h2 id="checkout-heading">Cart</h2>
          <p id="checkout-summary" class="muted">Add products to start a cart.</p>
        </div>
        <span id="cart-count" class="pill">0 items</span>
      </div>

      <ol id="selected-lines" class="cart-lines"></ol>

      <div id="manual-source" class="manual-source" hidden>
        <label>
          <span>Universal session URL</span>
          <input
            id="manual-src"
            type="url"
            name="manual-src"
            inputmode="url"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="https://shop.app/checkouts/…?key=…"
          />
        </label>
        <p class="field-help">
          Your server creates the session and passes its URL to
          <code>&lt;${page.tag}&gt;</code> as <code>src</code>.
        </p>
      </div>

      <section class="express-checkout" aria-labelledby="express-heading">
        <div class="express-checkout-header">
          <h3 id="express-heading">${page.button ? "Express checkout" : "Checkout"}</h3>
          <button type="button" id="prepare-session" class="secondary-action" disabled>
            ${prepareLabel}
          </button>
        </div>
        <div id="shop-pay-slot" class="shop-pay-slot">
          ${
            !page.button
              ? `<button type="button" id="host-pay" class="primary-action host-pay-button">
            ${buyLabel}
          </button>`
              : `<button type="button" id="host-pay" class="primary-action host-pay-button" hidden>
            ${buyLabel}
          </button>`
          }
          <p id="shop-pay-placeholder" class="shop-pay-placeholder">
            ${placeholderText}
          </p>
        </div>
        <p id="session-status" class="notice" role="status"></p>
      </section>
    </section>

    <div class="panel-header storefront-header">
      <span id="load-state" class="status-pill">No stores</span>
    </div>

    <div id="product-empty" class="empty-state">
      <div aria-hidden="true">🛍️</div>
      <h3>No stores yet</h3>
      <p>Add a store in Settings. Its products load as soon as it's added.</p>
    </div>

    <div class="product-scroll" aria-label="Product variants">
      <div id="product-list"></div>
    </div>
  </div>
</section>

<div
  class="col-resizer"
  id="resize-right"
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize the events panel"
  tabindex="0"
></div>

<section class="panel runtime-panel" aria-labelledby="events-heading">
  <div class="runtime-scroll">
    <details id="component-state" open>
      <summary>Component state</summary>
      <dl>
        <dt>src</dt>
        <dd id="state-src">—</dd>
        ${
          page.button
            ? `<dt>button</dt>
        <dd id="state-button">—</dd>`
            : ""
        }
        <dt>target</dt>
        <dd id="state-target">—</dd>
        <dt>log-level</dt>
        <dd id="state-log-level">—</dd>
      </dl>
    </details>

    <div class="panel-header events-header" id="events-header">
      <h2 id="events-heading">Events</h2>
      <button type="button" id="clear-log">Clear</button>
    </div>
    <ul id="event-log"></ul>
    <p id="event-empty" class="muted">
      ${eventEmptyText}
    </p>

    <section id="protocol-section" class="protocol-section" aria-label="Protocol messages"></section>
  </div>

  <button
    type="button"
    id="toggle-events"
    class="panel-collapse-toggle"
    aria-expanded="true"
    aria-controls="event-log"
    aria-label="Hide events panel"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill-rule="evenodd"
        d="M7.22 14.47L9.69 12 7.22 9.53a.75.75 0 111.06-1.06l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 01-1.06-1.06z"
      />
      <path
        fill-rule="evenodd"
        d="M3.75 2A1.75 1.75 0 002 3.75v16.5c0 .966.784 1.75 1.75 1.75h16.5A1.75 1.75 0 0022 20.25V3.75A1.75 1.75 0 0020.25 2H3.75zM3.5 3.75a.25.25 0 01.25-.25H15v17H3.75a.25.25 0 01-.25-.25V3.75zm13 16.75v-17h3.75a.25.25 0 01.25.25v16.5a.25.25 0 01-.25.25H16.5z"
      />
    </svg>
  </button>
</section>
`;
}
