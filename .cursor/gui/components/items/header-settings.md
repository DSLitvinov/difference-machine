# Header Settings

Figma: [Item / Panel / Header / Settings](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4335-19965) (`4335:19965`).  
Код: `HeaderSettings`. **309×60**. Низ [Panel / Project view](../../panels/project-view.md) и [Panel / File view](../../panels/file-view.md).

База: shadcn `Button` (ghost, icon) + `Avatar`. Не отдельная панель настроек.

---

## Слоты слева направо

| Слот | Node | Размер | Смысл |
|------|------|--------|--------|
| Avatar | [`4335:20298`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4335-20298) | 40×40 (глиф/инициалы 24×24 внутри) | инициалы автора |
| Actions | `4335:20071` | 82×40, x=215 | две кнопки 40×40 |
| Help | [`4335:20065`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4335-20065) | 40×40, ghost icon `circle-help` | справка, **disabled** |
| Settings | [`4335:19972`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4335-19972) | 40×40, ghost icon `settings` | открыть настройки приложения |

Иконки — экспорт из node, не Lucide «по имени».

---

## Avatar

Источник текста: `setup.cfg` `[user] name` (вкладка Profile в [Dialog / Settings](../../dialogs/settings.md)). Не `email`, не имя ветки, не путь репо.

В наборе Figma слот — `Avatar / Type=Icon` (глиф `user`). В продукте при непустом name — **инициалы**, не фото и не глиф.

Правило инициалов (не больше двух букв, uppercase, без транслита):

| `[user] name` | Аватар |
|---------------|--------|
| `Dmitry` | `D` |
| `Dmitry Litvinov` | `DL` |

- Обрезать пробелы. Слова — по whitespace.
- Одно слово: первая буква.
- Два и больше слов: первая буква первого + первая буква последнего (`Dmitry Alexeyevich Litvinov` → `DL`).
- Не брать две буквы из одного слова (`Dm` запрещено).

Пустой name: оставить глиф `user` из кадра. Не рисовать `?` и не подставлять email.

Аватар **не** открывает Settings. Клик — только кнопка Settings.

После сохранения Profile аватар обновляется без перезапуска окна.

---

## Help

Видна, как в макете. **Disabled:** клик ничего не делает, диалог и URL не открывать. Не скрывать. Не добавлять tooltip «coming soon». Пока нет отдельной спеки справки.

---

## Settings

Клик открывает [Dialog / Settings](../../dialogs/settings.md). Один диалог на окно; повторный клик не плодит вторую модалку.

---

## Запрещено

- Подпись «Settings» / имя пользователя рядом с аватаром — в кадре нет.
- Четвёртая кнопка, бейдж непрочитанного, меню по клику на аватар.
- Help как активный пункт, пока нет отдельной спеки справки.
