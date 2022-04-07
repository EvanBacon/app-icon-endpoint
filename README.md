> Example: https://icogen.vercel.app/api/icon?color=white&padding=300&icon_id=1f1f1-1f1fa

Can be used in Expo apps via `app.json`:

```json
{
  "expo": {
    "icon": "https://icogen.vercel.app/api/icon",
    "splash": {
      "image": "https://icogen.vercel.app/api/splash",
      "resizeMode": "cover"
    }
  }
}
```

Expo CLI will automatically fetch/resize/covert for each platform.

| Query Param        | Description                                                              | Example      |
| ------------------ | ------------------------------------------------------------------------ | ------------ |
| `width`            | width of image                                                           | `300`        |
| `height`           | height of image                                                          | `300`        |
| `color_hex`        | hex value for the background image                                       | `fff000`     |
| `icon_id`          | raw emoji or emoji unicode for the icon                                  | 🥓           |
| `padding`          | padding to apply to around the emoji                                     | `30`         |
| `color`            | CSS color name to use for background image                               | `dodgerblue` |
| `auto_color_style` | A weird prop that makes an emoji fill the canvas, good for faces like 😀 | `flood`      |
