import { Banner, Layout } from "@shopify/polaris";

export function ErrorBanner({ errors=[], data }){

  return errors.length > 0 && !data ? (
    <Layout.Section>
      <Banner status="critical">
        <p>There were some issues with your form submission:</p>
        <ul>
          {errors.map(({ message, field }, index) => {
            return (
              <li key={`${message}${index}`}>
                {message}
              </li>
            );
          })}
        </ul>
      </Banner>
    </Layout.Section>
  ) : null;
}