import '../../assets/style/selectableTable.scss'
import { chartManager } from "./chartManager"

class MarkTableManager {
    render() {
        const dataTable = document.createElement('table');
        dataTable.className = 'selectable-table';
        const dataTabelContainer = document.getElementById("dataTabelContainer");
        dataTabelContainer.innerHTML = "";
        dataTabelContainer.appendChild(dataTable);
    }
}

export const markTableManager = new MarkTableManager()