
const PLANS = [
    {
      title: "Starter",
      desc: "Free access for 2 members",
      price: 129,
      options: [
        {
          icon: CheckCircle,
          label: "Complete documentation",
        },
        {
          icon: CheckCircle,
          label: "Working materials in Sketch",
        },
        {
          icon: MinusCircle,
          label: "Integration help",
        },
        {
          icon: MinusCircle,
          label: "40GB Cloud storage",
        },
        {
          icon: MinusCircle,
          label: "Support team full assist",
        },
      ],
    },
    {
      title: "Premium",
      desc: "Free access for 30 members",
      price: 299,
      options: [
        {
          icon: CheckCircle,
          label: "Complete documentation",
        },
        {
          icon: CheckCircle,
          label: "Working materials in Sketch",
        },
        {
          icon: CheckCircle,
          label: "Integration help",
        },
        {
          icon: CheckCircle,
          label: "40GB Cloud storage",
        },
        {
          icon: MinusCircle,
          label: "Support team full assist",
        },
      ],
    },
    {
      title: "Company",
      desc: "Free access for 200 members",
      price: 399,
      options: [
        {
          icon: CheckCircle,
          label: "Complete documentation",
        },
        {
          icon: CheckCircle,
          label: "Working materials in Sketch",
        },
        {
          icon: CheckCircle,
          label: "Integration help",
        },
        {
          icon: CheckCircle,
          label: "40GB Cloud storage",
        },
        {
          icon: CheckCircle,
          label: "Support team full assist",
        },
      ],
    },
  ];
  
  export default function PricingSection12() {
    return (
      <section className="py-16">
        <div className="container mx-auto">
          <div className="mb-16">
            <Typography color="primary" className="font-semibold">
              Pricing Plans
            </Typography>
            <Typography
              as="h2"
              type="h3"
              color="default"
              className="my-4 max-w-2xl [text-wrap:balance]"
            >
              Invest in a plan that&apos;s as ambitious as your corporate goals.
            </Typography>
            <Typography type="lead" className="max-w-lg text-foreground">
              Compare the benefits and features of each plan below to find the
              ideal match for your business&apos;s budget and ambitions.
            </Typography>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl">
            {PLANS.map(({ title, desc, options, price }, key) => (
              <Card key={key}>
                <Card.Header className="m-0 w-full p-6">
                  <Typography
                    type="lead"
                    color="default"
                    className="font-semibold mb-1"
                  >
                    {title}
                  </Typography>
                  <Typography type="small" className="block mb-6 text-foreground">
                    {desc}
                  </Typography>
                  <Typography type="h3" color="default">
                    ${price}
                    <Typography
                      as="span"
                      type="lead"
                      className="self-end font-normal text-foreground"
                    >
                      /year
                    </Typography>
                  </Typography>
                </Card.Header>
                <Card.Body className="px-6 py-0">
                  <ul className="flex flex-col gap-3">
                    {options.map(({ icon: Icon, label }, key) => (
                      <li
                        key={key}
                        className="flex items-center gap-3 text-foreground"
                      >
                        <Icon className="w-4 h-4 stroke-2 text-inherit" />
                        <Typography type="small" className="block">
                          {label}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </Card.Body>
                <Card.Footer className="p-6">
                  <Button isFullWidth>Get Started</Button>
                </Card.Footer>
              </Card>
            ))}
          </div>
          <Typography type="small" className="mt-8 block text-foreground">
            You have Free Unlimited Updates and Premium Support on each package.
            You also have 30 days to request a refund.
          </Typography>
        </div>
      </section>
    );
  }