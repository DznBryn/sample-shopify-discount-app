
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Layout, Page } from "@shopify/polaris";
import { useState } from "react";
import { ErrorBanner } from "~/components/ErrorBanner";
import CreateReward from "~/components/ProductWithPurchase/CreateReward";
import ListProductWithPurchase from "~/components/ProductWithPurchase/ListProductWithPurchase";
import { authenticate } from "~/shopify.server";
import { BULK_UPDATE_PRODUCT_VARIANTS, GET_PRODUCT_WITH_PURCHASE, METAFIELDS_SET } from "~/utils/graphql/queries/products";
import { useProductWithPurchase } from "~/utils/hooks/useStore";

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const formAction = formData.get('formAction');
  let products = [];
  let hasNextPage = true;
  let lastProductCursor = null;

  try {
    if (formAction === 'GET_PRODUCT_WITH_PURCHASE') {
      while (hasNextPage) {
        const data = await admin.graphql(GET_PRODUCT_WITH_PURCHASE, {
          variables: {
            first: 100,
            lastProductCursor,
            variantsFirst: 100,
          }
        })
        const dataJson = await data.json();

        if (dataJson?.data?.products?.edges?.length > 0) {
          const edges = dataJson.data.products.edges;
          hasNextPage = dataJson.data.products.pageInfo.hasNextPage;
          lastProductCursor = edges[edges.length - 1]?.cursor;

          edges.forEach(edge => {
            const variants = edge.node.variants.edges.filter(variantEdge => variantEdge.node?.metafield?.value && JSON.parse(variantEdge.node.metafield.value).length > 0);
            if (variants.length) {
              products.push(...variants.map(variantEdge => {
                variantEdge.node.metafield.value = JSON.parse(variantEdge.node.metafield.value);
                return { productId: edge?.node?.id, productTitle: edge?.node?.title, image: edge?.node?.featuredImage, prices: edge?.node?.priceRangeV2, ...variantEdge.node }
              }));
            }
          });
        }

      }

      if (products.length > 0) {
        return json({ data: products, errors: [] });
      }

      return json({ data: null, errors: [] });
    }

    if (formAction === 'CREATE_PRODUCT_WITH_PURCHASE') {
      const selection = formData.get('selection') ? JSON.parse(formData.get('selection')) : null;
      const rewardSelection = formData.get('rewardSelection') ? JSON.parse(formData.get('rewardSelection')) : null;

      let result = {
        data: [],
        errors: []
      };

      if (selection?.length > 0 && rewardSelection?.length > 0) {
        selection.forEach(async (product) => {
          const selectionVariants = product?.variants?.flatMap(variant => {
            const mergeRewardSelection = rewardSelection.flatMap(product => product?.variants?.flatMap(variant => variant.id));
            return ({
              id: variant.id,
              metafields: [
                {
                  "namespace": "custom",
                  "key": "component_reference",
                  "value": JSON.stringify(mergeRewardSelection),
                  "type": "list.variant_reference"
                }
              ]
            })
          });
          const body = {
            productId: product.id,
            variants: selectionVariants
          }
          const updateVariant = await admin.graphql(BULK_UPDATE_PRODUCT_VARIANTS, {
            variables: {
              ...body
            }
          });

          const updateVariantJson = await updateVariant.json();
          if (updateVariantJson?.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
            // @ts-ignore
            result.errors.push(...updateVariantJson.data.productVariantsBulkUpdate.userErrors);
          } else {
            // @ts-ignore
            result.data.push({
              product: updateVariantJson.data.productVariantsBulkUpdate.product,
              productVariants: updateVariantJson.data.productVariantsBulkUpdate.productVariants
            });
          }

        })
        return json({ data: result, errors: [] });
      }
      return json({ data: null, errors: [] });
    }

    if (formAction === 'DELETE_PRODUCT_WITH_PURCHASE') {
      const id = formData.get('id');

      const updateMetafields = await admin.graphql(METAFIELDS_SET, {
        variables: {
          metafields: [
            {
              "key": "component_reference",
              "namespace": "custom",
              "ownerId": id,
              "type": "list.variant_reference",
              "value": "[]"
            }
          ]
        }
      })
      const updateMetafieldsJson = await updateMetafields.json();

      return json({ data: updateMetafieldsJson?.data?.metafieldsSet?.metafields ?? null, errors: updateMetafieldsJson?.data?.metafieldsSet?.userErrors ?? [] });
    }

    if (formAction === 'UPDATE_PRODUCT_WITH_PURCHASE') {
      return json({ data: null, errors: [] });
    }
    return json({ data: null, errors: [] });
  } catch (error) {
    console.error("Error:", error);
    return json({ data: null, errors: [{ field: 'loader', message: 'Server Error! Please contact First and Third, if this problem persist.' }] }, { status: 500 });
  }
}

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  try {
    const functionId = await admin.graphql(
      `#graphql
          mutation {
            cartTransformCreate(functionId: "${process.env.SHOPIFY_FREE_PRODUCT_WITH_PURCHASE_ID}") {
              cartTransform {
                id
                functionId
              }
              userErrors {
                field
                message
              }
            }
          }`
    );

    const functionIdJson = await functionId.json();

    if (functionIdJson.data.cartTransformCreate.userErrors.length > 0) {
      return json({
        data: {
          functionId: String(process.env.SHOPIFY_FREE_PRODUCT_WITH_PURCHASE_ID),
        }, errors: functionIdJson.data.cartTransformCreate.userErrors
      });
    }
    
    return json({ data: functionIdJson.data.cartTransformCreate.cartTransform, errors: [] });
  } catch (error) {
    console.error("Error:", error);
    return json({ data: null, errors: [{ field: 'loader', message: 'Server Error! Please contact First and Third, if this problem persist.' }] }, { status: 500 });
  }
}

export default function ProductWithPurchase() {
  const { data, errors } = useLoaderData();
  const [component, setComponent] = useState('');
  const { selection, rewardSelection } = useProductWithPurchase(state => state);
  const fetcher = useFetcher();

  const handleToggle = (component = "createRewards") => setComponent(component);
  const handleSubmit = async () => {
    if (component === '') return handleToggle("createRewards")
    await fetcher.submit({ formAction: 'CREATE_PRODUCT_WITH_PURCHASE', selection: JSON.stringify(selection.selection), rewardSelection: JSON.stringify(rewardSelection.selection) }, { method: 'POST' })
    return handleToggle("");
  }
  const mapToComponent = {
    createRewards: <CreateReward />,
  };

  return <Page title="Free Product with Purchase"
    primaryAction={{ content: component !== '' ? 'Save' : 'Create Reward', onAction: () => handleSubmit() }}
    secondaryActions={component !== '' && [{ content: 'Cancel', onAction: () => handleToggle('') }]}
    fullWidth
  >
    <Layout>
      <ErrorBanner errors={errors} data={data} />
      {component !== '' && mapToComponent[component]}
      <ListProductWithPurchase />
    </Layout>
  </Page>;
}
