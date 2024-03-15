// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  let cartOperations = input ? getMergeCartOperations(input.cart) : [];
  if (cartOperations.length > 0) {
    return {
      operations: cartOperations,
    };
  }
  return NO_CHANGES;
}

function getMergeCartOperations(cart) {
  let result = [];

  for (const line of cart.lines) {
    let variant =
      line.merchandise.__typename === "ProductVariant"
        ? line.merchandise
        : null;
    if (!variant) continue;

    let componentReferences = getComponentReferences(variant);

    if (componentReferences.variants.length === 0) continue;

    let expandRelationship = componentReferences.variants.map(
      (reference, index) => {
        return {
          merchandiseId: reference,
          quantity: Number(componentReferences?.quantity) ?? 1,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: index === 0 ? line.cost.amountPerQuantity.amount : 0,
              },
            },
          },
        };
      }
    );
    
    let expandOps = {
      cartLineId: line.id,
      title: line.title,
      expandedCartItems: expandRelationship,
    };

    result.push({ expand: expandOps });
  }

  return result;
}

function getComponentReferences(variant) {
  if (variant.component_reference) {
    return {
      quantity: JSON.parse(variant.component_reference.value).quantity,
      variants: JSON.parse(variant.component_reference.value).variants,
    };
  }

  return {
    quantity: 1,
    variants: [],
  };
}
