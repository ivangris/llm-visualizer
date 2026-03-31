export function formatTokenTokenFirst(token: string): string {
  return token.replace(/\n/g, "\\n");
}

export function tokenToWordHelper(token: string): string {
  if (!token) {
    return "";
  }
  const cleaned = token
    .replace(/^Ġ/, " ")
    .replace(/^▁/, " ")
    .replace(/\s+/g, " ");
  return cleaned.trim().length > 0 ? cleaned : token;
}

export function probabilityToPercent(probability: number): string {
  if (probability <= 0) {
    return "0%";
  }
  if (probability < 0.001) {
    return "<0.1%";
  }
  return `${(probability * 100).toFixed(1)}%`;
}
