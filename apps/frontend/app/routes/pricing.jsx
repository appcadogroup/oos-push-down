// @components
import { Card, Button, Typography } from "@material-tailwind/react";
import { PLAN_DATA } from "./app.subscription";


export const loader = async ({ request }) => {
  return {}
};

export default function PricingPage() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <Typography color="primary" className="font-semibold">
            Pricing Plans (version 8.0)
          </Typography>
          <Typography
            as="h2"
            type="h3"
            color="default"
            className="my-4 max-w-2xl [text-wrap:balance]"
          >
            Plans that match your needs
          </Typography>
          <Typography type="lead" className="max-w-lg text-foreground">
            Simple pricing, No Usage Fees, 7-Day Free Trial.
          </Typography>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PLAN_DATA.map(
            (
              {
                title,
                description,
                features,
                price,
                annual_price,
                annual_off_per,
              },
              key,
            ) => (
              <Card key={key}>
                <Card.Header className="m-0 w-full p-6">
                  <Typography
                    type="lead"
                    color="default"
                    className="font-semibold mb-1"
                  >
                    {title}
                  </Typography>
                  <Typography
                    type="small"
                    className="block mb-6 text-foreground"
                  >
                    {description}
                  </Typography>
                  <Typography type="h3" color="default">
                    ${price}
                    <Typography
                      as="span"
                      type="lead"
                      className="self-end font-normal text-foreground"
                    >
                      /month
                    </Typography>
                  </Typography>

                  <Typography type="p" color="success" className="min-h-8">
                    {annual_price
                      ? `or ${annual_price}/year and save ${annual_off_per}%`
                      : ""}
                  </Typography>
                </Card.Header>
                <Card.Body className="px-6 py-0">
                  <ul className="flex flex-col gap-3">
                    {features.map((option, key) => (
                      <li
                        key={key}
                        className="flex items-center gap-3 text-foreground"
                      >
                        {/* <Icon className="w-4 h-4 stroke-2 text-inherit" /> */}
                        <Typography type="small" className="block">
                          {option}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </Card.Body>
                <Card.Footer className="p-6">
                  <Button isFullWidth className="text-white">Start 7-day Free Trial</Button>
                </Card.Footer>
              </Card>
            ),
          )}
        </div>
        <Typography type="small" className="mt-8 block text-foreground">
          Our pricing works based on your store products and collections
          amounts. You’ll want your plan to cover both your number of Products
          and Collections. For example, if you have 510 Products and 50
          Collections, we recommend using our Professional Plan.
        </Typography>
      </div>
    </section>
  );
}
