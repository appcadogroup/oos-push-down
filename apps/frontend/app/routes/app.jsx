import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const shouldRevalidate = ({
  actionResult,
  formAction,
  formMethod,
  defaultShouldRevalidate,
}) => {
  return false;
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  let isAdmin = false;
  if (shop === "advanced-collection-sort.myshopify.com") {
    // Admin Shop
    isAdmin = true;
  }

  return { apiKey: process.env.SHOPIFY_API_KEY || "", isAdmin};
};

export default function App() {
  const { apiKey } = useLoaderData();
  const { isAdmin } = useLoaderData();  

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/collections">Collections</Link>
        <Link to="/app/settings/push-down">Push down settings</Link>
        <Link to="/app/settings/hide-or-show">Hide / unhide settings</Link>
        
        <Link to="/app/subscription">Subscription</Link>
        { isAdmin ? (
          <Link to="/app/admin">Admin</Link>
        ) : null }
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
