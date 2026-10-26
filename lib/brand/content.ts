export const brand = {
  name: "PlusOne AI",
  url: "https://plusoneai.net",
  title: "PlusOne AI — AI, Websites, Apps, E-commerce & Marketing",
  description: "We build AI tools, websites, apps, and online stores — and help businesses grow. A new era for your business, by PlusOne AI.",
};

export const services = [
  {
    id: "ai", label: "AI & Automation", numeral: "I",
    description: "Make room for the work that matters.",
    detail: "AI assistants and connected workflows that help your team find answers, handle repetitive tasks, and turn information into action.",
    capabilities: ["AI assistants", "Knowledge tools", "Workflow automation"],
  },
  {
    id: "websites", label: "Websites", numeral: "II",
    description: "A considered home for your business.",
    detail: "Distinctive websites that bring your brand to life, explain what you do, and make the next step feel natural — on every screen.",
    capabilities: ["Brand websites", "Interactive experiences", "Landing pages"],
  },
  {
    id: "apps", label: "Apps", numeral: "III",
    description: "Bring a useful idea into the world.",
    detail: "Web and mobile applications shaped around real needs, from an early product concept to the tools your team uses every day.",
    capabilities: ["Web applications", "Mobile apps", "Internal tools"],
  },
  {
    id: "ecommerce", label: "E-commerce", numeral: "IV",
    description: "From discovery to your next order.",
    detail: "Shopify storefronts, TikTok Shop setup, and connected commerce workflows that bring your products, content, and operations together.",
    capabilities: ["Shopify development", "TikTok Shop", "Store operations"],
  },
  {
    id: "marketing", label: "Marketing", numeral: "V",
    description: "Help the right people discover you.",
    detail: "Clear messaging, purposeful content, and thoughtful digital campaigns that connect your work with the people it is made for.",
    capabilities: ["Brand messaging", "Content & campaigns", "Conversion journeys"],
  },
] as const;

export type ServiceId = (typeof services)[number]["id"];
export type ServiceSelection = ServiceId | "overview";
