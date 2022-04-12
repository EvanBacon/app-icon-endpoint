const regex = /[^\u0000-\u00ff]/; // Small performance gain from pre-compiling the regex

export function containsDoubleByte(str: string | undefined): boolean {
  if (!str?.length) return false;
  if (str.charCodeAt(0) > 255) return true;
  return regex.test(str);
}

export function toUnicode(str: string) {
  if (str.length < 4) return str.codePointAt(0).toString(16);
  return (
    str.codePointAt(0).toString(16) + "-" + str.codePointAt(2).toString(16)
  );
}

export function ensureUnicode(str: string) {
  if (containsDoubleByte(str)) {
    return toUnicode(str);
  }
  return str;
}
