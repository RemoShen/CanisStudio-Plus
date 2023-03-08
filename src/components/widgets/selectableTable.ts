import '../../assets/style/selectableTable.scss'
import { state, State } from '../../app/state'
import { IDataItem, ISortDataAttr } from '../../app/core/ds';
import { Animation } from 'canis_toolkit';
import Reducer from '../../app/reducer';
import * as action from '../../app/action'
import AttrSort from './attrSort';
import Util from '../../app/core/util';
import PlusBtn from './plusBtn';
import KfItem from './kfItem';
import Tool from '../../util/tool';

export default class SelectableTable {
    startRowIdx: string;
    selectedRows: string[];
    constructor() {
        this.startRowIdx = state.dataOrder[0];
        this.selectedRows = [];
    }

    public static renderSelection(selection: string[]) {
        Array.from(document.getElementsByClassName('selected-td')).forEach(std => {
            (<HTMLElement>std).classList.remove('selected-td');
        })
        selection.forEach(rowDataId => {
            const targetTr: HTMLElement = document.querySelector('[dataItem="' + rowDataId + '"]');
            if (targetTr) {
                Array.from(targetTr.children).forEach(td => {
                    td.classList.add('selected-td');
                })
            }
        })
    }

    public createTable(dt: Map<string, IDataItem>): HTMLTableElement {
        const dataTable: HTMLTableElement = document.createElement('table');
        dataTable.className = 'selectable-table';
        let count = 0;
        state.dataOrder.forEach(markId => {
            const dataItem = dt.get(markId);
            if (count === 0) {
                //create title
                const headerTr: HTMLTableRowElement = document.createElement('tr');
                ['markId', ...Object.keys(dataItem)].forEach(key => {
                    const th: HTMLTableHeaderCellElement = document.createElement('th');
                    th.className = 'non-activate-th';
                    const thContainer: HTMLDivElement = document.createElement('div');
                    thContainer.className = 'th-container';
                    const titleContent: HTMLParagraphElement = document.createElement('p');
                    titleContent.innerHTML = key;
                    titleContent.className = 'non-activate-p';
                    thContainer.appendChild(titleContent);
                    //create sort btn
                    const sortBtn: HTMLSpanElement = document.createElement('span');
                    let iconCls: string = '';
                    state.sortDataAttrs.forEach(sda => {
                        if (sda.attr === key) {
                            if (sda.sort === AttrSort.DESCENDING_ORDER) {
                                iconCls = `${AttrSort.DESCENDING_ORDER}-icon activate-sort-btn`;
                                th.title = `${key} in descending order`;
                                titleContent.classList.remove('non-activate-p');
                                th.classList.remove('non-activate-th');
                            } else if (sda.sort === AttrSort.ASSCENDING_ORDER) {
                                iconCls = `${AttrSort.ASSCENDING_ORDER}-icon activate-sort-btn`;
                                th.title = `${key} in asscending order`;
                                titleContent.classList.remove('non-activate-p');
                                th.classList.remove('non-activate-th');
                            } else {
                                th.title = `Click to sort by ${key}`;
                            }
                        }
                    })
                    sortBtn.className = 'sort-btn ' + iconCls;

                    th.onclick = () => {
                        let sort: string = AttrSort.ASSCENDING_ORDER;
                        if (!sortBtn.classList.contains('asscending-icon') && !sortBtn.classList.contains('descending-icon')) {
                            th.title = `${key} in asscending order`;
                            sort = AttrSort.ASSCENDING_ORDER;
                        } else if (sortBtn.classList.contains('asscending-icon')) {
                            th.title = `${key} in descending order`;
                            sort = AttrSort.DESCENDING_ORDER;
                        } else if (sortBtn.classList.contains('descending-icon')) {
                            th.title = `${key} in asscending order`;
                            sort = AttrSort.ASSCENDING_ORDER;
                        }
                        //triger action
                        let sortDataAttrArr: ISortDataAttr[] = [];
                        state.sortDataAttrs.forEach(sda => {
                            if (sda.attr === key) {
                                sortDataAttrArr.push({
                                    attr: key,
                                    sort: sort
                                })
                            } else {
                                sortDataAttrArr.push({
                                    attr: sda.attr,
                                    sort: AttrSort.INDEX_ORDER
                                });
                            }
                        })
                        //save histroy before update state
                        State.tmpStateBusket.push({
                            historyAction: { actionType: action.UPDATE_DATA_SORT, actionVal: state.sortDataAttrs },
                            currentAction: { actionType: action.UPDATE_DATA_SORT, actionVal: sortDataAttrArr }
                        })
                        State.saveHistory();
                        Reducer.triger(action.UPDATE_DATA_SORT, sortDataAttrArr);
                    }
                    thContainer.appendChild(sortBtn);
                    th.appendChild(thContainer);

                    headerTr.appendChild(th);
                })
                dataTable.appendChild(headerTr);
            }
            //create content
            const tr: HTMLTableRowElement = document.createElement('tr');
            tr.setAttribute('dataItem', markId);
            [markId, ...Object.values(dataItem)].forEach(value => {
                const td: HTMLTableCellElement = document.createElement('td');
                td.setAttribute('draggable', 'true');
                td.innerText = value.toString();
                td.onmousedown = (downEvt) => {
                    this.mouseDownCell(downEvt);
                }
                // td.onclick = (clickEvt) => {
                //     this.clickCell(clickEvt);
                // }
                // td.ondragstart = (dragStartEvt) => {
                //     this.dragCell(dragStartEvt);
                // }
                tr.appendChild(td);
            })
            dataTable.appendChild(tr);
            count++;
        })
        return dataTable;
    }

    public resetSelection() {
        this.selectedRows = [];
    }

    // public dragCell(evt: any) {
    //     console.log('dragging');
    //     evt.currentTarget.classList.add("ghost-div");
    //     var elem = document.createElement('div');
    //     elem.id = 'drag-ghost';
    //     elem.className = 'ghost-div'
    //     elem.innerHTML = "Dragging";
    //     elem.style.position = "absolute";
    //     elem.style.top = "-1000px";
    //     document.body.appendChild(elem);
    //     evt.dataTransfer.setDragImage(elem, 0, 0);
    // }

    // public clickCell(evt: MouseEvent) {
    //     evt.preventDefault();
    //     const targetTd: HTMLElement = <HTMLElement>evt.target;
    //     if (evt.shiftKey) {
    //         if (this.selectedRows.length >= 0) {
    //             this.selectRange(targetTd);
    //         }
    //     } else if (evt.ctrlKey) {
    //         if (this.selectedRows.length >= 0) {
    //             this.addSelection(targetTd);
    //         }
    //     } else {
    //         this.startRowIdx = targetTd.parentElement.getAttribute('dataItem');
    //         this.resetSelection();
    //         this.selectedRows.push(this.startRowIdx);
    //         SelectableTable.renderSelection(this.selectedRows);
    //         //save histroy before update state
    //         State.tmpStateBusket.push({
    //             historyAction: { actionType: action.UPDATE_SELECTION, actionVal: state.selection },
    //             currentAction: { actionType: action.UPDATE_SELECTION, actionVal: this.selectedRows }
    //         })
    //         State.saveHistory();
    //         Reducer.triger(action.UPDATE_SELECTION, state.suggestion ? Util.suggestSelection(this.selectedRows) : this.selectedRows);
    //     }
    // }

    public mouseDownCell(evt: MouseEvent) {
        evt.preventDefault();
        Reducer.triger(action.UPDATE_MOUSE_MOVING, true);
        const targetTd: HTMLElement = <HTMLElement>evt.target;
        if (evt.shiftKey) {
            if (this.selectedRows.length >= 0) {
                this.selectRange(targetTd);
            }
        } else if (evt.ctrlKey) {
            if (this.selectedRows.length >= 0) {
                this.addSelection(targetTd);
            }
        } else {
            this.startRowIdx = targetTd.parentElement.getAttribute('dataItem');
            if (state.selection.includes(this.startRowIdx)) {//do grabbing
                console.log('drag start');
                const elem = document.createElement('div');
                elem.id = 'dragGhost';
                elem.className = 'ghost-div dragging-ghost-div'
                elem.innerHTML = `${state.selection.length} Marks`;
                elem.style.left = `${(evt.pageX || (evt.clientX + document.body.scrollLeft)) - 35}px`;
                elem.style.top = `${(evt.pageY || (evt.clientY + document.body.scrollTop)) - 15}px`;
                document.body.appendChild(elem);

                const selectedCls: string[] = state.selection.map((mId: string) => Animation.markClass.get(mId));//find the classes of selected marks
                PlusBtn.highlightPlusBtns([...new Set(selectedCls)]);//highlight kfs which can be dropped on
                document.onmousemove = (moveEvt) => {
                    this.mouseMoveCell(moveEvt);
                }
            } else {
                this.resetSelection();
                this.selectedRows.push(this.startRowIdx);
                SelectableTable.renderSelection(this.selectedRows);
                //save histroy before update state
                State.tmpStateBusket.push({
                    historyAction: { actionType: action.UPDATE_SELECTION, actionVal: state.selection },
                    currentAction: { actionType: action.UPDATE_SELECTION, actionVal: this.selectedRows }
                })
                State.saveHistory();
                Reducer.triger(action.UPDATE_SELECTION, state.suggestion ? Util.suggestSelection(this.selectedRows) : this.selectedRows);
            }
        }

        document.onmouseup = (upEvt) => {
            Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
            this.mouseUpCell(upEvt);
        }
    }
    public mouseMoveCell(evt: MouseEvent) {
        // evt.preventDefault();
        // const targetTd: HTMLElement = <HTMLElement>evt.target;
        // this.selectRange(targetTd);
        if (document.getElementById('dragGhost')) {
            const ghostDiv: HTMLElement = document.getElementById('dragGhost');
            // ghostDiv.classList.add('dragging-ghost-div');
            ghostDiv.style.left = `${(evt.pageX || (evt.clientX + document.body.scrollLeft)) - 35}px`;
            ghostDiv.style.top = `${(evt.pageY || (evt.clientY + document.body.scrollTop)) - 15}px`;
        }
        // (<HTMLElement>evt.target).classList.add('dragging-ghost-div');
        // (<HTMLElement>evt.target).style.left = `${(evt.pageX || (evt.clientX + document.body.scrollLeft)) - 35}px`;
        // (<HTMLElement>evt.target).style.top = `${(evt.pageY || (evt.clientY + document.body.scrollTop)) - 15}px`;

        const dragOverItem: PlusBtn | KfItem = Tool.judgeDragOver({ x: evt.pageX, y: evt.pageY });
        if (typeof dragOverItem !== 'undefined') {
            dragOverItem.dragSelOver();
        } else {
            if (typeof PlusBtn.dragoverBtn !== 'undefined') {
                PlusBtn.dragoverBtn.dragSelOut();
            } else if (typeof KfItem.dragoverKf !== 'undefined') {
                KfItem.dragoverKf.dragSelOut();
            }
        }
    }
    public mouseUpCell(evt: MouseEvent) {
        evt.preventDefault();
        if (document.getElementById('dragGhost')) {
            document.getElementById('dragGhost').remove();
        }
        if (typeof PlusBtn.dragoverBtn !== 'undefined') {
            const selectedMarks: string[] = state.selection;
            Reducer.triger(action.UPDATE_SELECTION, []);//reset state selection

            State.tmpStateBusket.push({
                historyAction: { actionType: action.ACTIVATE_PLUS_BTN, actionVal: { aniId: '', selection: [], renderedUniqueIdx: -10 } },
                currentAction: { actionType: action.ACTIVATE_PLUS_BTN, actionVal: { aniId: PlusBtn.dragoverBtn.aniId, selection: selectedMarks, renderedUniqueIdx: -1 } }
            })
            State.saveHistory();
            Reducer.triger(action.ACTIVATE_PLUS_BTN, { aniId: PlusBtn.dragoverBtn.aniId, selection: selectedMarks, renderedUniqueIdx: -1 });
        }
        PlusBtn.dragoverBtn = undefined;
        KfItem.dragoverKf = undefined;
        PlusBtn.cancelHighlightPlusBtns();
        document.onmousemove = null;
        document.onmouseup = null;
    }

    public addSelection(targetTd: HTMLElement) {
        const tmpRowIdx: string = targetTd.parentElement.getAttribute('dataItem');
        const tmpIdx: number = state.dataOrder.indexOf(tmpRowIdx);
        this.selectedRows = [...this.selectedRows, state.dataOrder[tmpIdx]];
        SelectableTable.renderSelection(this.selectedRows);
        //save histroy before update state
        State.tmpStateBusket.push({
            historyAction: { actionType: action.UPDATE_SELECTION, actionVal: state.selection },
            currentAction: { actionType: action.UPDATE_SELECTION, actionVal: this.selectedRows }
        })
        State.saveHistory();
        Reducer.triger(action.UPDATE_SELECTION, state.suggestion ? Util.suggestSelection(this.selectedRows) : this.selectedRows);
    }

    public selectRange(targetTd: HTMLElement) {
        const tmpRowIdx: string = targetTd.parentElement.getAttribute('dataItem');
        const startIdx: number = state.dataOrder.indexOf(this.startRowIdx);
        const tmpIdx: number = state.dataOrder.indexOf(tmpRowIdx);
        let selectionStartIdx: number, selectionEndIdx: number;
        if (startIdx <= tmpIdx) {
            selectionStartIdx = startIdx;
            selectionEndIdx = tmpIdx;
        } else {
            this.startRowIdx = tmpRowIdx;
            selectionStartIdx = tmpIdx;
            selectionEndIdx = startIdx;
        }
        this.selectedRows = state.dataOrder.slice(selectionStartIdx, selectionEndIdx + 1);
        SelectableTable.renderSelection(this.selectedRows);
        //save histroy before update state
        State.tmpStateBusket.push({
            historyAction: { actionType: action.UPDATE_SELECTION, actionVal: state.selection },
            currentAction: { actionType: action.UPDATE_SELECTION, actionVal: this.selectedRows }
        })
        State.saveHistory();
        Reducer.triger(action.UPDATE_SELECTION, state.suggestion ? Util.suggestSelection(this.selectedRows) : this.selectedRows);
    }
}