import {useState} from 'react';
import {
  Page,
  Layout,
  MediaCard,
  Card,
  Button,
  Text,
  Divider,
  Collapsible,
  BlockStack,
  InlineStack,
} from '@shopify/polaris';

export const shouldRevalidate = ({
  actionResult,
  formAction,
  formMethod,
  defaultShouldRevalidate,
}) => {
  return defaultShouldRevalidate;
};

const QA = [
  { "quesiton": "Can I limit the feature to specific collections?", "answer": "Yes. You can select which collections the app manages, so you have full control over where sold-out items are pushed down or hidden." },
  { "quesiton": "What does this app actually do?", "answer": "It spots products that sell out and either moves them to the bottom of your collections or hides them—so shoppers always see what’s in stock first." },
  { "quesiton": "Do sold-out products come back on their own?", "answer": "Yep! As soon as you restock, the app pops them right back into their original place. No clicking around needed." },
  { "quesiton": "Can I choose to hide or just push down?", "answer": "Totally. You decide whether to hide them, push them down, or do both. You can even tag them for easy tracking." },
  { "quesiton": "Will this app affect my SEO or product URLs?", "answer": "No. The app doesn’t delete or change your product URLs—it only changes their visibility or order within collections. All product links remain active." },
  { "quesiton": "How often does the app check for inventory changes?", "answer": "The app works in real time, monitoring your Shopify inventory and updating your collections instantly when a product’s stock status changes." },
]

/**
 * Remix route/component example
 * - Drop this component into app/routes/hidepay._index.tsx (or .jsx)
 * - Ensure AppProvider wraps your root with Polaris setup
 */
export default function DashboardPage() {
  const [faqOpen, setFaqOpen] = useState(QA.map(i => false));

  const toggleFaq = (index) =>
    setFaqOpen((prev) => prev.map((v, i) => (i === index ? !v : v)));

  return (
    <Page
      title="AC: Sold Out Push Down & Hide"
      primaryAction={undefined}
    >
      <Layout>
        {/* Hero / How-to section */}
        <Layout.Section>
          <Card>
            <MediaCard
              title={
                <Text as="h2" variant="headingMd">
                  🎉 Discover how to use AC: Sold Out Push Down & Hide.
                </Text>
              }
              primaryAction={{
                content: '🛍️ Manage collection sorting',
                url: "/app/collections"
              }}
              secondaryAction={{
                content: '⚙️ Configure push down setting',
                url: "/app/settings/push-down"
              }}
              description={
                <Text as="p" variant="bodyMd">
                  With AC: Sold Out Push Down & Hide, you can keep your store looking fresh by automatically pushing sold-out products to the bottom or hiding them entirely. Set it up once, and the app will manage your collections in real time—restoring products when they’re back in stock.
                </Text>
              }
            >
              <img
                alt="HidePay overview"
                style={{display: 'block', width: '100%', maxWidth: 600}}
                src="/assets/oos-app-banner-home.gif"
              />
            </MediaCard>
          </Card>
        </Layout.Section>

        {/* Section divider with helper text */}
        <Layout.Section>
          <Divider />
          <InlineStack align="center" gap="200" wrap>
            <Text tone="subdued" variant="bodyMd" fontWeight="bold">
              Check available customizations
            </Text>
          </InlineStack>
        </Layout.Section>

        {/* Two feature tiles 
        <Layout.Section>
          <Layout>
            <Layout.Section oneHalf>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd" fontWeight="semibold">
                    Payment Customizations
                  </Text>
                  <Text as="p">
                    Customize your payment options by renaming, reordering, or removing payment methods to better suit your business needs.
                  </Text>
                  <InlineStack gap="200" wrap>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        // navigate('/app/payment-customizations/new');
                      }}
                    >
                      Create
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        // navigate('/app/payment-customizations');
                      }}
                    >
                      View
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section oneHalf>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd" fontWeight="semibold">
                    Store customizations
                  </Text>
                  <Text as="p">
                    Create rule to hide accelerated checkout from product and cart pages or drawer.
                  </Text>
                  <InlineStack gap="200" wrap>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        // navigate('/app/store-customizations/new');
                      }}
                    >
                      Create
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        // navigate('/app/store-customizations');
                      }}
                    >
                      View
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>
        */}

        {/* FAQ divider */}
        <Layout.Section>
          <Divider />
          <InlineStack align="center" gap="200" wrap>
            <Text tone="subdued" variant="bodyMd" fontWeight="bold">
              Frequently asked questions
            </Text>
          </InlineStack>
        </Layout.Section>

        {/* FAQ list */}
        <Layout.Section>
          <Card>
            <BlockStack gap="0">
              { QA.map((qa, index) => {
                return (
                  <>
                  <FAQItem
                  index={index}
                  open={faqOpen[index]}
                  onToggle={toggleFaq}
                  question={qa.quesiton}
                >
                  <Text as="p">
                    {qa.answer}
                  </Text>
                  </FAQItem>
                  <Divider />
                  </>
                
                )
              })}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function FAQItem({
  index,
  open,
  onToggle,
  question,
  children,
}) {
  return (
    <BlockStack gap="0">
      <button
        onClick={() => onToggle(index)}
        style={{
          textAlign: 'left',
          width: '100%',
          border: 0,
          background: 'none',
          padding: '1rem',
          cursor: 'pointer',
        }}
        aria-expanded={open}
        aria-controls={`faq-content-${index}`}
      >
        <InlineStack align="space-between" blockAlign="center">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            {question}
          </Text>
          <Text as="span" variant="bodyMd">
            {open ? '▾' : '▸'}
          </Text>
        </InlineStack>
      </button>
      <Collapsible
        id={`faq-content-${index}`}
        open={open}
        expandOnPrint
        transition={{duration: '500ms', timingFunction: 'ease-in-out'}}
      >
        <Divider />
        <div style={{padding: '1rem'}}>{children}</div>
      </Collapsible>
    </BlockStack>
  );
}
