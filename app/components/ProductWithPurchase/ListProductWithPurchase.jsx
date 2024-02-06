import { useFetcher } from "@remix-run/react";
import { Card, EmptyState, Icon, IndexTable, Layout, Thumbnail } from "@shopify/polaris";
import { useEffect, useState } from "react";
import { ErrorBanner } from "../ErrorBanner";
import Loader from "../Loader";
import { XIcon } from "@shopify/polaris-icons";
import { useProductWithPurchase } from "~/utils/hooks/useStore";

export default function ListProductWithPurchase() {
  const { list, loading, setList } = useProductWithPurchase(state => state.rewards);
  const fetcher = useFetcher();

  useEffect(() => {
    const fetchProducts = async () => {
      await fetcher.submit({
        formAction: 'GET_PRODUCT_WITH_PURCHASE',
      }, {
        method: 'POST',
      });
      if (fetcher.state === 'loading' && fetcher?.data?.data) {
        setList({ list: fetcher?.data?.data, loading: false });
      }
    };

    if (list.length === 0) {
      fetchProducts();
    }
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      await fetcher.submit({
        formAction: 'GET_PRODUCT_WITH_PURCHASE',
      }, {
        method: 'POST',
      });
      if (fetcher.state === 'loading' && fetcher?.data?.data) {
        setList({ list: fetcher?.data?.data, loading: false });
      }
    };

    if (fetcher.state === 'submitting') {
      setList({ loading: true });
    }
    if (fetcher.state === 'loading') {
      setList({ loading: false });
    }
    if (list.length === 0 && fetcher?.data?.data) {
      fetchProducts();
    }
  }, [fetcher.state]);

  if (fetcher?.data?.errors?.length > 0 && !fetcher?.data?.data) {
    return <ErrorBanner errors={fetcher?.data?.errors} data={fetcher?.data?.data} />;
  }

  return loading ? (
    <Layout.Section>
      <Loader />
    </Layout.Section>
  ) : (
    <Layout.Section>
      <Card>
        {list.length === 0 ? (
          <EmptyState
            heading="No Products with Purchase found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          />
        ) : (
          <ListProductWithPurchaseLoader />
        )}
      </Card>
    </Layout.Section>
  );
}

export function ListProductWithPurchaseLoader() {
  const [removeId, setRemoveId] = useState('');
  const { list, setList } = useProductWithPurchase(state => state.rewards);
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === 'loading' && fetcher?.data?.data) {
      console.log('Loading', fetcher);
      if (removeId !== '') {
        const newList = list.filter(item => item.id !== removeId);
        setList({ list: newList, loading: false });
        setRemoveId('');
      }
    }
  }, [fetcher.state]);

  const removeProduct = async (id) => {
    await fetcher.submit({
      formAction: 'DELETE_PRODUCT_WITH_PURCHASE',
      id
    }, {
      method: 'POST',
    });
    return setRemoveId(id);
  };

  return (
    <IndexTable
      resourceName={{ singular: 'Product', plural: 'Products' }}
      itemCount={list.length}
      headings={[
        { title: 'Product' },
        { title: 'Name' },
        { title: 'Prices' },
        { title: 'Purchase Promotion' },
        { title: '' }
      ]}
      selectable={false}
    >
      {list.map((item, index) => (
        <IndexTable.Row
          id={`productVariant-${item.id}-${index}`}
          position={index}
          key={`productVariant-${item.id}-${index}`}
        >
          <IndexTable.Cell>
            {item?.image?.url ? (
              <Thumbnail size="small" source={item?.image?.url} alt={item?.image?.altText} />
            ) : (
              <Icon source="placeholder" color="base" />
            )}
          </IndexTable.Cell>
          <IndexTable.Cell>
            <p>
              {item?.productTitle} <br />
              <small>{item?.variantTitle}</small>
            </p>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <p>
              ${Number(item?.prices?.minVariantPrice?.amount).toFixed(2)} - ${Number(item?.prices?.maxVariantPrice?.amount).toFixed(2)}
            </p>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <p>
              with {item.metafield?.value.length} {item.metafield?.value.length === 1 ? 'product' : 'products'}
            </p>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <button
              onClick={() => removeProduct(item.id)}
              style={{
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Icon source={XIcon} color="base" />
            </button>
          </IndexTable.Cell>
        </IndexTable.Row>
      ))}
    </IndexTable>
  );
}

export const nomralizeData = (data) => {
  return data.map((item) => {
    return {
      id: item?.id ?? '',
      productId: item?.productId ?? '',
      productTitle: item?.productTitle ?? '',
      variantTitle: item?.title ?? '',
      prices: item?.prices ?? {
        maxVariantPrice: {
          amount: '0.00',
          currencyCode: 'USD'
        },
        minVariantPrice: {
          amount: '0.00',
          currencyCode: 'USD'
        }
      },
      image: item?.image ?? {
        altText: null,
        url: null
      },
      metafield: item?.metafield ?? {
        value: []
      }
    };
  });
};
