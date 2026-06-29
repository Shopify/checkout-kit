import { css, type SafeMarkup } from "./utils";

export const STYLES: SafeMarkup = css`
  * {
    box-sizing: border-box;
  }

  #shopify-element-wrapper,
  .Shopify-target {
    inline-size: 100%;
    block-size: 100%;
    border: none;
  }

  #checkout-frame {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    border: 0;
    background: hsl(0, 0%, 100%);
  }

  :host {
    @media (prefers-reduced-motion: reduce) {
      --shopify-checkout-overlay-transition-duration: 1ms;
    }

    /*
     * Reset any inheritable styles to ensure the text and links are visible by default no matter
     * what the embedding website's styles are. An embedder may override these values
     * using CSS parts.
     */
    color: hsl(0, 0%, 10%);
    font-family: system-ui, sans-serif;
    font-size: initial;
    line-height: 1.5;
    letter-spacing: initial;
    font-weight: initial;
    font-style: initial;
    text-align: initial;
    word-spacing: initial;
    text-transform: initial;
    text-decoration: initial;
    text-indent: initial;
    /* checkout applies subpixel-antialiased */
    -webkit-font-smoothing: subpixel-antialiased;
    -moz-osx-font-smoothing: initial;
    text-rendering: initial;

    a,
    a:hover,
    a:visited,
    a:focus,
    a:active {
      color: inherit;
    }
  }

  .overlay {
    padding: 0;
    transition:
      display var(--shopify-checkout-dialog-transition-duration, 150ms) allow-discrete,
      overlay var(--shopify-checkout-dialog-transition-duration, 150ms) allow-discrete;
  }

  .overlay-background {
    opacity: 0;
    position: fixed;
    place-items: center;
    inset: 0;
    background-color: hsla(0, 0%, 0%, 0.8);
    transition:
      opacity var(--shopify-checkout-overlay-transition-duration, 150ms) ease-out,
      backdrop-filter var(--shopify-checkout-overlay-transition-duration, 150ms) ease-out,
      display var(--shopify-checkout-overlay-transition-duration, 150ms) allow-discrete,
      overlay var(--shopify-checkout-overlay-transition-duration, 150ms) allow-discrete;
    color: hsl(0, 0%, 100%);
    font-size: 1.125em;
    text-align: center;
    overflow: auto;
  }

  .overlay[open] .overlay-background {
    display: grid;
    opacity: 1;
    backdrop-filter: blur(6px);
  }

  @starting-style {
    .overlay[open] .overlay-background {
      opacity: 0;
    }
  }

  .overlay-content-wrapper {
    display: grid;
    grid-template-rows: 1fr 20%;
    place-items: center;
    inline-size: 100%;
    block-size: 100%;
  }

  .overlay-content {
    padding: 0.75em;
    max-inline-size: 21em;
  }

  .overlay-close-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    background: transparent;
    border: none;
    padding: 0.625em;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    opacity: 0.8;
    text-decoration: underline;
    line-height: 0;

    &:hover {
      opacity: 1;
    }

    svg {
      inline-size: 1em;
      block-size: 1em;
      line-height: 0;
      fill: currentColor;
    }
  }

  :host([presentation="iframe"]) {
    display: block;
    block-size: var(--shopify-checkout-iframe-height, 640px);
    min-block-size: var(--shopify-checkout-iframe-min-height, 640px);
  }
`;
