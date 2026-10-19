// @ts-check

/**
 * @typedef {import("../generated/api").CartTransformRunInput} CartTransformRunInput
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 */

/**
 * Expands any line carrying `_bundle_items` (comma-separated variant IDs) into those variants.
 * Price is left to Shopify, which splits the bundle line's price across components by their variant price.
 *
 * @param {CartTransformRunInput} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  const operations = [];

  for (const line of input.cart.lines) {
    const value = line.bundleItems?.value;
    // Only real bundle products (custom.bundle_size metafield) expand; everything else is untouched.
    const size = Number(
      line.merchandise.__typename === "ProductVariant" ? line.merchandise.product.bundleSize?.value : 0,
    );
    if (!value || !size) continue;

    const ids = value.split(",").map((s) => s.trim());
    // Property is client-controlled: reject extra/missing/garbage IDs instead of giving them away at bundle price.
    if (ids.length !== size || !ids.every((id) => /^\d+$/.test(id))) continue;

    // Same fragrance can be picked twice -> merge into one component with quantity 2.
    const counts = new Map();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);

    operations.push({
      lineExpand: {
        cartLineId: line.id,
        // Quantities are per one bundle; Shopify multiplies by the line quantity.
        expandedCartItems: [...counts].map(([id, quantity]) => ({
          merchandiseId: `gid://shopify/ProductVariant/${id}`,
          quantity,
        })),
      },
    });
  }

  return { operations };
}
