"use client";

import { useId, useState } from "react";

const studies = {
  assistant: [
    { name: "Team knowledge", title: "An answer with a source.", steps: ["Ask a question", "Find the relevant knowledge", "Review a source-linked answer"], outcome: "Give people a useful place to start, with the original information close at hand." },
    { name: "Customer support", title: "A more helpful handoff.", steps: ["Understand the question", "Offer a useful next step", "Bring in the right person"], outcome: "Keep human support within reach when a question needs context or care." },
    { name: "Product assistant", title: "A little guidance, in context.", steps: ["Start with a user need", "Offer relevant guidance", "Let the person decide"], outcome: "Make AI part of a useful product journey with a clear role and boundaries." },
  ],
  workflow: [
    { name: "New inquiry", title: "From hello to a next step.", steps: ["Website inquiry", "Organized customer record", "Assigned follow-up"], outcome: "One connected path helps a new conversation reach the right person." },
    { name: "Document review", title: "Make information usable.", steps: ["Receive a document", "Extract and organize", "Send for human review"], outcome: "Leave the repeated sorting to a workflow and the important decisions to people." },
    { name: "Team updates", title: "Keep everyone in the picture.", steps: ["Collect key updates", "Prepare a summary", "Share with the team"], outcome: "A regular, understandable view of the work that needs attention." },
  ],
  website: [
    { name: "Brand website", title: "A considered first impression.", steps: ["A clear opening story", "A reason to explore", "A natural next step"], outcome: "Help a visitor understand your business without making them work for it." },
    { name: "Campaign page", title: "One page. One clear purpose.", steps: ["Match the campaign promise", "Explain the offer", "Make action straightforward"], outcome: "Bring the message and the destination together in a focused experience." },
    { name: "Content system", title: "Built to keep growing.", steps: ["Organize the content", "Make updates approachable", "Publish with confidence"], outcome: "Give your team a practical way to keep the website current." },
  ],
  app: [
    { name: "Customer app", title: "Useful from the first tap.", steps: ["Understand the task", "Design a clear flow", "Build the essential experience"], outcome: "Start with the feature that makes the product worth coming back to." },
    { name: "Internal tool", title: "Make everyday work clearer.", steps: ["See what needs attention", "Take the next action", "Keep the team in sync"], outcome: "A shared workspace can turn scattered tasks into a visible process." },
    { name: "Prototype", title: "Explore it before building it.", steps: ["Shape the idea", "Try the interaction", "Learn what to build"], outcome: "Make an early decision with something tangible in front of you." },
  ],
  commerce: [
    { name: "Shopify", title: "A store that feels like you.", steps: ["Discover the collection", "Understand the product", "Move toward purchase"], outcome: "Bring your brand, product information, and buying flow into one experience." },
    { name: "TikTok Shop", title: "Turn interest into discovery.", steps: ["Meet a product in content", "Explore its story", "Shop through a supported channel"], outcome: "Connect the creative idea to the product experience, with setup suited to your market." },
    { name: "Operations", title: "Keep the next step connected.", steps: ["Receive an order", "Route the information", "Support the customer"], outcome: "Plan the work after the purchase with as much care as the storefront." },
  ],
  growth: [
    { name: "Messaging", title: "Make the value easy to see.", steps: ["Know the audience", "Clarify the offer", "Tell a consistent story"], outcome: "Give the right people a reason to pay attention." },
    { name: "Campaign", title: "Connect the whole journey.", steps: ["A relevant creative idea", "A useful landing page", "A clear next action"], outcome: "Design the path together, from the first impression to the next step." },
    { name: "Learning", title: "Make the next decision better.", steps: ["Choose meaningful signals", "Review the experience", "Test a focused improvement"], outcome: "Use evidence to guide the next iteration without promising a predetermined result." },
  ],
};

export function ServiceStudy({ kind }: { kind: keyof typeof studies }) {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const choices = studies[kind];
  const study = choices[selected];
  return (
    <div className="plusone-study">
      <div className="plusone-study-toolbar">
        <p className="plusone-eyebrow">An idea in motion</p>
        <div className="plusone-study-choices" aria-label="Choose a concept">
          {choices.map((choice, index) => (
            <button key={choice.name} type="button" aria-pressed={selected === index} aria-controls={id}
              onClick={() => setSelected(index)}>{choice.name}</button>
          ))}
        </div>
      </div>
      <div id={id} className="plusone-study-canvas" aria-live="polite" aria-atomic="true">
        <div className="plusone-study-story" key={`${selected}-story`}>
          <span className="plusone-study-number" aria-hidden="true">0{selected + 1}</span>
          <h4>{study.title}</h4>
          <p>{study.outcome}</p>
        </div>
        <ol className="plusone-study-steps" key={`${selected}-steps`}>
          {study.steps.map((step, index) => <li key={step}><span aria-hidden="true">0{index + 1}</span>{step}</li>)}
        </ol>
      </div>
      <p className="plusone-study-caption">Concept study · An illustrative journey, not a client project.</p>
    </div>
  );
}
