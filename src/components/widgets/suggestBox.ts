import '../../assets/style/suggestBox.scss'
import KfItem from "./kfItem";
import { KfContainer } from "../kfContainer";
import { state, State } from "../../app/state";
import { IPath, IKeyframe, IActivatePlusBtn } from "../../app/core/ds";
import KfGroup from "./kfGroup";
import Tool from "../../util/tool";
import { ICoord } from "../../util/ds";
import Reducer from "../../app/reducer";
import * as action from "../../app/action";
import { Loading } from './loading';
import Util from '../../app/core/util';
import Suggest from '../../app/core/suggest';
import PlusBtn from './plusBtn';
import KfOmit from './kfOmit';

interface IOptionInfo {
    kfIdx: number;
    attrs: string[]
    values: string[]
    marks: string[]
    allCurrentMarks: string[]
    allGroupMarks: string[]
    kfWidth: number
    kfHeight: number
    suggestOnFirstKf: boolean
    ordering?: {
        attr: string
        order: string
    }
}

export class SuggestBox {
    static PADDING: number = 6;
    static SHOWN_NUM: number = 2;
    static MENU_WIDTH: number = 20;

    public lastUpdateSuggestionPathActionInfo: {
        ap: IPath[],
        kfIdxInPath: number,
        startKf: KfItem,
        suggestOnFirstKf: boolean,
        selectedMarks: string[]
    }
    public kfBeforeSuggestBox: KfItem;
    public uniqueKfIdx: number;
    public kfWidth: number = 240;
    public kfHeight: number = 178;
    public boxWidth: number = 240;
    public suggestMenu: SuggestMenu;
    public menuWidth: number = 0;
    public preMenuWidth: number = 0;//TODO: remove this 
    public numShown: number = SuggestBox.SHOWN_NUM;
    public container: SVGGElement;
    public itemContainer: SVGGElement;
    public options: OptionItem[] = [];

    public createSuggestBox(kfBeforeSuggestBox: KfItem, allCurrentPaths: IPath[], uniqueKfIdx: number, suggestOnFirstKf: boolean) {
        this.kfBeforeSuggestBox = kfBeforeSuggestBox;
        this.uniqueKfIdx = uniqueKfIdx;
        this.kfWidth = this.kfBeforeSuggestBox.kfWidth - 2 * SuggestBox.PADDING * this.kfBeforeSuggestBox.kfWidth / this.kfBeforeSuggestBox.kfHeight;
        this.kfHeight = this.kfBeforeSuggestBox.kfHeight - 2 * SuggestBox.PADDING;
        this.boxWidth = this.kfWidth + 3 * SuggestBox.PADDING + OptionItem.TEXT_PANEL_WIDTH;
        const tmpKfInfo: IKeyframe = KfItem.allKfInfo.get(this.kfBeforeSuggestBox.id);
        this.createOptionKfs(allCurrentPaths, [...tmpKfInfo.allCurrentMarks, ...tmpKfInfo.marksThisKf], tmpKfInfo.allGroupMarks, suggestOnFirstKf);
        if (typeof this.container === 'undefined') {
            this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        }
        if (this.options.length <= this.numShown) {
            this.numShown = this.options.length;
            this.preMenuWidth = this.menuWidth;
            this.menuWidth = 0;
            if (typeof this.suggestMenu !== 'undefined') {
                this.container.removeChild(this.suggestMenu.container);
                this.suggestMenu = undefined;
            }
        } else {
            this.numShown = SuggestBox.SHOWN_NUM;
            this.preMenuWidth = this.menuWidth;
            this.menuWidth = SuggestBox.MENU_WIDTH;
            this.suggestMenu = new SuggestMenu();
            this.suggestMenu.createMenu({ x: this.boxWidth, y: this.kfHeight / 2 + SuggestBox.PADDING }, this);
            this.container.appendChild(this.suggestMenu.container);
        }

        const bgLayerBBox: DOMRect = document.getElementById(KfContainer.KF_FG).getBoundingClientRect();//fixed
        const preKfBBox: DOMRect = this.kfBeforeSuggestBox.container.getBoundingClientRect();//fixed
        this.container.setAttributeNS(null, 'transform', `translate(${SuggestBox.PADDING + (preKfBBox.right - bgLayerBBox.left) / state.zoomLevel}, ${(preKfBBox.top - bgLayerBBox.top) / state.zoomLevel})`);
        const bg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttributeNS(null, 'width', `${this.boxWidth}`);
        bg.setAttributeNS(null, 'height', `${(this.kfHeight + 2 * SuggestBox.PADDING) * this.numShown}`);
        bg.setAttributeNS(null, 'fill', '#c9caca');
        bg.setAttributeNS(null, 'stroke', '#676767');
        bg.setAttributeNS(null, 'rx', `${KfGroup.GROUP_RX}`);
        this.container.appendChild(bg);

        this.itemContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.appendChild(this.itemContainer);
        for (let i = 0; i < this.numShown; i++) {
            this.options[i].updateTrans(i);
            this.itemContainer.appendChild(this.options[i].container);
        }

        const popupLayer: HTMLElement = document.getElementById(KfContainer.KF_POPUP);
        popupLayer.appendChild(this.container);
    }

    public removeSuggestBox() {
        if (typeof this.container !== 'undefined') {
            this.container.innerHTML = '';
        }
        const popupLayer: HTMLElement = document.getElementById(KfContainer.KF_POPUP);
        if (popupLayer.contains(this.container)) {
            popupLayer.removeChild(this.container);
        }
        this.options = [];
        this.menuWidth = 0;
        this.suggestMenu = undefined;
    }

    public pathToSpec(allSuggestedPaths: IPath[], startKf: KfItem, selectedMarks: string[], suggestOnFirstKf: boolean) {
        // console.log('rendering path to spec: ', allSuggestedPaths, suggestOnFirstKf);
        suggestBox.resetProps();
        const targetPath: IPath = allSuggestedPaths[0];

        let actionType: string = '';
        let actionInfo: any = {};
        if (typeof targetPath === 'undefined') {
            //create one animation
            actionType = action.SPLIT_CREATE_ONE_ANI;
            actionInfo = { aniId: startKf.aniId, newAniSelector: `#${selectedMarks.join(', #')}`, attrComb: [], attrValueSort: [] };
            // Reducer.triger(action.SPLIT_CREATE_ONE_ANI, { aniId: startKf.aniId, newAniSelector: `#${selectedMarks.join(', #')}`, attrComb: [], attrValueSort: [] });
        } else {
            //extract attr value order
            const attrValueSort: string[][] = Util.extractAttrValueOrder(targetPath.sortedAttrValueComb);
            const [clsOfMarksInPath, containsNonDataMarkInPath] = Util.extractClsFromMarks(targetPath.lastKfMarks);
            const [clsOfMarksThisAni, containsNonDataMarkInAni] = Util.extractClsFromMarks(startKf.parentObj.marksThisAni());
            if (!suggestOnFirstKf) {//the suggestion is based on all marks in this animation as the last kf
                if (Tool.identicalArrays(clsOfMarksInPath, clsOfMarksThisAni)) {//marks in current path have the same classes as those in current animation 
                    if (clsOfMarksInPath.length > 1 && !containsNonDataMarkInPath) {//create multiple animations
                        // console.log('same create multi ani');
                        actionType = action.REMOVE_CREATE_MULTI_ANI;
                        actionInfo = { aniId: startKf.aniId, path: targetPath, attrValueSort: attrValueSort }
                    } else {//create grouping
                        actionType = action.UPDATE_SPEC_GROUPING;
                        actionInfo = { aniId: startKf.aniId, attrComb: targetPath.attrComb, attrValueSort: attrValueSort }
                    }
                } else {//marks in current path don't have the same classes as those in current animation 
                    if (clsOfMarksInPath.length > 1 && !containsNonDataMarkInPath) {//create multiple animations
                        // console.log('not same create multi ani');
                        actionType = action.SPLIT_CREATE_MULTI_ANI;
                        actionInfo = { aniId: startKf.aniId, path: targetPath, attrValueSort: attrValueSort };
                    } else {//create one animation
                        // console.log('not same create one ani');
                        actionType = action.SPLIT_CREATE_ONE_ANI;
                        actionInfo = { aniId: startKf.aniId, newAniSelector: `#${targetPath.lastKfMarks.join(', #')}`, attrComb: targetPath.attrComb, attrValueSort: attrValueSort };
                    }
                }
            } else {//the suggestion is based on all marks in current first  kf as the last kf
                if (clsOfMarksInPath.length > 1) {//change timing of marks of different classes
                    // console.log('diff cls first kf as last: ', targetPath, targetPath.attrComb, attrValueSort);
                    actionType = action.APPEND_SPEC_GROUPING;
                    actionInfo = { aniId: startKf.aniId, attrComb: targetPath.attrComb, attrValueSort: attrValueSort }
                } else {//append grouping to current animation
                    actionType = action.APPEND_SPEC_GROUPING;
                    actionInfo = { aniId: startKf.aniId, attrComb: targetPath.attrComb, attrValueSort: attrValueSort };
                }
            }
        }

        State.tmpStateBusket.push({
            historyAction: { actionType: action.LOAD_CANIS_SPEC, actionVal: JSON.stringify(state.spec) },
            currentAction: { actionType: actionType, actionVal: actionInfo }
        })
        let insertHistory: boolean = false;
        if (State.stateHistory[State.stateHistory.length - 1][0].currentAction.actionType === action.ACTIVATE_PLUS_BTN) {
            insertHistory = true;
        }
        State.saveHistory(insertHistory);
        Reducer.triger(actionType, actionInfo);
    }

    public createKfOnPath(marksThisStep: string[], preKfInfo: IKeyframe, startKf: KfItem, transX: number): [IKeyframe, KfItem] {
        const tmpKfInfo: IKeyframe = KfItem.createKfInfo(marksThisStep,
            {
                duration: preKfInfo.duration,
                allCurrentMarks: preKfInfo.allCurrentMarks,
                allGroupMarks: preKfInfo.allGroupMarks
            });
        KfItem.allKfInfo.set(tmpKfInfo.id, tmpKfInfo);
        let tmpKf: KfItem = new KfItem();
        const startX: number = Tool.extractTransNums(startKf.container.getAttributeNS(null, 'transform')).x + transX - KfGroup.PADDING;
        tmpKf.createItem(tmpKfInfo, startKf.parentObj.treeLevel + 1, startKf.parentObj, startX);
        startKf.parentObj.children.push(tmpKf);
        tmpKf.idxInGroup = startKf.parentObj.children.length - 1;
        return [tmpKfInfo, tmpKf];
    }

    public renderKfOnPathAndSuggestionBox(allSuggestedPaths: IPath[], startKf: KfItem, startKfGroup: KfGroup, suggestOnFirstKf: boolean) {
        const selectedMarks: string[] = state.activatePlusBtn.selection;//marks dropped on the plus button
        const kfIdxInPath: number = state.activatePlusBtn.renderedUniqueIdx;
        const marksEachStep: Map<number, string[]> = state.activatePlusBtn.selectedMarksEachStep;

        let insertIdx: number = 0;
        let kfBeforeSuggestBox: KfItem = startKf;
        let transX: number = startKf.totalWidth;
        let lastKf: KfItem;
        const startKfInfo: IKeyframe = KfItem.allKfInfo.get(startKf.id);
        let preKfInfo: IKeyframe = startKfInfo;
        let preKf: KfItem = startKf;
        let preStepIdx: number = -1;
        if (typeof marksEachStep !== 'undefined') {
            const marksEachStepArr: ([number, string[]])[] = [...marksEachStep];
            for (let i = 0, len = marksEachStepArr.length; i < len; i++) {
                let stepIdx: number = marksEachStepArr[i][0];
                let marksThisStep: string[] = marksEachStepArr[i][1];

                //render kfs in between
                if (stepIdx - preStepIdx - 1 > 0) {
                    for (let j = preStepIdx + 1; j < stepIdx; j++) {
                        let omittedMarksRecord: string[] = [];
                        if (stepIdx - preStepIdx - 1 > 2) {
                            if (j === stepIdx - 1) {//put omit
                                const kfOmit: KfOmit = new KfOmit();
                                const omitStartX: number = Tool.extractTransNums(preKf.container.getAttributeNS(null, 'transform')).x + preKf.kfWidth + transX;
                                kfOmit.createOmit(KfOmit.KF_OMIT, omitStartX, stepIdx - preStepIdx - 3, startKf.parentObj, false, true, startKf.kfHeight / 2);
                                startKf.parentObj.children.push(kfOmit);
                                startKf.parentObj.kfOmits.push(kfOmit);
                                insertIdx++;
                                transX += kfOmit.oWidth + 2 * KfItem.PADDING;
                            } else if (j > preStepIdx + 1 && j < stepIdx - 1) {
                                omittedMarksRecord = [...omittedMarksRecord, ...allSuggestedPaths[0].kfMarks[j]];
                            }
                        }

                        //render kf
                        const [tmpKfInfo, tmpKf] = this.createKfOnPath([...allSuggestedPaths[0].kfMarks[j], ...omittedMarksRecord], preKfInfo, startKf, transX)
                        lastKf = tmpKf;
                        insertIdx++;
                        transX += tmpKf.totalWidth;
                        kfBeforeSuggestBox = tmpKf;
                        preKfInfo = tmpKfInfo;
                        preKf = tmpKf;
                    }
                }

                //render this kf
                const [tmpKfInfo, tmpKf] = this.createKfOnPath(marksThisStep, preKfInfo, startKf, transX)
                lastKf = tmpKf;
                insertIdx++;
                transX += tmpKf.totalWidth;
                kfBeforeSuggestBox = tmpKf;
                preKfInfo = tmpKfInfo;
                preKf = tmpKf;

                //filter all paths
                let tmpAllPaths: IPath[] = [];
                allSuggestedPaths.forEach((p: IPath) => {
                    if (Tool.identicalArrays(p.kfMarks[stepIdx], marksThisStep)) {
                        tmpAllPaths.push(p);
                    }
                })
                allSuggestedPaths = tmpAllPaths;
                preStepIdx = stepIdx;
            }
        }

        const nextUniqueKfIdx: number = Suggest.findNextUniqueKf(allSuggestedPaths, preStepIdx);
        // console.log('next unique idx in path: ', nextUniqueKfIdx);
        if (nextUniqueKfIdx === -1) {
            this.pathToSpec(allSuggestedPaths, startKf, selectedMarks, suggestOnFirstKf);
        } else {
            // State.saveHistory();
            //render kfs before
            for (let j = preStepIdx + 1; j < nextUniqueKfIdx; j++) {
                let omittedMarksRecord: string[] = [];
                if (nextUniqueKfIdx - preStepIdx - 1 > 2) {
                    if (j === nextUniqueKfIdx - 1) {//put omit
                        const kfOmit: KfOmit = new KfOmit();
                        const omitStartX: number = Tool.extractTransNums(preKf.container.getAttributeNS(null, 'transform')).x + preKf.kfWidth + transX;
                        kfOmit.createOmit(KfOmit.KF_OMIT, omitStartX, nextUniqueKfIdx - preStepIdx - 3, startKf.parentObj, false, true, startKf.kfHeight / 2);
                        startKf.parentObj.children.push(kfOmit);
                        startKf.parentObj.kfOmits.push(kfOmit);
                        insertIdx++;
                        transX += kfOmit.oWidth + 2 * KfItem.PADDING;
                    } else if (j > preStepIdx + 1 && j < nextUniqueKfIdx - 1) {
                        omittedMarksRecord = [...omittedMarksRecord, ...allSuggestedPaths[0].kfMarks[j]];
                    }
                }

                //render kf
                const [tmpKfInfo, tmpKf] = this.createKfOnPath([...allSuggestedPaths[0].kfMarks[j], ...omittedMarksRecord], preKfInfo, startKf, transX)
                lastKf = tmpKf;
                insertIdx++;
                transX += tmpKf.totalWidth;
                kfBeforeSuggestBox = tmpKf;
                preKfInfo = tmpKfInfo;
                preKf = tmpKf;
            }

            suggestBox.createSuggestBox(kfBeforeSuggestBox, allSuggestedPaths, nextUniqueKfIdx, suggestOnFirstKf);
            transX += (suggestBox.boxWidth + suggestBox.menuWidth - PlusBtn.BTN_SIZE);
            let transStartKf: KfItem = typeof lastKf === 'undefined' ? startKf : lastKf;
            startKf.parentObj.translateGroup(transStartKf, transX, false, false, false, { lastItem: true, extraWidth: suggestBox.boxWidth + SuggestBox.PADDING + suggestBox.menuWidth });

            //update the container slider
            const rootGroupBBox: DOMRect = document.getElementById(KfContainer.KF_FG).getBoundingClientRect();
            Reducer.triger(action.UPDATE_KEYFRAME_CONTAINER_SLIDER, { width: rootGroupBBox.width, height: rootGroupBBox.height });
        }
    }

    public resetProps() {
        this.lastUpdateSuggestionPathActionInfo = undefined;
        this.menuWidth = 0;
        this.preMenuWidth = 0;
    }

    public createOptionKfs(allCurrentPaths: IPath[], allCurrentMarks: string[], allGroupMarks: string[], suggestOnFirstKf: boolean): void {
        // console.log('all paths right now: ', allCurrentPaths);
        this.options = [];
        let uniqueKfRecorder: string[][] = [];//record unique kfs
        allCurrentPaths.forEach((path: IPath) => {
            const marksThisKf: string[] = path.kfMarks[this.uniqueKfIdx];
            if (!Tool.Array2DItem(uniqueKfRecorder, marksThisKf)) {
                uniqueKfRecorder.push(marksThisKf);
                let optionInfo: IOptionInfo = {
                    kfIdx: this.uniqueKfIdx,
                    attrs: path.attrComb,
                    values: path.sortedAttrValueComb[this.uniqueKfIdx + 1].split(','),
                    marks: marksThisKf,
                    allCurrentMarks: allCurrentMarks,
                    allGroupMarks: allGroupMarks,
                    kfWidth: this.kfWidth,
                    kfHeight: this.kfHeight,
                    suggestOnFirstKf: suggestOnFirstKf,
                    ordering: path.ordering
                }

                let optionItem: OptionItem = new OptionItem();
                optionItem.createaItem(optionInfo);
                this.options.push(optionItem);
            }
        })
    }
}

export class SuggestMenu {
    static MENU_WIDTH: number = 20
    static MENU_RX: number = KfGroup.GROUP_RX;
    static MENU_ICON_COLOR: string = '#e5e5e5';
    static MENU_ICON_HIGHLIGHT_COLOR: string = '#494949';
    static BTN_SIZE: number = 20;
    static PADDING: number = 2;
    static DOT_SIZE: number = 10;
    static UP_DIRECT: string = 'up';
    static DOWN_DIRECT: string = 'down';

    public container: SVGGElement;
    public parentSuggestBox: SuggestBox;
    public numPages: number = 0;
    public pageIdx: number = 0;
    public dots: SVGCircleElement[] = [];
    public createMenu(startCoord: ICoord, suggestBox: SuggestBox) {
        this.parentSuggestBox = suggestBox;
        this.numPages = Math.ceil(this.parentSuggestBox.options.length / this.parentSuggestBox.numShown);
        const menuHeight: number = (SuggestMenu.BTN_SIZE + 2 * SuggestMenu.PADDING) * 2 + this.numPages * (SuggestMenu.DOT_SIZE + 2 * SuggestMenu.PADDING);
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.setAttributeNS(null, 'transform', `translate(${startCoord.x - SuggestMenu.MENU_RX}, ${startCoord.y - menuHeight / 2})`);
        const bg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttributeNS(null, 'width', `${SuggestMenu.MENU_RX + SuggestMenu.MENU_WIDTH}`);
        bg.setAttributeNS(null, 'height', `${menuHeight}`);
        bg.setAttributeNS(null, 'fill', '#676767');
        bg.setAttributeNS(null, 'rx', `${SuggestMenu.MENU_RX}`);
        this.container.appendChild(bg);

        const upArrow: SVGPolygonElement = this.createArrowBtn(SuggestMenu.UP_DIRECT, menuHeight);
        this.container.appendChild(upArrow);
        const downArrow: SVGPolygonElement = this.createArrowBtn(SuggestMenu.DOWN_DIRECT, menuHeight);
        this.container.appendChild(downArrow);

        this.dots = [];
        for (let i = 0; i < this.numPages; i++) {
            const tmpDot: SVGCircleElement = this.createDot(i);
            this.container.appendChild(tmpDot);
            this.dots.push(tmpDot);
        }
    }

    public createArrowBtn(direct: string, menuHeight: number): SVGPolygonElement {
        let arrow: SVGPolygonElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        // arrow.setAttributeNS(null, 'fill', SuggestMenu.MENU_ICON_COLOR);
        arrow.classList.add('clickable-component', 'normal-btn');
        switch (direct) {
            case SuggestMenu.UP_DIRECT:
                arrow.setAttributeNS(null, 'points', '9.76,2.41 16.46,17.59 9.76,14.68 3.12,17.59');
                arrow.setAttributeNS(null, 'transform', `translate(${SuggestMenu.MENU_RX}, ${SuggestMenu.PADDING})`);
                arrow.onclick = () => {
                    if (this.pageIdx > 0) {
                        this.pageIdx--;
                        this.arrowClickListener();
                    }
                }
                break;
            case SuggestMenu.DOWN_DIRECT:
                arrow.setAttributeNS(null, 'points', '3.12,2.41 9.76,5.32 16.46,2.41 9.76,17.59');
                arrow.setAttributeNS(null, 'transform', `translate(${SuggestMenu.MENU_RX}, ${menuHeight - SuggestMenu.BTN_SIZE - SuggestMenu.PADDING})`);
                arrow.onclick = () => {
                    if (this.pageIdx < this.numPages - 1) {
                        this.pageIdx++;
                        this.arrowClickListener();
                    }
                }
                break;
        }

        return arrow;
    }

    public arrowClickListener() {
        this.parentSuggestBox.itemContainer.innerHTML = '';
        for (let i = this.pageIdx * this.parentSuggestBox.numShown; i < (this.pageIdx + 1) * this.parentSuggestBox.numShown; i++) {
            if (typeof this.parentSuggestBox.options[i] !== 'undefined') {
                this.parentSuggestBox.options[i].updateTrans(i - this.pageIdx * this.parentSuggestBox.numShown);
                this.parentSuggestBox.itemContainer.appendChild(this.parentSuggestBox.options[i].container);
            }
        }
        this.dots.forEach((dot: SVGCircleElement, idx: number) => {
            if (idx === this.pageIdx) {
                dot.classList.add('highlight-btn')
            } else {
                dot.classList.remove('highlight-btn')
            }
        })
    }

    public createDot(idx: number): SVGCircleElement {
        let dot: SVGCircleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.classList.add('clickable-component', 'normal-btn');
        if (idx === 0) {
            dot.classList.add('clickable-component', 'highlight-btn');
        }
        dot.setAttributeNS(null, 'fill', SuggestMenu.MENU_ICON_COLOR);
        dot.setAttributeNS(null, 'r', `${SuggestMenu.BTN_SIZE / 2 - 6}`);
        dot.setAttributeNS(null, 'cx', `${SuggestMenu.MENU_RX + SuggestMenu.BTN_SIZE / 2}`);
        dot.setAttributeNS(null, 'cy', `${SuggestMenu.BTN_SIZE + SuggestMenu.PADDING * 3 + SuggestMenu.DOT_SIZE / 2 + (SuggestMenu.DOT_SIZE + 2 * SuggestMenu.PADDING) * idx}`);
        dot.onclick = () => {
            this.pageIdx = idx;
            this.arrowClickListener();
        }

        return dot;
    }
}

export class OptionItem {
    static PADDING: number = 6;
    static TEXT_PANEL_WIDTH: number = 60;

    public container: SVGGElement;
    public optionKf: KfItem;
    public createaItem(optionInfo: IOptionInfo) {
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.classList.add('clickable-component');
        this.optionKf = new KfItem();
        this.optionKf.createOptionKfItem(optionInfo.allCurrentMarks, optionInfo.allGroupMarks, optionInfo.marks, optionInfo.kfWidth, optionInfo.kfHeight);
        const text: SVGTextElement = this.createText(optionInfo.attrs, optionInfo.values, optionInfo.ordering);
        const bg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.classList.add('ease-fade', 'hide-ele');
        bg.setAttributeNS(null, 'width', `${this.optionKf.kfWidth + 3 * OptionItem.PADDING + OptionItem.TEXT_PANEL_WIDTH}`);
        bg.setAttributeNS(null, 'height', `${this.optionKf.kfHeight + 2 * OptionItem.PADDING}`);
        bg.setAttributeNS(null, 'rx', `${KfGroup.GROUP_RX}`);
        bg.setAttributeNS(null, 'fill', '#b6b6b6');
        this.container.appendChild(bg);
        this.container.appendChild(this.optionKf.container);
        this.container.appendChild(text);
        this.container.onmouseover = () => {
            if (!state.mousemoving) {
                bg.classList.remove('hide-ele');
            }
        }
        this.container.onmouseout = () => {
            bg.classList.add('hide-ele');
        }
        this.container.onclick = () => {
            Reducer.triger(action.UPDATE_LOADING_STATUS, { il: true, srcDom: this.container, content: Loading.SUGGESTING });
            setTimeout(() => {
                let currentSelectedMarksEachStep: Map<number, string[]> = typeof state.activatePlusBtn.selectedMarksEachStep === 'undefined' ? new Map() : new Map(state.activatePlusBtn.selectedMarksEachStep);
                const currentActionInfo: IActivatePlusBtn = {
                    aniId: state.activatePlusBtn.aniId,
                    selection: state.activatePlusBtn.selection,
                    selectedMarksEachStep: currentSelectedMarksEachStep.set(optionInfo.kfIdx, optionInfo.marks),
                    renderedUniqueIdx: suggestBox.uniqueKfIdx
                }
                State.tmpStateBusket.push({
                    historyAction: { actionType: action.ACTIVATE_PLUS_BTN, actionVal: state.activatePlusBtn },
                    currentAction: { actionType: action.ACTIVATE_PLUS_BTN, actionVal: currentActionInfo }
                })
                State.saveHistory();
                Reducer.triger(action.ACTIVATE_PLUS_BTN, currentActionInfo);

                // //filter paths
                // let tmpAllPaths: IPath[] = [];
                // state.allPaths.forEach((p: IPath) => {
                //     if (Tool.identicalArrays(p.kfMarks[optionInfo.kfIdx], optionInfo.marks)) {
                //         tmpAllPaths.push(p);
                //     }
                // })

                // //remove suggest box and create a new kf
                // const startKfInfo: IKeyframe = KfItem.allKfInfo.get(suggestBox.kfBeforeSuggestBox.id);
                // const tmpKfInfo: IKeyframe = KfItem.createKfInfo(optionInfo.marks,
                //     {
                //         duration: startKfInfo.duration,
                //         allCurrentMarks: [...startKfInfo.allCurrentMarks, ...startKfInfo.marksThisKf],
                //         allGroupMarks: startKfInfo.allGroupMarks
                //     });
                // KfItem.allKfInfo.set(tmpKfInfo.id, tmpKfInfo);
                // let tmpKf: KfItem = new KfItem();
                // const startX: number = Tool.extractTransNums(suggestBox.kfBeforeSuggestBox.container.getAttributeNS(null, 'transform')).x + suggestBox.kfBeforeSuggestBox.totalWidth - KfItem.PADDING;
                // tmpKf.createItem(tmpKfInfo, suggestBox.kfBeforeSuggestBox.parentObj.treeLevel + 1, suggestBox.kfBeforeSuggestBox.parentObj, startX);
                // let insertIdx: number = 0;
                // for (let i = 0, len = suggestBox.kfBeforeSuggestBox.parentObj.children.length; i < len; i++) {
                //     if (suggestBox.kfBeforeSuggestBox.parentObj.children[i] instanceof KfItem && suggestBox.kfBeforeSuggestBox.parentObj.children[i].id === suggestBox.kfBeforeSuggestBox.id) {
                //         insertIdx = i + 1;
                //         break;
                //     }
                // }
                // // let nextKf: KfItem = suggestBox.kfBeforeSuggestBox.parentObj.children[insertIdx];
                // suggestBox.kfBeforeSuggestBox.parentObj.children.splice(insertIdx, 0, tmpKf);
                // // let transX: number = tmpKf.totalWidth - (suggestBox.boxWidth + 3 * SuggestBox.PADDING + suggestBox.menuWidth + 2);
                // // let transX: number = tmpKf.totalWidth;
                // // console.log('in suggest box translate: ', transX);
                // // if (typeof nextKf === 'undefined') {
                // // suggestBox.kfBeforeSuggestBox.parentObj.translateGroup(tmpKf, transX, false, false, false, { lastItem: true, extraWidth: suggestBox.boxWidth + SuggestBox.PADDING + suggestBox.menuWidth });
                // // } else {
                // // suggestBox.kfBeforeSuggestBox.parentObj.translateGroup(nextKf, transX, false, false, false);
                // // }
                // suggestBox.removeSuggestBox();

                // //triger actions to render again
                // const actionInfo: any = { ap: tmpAllPaths, kfIdxInPath: suggestBox.uniqueKfIdx, startKf: tmpKf, kfGroup: suggestBox.kfBeforeSuggestBox.parentObj, suggestOnFirstKf: optionInfo.suggestOnFirstKf, selectedMarks: optionInfo.marks };
                // State.tmpStateBusket.push({
                //     historyAction: { actionType: action.UPDATE_SUGGESTION_PATH, actionVal: suggestBox.lastUpdateSuggestionPathActionInfo },
                //     currentAction: { actionType: action.UPDATE_SUGGESTION_PATH, actionVal: actionInfo }
                // })
                // State.saveHistory();
                // Reducer.triger(action.UPDATE_SUGGESTION_PATH, actionInfo);
                // suggestBox.lastUpdateSuggestionPathActionInfo = actionInfo;
            }, 1);
        }
    }

    /**
     * 
     * @param index : index of this item in the shown items
     */
    public updateTrans(index: number) {
        this.container.setAttributeNS(null, 'transform', `translate(0, ${index * (this.optionKf.kfHeight + 2 * OptionItem.PADDING)})`);
    }

    public createText(attrs: string[], values: string[], ordering?: { attr: string, order: string }): SVGTextElement {
        const text: SVGTextElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttributeNS(null, 'transform', `translate(${this.optionKf.kfWidth + 2 * OptionItem.PADDING}, ${3 * OptionItem.PADDING})`)
        text.classList.add('monospace-font', 'small-font');
        if (typeof ordering === 'undefined') {
            attrs.forEach((aName: string, idx: number) => {
                const aNameTspan: SVGTSpanElement = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                aNameTspan.innerHTML = `${aName}:`;
                aNameTspan.setAttributeNS(null, 'font-weight', 'bold');
                aNameTspan.setAttributeNS(null, 'x', '0');
                aNameTspan.setAttributeNS(null, 'y', `${idx * 38}`);
                text.appendChild(aNameTspan);
                const aValueTspan: SVGTSpanElement = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                aValueTspan.innerHTML = values[idx];
                aValueTspan.setAttributeNS(null, 'x', '0');
                aValueTspan.setAttributeNS(null, 'y', `${idx * 38 + 16}`);
                text.appendChild(aValueTspan);
            })
        } else {
            const aNameTspan: SVGTSpanElement = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            aNameTspan.innerHTML = `${ordering.attr}:`;
            aNameTspan.setAttributeNS(null, 'font-weight', 'bold');
            aNameTspan.setAttributeNS(null, 'x', '0');
            aNameTspan.setAttributeNS(null, 'y', '0');
            text.appendChild(aNameTspan);
            const aValueTspan: SVGTSpanElement = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            aValueTspan.innerHTML = `${ordering.order}`;
            aValueTspan.setAttributeNS(null, 'x', '0');
            aValueTspan.setAttributeNS(null, 'y', '16');
            text.appendChild(aValueTspan);
        }
        return text;
    }
}

export let suggestBox: SuggestBox = new SuggestBox();