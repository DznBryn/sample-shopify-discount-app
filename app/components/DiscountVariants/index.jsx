// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Text,
  TextField,
  VerticalStack,
  Button,
  Box,
  Listbox,
  Icon,
  Grid,
} from "@shopify/polaris";
import {
  XIcon,
} from '@shopify/polaris-icons';
import { useField } from "@shopify/react-form";
import { ResourcePicker } from "@shopify/app-bridge-react";

export function DiscountVariant({ configurations, configIndex, onChange, showButtons = true, ...props }) {

  const productVariants = useField(props?.configuration?.selection ?? []);
  const percentage = useField(String(props?.configuration.percentage) ?? "0");

  const [isPickerOpen, setIsPickerOpen] = useState({
    resourceType: 'Product',
    open: false,
  });
  const [selection, setSelection] = useState({
    id: '',
    selection: productVariants.defaultValue ?? [],
  });

  const handleResourcePickerOpen = (resourceType) => {
    setIsPickerOpen({
      resourceType,
      open: true,
    });
  };

  useEffect(() => {
    if (percentage?.value && productVariants?.value?.length) {
      configurations[configIndex] = {
        ...configurations[configIndex],
        percentage: percentage.value,
        selection: productVariants.value,
      }
      onChange(configurations);
    }

  }, [percentage.value, productVariants.value])


  useEffect(() => {
    if (selection.selection.length > 0 && JSON.stringify(productVariants.value) !== JSON.stringify(selection.selection)) {
      productVariants.onChange(selection.selection)
    }
    if (selection.selection.length === 0 && productVariants.value?.length > 0) {
      productVariants.onChange(productVariants.defaultValue)
    }
  }, [JSON.stringify(selection.selection.length)])


  const removeProduct = useCallback(
    (resource) => {
      const options = selection?.selection?.filter((item) => item.id !== resource.id) ?? [];
      setSelection({ ...selection, selection: options });
    },
    [selection],
  );

  const handleOnSelect = (resource) => {
    if (resource) setSelection(resource)
    return setIsPickerOpen({
      ...isPickerOpen,
      open: false});
  }

  return <>
    <Card>
      <VerticalStack gap="3">
        <Grid>
          <Grid.Cell columnSpan={{ xs: 5, sm: 5, md: 5, lg: 10, xl: 10 }}>
            <Text variant="headingMd" as="h2">
              Discount Variant {percentage.value.toString() === "0" ? "" : `(${percentage.value}% off)`}
            </Text>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 1, sm: 1, md: 1, lg: 2, xl: 2 }}>
            {
              showButtons && <Button plain fullWidth textAlign="right" onClick={() => configurations.length > 1 && props.removeConfiguration(configIndex)} disabled={configurations.length <= 1}>
                Remove
              </Button>
            }
          </Grid.Cell>
        </Grid>
        <TextField
          label="Discount percentage"
          autoComplete="on"
          {...percentage}
          suffix="%"
        />

        <TextField
          label="Search Products"
          onFocus={() => handleResourcePickerOpen("Product")}
          autoComplete="on"
          placeholder="Search Products"
          labelHidden
          requiredIndicator
        />
        <ResourcePicker
          resourceType={isPickerOpen.resourceType ?? "Product"}
          open={isPickerOpen.open}
          initialSelectionIds={selection?.selection ?? []}
          onSelection={handleOnSelect}
          onCancel={() => setIsPickerOpen({
            ...isPickerOpen,
            open: false
          })}
        />
        {
          selection?.selection.length > 0 && <Listbox accessibilityLabel="Selected products">
            {
              selection?.selection.map((selectedOption) => {
                return <Listbox.Option key={selectedOption.id} value={selectedOption.id}>
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
                        }} onClick={() => handleResourcePickerOpen()}>

                        <VerticalStack gap={"1"}>
                          <Text as="p">
                            {selectedOption?.title ?? "Product not found"}
                          </Text>
                          {
                            (selection?.selection?.length > 0) &&
                            <Text as="p" variant="bodySm" color="subdued">
                              ({selectedOption?.variants?.length ?? 0}  variants selected)
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

                        <button onClick={() => removeProduct(selectedOption)} style={{
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                        }} >
                          <Icon source={XIcon} color="base" />
                        </button>
                      </div>
                    </div>
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