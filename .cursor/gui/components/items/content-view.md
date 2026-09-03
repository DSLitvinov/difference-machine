# Content View Text / Binary / Img

Область просмотра **текущего** файла в центральной колонке (не `View / Project view / …`).

| Figma | Node | Код | Кирпич внутри |
|-------|------|-----|----------------|
| Content / View / Text | `4383:7176` | `ContentViewText` | текст / [text-diff](./commit-diff-text.md) по контексту панели |
| Content / View / Binary | `4383:7549` | `ContentViewBinary` | [binary stub](./commit-diff-binary.md) |
| Content / View / Img | `4383:7589` | `ContentViewImg` | bitmap / [image-diff](./commit-diff-image.md) |
| Content / View / Missing file | `6066:12449` | `ContentViewMissing` | «?» Inter Semi Bold 96, `#274754`; без иллюстрации-кота |

Размер в наборе 759×640. Шапка — соседний Header File/Folder Action, не внутри этих символов.

Img: масштаб **без chrome**. Источник — полный кадр (`workdir.file` для workdir, `blob.get` для ревизии), не thumbnail. Растр и SVG рисует webview (`<img>`). **Ctrl** или **Cmd** + колесо / жест тачпада — зум картинки (0.25…8 от вписанного размера). Скролл без модификатора — пан, если кадр больше области. Смена файла сбрасывает зум. Не зумить окно WebView.

Text: те же split-строки (номер 40 px). Язык по расширению; токены highlight.js, цвета из палитры GUI. `.txt` / `.log` / `.csv` без подсветки. Не подсветка diff.

Missing file: файл workdir пропал (deleted / renamed / moved). Не [File Info placeholder](../placeholders/missing-file.md). Не зум.

Это **item области превью**, не экран приложения.
