"use client";

interface InfoPanelProps {
  topic: string;
}

const INFO_CONTENT: Record<string, { title: string; body: string }> = {
  overview: {
    title: "How to read this tree",
    body:
      "Each step shows a few possible next words. The bright branch is the one the model chose. Faded branches are options it did not choose.",
  },
  strategy: {
    title: "How a word gets picked",
    body:
      "Top-k: choose from the top few options. Top-p: choose from options until enough total confidence is covered. Temperature: makes choices more conservative or more creative.",
  },
  topology: {
    title: "Layout styles",
    body:
      "Layered LR reads like a timeline from left to right. Top-down reads like an org chart. Radial looks like a burst from the center.",
  },
};

export function InfoPanel({ topic }: InfoPanelProps) {
  const content = INFO_CONTENT[topic] ?? INFO_CONTENT.overview;
  return (
    <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
      <h3 className="text-sm font-semibold text-cyan-300">{content.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{content.body}</p>
    </aside>
  );
}
