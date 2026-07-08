export class CheckoutFixture {
  static readonly ORIGIN = "https://checkout.example.test";
  static readonly CHECKOUT_ID = "checkout_test_1";
  static readonly ORDER_ID = "order_test_1";
  static readonly ERROR_CODE = "checkout_failed";

  static get glob(): string {
    return `${this.ORIGIN}/**`;
  }

  static url(path = ""): string {
    return `${this.ORIGIN}${path}`;
  }

  static src(params: Record<string, string> = {}): string {
    const searchParams = new URLSearchParams(params);
    return `${this.ORIGIN}/checkout/${this.CHECKOUT_ID}${
      searchParams.size > 0 ? `?${searchParams}` : ""
    }`;
  }
}
