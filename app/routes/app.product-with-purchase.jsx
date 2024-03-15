// @ts-nocheck

import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";

import { Layout, Page } from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";
import { ErrorBanner } from "~/components/ErrorBanner";
import CreateReward from "~/components/ProductWithPurchase/CreateReward";
import ListProductWithPurchase from "~/components/ProductWithPurchase/ListProductWithPurchase";
import { authenticate } from "~/shopify.server";
import { METAFIELDS_SET, getProductVariant, getProducts } from "~/utils/graphql/queries/products";
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
      products = await getProducts({
        admin,
        lastProductCursor,
        hasNextPage,
        products,
      });

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
        for (const product of selection) {
          const selectionVariants = product?.variants?.flatMap(variant => {
            const mergeRewardSelection = rewardSelection.flatMap(product => product?.variants?.flatMap(variant => variant.id));
            return ({
              id: variant.id,
              value: mergeRewardSelection
            })
          });

          for (const variant of selectionVariants) {
            const updateMetafields = await admin.graphql(METAFIELDS_SET, {
              variables: {
                metafields: [
                  {
                    "key": "component_reference",
                    "namespace": "custom",
                    "ownerId": variant.id,
                    "value": JSON.stringify({
                      quantity: formData.get('quantity'),
                      variants: variant.value
                    }),
                    "type": "json",
                  }
                ]
              }
            })

            const updateMetafieldsJson = await updateMetafields.json();

            if (updateMetafieldsJson?.data?.metafieldsSet?.useErrors?.length > 0) {
              result.data.push(updateMetafieldsJson.data?.metafieldsSet.useErrors);
            }

            if (updateMetafieldsJson?.data?.metafieldsSet?.metafields?.length > 0) {
              result.data.push(updateMetafieldsJson.data?.metafieldsSet.metafields);
            }
          }
        }
      }

      products = await getProducts({
        admin,
        lastProductCursor,
        hasNextPage,
        products,
      });

      if (products.length > 0) {
        return json({ data: products, errors: [] });
      }

      return json({ data: [], errors: result.data?.metafieldsSet?.userErrors ?? [] });
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

    if (formAction === 'GET_PRODUCT_VARIANTS') {

      const ids = JSON.parse(formData.get('ids'))
      const selectionData = []
      const rewardSelectionData = []

      if (ids && ids?.selectionIds?.length > 0) {
        await Promise.all(ids.selectionIds.map(async (id) => {
          const res = await getProductVariant(admin, { id });
          selectionData.push(res?.data?.productVariant);
        }));
      }

      if (ids && ids?.rewardSelectionIds?.length > 0) {
        await Promise.all(ids.rewardSelectionIds.map(async (id) => {
          const res = await getProductVariant(admin, { id });
          rewardSelectionData.push(res?.data?.productVariant);
        }));
      }

      return json({
        data: {
          selectionData,
          rewardSelectionData,
          quantity: formData.get('quantity')
        }, errors: []
      });
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
  const { selection, rewardSelection, } = useProductWithPurchase(state => state);
  const { setList } = useProductWithPurchase(state => state.rewards);
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === 'loading' && fetcher?.data?.data) {
      setList({ list: fetcher?.data?.data, loading: false });
    };
  }, [fetcher.state])

  const handleToggle = useCallback(async (component = "createRewards",
    defaultSelection,
    defaultRewardSelection,
    quantity
  ) => {

    defaultSelection ? selection.setSelection(defaultSelection) : selection.setSelection({
      selectionId: "",
      quantity: 1,
      selection: [],
    });

    defaultRewardSelection ? rewardSelection.setSelection({ ...defaultRewardSelection, quantity }) : rewardSelection.setSelection({
      selectionId: "",
      quantity: 1,
      selection: [],
    });

    return setComponent(component)
  }, []);

  const handleSubmit = async () => {

    if (component === '') return handleToggle("createRewards")
    setList({ loading: true });

    await fetcher.submit({
      formAction: 'CREATE_PRODUCT_WITH_PURCHASE',
      selection: JSON.stringify(selection.selection),
      rewardSelection: JSON.stringify(rewardSelection.selection),
      quantity: rewardSelection.quantity
    }, { method: 'POST' })

    selection.setSelection({
      selectionId: "",
      quantity: 1,
      selection: [],
    });
    rewardSelection.setSelection({
      selectionId: "",
      quantity: 1,
      selection: [],
    });
    return handleToggle("");
  }

  const mapToComponent = {
    createRewards: <CreateReward />,
    editRewards: <CreateReward />,
  };

  return (
    <Page
      title="Purchase Rewards"
      primaryAction={{
        content: component !== '' ? 'Save' : 'Create Reward',
        onAction: () => handleSubmit()
      }}
      secondaryActions={component !== '' && [{ content: 'Cancel', onAction: () => handleToggle('') }]}
      fullWidth
    >
      <Layout>
        <ErrorBanner errors={errors} data={data} />
        {component !== '' && mapToComponent[component]}
        <ListProductWithPurchase handleToggle={handleToggle} />
      </Layout>
    </Page>
  );
}
