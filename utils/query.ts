import { cssColorNameToHex } from "./color";

export function getNumericQueryParam(
  query: { [key: string]: string | string[] },
  key: string
): number | null {
  if (query[key] == null) {
    return null;
  }

  const value = query[key];

  if (Array.isArray(value)) {
    throw new Error(
      `Invalid query parameter: ${key}=${value.join(
        ","
      )}. Expected a single positive integer.`
    );
  }

  const num = Number(query[key]);

  if (!Number.isInteger(num) || num < 0) {
    throw new Error(
      `Invalid query parameter: ${key}=${value}. Expected a single positive integer.`
    );
  }

  return num;
}

export function getFirst<T>(param: undefined | T | T[]): T | undefined {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param;
}
