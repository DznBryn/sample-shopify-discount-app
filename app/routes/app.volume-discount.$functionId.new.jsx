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
  Card,
  Text,
  Layout,
  Page,
  PageActions,
  TextField,
  VerticalStack,
  Button,
  Box,
  Autocomplete,
  Listbox,
  Icon,
  Checkbox,
  HorizontalStack,
} from "@shopify/polaris";
import {
  XIcon,
} from '@shopify/polaris-icons';


import { GET_PRODUCTS, GET_PRODUCT_BY_ID } from "~/utils/graphql/queries/products";
import { authenticate } from "~/shopify.server";


export const action = async ({ params, request }) => {
  const { functionId } = params;
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  if (formData.get("cartAction") === "GET_PRODUCT_VARIANT") {

    const response = await admin.graphql(GET_PRODUCT_BY_ID, {
      variables: {
        id: formData.get("id"),
      },
    });
    const responseJson = await response.json();;
    return json({ redirect: false, id: responseJson?.data?.product?.id ?? "", variants: responseJson?.data?.product?.variants ?? [] })
  }

  if (formData.get("cartAction") === "SUBMIT_DISCOUNT") {
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
        productVariants: config.productVariants,
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
      console.log("GET RESPONSE", responseJson)

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
      console.log("GET RESPONSE ====", discountProducts)
      const responseJson = await response.json();

      const errors = responseJson?.data?.discountCreate?.userErrors ?? [];

      return json({ redirect: true, errors });
    }
  }

  return json({ redirect: false, errors: [] });
};

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const productsQuery = await admin.graphql(GET_PRODUCTS, {
      variables: {
        first: 50,
      }
    });

    const productsJson = await productsQuery.json();
    const products = productsJson?.data?.products.edges ?? [];

    return json({ products, error: null });
  } catch (error) {
    console.error("Error on Create Discount Variant", error);
    return json({ products: [], error });
  }
}

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
      productVariants: [],
    },
  ]);

  const handleAddConfiguration = useCallback(() => {
    if (configurations.length <= 3) {
      const newConfiguration = {
        percentage: "0",
        productVariants: [],
      };
      setConfigurations([...configurations, newConfiguration]);
    }
  }, [configurations]);

  const handleUpdateConfiguration = useCallback((configurations) => {
    return setConfigurations(configurations);
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
      cartAction: useField("SUBMIT_DISCOUNT"),
      discountTitle: useField(""),
      discountMethod: useField(DiscountMethod.Code),
      discountCode: useField(""),
      combinesWith: useField({
        orderDiscounts: false,
        productDiscounts: false,
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
          productVariants: useField([]),
        }
      ],
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
        configuration: configurations.map((config) => {
          return {
            percentage: parseFloat(config.percentage),
            productVariants: config.productVariants,
          }
        }
        ),
      };

      submitForm({ cartAction, discount: JSON.stringify(discount) }, { method: "post" });

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
                  return <DiscountVariant key={index} configuration={config} configurations={configurations} configIndex={index} onChange={handleUpdateConfiguration} />
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

export function DiscountVariant({ configurations, configIndex, onChange, ...props}) {
  const actionData = useActionData();
  const { products } = useLoaderData();
  const handleSubmit = useSubmit();
  const DEFAULT_SELECT_LIST = Array.from(Array(1)).map((_, index) => ({
    value: `option-${index + 1}`,
    label: `Option ${index + 1}`,
  }))
  const deselectedOptions = products.length > 0 ? products.map((product) => ({
    value: `${product.node.id}`,
    label: `${product.node.title}`,
  })) : DEFAULT_SELECT_LIST;
  const productVariants = useField(props?.configuration?.productVariants ?? []);
  const percentage = useField(String(props?.configuration.percentage) ?? "0");

  const [options, setOptions] = useState(deselectedOptions);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [list, setList] = useState(productVariants.value ?? []);

  useEffect(() => {
    if (productVariants.value?.length > 0 && selectedOptions.length === 0) {
      setSelectedOptions(productVariants.value.map((item) => item?.id))
    }
  }, [])
  
  useEffect(() => {
    if (percentage?.value && productVariants?.value?.length) {
      configurations[configIndex] = {
        ...configurations[configIndex],
        percentage: percentage.value,
        productVariants: productVariants.value,
      }
      onChange(configurations);
    }

  }, [percentage.value, productVariants.value])
  

  useEffect(() => {
    if (actionData && actionData?.variants?.edges?.length > 0) {
      const variants = actionData?.variants?.edges ?? [];
      const selectedVariants = variants?.length === 1 && variants?.[0]?.node?.id ? [variants[0].node.id] : []
      if (list.length > 0) {
        const index = list.findIndex((item) => item?.id === actionData.id);
        if (index === -1) {
          const newList = [...list];
          newList.push({
            id: actionData.id,
            size: variants.length,
            variants,
            selectedVariants
          })
          setList(newList)
        }
      } else {
        setList([{
          id: actionData.id,
          size: variants.length,
          variants,
          selectedVariants
        }])
      }
    }
  }, [actionData])

  useEffect(() => {
    if (list.length > 0 && JSON.stringify(productVariants.value) !== JSON.stringify(list)) {
      productVariants.onChange(list)
    }
    if (list.length === 0 && productVariants.value?.length > 0) {
      productVariants.onChange(productVariants.defaultValue)
    }
  }, [JSON.stringify(list)])

  const updateText = useCallback(value => {
    setInputValue(value);
    if (value === '') {
      setOptions(deselectedOptions);
      return;
    }
    const filterRegex = new RegExp(value, 'i');
    const resultOptions = deselectedOptions.filter(option => option.label.match(filterRegex));
    setOptions(resultOptions);
    return setInputValue
  }, [deselectedOptions])

  const removeProduct = useCallback(
    (id) => {
      const options = selectedOptions.filter((item) => item !== id);
      const updateList = list.filter((item) => item?.id !== id);
      console.log("LIst====>", { updateList })
      setList(updateList);
      setSelectedOptions(options);
    },
    [selectedOptions, list],
  );

  const handleOnSelect = async (selected) => {

    try {
      const formData = {
        cartAction: "GET_PRODUCT_VARIANT",
        id: selected[selected.length - 1]
      }
      if (list.findIndex((item) => item?.id === selected[selected.length - 1]) === -1 && selected.length > 0) {
        await handleSubmit(formData, { method: "post" });
      } else {
        const updateList = list.filter((item) => selected.includes(item?.id));
        setList(updateList);
      }

      return setSelectedOptions(selected)
    } catch (error) {
      console.error("Error on handleOnSelect", error);
      return setSelectedOptions([])
    }
  }

  const handleChoicesChange = useCallback((selected) => {
    const updateList = list.map((item) => {
      if (item?.id === selectedProduct?.id) {
        item = {
          ...item,
          selectedVariants: item?.selectedVariants?.includes(selected) ? item?.selectedVariants?.filter((variant) => variant !== selected) : [...item?.selectedVariants, selected]
        }
      }
      return item;
    });
    setList(updateList);
  }, [list, selectedProduct]);

  return <>
    <Card>
      <VerticalStack gap="3">
        <Text variant="headingMd" as="h2">
          Discount Variant {percentage.value.toString() === "0" ? "" : `(${percentage.value}% off)`}
        </Text>
        <TextField
          label="Discount percentage"
          autoComplete="on"
          {...percentage}
          suffix="%"
        />

        <Autocomplete
          allowMultiple
          options={options}
          selected={selectedOptions}
          textField={<Autocomplete.TextField onChange={updateText}
            label="Products"
            value={inputValue}
            placeholder="Add products to discount variant"
            autoComplete="off" />}
          onSelect={handleOnSelect}
        />
        {
          selectedOptions.length > 0 && <Listbox accessibilityLabel="Selected products">
            {
              selectedOptions.map((selectedOption) => {
                const productVariantsSize = list.find((item) => item?.id === selectedOption)?.size ?? 0;
                const selectedVariants = list.find((item) => item?.id === selectedOption)?.selectedVariants;
                const selectedVariantsSize = selectedVariants?.length ?? 0;
                return <Listbox.Option key={selectedOption} value={selectedOption}>
                  <Box borderRadius="100" width="100%" padding={"100"}>
                    <div style={{
                      padding: "0.25rem",
                      cursor: "pointer",
                      width: "100%",
                      height: "auto",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div
                        style={{
                          width: "auto",
                          maxWidth: "80%",
                          height: "auto",
                        }}>

                        <VerticalStack gap={"1"}>
                          <Text as="p">
                            {products.find((product) => product.node.id === selectedOption)?.node?.title ?? "Product not found"}
                          </Text>
                          {
                            (list.length > 0 && productVariantsSize > 1) &&
                            <Text as="p" variant="bodySm" color="subdued">
                              ({selectedVariantsSize} of {productVariantsSize}  variants selected)
                            </Text>
                          }
                        </VerticalStack>
                      </div>
                      <div style={{
                        width: "auto",
                        height: "auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem"
                      }}>
                        {
                          productVariantsSize > 1 && <Button plain onClick={() => {
                            if (!selectedProduct || selectedProduct?.id !== selectedOption) {
                              setSelectedProduct(list.find((item) => item?.id === selectedOption))
                              console.log("selectedProduct", list.find((item) => item?.id === selectedOption))
                            } else {
                              setSelectedProduct(null)
                            }

                          }} >{selectedProduct && selectedProduct?.id === selectedOption ? 'Save' : 'Edit'}</Button>
                        }
                        <button onClick={() => removeProduct(selectedOption)} style={{
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                        }} >
                          <Icon source={XIcon} color="base" />
                        </button>
                      </div>
                    </div>
                    {selectedProduct && selectedProduct?.id === selectedOption && <Box padding={"100"} gap={"3"} width="100%">
                      <HorizontalStack gap={"3"} verticalAlign={"center"}>
                        {
                          selectedProduct?.variants?.map((variant) => {
                            return <VariantCheckbox key={variant?.node?.id} variant={variant} selectedVariants={selectedVariants} handleChoicesChange={handleChoicesChange} />
                          })
                        }
                      </HorizontalStack>
                    </Box>}
                  </Box>
                </Listbox.Option>
              })
            }
          </Listbox>
        }
      </VerticalStack>
    </Card >

  </>
}

export const VariantCheckbox = ({ variant, selectedVariants, handleChoicesChange }) => {
  const [checked, setChecked] = useState(null);

  useEffect(() => {
    if (typeof checked === "boolean") {
      handleChoicesChange(variant?.node?.id)
    }
  }, [checked])

  const handleChange = useCallback(
    (newChecked) => {
      setChecked(newChecked)
    },
    [],
  );
  return <Checkbox key={variant?.node?.id} label={variant?.node?.title ?? variant?.node?.id ?? ""} checked={selectedVariants?.includes(variant?.node?.id) ?? checked} onChange={handleChange} />
}