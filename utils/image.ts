// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import chroma from "chroma-js";
import getColors from "get-image-colors";
import sharp from "sharp";

export const resizedSvgToSharp = async (
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

export async function generateIconAsync({
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
      //   console.log("colors:", colors);
      // Uses the dominate color which effectively floods the image making emojis look like floating faces.
      if (autoColorStyle === "flood") {
        color = colors[0].hex();
      } else {
        const flipColor = (color) => {
          const isDark = color.get("lab.l") < 80;
          const adjust = color.get("lab.l") * 0.04;
          //   console.log("is dark:", isDark, adjust);
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

  // Add background color
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
  return await buff.png().toBuffer();
}
