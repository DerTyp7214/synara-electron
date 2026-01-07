export function cleanTitle<T extends string | undefined>(title: T): T {
  if (!title) return title;

  const regex =
    /\s*([([].*?(feat|ft|with|prod|live|remix|acoustic|radio\sedit|explicit|clean|remaster).*?[)\]])|\s+(feat|ft|with|prod)\.?\s+.*$/gi;

  return title.replace(regex, "").trimEnd() as T;
}
