import '../../assets/style/sortableSvgTable.scss'
import { ICoord } from "../../util/ds";
import { KfContainer } from "../kfContainer";
import { state, State } from "../../app/state";
import KfGroup from "./kfGroup";
import * as action from "../../app/action";
import Tool from '../../util/tool';
import Reducer from '../../app/reducer';
import KfItem from './kfItem';
import CanisGenerator from '../../app/core/canisGenerator';

export default class SortableSvgTable {
    static TABLE_WIDTH: number = 200;
    static TABLE_PADDING: number = 6;
    static CELL_HEIGHT: number = 24;
    private data: string[];
    private correspondingKfg: KfGroup;
    private position: ICoord;

    public container: SVGGElement;
    public useTag: SVGGElement;

    /**
     * @param data : attribtue names used to do sorting 
     */
    public createTable(data: string[], position: ICoord, kfg: KfGroup) {
        this.data = data;
        this.position = position;
        this.correspondingKfg = kfg;
        this.renderTable();
    }

    private renderTable() {
        const svgHintLayer: HTMLElement = document.getElementById(KfContainer.KF_HINT);
        const layerBBox: DOMRect = document.getElementById(KfContainer.KF_FG).getBoundingClientRect();//fixed
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.setAttributeNS(null, 'transform', `translate(${(this.position.x - layerBBox.left) / state.zoomLevel}, ${(this.position.y - layerBBox.top) / state.zoomLevel})`);
        this.container.onmouseleave = () => {
            this.removeTable();
            this.correspondingKfg.transHideTitle();
        }
        const fakeBg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        fakeBg.setAttributeNS(null, 'x', '0');
        fakeBg.setAttributeNS(null, 'y', '0');
        fakeBg.setAttributeNS(null, 'width', `${SortableSvgTable.TABLE_WIDTH}`);
        fakeBg.setAttributeNS(null, 'height', `${SortableSvgTable.TABLE_WIDTH}`);
        fakeBg.setAttributeNS(null, 'fill', 'rgba(0,0,0,0)');
        this.container.appendChild(fakeBg);

        const pointer: SVGPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pointer.classList.add('drop-shadow-ele');
        pointer.setAttributeNS(null, 'd', 'M8,0 V12 L0,6 Z');
        pointer.setAttributeNS(null, 'transform', `translate(${KfGroup.TITLE_HEIHGT - 4}, 2)`);
        pointer.setAttributeNS(null, 'fill', '#383838');
        this.container.appendChild(pointer);

        const bg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.classList.add('drop-shadow-ele');
        bg.setAttributeNS(null, 'x', `${KfGroup.TITLE_HEIHGT + 4}`);
        bg.setAttributeNS(null, 'y', '0');
        bg.setAttributeNS(null, 'width', `${SortableSvgTable.TABLE_WIDTH - KfGroup.TITLE_HEIHGT - 4}`);
        bg.setAttributeNS(null, 'height', `${SortableSvgTable.TABLE_WIDTH}`);
        bg.setAttributeNS(null, 'stroke', '#383838');
        bg.setAttributeNS(null, 'fill', '#e6e6e6');
        bg.setAttributeNS(null, 'stroke-width', '1');
        this.container.appendChild(bg);

        //create list
        const itemList: SVGGElement[] = [];
        const itemContentList: string[] = [];
        this.data.forEach((d: string, idx: number) => {
            const itemContainer: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            itemContainer.classList.add('ease-transform');
            itemContainer.setAttributeNS(null, 'id', `sortAttr${idx}`);
            itemContainer.setAttributeNS(null, 'transform', `translate(${SortableSvgTable.TABLE_PADDING + KfGroup.TITLE_HEIHGT + 4}, ${SortableSvgTable.TABLE_PADDING + idx * SortableSvgTable.CELL_HEIGHT})`);
            itemContainer.classList.add('svg-table-cell-container');
            const itemBg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            itemBg.setAttributeNS(null, 'width', `${SortableSvgTable.TABLE_WIDTH - 2 * SortableSvgTable.TABLE_PADDING - KfGroup.TITLE_HEIHGT - 4}`);
            itemBg.setAttributeNS(null, 'height', `${SortableSvgTable.CELL_HEIGHT}`);
            itemContainer.appendChild(itemBg);
            const itemContent: SVGTextContentElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            itemContent.innerHTML = d;
            itemContentList.push(d);
            itemContent.setAttributeNS(null, 'x', '10');
            itemContent.setAttributeNS(null, 'y', `${SortableSvgTable.CELL_HEIGHT - 7}`);
            itemContainer.appendChild(itemContent);
            this.container.appendChild(itemContainer);

            itemContainer.onmousedown = (downEvt) => {
                Reducer.triger(action.UPDATE_MOUSE_MOVING, true);
                itemContainer.classList.add('being-selected');
                const cloneItem: Node = itemContainer.cloneNode(true);
                this.useTag = <SVGGElement>cloneItem;
                this.useTag.classList.add('being-dragging');
                this.useTag.classList.remove('ease-transform');
                this.useTag.setAttributeNS(null, 'opacity', '0.5');
                this.container.appendChild(this.useTag);
                let oriMousePosi: ICoord = {
                    x: 0,
                    y: downEvt.pageY
                }
                let currentItemPosi: ICoord = Tool.extractTransNums(itemContainer.getAttributeNS(null, 'transform'));
                document.onmousemove = (moveEvt) => {
                    let tmpMousePosi: ICoord = {
                        x: 0,
                        y: moveEvt.pageY
                    }
                    let diffPosi: ICoord = {
                        x: 0,
                        y: (tmpMousePosi.y - oriMousePosi.y) / state.zoomLevel,
                    }
                    //drag use tag
                    const oriTrans: ICoord = Tool.extractTransNums(this.useTag.getAttributeNS(null, 'transform'));
                    this.useTag.setAttributeNS(null, 'transform', `translate(${oriTrans.x}, ${oriTrans.y + diffPosi.y})`);

                    //switch
                    if (oriTrans.y + diffPosi.y < currentItemPosi.y - SortableSvgTable.CELL_HEIGHT / 2) {
                        for (let i = 0, len = itemList.length; i < len; i++) {
                            const tmpTrans: ICoord = Tool.extractTransNums(itemList[i].getAttributeNS(null, 'transform'));
                            if (currentItemPosi.y - SortableSvgTable.CELL_HEIGHT === tmpTrans.y) {
                                itemContainer.setAttributeNS(null, 'transform', `translate(${currentItemPosi.x}, ${currentItemPosi.y - SortableSvgTable.CELL_HEIGHT})`);
                                itemList[i].setAttributeNS(null, 'transform', `translate(${tmpTrans.x}, ${tmpTrans.y + SortableSvgTable.CELL_HEIGHT})`);
                                currentItemPosi = tmpTrans;
                                break;
                            }
                        }
                    } else if (oriTrans.y + diffPosi.y > currentItemPosi.y + SortableSvgTable.CELL_HEIGHT / 2) {
                        for (let i = 0, len = itemList.length; i < len; i++) {
                            const tmpTrans: ICoord = Tool.extractTransNums(itemList[i].getAttributeNS(null, 'transform'));
                            if (currentItemPosi.y + SortableSvgTable.CELL_HEIGHT === tmpTrans.y) {
                                itemContainer.setAttributeNS(null, 'transform', `translate(${currentItemPosi.x}, ${currentItemPosi.y + SortableSvgTable.CELL_HEIGHT})`);
                                itemList[i].setAttributeNS(null, 'transform', `translate(${tmpTrans.x}, ${tmpTrans.y - SortableSvgTable.CELL_HEIGHT})`);
                                currentItemPosi = tmpTrans;
                                break;
                            }
                        }
                    }

                    oriMousePosi = tmpMousePosi;
                }
                document.onmouseup = () => {
                    Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
                    this.useTag.remove();
                    itemContainer.classList.remove('being-selected');
                    document.onmousemove = null;
                    document.onmouseup = null;
                    const tmpRecorder: ([number, string])[] = itemList.map((tmpItemContainer: SVGGElement, idx) => {
                        return [Tool.extractTransNums(tmpItemContainer.getAttributeNS(null, 'transform')).y, itemContentList[idx]];
                    })
                    tmpRecorder.sort((a: [number, string], b: [number, string]) => {
                        return a[0] - b[0];
                    })
                    const attrOrder: string[] = tmpRecorder.map((tr: [number, string]) => tr[1]);
                    this.removeTable();
                    const oriOrder: string[] = CanisGenerator.fetchGroupingSort(this.correspondingKfg.aniId, this.correspondingKfg.childrenRef);
                    State.tmpStateBusket.push({
                        historyAction: { actionType: action.UDPATE_GROUPING_SORT, actionVal: { aniId: this.correspondingKfg.aniId, groupRef: this.correspondingKfg.childrenRef, order: oriOrder } },
                        currentAction: { actionType: action.UDPATE_GROUPING_SORT, actionVal: { aniId: this.correspondingKfg.aniId, groupRef: this.correspondingKfg.childrenRef, order: attrOrder } }
                    })
                    State.saveHistory();
                    Reducer.triger(action.UDPATE_GROUPING_SORT, { aniId: this.correspondingKfg.aniId, groupRef: this.correspondingKfg.childrenRef, order: attrOrder });
                }
            }
            itemList.push(itemContainer);
        })

        svgHintLayer.appendChild(this.container);
    }

    public removeTable() {
        const svgHintLayer: HTMLElement = document.getElementById(KfContainer.KF_HINT);
        if (svgHintLayer.contains(this.container)) {
            svgHintLayer.removeChild(this.container);
        }
    }
}

export const sortableSvgTable: SortableSvgTable = new SortableSvgTable();