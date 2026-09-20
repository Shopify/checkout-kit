export const WALLETS_SHELL = `
  <main id="layout">
    <section class="panel settings-panel"></section>
    <section class="panel runtime-panel"></section>
    <div class="col-resizer" id="resize-left" tabindex="0"></div>
    <div class="col-resizer" id="resize-right" tabindex="0"></div>
    <form id="wallets-form" autocomplete="off">
      <fieldset class="source-group source-switcher">
        <legend>Purchase source</legend>
        <label><input type="radio" name="purchase-source" value="cart" checked /></label>
        <label><input type="radio" name="purchase-source" value="buynow" /></label>
      </fieldset>
      <fieldset id="wallets-cart-source"></fieldset>
      <fieldset id="wallets-buynow-source" hidden>
        <input id="wallets-variant-id" type="text" name="variant-id" />
        <input id="wallets-selling-plan-id" type="text" name="selling-plan-id" />
      </fieldset>
      <input id="wallets-storefront-domain" type="text" name="storefront-domain" />
      <input id="wallets-access-token" type="text" name="access-token" />
      <input id="wallets-country" type="text" name="country" />
      <input id="wallets-language" type="text" name="language" />
      <input id="wallets-wallet-count" type="number" name="wallet-count" min="0" value="0" />
      <select id="wallets-layout" name="layout"><option value="horizontal" selected>horizontal</option><option value="vertical">vertical</option></select>
    </form>
    <button type="button" id="toggle-settings" class="panel-collapse-toggle" aria-expanded="true"></button>
    <button type="button" id="toggle-events" class="panel-collapse-toggle" aria-expanded="true"></button>

    <div id="wallets-element-wrapper"></div>
    <pre id="wallets-element-attrs"></pre>

    <section id="wallets-cart-banner">
      <p id="wallets-cart-summary-text"></p>
      <span id="wallets-cart-count">0 items</span>
      <ol id="wallets-selected-lines"></ol>
      <a id="wallets-generated-src">Add products to derive a cart permalink</a>
      <button type="button" id="wallets-create-cart" class="primary-action" disabled>Create cart</button>
    </section>

    <div id="wallets-build-workspace">
      <span id="wallets-load-state">Waiting for domain</span>
      <p id="wallets-cart-status" role="status"></p>
      <div id="wallets-product-empty"></div>
      <ul id="wallets-product-list"></ul>
    </div>

    <dl>
      <dd id="wallets-state-store-domain">—</dd>
      <dd id="wallets-state-country">—</dd>
      <dd id="wallets-state-language">—</dd>
      <dd id="wallets-state-cart-id">—</dd>
      <dd id="wallets-state-variant-id">—</dd>
      <dd id="wallets-state-selling-plan-id">—</dd>
      <dd id="wallets-state-wallet-count">—</dd>
      <dd id="wallets-state-layout">—</dd>
    </dl>
    <button type="button" id="clear-log">Clear</button>
    <ul id="event-log"></ul>
  </main>
`;
