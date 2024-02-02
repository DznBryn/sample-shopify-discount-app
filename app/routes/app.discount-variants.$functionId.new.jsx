/* eslint-disable react-hooks/exhaustive-deps */
// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import { json } from "@remix-run/node";
import { useForm, useField } from "@shopify/react-form";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { CurrencyCode } from "@shopify/react-i18n";
import {
  Form,
  useActionData,
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
  Button,
  Box
} from "@shopify/polaris";
import { DiscountVariant } from "../components/DiscountVariants";
import { authenticate } from "~/shopify.server";

export const action = async ({ params, request }) => {
  const { functionId } = params;
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  if (formData.get("formAction") === "SUBMIT_DISCOUNT") {
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

    const discountProducts = configuration.map((config) => {
      return {
        percentage: config.percentage,
        selection: config.selection,
      }
    })

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
          mutation CreateCodeDiscount($discount: DiscountCodeAppInput!) {
            discountCreate: discountCodeAppCreate(codeAppDiscount: $discount) {
              codeAppDiscount {
                discountId
              }
              userErrors {
                code
                message
                field
              }
            }
          }`,
        {
          variables: {
            discount: {
              ...baseCodeDiscount,
              metafields: [
                {
                  namespace: "$app:multi-discount",
                  key: "function-configuration",
                  type: "json",
                  value: JSON.stringify(discountProducts),
                },
              ],
            },
          },
        }
      );

      const responseJson = await response.json();

      const errors = responseJson.data.discountCreate?.userErrors;
      return json({ redirect: true, errors });
    } else {
      const response = await admin.graphql(
        `#graphql
          mutation CreateAutomaticDiscount($discount: DiscountAutomaticAppInput!) {
            discountCreate: discountAutomaticAppCreate(automaticAppDiscount: $discount) {
              automaticAppDiscount{
                discountId
              }
              userErrors {
                code
                message
                field
              }
            }
          }`,
        {
          variables: {
            discount: {
              ...baseDiscount,
              metafields: [
                {
                  namespace: "$app:multi-discount",
                  key: "function-configuration",
                  type: "json",
                  value: JSON.stringify(discountProducts),
                },
              ],
            },
          },
        }
      );
      const responseJson = await response.json();

      const errors = responseJson?.data?.discountCreate?.userErrors ?? [];

      return json({ redirect: true, errors });
    }
  }

  return json({ redirect: false, errors: ['null'] });
};

export default function DiscountVariants() {
  const submitForm = useSubmit();
  const actionData = useActionData();
  const navigation = useNavigation();
  const app = useAppBridge();
  const todaysDate = useMemo(() => new Date(), []);

  const isLoading = navigation.state === "submitting";
  const currencyCode = CurrencyCode.Cad;
  const submitErrors = actionData?.errors || [];
  const redirect = Redirect.create(app);

  const [configurations, setConfigurations] = useState([
    {
      percentage: 0,
      selection: [],
    },
  ]);

  const handleAddConfiguration = useCallback(() => {
    if (configurations.length <= 3) {
      const newConfiguration = {
        percentage: "0",
        selection: [],
      };
      setConfigurations([...configurations, newConfiguration]);
    }
  }, [configurations]);

  const handleUpdateConfiguration = useCallback((configurations) => {
    return setConfigurations(configurations);
  }, [configurations]);

  const removeConfiguration = useCallback((index) => {
    if (configurations.length > 1){
      const updateConfigurations = configurations.filter((_, i) => i !== index);
      setConfigurations(updateConfigurations);
    }
  }, [configurations]);
  
  useEffect(() => {
    if (actionData?.errors?.length === 0 && actionData?.redirect === true) {
      redirect.dispatch(Redirect.Action.ADMIN_SECTION, {
        name: Redirect.ResourceType.Discount,
      });
    }
  }, [actionData]);

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
      formAction: useField("SUBMIT_DISCOUNT"),
      discountTitle: useField(""),
      discountMethod: useField(DiscountMethod.Code),
      discountCode: useField(""),
      combinesWith: useField({
        orderDiscounts: false,
        productDiscounts: true,
        shippingDiscounts: false,
      }),
      requirementType: useField(RequirementType.None),
      requirementSubtotal: useField("0"),
      requirementQuantity: useField("0"),
      usageLimit: useField(null),
      appliesOncePerCustomer: useField(false),
      startDate: useField(todaysDate),
      endDate: useField(null),
      configuration: [
        {
          percentage: useField("0"),
          selection: useField([]),
        }
      ],
    },
    onSubmit: async (form) => {
      const formAction = "SUBMIT_DISCOUNT"
      const discount = {
        title: form.discountTitle,
        method: form.discountMethod,
        code: form.discountCode,
        combinesWith: form.combinesWith,
        usageLimit: form.usageLimit == null ? null : parseInt(form.usageLimit),
        appliesOncePerCustomer: form.appliesOncePerCustomer,
        startsAt: form.startDate,
        endsAt: form.endDate,
        configuration: configurations.map((config) => {
          return {
            percentage: parseFloat(config.percentage),
            selection: config.selection,
          }
        }
        ),
      };

      submitForm({ formAction, discount: JSON.stringify(discount) }, { method: "post" });

      return { status: "success" };
    },
  });

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
    <Page
      title="Create discount variants"
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
                title="Type"
                discountTitle={discountTitle}
                discountClass={DiscountClass.Product}
                discountCode={discountCode}
                discountMethod={discountMethod}
              />
              {
                configurations.map((config, index) => {
                  return <DiscountVariant key={`dv-${index}`} configuration={config} removeConfiguration={removeConfiguration} configurations={configurations} configIndex={index} onChange={handleUpdateConfiguration} />

                })
              }

              <Box paddingInlineStart={"400"} paddingInlineEnd={"400"} width="100%">
                <Button plain textAlign="center" onClick={() => handleAddConfiguration()} disabled={configurations.length >= 3}>
                  Add discount variant
                </Button>
              </Box>
              {discountMethod.value === DiscountMethod.Code && (
                <UsageLimitsCard
                  // @ts-ignore
                  totalUsageLimit={usageLimit}
                  oncePerCustomer={appliesOncePerCustomer}
                />
              )}

              <ActiveDatesCard
                // @ts-ignore
                startDate={startDate}
                // @ts-ignore
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
              // @ts-ignore
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
              // @ts-ignore
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

