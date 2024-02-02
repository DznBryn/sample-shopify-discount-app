import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page } from "@shopify/polaris";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { authenticate } from "~/shopify.server";

export async function loader({ request }) {
  await authenticate.admin(request);

  const url = new URL(request.url);

  return json({
    apiKey: process.env.SHOPIFY_API_KEY,
    host: url.searchParams.get("functionId"),
  });
}
export default function ProductWithPurchaseNew() {
  const { apiKey } = useLoaderData();
  return <AppProvider isEmbeddedApp apiKey={apiKey}>
      <Page title="Product with Purchase"></Page>
    </AppProvider>
}