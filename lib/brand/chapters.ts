import type { ServiceSelection } from "./content";

/** Public section IDs are independent of the original artwork handles. */
export const artworkScenes = {
  hero: { section: "hero", index: 0, grid: "7" },
  sidekick: { section: "ai", index: 1, grid: "6" },
  agentic: { section: "automation", index: 2, grid: "6" },
  online: { section: "websites", index: 3, grid: "5" },
  retail: { section: "apps", index: 4, grid: "4" },
  marketing: { section: "ecommerce", index: 5, grid: "3" },
  checkout: { section: "shopify", index: 6, grid: "2" },
  operations: { section: "operations", index: 7, grid: "1" },
  "shop-app": { section: "social-commerce", index: 8, grid: "8" },
  b2b: { section: "b2b-commerce", index: 9, grid: "7" },
  finance: { section: "marketing", index: 10, grid: "6" },
  shipping: { section: "process", index: 11, grid: "5" },
  developer: { section: "partnership", index: 12, grid: "4" },
} as const;
export type ArtworkScene = keyof typeof artworkScenes;

type Offering = { title: string; description: string; details: string[] };
export type BrandChapter = {
  scene: Exclude<ArtworkScene, "hero">;
  service: ServiceSelection;
  label: string;
  title: [string, string];
  intro: string;
  heading: string;
  lead: string;
  offerings: Offering[];
  study?: "assistant" | "workflow" | "website" | "app" | "commerce" | "growth";
  platform?: "shopify";
};

export const brandChapters: BrandChapter[] = [
  {
    scene: "sidekick", service: "ai", label: "AI & Automation",
    title: ["Intelligence,", "with purpose."],
    intro: "Give your team a little more room to think. We turn AI into useful tools for the work you do every day.",
    heading: "Your knowledge. A new way to use it.",
    lead: "Start with one real problem. We shape an assistant around your information, your people, and a clear place for human judgment.",
    study: "assistant",
    offerings: [
      { title: "Knowledge assistants", description: "Find answers across the documents and resources your team relies on.", details: ["Source-linked answers", "Access shaped around your team"] },
      { title: "Customer support tools", description: "Help people find the right information and give your team a clearer handoff.", details: ["Guided self-service", "Human escalation paths"] },
      { title: "AI inside your product", description: "Add a focused AI feature to an existing website, app, or internal tool.", details: ["Useful prototypes", "Evaluation before rollout"] },
    ],
  },
  {
    scene: "agentic", service: "ai", label: "Connected workflows",
    title: ["Less repetition.", "More possibility."],
    intro: "The best automation gives people time back. Connect the small, repeated steps that keep a business moving.",
    heading: "Let the routine take care of itself.",
    lead: "We map how work moves today, then build practical connections between the tools you already use.",
    study: "workflow",
    offerings: [
      { title: "Lead to follow-up", description: "Turn a website inquiry into an organized record and a clear next action.", details: ["Forms and CRM connections", "Notifications and reminders"] },
      { title: "Documents to decisions", description: "Extract, organize, and route information so it reaches the right person.", details: ["Document processing", "Review and approval steps"] },
      { title: "A connected back office", description: "Bring routine updates and reporting into a workflow your team can understand.", details: ["Tool integrations", "Visible errors and recovery"] },
    ],
  },
  {
    scene: "online", service: "websites", label: "Website design & development",
    title: ["Make a lasting", "first impression."],
    intro: "A website should feel like your business. Distinctive design, a clear story, and an experience that makes the next step easy.",
    heading: "Beautiful to explore. Simple to use.",
    lead: "From an expressive company website to a focused campaign page, we bring strategy, design, and development together.",
    study: "website",
    offerings: [
      { title: "Company websites", description: "Show what you do, who it is for, and why it matters with a considered visual identity.", details: ["Content and page structure", "Responsive visual design"] },
      { title: "Interactive experiences", description: "Give a story depth through motion, thoughtful transitions, and purposeful interaction.", details: ["Animation and 3D", "Accessible alternatives"] },
      { title: "Sites you can manage", description: "Keep everyday updates within reach after the website launches.", details: ["Content management", "Performance and search foundations"] },
    ],
  },
  {
    scene: "retail", service: "apps", label: "Web & mobile applications",
    title: ["From an idea", "to something real."],
    intro: "A useful product begins with understanding the person using it. We design and build apps around real needs.",
    heading: "A focused first version. Room to evolve.",
    lead: "Define the essential experience, test the flow, and build a product that can grow with what you learn.",
    study: "app",
    offerings: [
      { title: "Product prototypes", description: "Make an idea tangible before committing to the full build.", details: ["User journeys", "Interactive prototypes"] },
      { title: "Web & mobile apps", description: "Bring an experience to the screens where your customers and team need it.", details: ["Customer-facing products", "Accounts and integrations"] },
      { title: "Internal tools", description: "Replace scattered spreadsheets and repeated work with a clearer workspace.", details: ["Portals and dashboards", "Roles and everyday workflows"] },
    ],
  },
  {
    scene: "marketing", service: "ecommerce", label: "E-commerce · Shopify · TikTok",
    title: ["From discovery", "to a storefront."],
    intro: "Build a store people want to explore, then connect it to the channels where they discover your products.",
    heading: "One brand. More ways to shop.",
    lead: "We bring storefront design, product content, and channel setup into one considered commerce experience.",
    study: "commerce",
    offerings: [
      { title: "Shopify storefronts", description: "Launch or refine a Shopify store that feels like your brand and makes products easy to understand.", details: ["Store setup and theme development", "Collections and product pages"] },
      { title: "TikTok Shop connections", description: "Set up your TikTok sales channel and connect product, inventory, and order flows where supported.", details: ["Account and catalog setup", "Market and product eligibility review"] },
      { title: "Content that connects", description: "Carry a consistent product story from a short video or campaign to the shopping experience.", details: ["Product storytelling", "Campaign landing pages"] },
    ],
  },
  {
    scene: "checkout", service: "ecommerce", label: "Shopify development",
    title: ["Every detail", "earns its place."],
    intro: "A strong store is more than a theme. Help shoppers understand the product, choose with confidence, and keep moving.",
    heading: "A better journey, from product to purchase.",
    lead: "We work within your Shopify plan and the tools available to your store, with attention to both the shopping experience and the team behind it.",
    platform: "shopify",
    offerings: [
      { title: "Theme & storefront craft", description: "Turn your brand direction into a fast, flexible storefront with useful product details.", details: ["Custom theme sections", "Navigation and merchandising"] },
      { title: "Cart & checkout journey", description: "Review the buying flow and configure the options supported by your store.", details: ["Cart usability", "Payment and delivery setup"] },
      { title: "The right integrations", description: "Connect the services your store needs without making everyday operations harder.", details: ["App selection and setup", "Analytics and operational connections"] },
    ],
  },
  {
    scene: "operations", service: "ecommerce", label: "Commerce operations",
    title: ["Behind the scenes,", "everything connects."],
    intro: "Make the work behind an order feel as considered as the storefront. Clear systems help a growing team stay in step.",
    heading: "A clearer view of the everyday.",
    lead: "Connect information across your store and operations, with practical workflows for the exceptions that still need a person.",
    offerings: [
      { title: "Catalog foundations", description: "Bring structure to product information, collections, variants, and launch updates.", details: ["Product data organization", "Repeatable publishing workflows"] },
      { title: "Orders & fulfillment", description: "Help the team see what needs attention and move information between connected tools.", details: ["Order workflow mapping", "Inventory and fulfillment integrations"] },
      { title: "Useful reporting", description: "Make the numbers and operational signals your team uses easier to find.", details: ["Shared dashboards", "Scheduled summaries"] },
    ],
  },
  {
    scene: "shop-app", service: "ecommerce", label: "Social & mobile commerce",
    title: ["Meet people", "where they discover."],
    intro: "From a TikTok video to a phone-sized storefront, make the path from interest to product feel connected.",
    heading: "Made for the way people browse.",
    lead: "We help shape mobile product experiences and social commerce content around your audience and the channels available to your business.",
    offerings: [
      { title: "TikTok content planning", description: "Develop product stories, creative briefs, and a content rhythm your team can sustain.", details: ["Short-form concepts", "Creator collaboration briefs"] },
      { title: "Mobile shopping", description: "Give small-screen shoppers clear information, useful images, and an easy next step.", details: ["Mobile product pages", "Storefront usability reviews"] },
      { title: "Connected campaigns", description: "Match what a person sees in a campaign with the page they arrive on.", details: ["Creative and landing-page alignment", "Campaign measurement setup"] },
    ],
  },
  {
    scene: "b2b", service: "ecommerce", label: "B2B & customer portals",
    title: ["Make room for", "your next customer."],
    intro: "Different customers need different journeys. Give business buyers, partners, and returning customers a more useful experience.",
    heading: "Commerce that fits the relationship.",
    lead: "We design a suitable route for your business, whether that means a product catalog, a quote workflow, or a connected customer portal.",
    offerings: [
      { title: "Wholesale experiences", description: "Help business buyers discover the right range and understand how to work with you.", details: ["Catalog and inquiry flows", "Platform and plan assessment"] },
      { title: "Customer portals", description: "Give customers a clear place to find information, make requests, and follow progress.", details: ["Accounts and permissions", "Self-service tools"] },
      { title: "Connected relationships", description: "Keep sales and customer information moving between your website and business tools.", details: ["CRM integrations", "Handoffs and follow-ups"] },
    ],
  },
  {
    scene: "finance", service: "marketing", label: "Marketing & growth",
    title: ["Good work deserves", "to be discovered."],
    intro: "Give people a reason to notice, understand, and remember your business. Then learn from what happens next.",
    heading: "A clear story. A thoughtful next step.",
    lead: "We connect brand messaging, content, campaign pages, and measurement so your marketing and website work together.",
    study: "growth",
    offerings: [
      { title: "Positioning & messaging", description: "Explain your value in language that makes sense to the people you want to reach.", details: ["Audience and offer clarity", "Website and campaign copy"] },
      { title: "Content & campaigns", description: "Create a consistent path across social content, campaign creative, and your website.", details: ["Content planning", "TikTok and digital campaign creative"] },
      { title: "Measure & improve", description: "Choose meaningful signals, review the journey, and decide what to improve next.", details: ["Analytics and conversion tracking", "Focused experiments"] },
    ],
  },
  {
    scene: "shipping", service: "overview", label: "How we work",
    title: ["A good beginning.", "A clear way forward."],
    intro: "An idea becomes a useful experience through a series of considered decisions. We make those decisions with you.",
    heading: "From the first conversation to the next chapter.",
    lead: "A clear brief keeps the project focused. Early designs make it tangible. A thoughtful handoff makes it yours.",
    offerings: [
      { title: "01 · Discover", description: "Understand the business, the people, and the problem worth solving.", details: ["Goals and priorities", "A shared scope and plan"] },
      { title: "02 · Design & build", description: "Explore the experience, review it together, and bring the agreed direction to life.", details: ["Visible milestones", "Design and development reviews"] },
      { title: "03 · Launch & learn", description: "Check the details, prepare the team, and use real feedback to guide what comes next.", details: ["Testing and handoff", "An agreed support plan"] },
    ],
  },
  {
    scene: "developer", service: "overview", label: "Your next chapter",
    title: ["One good idea.", "One step further."],
    intro: "A new website. A more useful app. A store ready for its next chapter. Start with the opportunity in front of you.",
    heading: "What would you like to make possible?",
    lead: "Choose a starting point. We can connect the pieces as your project takes shape.",
    offerings: [
      { title: "Create something new", description: "Give an early idea a clear shape and a practical first version.", details: ["Websites and apps", "Stores and AI tools"] },
      { title: "Improve what exists", description: "Find the points of friction in an existing experience and make a focused improvement.", details: ["Design and usability", "Workflows and integrations"] },
      { title: "Connect the next step", description: "Bring development and marketing together around a shared goal.", details: ["Content and campaigns", "Ongoing iteration"] },
    ],
  },
];
