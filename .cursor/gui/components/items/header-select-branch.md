# Header Select Branch

Figma: [Item / Panel / Header / Select Branch](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-5686) (`4309:5686`).  
Код: `HeaderSelectBranch`.

309×64. Padding 12. Слот `.Sidebar Item` 285×40 — dropdown ветки (и при необходимости репо). Данные: `branch.list`, текущая из `status.get`. Не ходить в API из хедера: колбэки панели.

Иконки и пункты меню — из `get_design_context` на этот node при реализации.
