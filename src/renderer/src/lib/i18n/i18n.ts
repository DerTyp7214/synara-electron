import translations from "$lib/i18n/translations";
import { derived, get, writable } from "svelte/store";
import { settings } from "$lib/settings";

type PartialRecord<K extends PropertyKey, T> = {
  [P in K]?: T;
};

const storedLocale = get(settings.locale) ?? "us";

export const locales = Object.keys(translations) as Locales[];
export const locale = writable<Locales>(
  storedLocale in locales ? (storedLocale as Locales) : locales[0],
);

locale.subscribe((value) => {
  settings.locale?.set(value);
});

export type TranslationsType = Readonly<typeof translations>;
export type TranslationsTypeKeys<Locale extends Locales = Locales> = Readonly<
  keyof TranslationsType[Locale]
>;
export type TranslationsTypeValues<
  Locale extends Locales = Locales,
  Key extends TranslationsTypeKeys = TranslationsTypeKeys,
> = Readonly<TranslationsType[Locale]>[Key];

export type ReplaceInString<
  Locale extends Locales,
  Key extends TranslationsTypeKeys,
  V extends KeyVariables<Locale, Key>,
  T extends string = TranslationsTypeValues<Locale, Key>,
> = T extends `${infer Start}{{${infer Var}}}${infer Rest}`
  ? Var extends keyof V
    ? `${Start}${V[Var]}${ReplaceInString<Locale, Key, V, Rest>}`
    : T
  : T;

export type TranslationsTypeValuesWithVariables<
  Locale extends Locales,
  Key extends TranslationsTypeKeys,
  Vars extends KeyVariables<Locale, Key>,
> = ReplaceInString<Locale, Key, Vars>;

export type Locales = keyof TranslationsType;

export type ExtractVariables<T extends string> =
  T extends `${infer _Start}{{${infer Var}}}${infer Rest}`
    ? Var | ExtractVariables<Rest>
    : never;
export type ExportKeyVariables<
  Locale extends Locales = Locales,
  Key extends TranslationsTypeKeys = TranslationsTypeKeys,
> = ExtractVariables<TranslationsTypeValues<Locale, Key>>;
export type KeyVariables<
  Locale extends Locales = Locales,
  Key extends TranslationsTypeKeys = TranslationsTypeKeys,
> =
  ExportKeyVariables<Locale, Key> extends never
    ? never
    : PartialRecord<ExportKeyVariables<Locale, Key>, string>;

function translate<
  L extends Locales,
  K extends TranslationsTypeKeys,
  Vars extends KeyVariables<L, K>,
>(
  locale: L,
  key: K,
  vars: Vars | undefined,
  failOnError: boolean = true,
): TranslationsTypeValuesWithVariables<L, K, Vars> {
  if (!key) throw new Error("no key provided to $t()");
  if (!locale) throw new Error(`no translation for key "${key}"`);

  let text = translations[locale][key];

  if (!text) {
    if (failOnError)
      throw new Error(`no translation found for ${locale}.${key}`);
    return "" as TranslationsTypeValuesWithVariables<L, K, Vars>;
  }

  Object.keys(vars ?? {}).map((k) => {
    const regex = new RegExp(`{{${k}}}`, "g");
    text = text.replace(
      regex,
      vars![k as ExportKeyVariables<L, K>] as string,
    ) as never;
  });

  return text as TranslationsTypeValuesWithVariables<L, K, Vars>;
}

export const tC = <
  TLocale extends Locales,
  TKey extends TranslationsTypeKeys,
  TVars extends KeyVariables<TLocale, TKey>,
>(
  key: TKey,
  locale: TLocale,
  vars?: TVars,
) => translate<TLocale, TKey, TVars>(locale, key, vars);

export const t = derived(
  locale,
  <TLocale extends Locales>($locale: TLocale) =>
    <
      TKey extends TranslationsTypeKeys,
      TVars extends KeyVariables<TLocale, TKey>,
    >(
      key: TKey,
      vars?: TVars,
      failOnError: boolean = true,
    ): TranslationsTypeValuesWithVariables<TLocale, TKey, TVars> =>
      translate<TLocale, TKey, TVars>($locale, key, vars, failOnError),
);
