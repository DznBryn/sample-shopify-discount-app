export async function getProducts({
  admin,
  hasNextPage,
  lastProductCursor,
  products,
}) {
  while (hasNextPage) {
    const data = await admin.graphql(GET_PRODUCT_WITH_PURCHASE, {
      variables: {
        first: 100,
        lastProductCursor,
        variantsFirst: 100,
      },
    });
    const dataJson = await data.json();

    if (dataJson?.data?.products?.edges?.length > 0) {
      const edges = dataJson.data.products.edges;
      hasNextPage = dataJson.data.products.pageInfo.hasNextPage;
      lastProductCursor = edges[edges.length - 1]?.cursor;

      edges.forEach((edge) => {
        const variants = edge.node.variants.edges.filter(
          (variantEdge) => variantEdge.node?.metafield
        );

        if (variants.length > 0) {
          products.push(
            ...variants.map((variantEdge) => {
              variantEdge.node.metafield.value = JSON.parse(
                variantEdge.node.metafield.value
              );
              return {
                productId: edge?.node?.id,
                productTitle: edge?.node?.title,
                image: edge?.node?.featuredImage,
                prices: edge?.node?.priceRangeV2,
                ...variantEdge.node,
              };
            })
          );
        }
      });
    }
  }
  return products;
}

export async function getProductVariant(admin, { id }) {
  const data = await admin.graphql(GET_PRODUCT_VARIANT, {
    variables: {
      id,
    },
  });
  const dataJson = await data.json();
  return dataJson;
}

export const GET_PRODUCTS = `#graphql
  	query getProducts($first: Int!, $lastProductCursor: String, $variantsFirst: Int! ) {
    products(first: $first, after: $lastProductCursor) {
      edges {
        cursor
        node {
          id
          title
          handle
          variants(first: $variantsFirst) {
            edges {
              node {
                id
                title
                metafield(namespace: "global", key: "discountVariants") {     
                  id
                  key
                  value
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

export const GET_PRODUCT_BY_ID = `#graphql
  query getProductById($id: ID!) {
    product(id: $id) {
      id
      variants(first: 10) {
      edges {
        node {
          id
          title
          metafield(namespace: "global", key: "discountVariants") {     
            id
            key
            value
          }
          media(first: 1) {
            edges {
              node {
                alt
                mediaContentType
                status
                __typename
                ... on MediaImage {
                  id
                  preview {
                    image {
                      originalSrc
                    }
                  }
                  __typename
                }
              }
            }
          }
        }
      }
    }
    }
  }
`;
export const BULK_UPDATE_PRODUCT_VARIANTS = `#graphql
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    product {
      id
    }
    productVariants {
      id
      metafields(first: 2) {
        edges {
          node {
            namespace
            key
            value
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;
export const UPDATE_PRODUCT_VARIANTS = `#graphql
mutation updateVariant($input: ProductVariantInput!) {
  productVariantUpdate(input: $input) {
   	productVariant {
      id
      metafields(first: 3) {
        edges {
          node {
            id
            namespace
            key
            value
          }
        }
      }
    }
    userErrors {
      message
      field
    }
  }
}
`;
export const METAFIELDS_SET = `#graphql
mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      value
    }
    userErrors {
      field
      message
    }
  }
}
`;
export const GET_PRODUCT_WITH_PURCHASE = `#graphql
query getProductsWithPurchase($first: Int!, $lastProductCursor: String, $variantsFirst: Int! ){
  products(first: $first, after: ${
    `$lastProductCursor` ? `$lastProductCursor` : null
  }) {
    edges {
      cursor
      node {
        id
        title
        featuredImage {
          altText
          url
        }
        priceRangeV2 {
          maxVariantPrice {
            amount
            currencyCode
          }
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: $variantsFirst) {
          edges {
            node {
              id
              title
              metafield(namespace: "custom", key: "component_reference") {
                id
                value
              }
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
`;
export const GET_PRODUCT_VARIANT = `#graphql
  query getProductVariant($id: ID!) {
    productVariant(id: $id) {
      id,
      product {
        id
        title
      }
    }
  }
`;
