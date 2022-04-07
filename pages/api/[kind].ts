// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
import getColors from "get-image-colors";
import chroma from "chroma-js";

const resizedSvgToSharp = async (
  p: string | Buffer,
  { width, height }: { width?: number; height?: number }
) => {
  const instance = sharp(p);

  // @ts-ignore
  const metadata = await instance.metadata();

  const initDensity = metadata.density ?? 72;

  if (metadata.format !== "svg") {
    return instance;
  }

  let wDensity = 0;
  let hDensity = 0;
  if (width && metadata.width) {
    wDensity = (initDensity * width) / metadata.width;
  }

  if (height && metadata.height) {
    hDensity = (initDensity * height) / metadata.height;
  }

  if (!wDensity && !hDensity) {
    // both width & height are not present and/or
    // can't detect both metadata.width & metadata.height
    return instance;
  }

  return (await sharp(p, { density: Math.max(wDensity, hDensity) })).resize(
    width,
    height,
    { fit: "contain", background: "transparent" }
  );
};

function twitterEmoji(id: string): string {
  return `https://twemoji.maxcdn.com/v/latest/svg/${id.toLowerCase()}.svg`;
}

async function genicoAsync({
  width,
  height,
  iconUrl,
  color,
  padding,
  auto_color_style: autoColorStyle,
}: {
  width: number;
  height: number;
  iconUrl: string;
  color?: string;
  padding: number;
  auto_color_style: string;
}) {
  console.log("Info:", { width, height, color, iconUrl });

  // Download SVG from Twitter
  // const iconData: Buffer = Buffer.from("..."); //await fetch(iconUrl).then((res) =>
  const iconData: Buffer = await fetch(iconUrl).then((res) =>
    // @ts-ignore
    res.buffer()
  );

  if (!color) {
    try {
      const colors = await getColors(iconData, "image/svg+xml");
      console.log("colors:", colors);
      // Uses the dominate color which effectively floods the image making emojis look like floating faces.
      if (autoColorStyle === "flood") {
        color = colors[0].hex();
      } else {
        const flipColor = (color) => {
          const isDark = color.get("lab.l") < 80;
          const adjust = color.get("lab.l") * 0.04;
          console.log("is dark:", isDark, adjust);
          // color = chroma.average(colors).brighten(3).hex();
          return isDark ? color.brighten(adjust) : color.darken(adjust);
        };
        color = flipColor(chroma.average(colors)).hex();
      }
    } catch (error) {
      console.error("error getting colors:", error);
      color = "#fff";
    }
  }

  let buff = await resizedSvgToSharp(iconData, { width, height });

  // Scale SVG
  // let buff = await resizedSvgToSharp(
  //   Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">
  //   <circle cx="46.5" cy="46.5" r="46.5" fill="#C4C4C4"/>
  //   <text cx="40">Hey</text>
  //   </svg>
  // `),
  //   { width, height }
  // );

  // let ribbon = await resizedSvgToSharp(
  //   Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">
  //   <path d="M208 0H0V242.686C0 249.814 8.61714 253.383 13.6569 248.343L80.6655 181.335C93.5528 168.447 114.447 168.447 127.335 181.335L194.343 248.343C199.383 253.383 208 249.814 208 242.686V0Z" fill="#F42C2C"/>
  //   </svg>
  //   `),
  //   { width: Math.round(width * 0.2), height: Math.round(height * 0.2) }
  // );

  buff = await buff.resize(width, height, {
    fit: "contain",
    background: color,
  });

  // // Add background color
  buff = await buff.composite([
    {
      // create a background color
      input: {
        create: {
          width,
          height,
          // allow alpha colors
          channels: 4,
          background: color,
        },
      },
      // dest-over makes the first image (input) appear on top of the created image (background color)
      blend: "dest-over",
    },
    // {
    //   // create a background color
    //   input: await ribbon.toBuffer(),
    //   gravity: "northeast",
    //   // dest-over makes the first image (input) appear on top of the created image (background color)
    //   // blend: "dest-over",
    // },
  ]);

  // Add padding
  buff = await buff.extend({
    top: padding,
    left: padding,
    bottom: padding,
    right: padding,
    background: color,
  });

  // Convert to PNG
  buff = await buff.png().toBuffer();

  return buff;
}

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
    color: "transparent",
    padding: 0,
    width: 48,
    height: 48,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let {
    width,
    height,
    padding,
    color,
    color_hex,
    icon_id,
    icon,
    kind,
    auto_color_style,
  } = req.query;

  let preset: any = {};
  if (kind === "splash") {
    preset = PRESETS.splash;
  } else if (kind === "favicon") {
    preset = PRESETS.favicon;
  } else {
    preset = PRESETS.icon;
  }

  let _color = color || preset.color;

  if (color_hex) {
    _color = "#" + color_hex;
  }

  let _padding = Number((padding || preset.padding) ?? 128);
  let _width = Number((width || preset.width) ?? 1024);
  let _height = Number((height || preset.height) ?? 1024);

  _width -= _padding * 2;
  _height -= _padding * 2;

  const iconUrl = resolveIconUrl({
    hex: icon_id,
    name: icon,
  });

  const buff = await genicoAsync({
    width: _width,
    height: _height,
    iconUrl,
    color: _color,
    padding: _padding,
    auto_color_style,
  } as any);

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Length", buff.length);
  res.end(buff);
}

const regex = /[^\u0000-\u00ff]/; // Small performance gain from pre-compiling the regex
function containsDoubleByte(str) {
  if (!str.length) return false;
  if (str.charCodeAt(0) > 255) return true;
  return regex.test(str);
}

function toUnicode(str: string) {
  if (str.length < 4) return str.codePointAt(0).toString(16);
  return (
    str.codePointAt(0).toString(16) + "-" + str.codePointAt(2).toString(16)
  );
}

function ensureUnicode(str: string) {
  if (containsDoubleByte(str)) {
    return toUnicode(str);
  }
  return str;
}

function resolveIconUrl(resolve: { name?: any; hex?: any }): string {
  if (typeof resolve.hex === "string" && resolve.hex) {
    return twitterEmoji(ensureUnicode(resolve.hex));
  }

  if (typeof resolve.name === "string" && resolve.name) {
    const iconSearch = require("./twitter.json");
    if (!iconSearch.emojis[resolve.name]?.b) {
      throw new Error(`Icon \"${resolve.name}\" not found`);
    }
    const iconObject = iconSearch.emojis[resolve.name];
    resolve.hex = iconObject?.c?.toLowerCase() ?? iconObject?.b?.toLowerCase();
    if (!resolve.hex) {
      throw new Error(
        `Icon \"${resolve.name}\" not resolvable. Maybe use icon_hex instead.`
      );
    }
    return resolveIconUrl(resolve);
  }

  return twitterEmoji(getRandomEmoji());
}

// Random list of fun emojis, converted to unicode since my computer is on the latest os.
function getRandomEmoji() {
  const emojiList = [
    "1f953",
    "1f951",
    "1faac",
    "1fae0",
    "1fae6",
    "1f979",
    "1fae5",
    "1fae1",
    "1fae0",
    "1fae3",
    "1f9cc",
    "1fac3-1f3fb",
    "1faf5",
    "1f6de",
    "1faa9",
    "1f9e2",
    "1f606",
    "1f60e",
    "1f970",
    "1f9d0",
    "1f60f",
    "1f929",
    "1f973",
    "1f92f",
    "1f643",
    "1f62e",
    "1f36a",
    "1f525",
    "1f333",
    "1f441",
    "1f635-200d",
    "1f47e",
    "1f9be",
    "1f440",
    "1f468-1f3ff",
    "1f9de-200d",
    "1f31d",
    "1f30e",
    "2600",
    "1f4a5",
    "2b50",
    "1f34e",
    "1f34c",
    "1f346",
    "1fad2",
    "1f354",
    "1f968",
    "1f355",
    "26bd",
    "1f3c4-200d",
    "1f3c6",
    "1f3f5",
    "1f3a7",
    "1f941",
    "1f3b8",
    "265f",
    "1f9e9",
    "1f3b2",
    "1f3ae",
    "1f3b3",
    "1f9f6",
    "1f48d",
    "1f451",
    "1f436",
    "1f437",
    "1f426",
    "1f98b",
    "1f984",
    "1f996",
    "1f40a",
    "1f40b",
    "1f9a2",
    "1fab4",
    "1fa90",
    "1f697",
    "2708",
    "1f680",
    "1f6f8",
    "26f5",
    "1f6f0",
    "1f5ff",
    "1f3df",
    "1f3d6",
    "1f4c0",
    "1f9ed",
    "23f3",
    "1fa99",
    "1f4b0",
    "1f48e",
    "2699",
    "1f9f2",
    "1f4a3",
    "1f9ff",
    "1f52e",
    "1f48a",
    "1f9a0",
    "1f9ec",
    "1f9fd",
    "1f511",
    "1f381",
    "1f9f8",
    "1f389",
    "1fa85",
    "1f4e6",
    "1f4ee",
    "1f4ce",
    "1f50d",
    "1f512",
    "2764",
    "1f499",
    "1f49c",
    "1f5a4",
    "2764-200d",
    "1f494",
    "269c",
    "267b",
    "1f300",
    "1f310",
    "1f4a4",
    "1f3b5",
    "2660",
    "2663",
    "2665",
    "2666",
    "1f3f4-200d",
    "1f3c1",
    "1f1fa-1f1f8",
    "1f1f2-1f1fd",
    "1f32e",
    "1f1f3-1f1f1",
  ];
  const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
  return emoji;
}
