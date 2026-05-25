export function buildAskPrompt(markdown: string, question: string): string {
  return `You are analyzing a web page that has been converted to Markdown. Answer the user's question based only on the content provided.

## Page Content

${markdown}

## Question

${question}

## Instructions

- Answer based only on the page content above.
- Be concise and direct.
- If the answer is not in the content, say so.
`;
}

export function buildSummarizePrompt(markdown: string): string {
  return `You are analyzing a web page that has been converted to Markdown. Provide a clear, concise summary.

## Page Content

${markdown}

## Instructions

- Summarize the key points in bullet form.
- Be concise.
- Focus on actionable or important information.
`;
}

export function buildExtractPrompt(markdown: string, instruction: string): string {
  return `You are analyzing a web page that has been converted to Markdown. Follow the user's instruction.

## Page Content

${markdown}

## Instruction

${instruction}

## Guidelines

- Work only with the content provided above.
- Be precise and structured in your output.
`;
}

export function buildReformatPrompt(markdown: string): string {
  return `You are a Markdown formatting expert. Reformat the following web page content into clean, well-structured Markdown.

## Raw Content

${markdown}

## Formatting Rules

- Preserve ALL factual content — do not summarize or remove information.
- Use proper heading hierarchy (# → ## → ### etc.) to reflect the information structure.
- Convert any tabular data into proper Markdown tables with aligned columns.
- Use bullet lists for related items, numbered lists for sequential steps.
- Preserve links, code blocks, and emphasis.
- Remove redundant whitespace, broken formatting, and navigation artifacts.
- Group related content under clear headings.
- If content has no clear structure, impose a logical one based on the topic flow.
- Output ONLY the reformatted Markdown — no commentary, no explanation.
`;
}
