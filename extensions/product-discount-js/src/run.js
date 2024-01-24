// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 * @typedef {import("../generated/api").Target} Target
 * @typedef {import("../generated/api").ProductVariant} ProductVariant
 * @typedef {import("../generated/api").Product} Product
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  /**
   * @type {[{
   *   quantity: number
   *   percentage: number
   *   productVariants: {
   *    id: string
   *    size: number
   *    variants: any
   *    selectedVariants: string[]
   *  }[]
   * }]}
   */
  const configurations = JSON.parse(
    input?.discountNode?.metafield?.value ?? "[]"
  );

  configurations.forEach((configuration) => {
    if (!configuration.quantity || !configuration.percentage) {
      return EMPTY_DISCOUNT;
    }
  });

  function extractSelectedVariants(data) {
    const selectedVariants = data.productVariants.flatMap((productVariant) =>
      productVariant.selectedVariants.map((variantId) => ({
        productVariant: {
          id: variantId,
        },
      }))
    );

    return {
      quantity: data.quantity,
      percentage: data.percentage,
      selectedVariants: selectedVariants,
    };
  }

  const results = configurations.map((configuration) =>
    extractSelectedVariants(configuration)
  );

  const discounts = results.map((result) => {
    return {
      targets: result.selectedVariants,
      message: `${result.percentage}% off`,
      value: {
        percentage: {
          value: result.percentage.toString(),
        },
      },
    };
  });

  discounts.forEach((discount) => {
    if (!discount.targets.length) {
      console.error("No cart lines qualify for volume discount.");
      return EMPTY_DISCOUNT;
    }
  });

  return {
    discounts,
    discountApplicationStrategy: DiscountApplicationStrategy.All,
  };
}
