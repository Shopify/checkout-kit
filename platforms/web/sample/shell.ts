export const SAMPLE_SHELL = `
  <main id="layout">
    <form id="options-form" autocomplete="off">
      <label><input type="radio" name="source-mode" value="build" checked /></label>
      <label><input type="radio" name="source-mode" value="manual" /></label>
      <fieldset id="storefront-source-fields">
        <input id="storefront-domain" type="text" name="storefront-domain" />
      </fieldset>
      <select id="checkout-target" name="target">
        <option value="popup" selected>popup</option>
        <option value="auto">auto</option>
      </select>
      <select id="checkout-appearance" name="appearance">
        <option value="" selected></option>
        <option value="app:light">app:light</option>
        <option value="app:dark">app:dark</option>
        <option value="app:automatic">app:automatic</option>
        <option value="storefront">storefront</option>
      </select>
      <input id="debug-toggle" type="checkbox" name="debug" />
    </form>
    <button type="button" id="toggle-settings" aria-expanded="true">Hide</button>

    <div id="build-workspace">
      <p id="cart-summary-text"></p>
      <span id="cart-count">0 items</span>
      <ol id="selected-lines"></ol>
      <a id="generated-src">Add products to derive a cart permalink</a>
      <button type="button" id="cart-checkout" disabled>Open checkout</button>
      <p id="cart-checkout-hint"></p>
      <span id="load-state">Waiting for domain</span>
      <p id="cart-status" role="status"></p>
      <div id="product-empty"></div>
      <ul id="product-list"></ul>
    </div>

    <div id="manual-workspace" hidden>
      <input id="manual-src" type="url" name="manual-src" />
      <button type="button" id="manual-checkout" disabled>Open checkout</button>
    </div>

    <dl>
      <dd id="state-checkout">—</dd>
      <dd id="state-error">—</dd>
      <dd id="state-target">—</dd>
      <dd id="state-appearance">—</dd>
      <dd id="state-debug">—</dd>
    </dl>
    <button type="button" id="clear-log">Clear</button>
    <ul id="event-log"></ul>
  </main>
`;
