// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from "next";
import querystring from "querystring";
import { cssColorNameToHex, isHexColor } from "../../utils/color";

import { getRandomEmoji, getTwitterEmojiUrl } from "../../utils/emoji";
import { generateIconAsync } from "../../utils/image";
import { getFirst, getNumericQueryParam } from "../../utils/query";
import {
  containsDoubleByte,
  ensureUnicode,
  toUnicode,
} from "../../utils/unicode";

const PRESETS = {
  splash: {
    padding: 832,
    width: 2048,
    height: 2048,
  },
  icon: {
    padding: 128,
    width: 1024,
    height: 1024,
  },
  favicon: {
    padding: 0,
    width: 48,
    height: 48,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const iconId = getFirst<string | undefined>(req.query.icon);

  if (containsDoubleByte(iconId)) {
    // redirect with icon as unicode
    req.query.icon = toUnicode(iconId);
    delete req.query.kind;
    const url = req.url!;
    const redirect = `${url.slice(0, url.indexOf("?"))}?${querystring.stringify(
      req.query
    )}`;
    console.log("Redirect emoji ->", redirect);
    return res.redirect(redirect);
  }

  const iconUrl = resolveIconUrl({
    hex: iconId,
  });

  const kind = getFirst<string | undefined>(req.query.kind);

  let preset: any = {};
  if (kind === "splash") {
    preset = PRESETS.splash;
  } else if (kind === "favicon") {
    preset = PRESETS.favicon;
  } else {
    preset = PRESETS.icon;
  }

  // Redirect color to hex if it's a CSS color name.
  const color = getFirst<string | undefined>(req.query.color);
  if (color) {
    const getColorAsHex = (color) => {
      if (isHexColor("#" + color)) {
        return "#" + color;
      }
      return cssColorNameToHex(color);
    };

    const parsed = getColorAsHex(color);
    if (parsed) {
      req.query.color_hex = parsed.substring(1);
      delete req.query.color;
      delete req.query.kind;
      const url = req.url!;
      const redirect = `${url.slice(
        0,
        url.indexOf("?")
      )}?${querystring.stringify(req.query)}`;
      console.log("Redirect color ->", redirect);
      return res.redirect(redirect);
    } else {
      throw new Error(
        `Invalid query parameter: ${color}. Expected a CSS color name or hex color without '#'.`
      );
    }
  }

  const colorHex = getFirst<string | undefined>(req.query.color_hex);

  const resolvedHexColor = colorHex ? "#" + colorHex : undefined;

  const queryPadding = getNumericQueryParam(req.query, "padding");

  const resolvedPadding = queryPadding ?? preset.padding ?? 128;

  const queryWidth = getNumericQueryParam(req.query, "width");
  const queryHeight = getNumericQueryParam(req.query, "height");
  let adjustedWidth = queryWidth ?? preset.width ?? 1024;
  let adjustedHeight = queryHeight ?? preset.height ?? 1024;

  adjustedWidth -= resolvedPadding * 2;
  adjustedHeight -= resolvedPadding * 2;

  const imageBuffer = await generateIconAsync({
    width: adjustedWidth,
    height: adjustedHeight,
    iconUrl,
    color: resolvedHexColor,
    padding: resolvedPadding,
    auto_color_style: getFirst(req.query.auto_color_style),
  });

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Length", imageBuffer.length);
  res.end(imageBuffer);
}

function resolveIconUrl(resolve: { hex?: any }): string {
  if (typeof resolve.hex === "string" && resolve.hex) {
    const unicode = ensureUnicode(resolve.hex);
    const url = getTwitterEmojiUrl(unicode);
    console.log("Using emoji: %s -> %s -> %s", resolve.hex, unicode, url);
    return url;
  }

  return getTwitterEmojiUrl(getRandomEmoji());
}
