import { expect, test } from "../../support";

for (const distribution of ["npm", "cdn"] as const) {
  test(`preserves Shop Pay button branding against page CSS (${distribution})`, async ({
    page,
  }) => {
    await page.goto("/cdn");
    await page.addStyleTag({
      content: `
        shop-pay::part(button),
        shop-pay::part(button):hover {
          background: rgb(255, 0, 0);
          color: rgb(0, 255, 0);
          border-radius: 50px;
        }
      `,
    });
    await page.evaluate(async (loadedDistribution) => {
      if (loadedDistribution === "npm") {
        const registrationUrl = "/dist/shop-pay.js";
        await import(registrationUrl);
      } else {
        const loaderUrl = "/cdn/checkout-kit.js";
        const { loadComponents } = await import(loaderUrl);
        await loadComponents(["shop-pay"]);
      }
      const shopPay = document.createElement("shop-pay");
      shopPay.setAttribute("button", "");
      shopPay.setAttribute("telemetry", "false");
      shopPay.setAttribute("src", "https://shop.example.com/checkouts/uc/example?key=example");
      document.body.append(shopPay);
    }, distribution);

    const button = page.getByRole("button", { name: "Buy with Shop Pay" });
    await expect(button).toBeVisible();
    await expect(button).toHaveCSS("background-color", "rgb(84, 51, 235)");
    await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(button).toHaveCSS("border-radius", "4px");

    await button.hover();
    await expect(button).toHaveCSS("background-color", "rgb(60, 10, 194)");
    await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(button).toHaveCSS("border-radius", "4px");
  });
}
