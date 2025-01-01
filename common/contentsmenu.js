const { Menu } = require('electron');

function onWebContentsMenu(event, params, i18n) {
    const { selectionText, isEditable } = params;
    const selectEnabled = selectionText && selectionText.trim().length > 0;
    const temlate = [];
    if (isEditable) {
        temlate.unshift(...[{
            label: i18n.paste,
            role: 'paste'
        },
        {
            label: i18n.selectall,
            role: 'selectall'
        }]);
    }

    if (isEditable && selectEnabled) {
        temlate.unshift(...[{
            label: i18n.cut,
            role: 'cut'
        },
        {
            label: i18n.delete,
            role: 'delete'
        }]);
    }

    if (selectEnabled) {
        temlate.unshift(...[{
            label: i18n.copy,
            role: 'copy'
        }]);
    }

    if (temlate.length > 0) {
        Menu.buildFromTemplate(temlate).popup();
    }
}
module.exports = {
    onWebContentsMenu
}