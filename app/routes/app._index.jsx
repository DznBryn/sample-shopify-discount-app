import { useEffect } from "react";
import { json } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  VerticalStack,
  Card,
  Button,
  HorizontalStack,
  Box,
  Divider,
  List,
  Link,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({ shop: session.shop.replace(".myshopify.com", "") });
};

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        input: {
          title: `${color} Snowboard`,
          variants: [{ price: Math.random() * 100 }],
        },
      },
    }
  );

  const responseJson = await response.json();

  return json({
    product: responseJson.data.productCreate.product,
  });
}

export default function Index() {
  const nav = useNavigation();
  const { shop } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

  const productId = actionData?.product?.id.replace(
    "gid://shopify/Product/",
    ""
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId]);

  const generateProduct = () => submit({}, { replace: true, method: "POST" });

  return (
    <Page>
      <ui-title-bar title="Service Hub">
      </ui-title-bar>
      <VerticalStack gap="5">
        <Layout>
          <Layout.Section>
            <Card>
              <VerticalStack gap="5">
                <VerticalStack gap="2">
                  <Text as="h2" variant="headingMd">
                    Congrats on creating a new Shopify app 🎉
                  </Text>
                  <Text variant="bodyMd" as="p">
                    This embedded app template uses{" "}
                    <Link
                      url="https://shopify.dev/docs/apps/tools/app-bridge"
                      target="_blank"
                    >
                      App Bridge
                    </Link>{" "}
                    interface examples like an{" "}
                    <Link url="/app/additional">
                      additional page in the app nav
                    </Link>
                    , as well as an{" "}
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql"
                      target="_blank"
                    >
                      Admin GraphQL
                    </Link>{" "}
                    mutation demo, to provide a starting point for app
                    development.
                  </Text>
                </VerticalStack>
                <VerticalStack gap="2">
                  <Text as="h3" variant="headingMd">
                    Get started with products
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Generate a product with GraphQL and get the JSON output for
                    that product. Learn more about the{" "}
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate"
                      target="_blank"
                    >
                      productCreate
                    </Link>{" "}
                    mutation in our API references.
                  </Text>
                </VerticalStack>
                <HorizontalStack gap="3" align="end">
                  {actionData?.product && (
                    <Button
                      url={`https://admin.shopify.com/store/${shop}/admin/products/${productId}`}
                      target="_blank"
                    >
                      View product
                    </Button>
                  )}
                  <Button loading={isLoading} primary onClick={generateProduct}>
                    Generate a product
                  </Button>
                </HorizontalStack>
                {actionData?.product && (
                  <Box
                    padding="4"
                    background="bg-subdued"
                    borderColor="border"
                    borderWidth="1"
                    borderRadius="2"
                    overflowX="scroll"
                  >
                    <pre style={{ margin: 0 }}>
                      <code>{JSON.stringify(actionData.product, null, 2)}</code>
                    </pre>
                  </Box>
                )}
              </VerticalStack>
            </Card>
          </Layout.Section>
        </Layout>
      </VerticalStack>
    </Page>
  );
}
