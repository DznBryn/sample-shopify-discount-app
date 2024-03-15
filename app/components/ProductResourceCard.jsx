import { ResourcePicker } from "@shopify/app-bridge-react"
import { Box, Button, ButtonGroup, Card, Icon, Listbox, Text, TextField, Thumbnail, VerticalStack } from "@shopify/polaris"
import { XIcon } from "@shopify/polaris-icons"
import { useCallback, useState } from "react";

export default function ProductResourceCard({ title = "Select products", selectionId, selection, setSelection, enableQuantity = false}) {
  const [isPickerOpen, setIsPickerOpen] = useState({
    resourceType: 'Product',
    open: false,
  });

  const handleProductSelect = (resource) => {
    if (resource) setSelection({ selectionId: resource?.id ?? '', selection: resource?.selection ?? [] });
    return setIsPickerOpen({
      ...isPickerOpen,
      open: false
    });
  }
  const handleRemoveProductSelect = useCallback(
    (resource) => {
      const options = selection?.filter((item) => item?.id !== resource.id) ?? [];
      setSelection({ selectionId, selection: options });
    },
    [selection],
  );

  const handleResourcePickerOpen = (resourceType) => {
    setIsPickerOpen({
      resourceType,
      open: true,
    });
  };

  return <Card>
    <VerticalStack gap="3">
      <Text variant="headingSm" as="h2">
        {title}
      </Text>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <div>
          <Button onClick={() => handleResourcePickerOpen('Product')}>Browse</Button>
        </div>
        <div>
          <QuantityInput />
        </div>
      </div>
      <ResourcePicker
        resourceType={"Product"}
        open={isPickerOpen.open}
        initialSelectionIds={selection ?? []}
        onSelection={handleProductSelect}
        onCancel={() => setIsPickerOpen({
          ...isPickerOpen,
          open: false
        })}
      />
      {
        selection?.length > 0 && <Listbox accessibilityLabel="Selected products">
          {
            selection?.map((selectedOption) => {
              return <Listbox.Option key={selectedOption?.id} value={selectedOption.id}>
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
                          (selection?.length > 0) &&
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

                      <button onClick={() => handleRemoveProductSelect(selectedOption)} style={{
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
  </Card>
}

function QuantityInput() {
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (value) => {
    const newQuantity = parseInt(value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      setQuantity(newQuantity);
    }
  };

  const incrementQuantity = () => {
    setQuantity(quantity + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 0) {
      setQuantity(quantity - 1);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%'}}>
      <ButtonGroup segmented fullWidth>
        <Button onClick={decrementQuantity} accessibilityLabel="Decrease quantity" disabled={quantity === 1} >-</Button>
        <TextField label="Quantity" labelHidden value={String(quantity)} onChange={handleQuantityChange} autoComplete="off" />
        <Button onClick={incrementQuantity} accessibilityLabel="Increase quantity" >+</Button>
      </ButtonGroup>
    </div>
  );
}
