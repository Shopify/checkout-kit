interface CheckoutWindowOptions {
  features?: string;
  body?: URLSearchParams;
}

export function openCheckoutWindow(
  src: string,
  target: string,
  { features, body }: CheckoutWindowOptions = {},
): WindowProxy | null {
  if (body === undefined) {
    return features === undefined ? window.open(src, target) : window.open(src, target, features);
  }

  if (body.has("")) {
    throw new TypeError("POST form fields must have a name");
  }

  const windowName =
    target && target !== "auto" && !target.startsWith("_")
      ? target
      : `checkout-${crypto.getRandomValues(new Uint32Array(4)).join("-")}`;
  const checkoutWindow =
    features === undefined
      ? window.open("about:blank", windowName)
      : window.open("about:blank", windowName, features);

  if (!checkoutWindow) return null;

  const form = document.createElement("form");
  form.method = "post";
  form.enctype = "application/x-www-form-urlencoded";
  form.acceptCharset = "UTF-8";
  form.action = src;
  form.target = windowName;
  form.hidden = true;

  const fields = document.createDocumentFragment();
  for (const [name, value] of body) {
    const field = document.createElement("textarea");
    field.name = name;
    field.value = value;
    fields.append(field);
  }
  form.append(fields);

  try {
    document.body.append(form);
    HTMLFormElement.prototype.submit.call(form);
  } catch (error) {
    checkoutWindow.close();
    throw error;
  } finally {
    Element.prototype.remove.call(form);
  }

  return checkoutWindow;
}
