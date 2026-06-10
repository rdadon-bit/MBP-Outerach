// Seeds starter email templates. Run once after deploy: node prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const templates = [
  {
    name: "Initial outreach",
    touchType: "initial",
    subject: "Financing options for {{propertyAddress}}",
    body: `Hi {{firstName}},

I'm reaching out from Max Benjamin Partners — we arrange debt and equity for commercial real estate owners, and I came across {{propertyAddress}}.

We're seeing strong appetite from our lender network for {{propertyType}} assets right now, whether you're looking at a refinance, bridge, or construction financing.

Would you be open to a quick call this week to see if we can improve your current terms?

Best,`,
  },
  {
    name: "Follow-up 1 (day 3)",
    touchType: "followup1",
    subject: "Re: Financing options for {{propertyAddress}}",
    body: `Hi {{firstName}},

Following up on my note earlier this week. Even if you're not actively looking, it's often worth a 10-minute conversation to benchmark your current debt against today's market.

Any interest in connecting?

Best,`,
  },
  {
    name: "Follow-up 2 (day 7)",
    touchType: "followup2",
    subject: "Re: Financing options for {{propertyAddress}}",
    body: `Hi {{firstName}},

Wanted to surface this one more time — we recently closed several deals for owners of {{propertyType}} properties at terms meaningfully better than their existing debt.

Happy to share what we're seeing in the market. Worth a quick call?

Best,`,
  },
  {
    name: "Follow-up 3 (day 14)",
    touchType: "followup3",
    subject: "Re: Financing options for {{propertyAddress}}",
    body: `Hi {{firstName}},

I'll keep this short — if financing for {{propertyAddress}} ever becomes a priority, we'd love to be your first call. I'll check back in periodically with anything relevant from the market.

Best,`,
  },
  {
    name: "Monthly check-in",
    touchType: "monthly",
    subject: "Market update — {{propertyType}} financing",
    body: `Hi {{firstName}},

Quick check-in from Max Benjamin Partners. Rates and lender appetite have continued to move, and we're actively placing {{propertyType}} deals.

If a refinance or new acquisition is on your radar for {{propertyAddress}} or elsewhere in your portfolio, I'd welcome the chance to put together some options.

Best,`,
  },
];

(async () => {
  for (const t of templates) {
    const existing = await db.template.findFirst({ where: { touchType: t.touchType } });
    if (!existing) {
      await db.template.create({ data: { ...t, active: true } });
      console.log(`Created template: ${t.name}`);
    } else {
      console.log(`Skipped (exists): ${t.name}`);
    }
  }
  await db.$disconnect();
})();
