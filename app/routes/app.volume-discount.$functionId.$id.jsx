import { useCallback, useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useForm, useField } from "@shopify/react-form";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { CurrencyCode } from "@shopify/react-i18n";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  ActiveDatesCard,
  DiscountClass,
  DiscountMethod,
  MethodCard,
  DiscountStatus,
  RequirementType,
  SummaryCard,
  UsageLimitsCard,
  onBreadcrumbAction,
} from "@shopify/discount-app-components";
import {
  Banner,
  Layout,
  Page,
  PageActions,
  VerticalStack,
  Box,
  Button,
} from "@shopify/polaris";

import shopify from "../shopify.server";
import { NotFoundPage } from "../components/NotFoundPage";
import { DiscountVariant } from "./app.volume-discount.$functionId.new";
import { GET_PRODUCTS, GET_PRODUCT_BY_ID } from "~/utils/graphql/queries/products";

// This is a server-side action that is invoked when the form is submitted.
// It makes an admin GraphQL request to update a discount.
export const action = async ({ params, request }) => {
  const { id, functionId } = params;
  const { admin } = await shopify.authenticate.admin(request);
  const formData = await request.formData();

  if (formData.get("cartAction") === "GET_PRODUCT_VARIANT") {
    const response = await admin.graphql(GET_PRODUCT_BY_ID, {
      variables: {
        id: formData.get("id"),
      },
    });
    const responseJson = await response.json();
    return json({ redirect: false, id: responseJson?.data?.product?.id ?? "", variants: responseJson?.data?.product?.variants ?? [], errors: [] })
  }

  const {
    title,
    method,
    code,
    combinesWith,
    usageLimit,
    appliesOncePerCustomer,
    startsAt,
    endsAt,
    configuration,
  } = JSON.parse(formData.get("discount"));
  const baseDiscount = {
    functionId,
    title,
    combinesWith,
    startsAt: new Date(startsAt),
    endsAt: endsAt && new Date(endsAt),
  };

  if (formData.get("cartAction") === "SUBMIT_DISCOUNT") {
    if (method === DiscountMethod.Code) {
      const baseCodeDiscount = {
        ...baseDiscount,
        title: code,
        code,
        usageLimit,
        appliesOncePerCustomer,
      };

      const response = await admin.graphql(
        `#graphql
          mutation UpdateCodeDiscount($id: ID!, $discount: DiscountCodeAppInput!) {
            discountUpdate: discountCodeAppUpdate(id: $id, codeAppDiscount: $discount) {
              userErrors {
                code
                message
                field
              }
            }
          }`,
        {
          variables: {
            id: `gid://shopify/DiscountCodeApp/${id}`,
            discount: {
              ...baseCodeDiscount,
              metafields: [
                {
                  id: configuration.metafieldId,
                  value: JSON.stringify([{
                    quantity: configuration.quantity,
                    percentage: configuration.percentage,
                  }]),
                },
              ],
            },
          },
        }
      );

      const responseJson = await response.json();
      const errors = responseJson.data.discountUpdate?.userErrors;

      return json({ redirect: false, errors });
    } else {
      const response = await admin.graphql(
        `#graphql
          mutation UpdateAutomaticDiscount($id: ID!, $discount: DiscountAutomaticAppInput!) {
            discountUpdate: discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $discount) {
              userErrors {
                code
                message
                field
              }
            }
          }`,
        {
          variables: {
            id: `gid://shopify/DiscountAutomaticApp/${id}`,
            discount: {
              ...baseDiscount,
              metafields: [
                {
                  id: configuration.metafieldId,
                  value: JSON.stringify(configuration.data),
                },
              ],
            },
          },
        }
      );

      const responseJson = await response.json();
      const errors = responseJson.data.discountUpdate?.userErrors;
      return json({ redirect: true, errors });
    }
  }

  return json({ redirect: false, errors: [] });
};


export const loader = async ({ params, request }) => {
  try {
    const { id } = params;
    const { admin } = await shopify.authenticate.admin(request);

    const response = await admin.graphql(
      `#graphql
      query GetDiscount($id: ID!) {
        discountNode(id: $id) {
          id
          configurationField: metafield(
            namespace: "$app:multi-discount"
            key: "function-configuration"
          ) {
            id
            value
          }
          discount {
            __typename
            ... on DiscountAutomaticApp {
              title
              discountClass
              combinesWith {
                orderDiscounts
                productDiscounts
                shippingDiscounts
              }
              startsAt
              endsAt
            }
            ... on DiscountCodeApp {
              title
              discountClass
              combinesWith {
                orderDiscounts
                productDiscounts
                shippingDiscounts
              }
              startsAt
              endsAt
              usageLimit
              appliesOncePerCustomer
              codes(first: 1) {
                nodes {
                  code
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          id: `gid://shopify/DiscountNode/${id}`,
        },
      }
    );

    const responseJson = await response.json();

    if (
      !responseJson.data.discountNode ||
      !responseJson.data.discountNode.discount
    ) {
      return json({ discount: null });
    }

    const method =
      responseJson.data.discountNode.discount.__typename === "DiscountCodeApp"
        ? DiscountMethod.Code
        : DiscountMethod.Automatic;

    const {
      title,
      codes,
      combinesWith,
      usageLimit,
      appliesOncePerCustomer,
      startsAt,
      endsAt,
    } = responseJson.data.discountNode.discount;

    const configuration = JSON.parse(
      responseJson.data.discountNode.configurationField.value
    )?.map((config) => {
      return {
        percentage: config.percentage,
        productVariants: config.productVariants,
      };
    });

    const discount = {
      title,
      method,
      code: codes?.nodes[0]?.code ?? "",
      combinesWith,
      usageLimit: usageLimit ?? null,
      appliesOncePerCustomer: appliesOncePerCustomer ?? false,
      startsAt,
      endsAt,
      configuration: {
        data: configuration,
        metafieldId: responseJson.data.discountNode.configurationField.id,
      },
    };

    const productsQuery = await admin.graphql(GET_PRODUCTS, {
      variables: {
        first: 50,
      }
    });
    const productsJson = await productsQuery.json();
    const products = productsJson?.data?.products.edges ?? [];
    console.log("PRODUCTS ==============> ", discount);
    return json({ products, discount, error:[] });
  } catch (error) {
    console.error("Error on Edit Discount Variant", error);
    return json({ products: [], error });
  }
};

// This is the React component for the page.
export default function VolumeEdit() {
  const submitForm = useSubmit();
  const actionData = useActionData();
  const { discount } = useLoaderData();
  const navigation = useNavigation();
  const app = useAppBridge();

  const isLoading = navigation.state === "submitting";
  const currencyCode = CurrencyCode.Cad;
  const submitErrors = actionData?.errors || [];
  const redirect = Redirect.create(app);

  const [configurations, setConfigurations] = useState(discount.configuration.data ?? [
    {
      percentage: 0,
      productVariants: [],
    },
  ]);

  const handleUpdateConfiguration = useCallback((configurations) => {
    return setConfigurations(configurations);
  }, []);

  const { metafieldId } = discount.configuration;
  
  const {
    fields: {
      discountTitle,
      discountCode,
      discountMethod,
      requirementType,
      requirementSubtotal,
      requirementQuantity,
      usageLimit,
      appliesOncePerCustomer,
      startDate,
      endDate,
    },
    submit,
  } = useForm({
    fields: {
      cartAction: useField("SUBMIT_DISCOUNT"),
      discountTitle: useField(discount.title),
      discountMethod: useField(discount.method),
      discountCode: useField(discount.code),
      combinesWith: useField(discount.combinesWith),
      requirementType: useField(RequirementType.None),
      requirementSubtotal: useField("0"),
      requirementQuantity: useField("0"),
      usageLimit: useField(discount.usageLimit),
      appliesOncePerCustomer: useField(discount.appliesOncePerCustomer),
      startDate: useField(discount.startsAt),
      endDate: useField(discount.endsAt),
      configuration: {
        data: configurations.map((config) => {
          return {
            percentage: useField(config.percentage),
            productVariants: useField(config.productVariants),
          }
        })
      },
    },
    onSubmit: async (form) => {
      const cartAction = "SUBMIT_DISCOUNT"
      const discount = {
        title: form.discountTitle,
        method: form.discountMethod,
        code: form.discountCode,
        combinesWith: form.combinesWith,
        usageLimit: form.usageLimit == null ? null : parseInt(form.usageLimit),
        appliesOncePerCustomer: form.appliesOncePerCustomer,
        startsAt: form.startDate,
        endsAt: form.endDate,
        configuration: {
          metafieldId,
          data: configurations.map((config) => {
            return {
              percentage: config.percentage,
              productVariants: config.productVariants,
            }
          })
        },
      };

      submitForm({ cartAction, discount: JSON.stringify(discount) }, { method: "post" });

      return { status: "success" };
    },
  });

  useEffect(() => {
    if (actionData?.errors.length === 0 && actionData?.redirect) {
      redirect.dispatch(Redirect.Action.ADMIN_SECTION, {
        name: Redirect.ResourceType.Discount,
      });
    }
  }, [actionData]);

  if (!discount) {
    return <NotFoundPage />;
  }

  const errorBanner =
    submitErrors.length > 0 ? (
      <Layout.Section>
        <Banner status="critical">
          <p>There were some issues with your form submission:</p>
          <ul>
            {submitErrors.map(({ message, field }, index) => {
              return (
                <li key={`${message}${index}`}>
                  {field.join(".")} {message}
                </li>
              );
            })}
          </ul>
        </Banner>
      </Layout.Section>
    ) : null;

  

  return (
    // Render a discount form using Polaris components and the discount app components
    <Page
      title="Create volume discount"
      backAction={{
        content: "Discounts",
        onAction: () => onBreadcrumbAction(redirect, true),
      }}
      primaryAction={{
        content: "Save",
        onAction: submit,
        loading: isLoading,
      }}
    >
      <Layout>
        {errorBanner}
        <Layout.Section>
          <Form method="post">
            <VerticalStack align="space-around" gap="5">
              <MethodCard
                title="Volume"
                discountTitle={discountTitle}
                discountClass={DiscountClass.Product}
                discountCode={discountCode}
                discountMethod={discountMethod}
              />
              {
                configurations.map((config, index) => {
                  return <DiscountVariant key={index} configuration={config} configurations={configurations} configIndex={index} onChange={handleUpdateConfiguration} />
                })
              }

              {discountMethod.value === DiscountMethod.Code && (
                <UsageLimitsCard
                  totalUsageLimit={usageLimit}
                  oncePerCustomer={appliesOncePerCustomer}
                />
              )}

              <ActiveDatesCard
                startDate={startDate}
                endDate={endDate}
                timezoneAbbreviation="EST"
              />
            </VerticalStack>
          </Form>
        </Layout.Section>
        <Layout.Section secondary>
          <SummaryCard
            header={{
              discountMethod: discountMethod.value,
              discountDescriptor:
                discountMethod.value === DiscountMethod.Automatic
                  ? discountTitle.value
                  : discountCode.value,
              appDiscountType: "Volume",
              isEditing: false,
            }}
            performance={{
              status: DiscountStatus.Scheduled,
              usageCount: 0,
              isEditing: false,
            }}
            minimumRequirements={{
              requirementType: requirementType.value,
              subtotal: requirementSubtotal.value,
              quantity: requirementQuantity.value,
              currencyCode: currencyCode,
            }}
            usageLimits={{
              oncePerCustomer: appliesOncePerCustomer.value,
              totalUsageLimit: usageLimit.value,
            }}
            activeDates={{
              startDate: startDate.value,
              endDate: endDate.value,
            }}
          />
        </Layout.Section>
        <Layout.Section>
          <PageActions
            primaryAction={{
              content: "Save discount",
              onAction: submit,
              loading: isLoading,
            }}
            secondaryActions={[
              {
                content: "Discard",
                onAction: () => onBreadcrumbAction(redirect, true),
              },
            ]}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
