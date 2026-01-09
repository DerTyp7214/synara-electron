export function cleanTitle<T extends string | undefined>(title: T): T {
  if (!title) return title;

  const regex =
    /\s*([([].*?(feat|ft|with|prod|live|remix|acoustic|radio\sedit|explicit|clean|remaster).*?[)\]])|\s+(feat|ft|with|prod)\.?\s+.*$/gi;

  return title.replace(regex, "").trimEnd() as T;
}

export async function toDataURL(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
