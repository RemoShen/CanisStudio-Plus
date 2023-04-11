import '../assets/style/selectableTable.scss'
import AttrSort from '../components/widgets/attrSort';
import { chartManager } from "./chartManager"

class MarkTableManager {
    render() {
        const dataTableMarks = chartManager.markTables;
        const dataTabelContainer = document.getElementById("dataTabelContainer");
        dataTabelContainer.innerHTML = '';
        dataTableMarks.forEach((dataTableMark) => {
            const dataTable = document.createElement('table');
            dataTable.className = 'selectable-table';
            const headerTr: HTMLTableRowElement = document.createElement('tr');
            //create table header
            //markId
            const th: HTMLTableHeaderCellElement = document.createElement('th');
            th.className = 'no-active-th';
            const thContainer: HTMLDivElement = document.createElement('div');
            thContainer.className = 'th-container';
            const titleContent: HTMLParagraphElement = document.createElement('p');
            titleContent.innerHTML = 'Id';
            titleContent.className = 'non-active-p';
            thContainer.appendChild(titleContent);
            //create sort button
            const sortBtn: HTMLSpanElement = document.createElement('span');
            let iconCls: string = '';
            if (sortBtn.classList.contains('asscending-icon') && !sortBtn.classList.contains('descending-icon')) {
                iconCls = `${AttrSort.ASSCENDING_ORDER}-icon active-sort-btn`;
                th.title = `markId in asscending order`;
                titleContent.classList.remove('non-active-p');
                th.classList.remove('no-active-th');
            } else if (sortBtn.classList.contains('descending-icon') && !sortBtn.classList.contains('asscending-icon')) {
                iconCls = `${AttrSort.DESCENDING_ORDER}-icon active-sort-btn`;
                th.title = `markId in descending order`;
                titleContent.classList.remove('non-active-p');
                th.classList.remove('no-active-th');
            } else {
                th.title = `Click to sort by markId`;
            }
            sortBtn.className = `sort-btn ${iconCls}`;
            //TODO: sort data
            th.onclick = () => {
            }
            thContainer.appendChild(sortBtn);
            th.appendChild(thContainer);
            headerTr.appendChild(th);
            //attributes
            dataTableMark.fieldNames.forEach((fieldName) => {
                const th: HTMLTableHeaderCellElement = document.createElement('th');
                th.className = 'no-active-th';
                const thContainer: HTMLDivElement = document.createElement('div');
                thContainer.className = 'th-container';
                const titleContent: HTMLParagraphElement = document.createElement('p');
                if (fieldName === '_MARKID') {
                    titleContent.innerHTML = 'Type';
                } else {
                    titleContent.innerHTML = fieldName;
                }
                titleContent.className = 'non-active-p';
                thContainer.appendChild(titleContent);
                //create sort button
                const sortBtn: HTMLSpanElement = document.createElement('span');
                let iconCls: string = '';
                if (sortBtn.classList.contains('asscending-icon') && !sortBtn.classList.contains('descending-icon')) {
                    iconCls = `${AttrSort.ASSCENDING_ORDER}-icon active-sort-btn`;
                    th.title = `${fieldName} in asscending order`;
                    titleContent.classList.remove('non-active-p');
                    th.classList.remove('no-active-th');
                } else if (sortBtn.classList.contains('descending-icon') && !sortBtn.classList.contains('asscending-icon')) {
                    iconCls = `${AttrSort.DESCENDING_ORDER}-icon active-sort-btn`;
                    th.title = `${fieldName} in descending order`;
                    titleContent.classList.remove('non-active-p');
                    th.classList.remove('no-active-th');
                } else {
                    th.title = `Click to sort by ${fieldName}`;
                }
                sortBtn.className = `sort-btn ${iconCls}`;
                //TODO: sort data
                th.onclick = () => {
                }
                thContainer.appendChild(sortBtn);
                th.appendChild(thContainer);
                headerTr.appendChild(th);
            })
            dataTable.appendChild(headerTr);

            //create table body
            dataTableMark.items.forEach((item) => {
                const tr: HTMLTableRowElement = document.createElement('tr');
                tr.setAttribute('dataItem', item.id);
                //markId
                const td: HTMLTableDataCellElement = document.createElement('td');
                td.setAttribute('draggable', 'true');
                td.innerText = item.id;
                //TODO: add drag event
                tr.appendChild(td);
                //attributes
                item.attributes.forEach((value, index) => {
                    const td: HTMLTableDataCellElement = document.createElement('td');
                    td.setAttribute('draggable', 'true');
                    td.innerText = value;
                    //TODO: add drag event
                    tr.appendChild(td);
                })
                dataTable.appendChild(tr);
            })

            
            // dataTabelContainer.innerHTML = "";
            dataTabelContainer.appendChild(dataTable);
        })
    }
}
export const markTableManager = new MarkTableManager()