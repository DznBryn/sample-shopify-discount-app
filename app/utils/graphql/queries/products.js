export const GET_PRODUCTS = `#graphql
  	query getProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          featuredImage {
            id
            altText
            url
            width
            height
          }
          
        }
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
