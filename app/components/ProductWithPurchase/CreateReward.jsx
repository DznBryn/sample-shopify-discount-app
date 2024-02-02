import { useProductWithPurchase } from "~/utils/hooks/useStore";
import ProductResourceCard from "../ProductResourceCard";
import { Layout, VerticalStack } from "@shopify/polaris";

export default function CreateReward() {
  const selection = useProductWithPurchase(state => state.selection)
  const rewardSelection = useProductWithPurchase(state => state.rewardSelection)

  return (
    <Layout.Section secondary>
      <VerticalStack gap="3">
        <ProductResourceCard selectionId={selection.selectionId} selection={selection.selection} setSelection={selection.setSelection} />
        <ProductResourceCard title="Select free products for selected products" selectionId={rewardSelection.selectionId} selection={rewardSelection.selection} setSelection={rewardSelection.setSelection} />
      </VerticalStack>
    </Layout.Section>
  );
}

