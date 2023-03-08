import KfTrack from "./kfTrack";
import { IKeyframeGroup, IKeyframe } from "../../app/core/ds";
import KfOmit from "./kfOmit";
import KfTimingIllus from "./kfTimingIllus";
import KfItem from "./kfItem";
import Tool from "../../util/tool";
import { ICoord } from "../../util/ds";
import IntelliRefLine, { hintDrop } from "./intelliRefLine";

import '../../assets/style/keyframeGroup.scss'
import { KfContainer } from "../kfContainer";
import * as action from "../../app/action";
import Reducer from "../../app/reducer";
import { TimingSpec, Animation } from 'canis_toolkit';
import PlusBtn from "./plusBtn";
import { hintTag } from "./hint";
import { state, State } from "../../app/state";
import Util from "../../app/core/util";
import { sortableSvgTable } from "./sortableSvgTable";

export default class KfGroup extends KfTimingIllus {
    static groupIdx: number = 0;
    static leafLevel: number = 0;
    static BASIC_GRAY: number = 239;
    static GRAY_STEP: number = 20;
    static PADDING: number = 6;
    static GROUP_RX: number = 8;
    static TITLE_CHAR_WIDTH: number = 9;
    static TITLE_PADDING: number = 4;
    static TITLE_HEIHGT: number = 18;
    static allActions: Map<string, any> = new Map();//key: aniId, value: action
    static allAniGroups: Map<string, KfGroup> = new Map();//key: aniId, value: kfgroup corresponds to animation
    static allAniGroupInfo: Map<string, IKeyframeGroup> = new Map();//key: aniId, value: kfg info

    // public id: number;
    public aniId: string;
    public preAniId: string;
    public newTrack: boolean;
    public posiX: number;
    public posiY: number;
    public delay: number;
    public title: string;
    public fullTitle: string;
    public rendered: boolean = false;
    public targetTrackId: string;
    public idxInGroup: number = 0;
    public groupRef: string = '';
    public refValue: string = '';
    public childrenRef: string;
    public childrenRefValues: string[] = [];
    public timingRef: string = TimingSpec.timingRef.previousStart;
    public kfHasOffset: boolean = false;//for updating omits
    public kfHasDuration: boolean = false;//for updating omits
    public width: number = 0;
    public marks: string[];
    public treeLevel: number;
    public alignTarget: string;
    public alignId: string;
    public alignType: string;
    public alignMerge: boolean = false;
    public isDragging: boolean = false;

    public groupBg: SVGRectElement;
    public groupMenu: GroupMenu;
    // public groupMenuMask: SVGMaskElement;
    public plusBtn: PlusBtn;
    public groupTitle: SVGGElement;
    public groupTitleBg: SVGRectElement;
    public groupTitleContent: SVGTextContentElement;
    public groupSortBtn: SVGGElement
    public groupTitleCover: SVGRectElement;//same color as the group bg
    public children: (KfGroup | KfItem | KfOmit)[] = [];
    public kfNum: number = 0;
    public kfOmits: KfOmit[] = [];
    public parentObj: KfGroup | KfTrack;
    public alignLines: number[] = [];
    public _renderWhenZooming: boolean = true;

    set offsetDiff(od: number) {//for dragging the offset stretch bar
        this._offsetDiff = od;
        // this.hideLinesInGroup();
        Tool.transNodeElements(this.container, od, true);
        this.translateWholeGroup(od);
    }
    get offsetDiff(): number {
        return this._offsetDiff;
    }

    set renderWhenZooming(rwz: boolean) {
        const changed: boolean = rwz !== this.renderWhenZooming;
        this._renderWhenZooming = rwz;
        if (changed) {
            this.showGroupWhenZooming();
        }
    }

    get renderWhenZooming(): boolean {
        return this._renderWhenZooming;
    }

    public static reset() {
        this.groupIdx = 0;
        this.leafLevel = 0;
    }

    public addEasingTransform() {
        this.groupTitle.classList.add('ease-transform');
    }
    public removeEasingTransform() {
        this.groupTitle.classList.remove('ease-transform');
    }

    /**
     * @param g : container of this group, could be track or another group
     * @param p : init position of the root group
     */
    public createGroup(kfg: IKeyframeGroup, previousAniId: string, parentObj: KfGroup | KfTrack, posiY: number, treeLevel: number, targetTrackId: string): void {
        // console.log('test kfg: ', kfg);
        this.id = kfg.id;
        this.aniId = kfg.aniId;
        this.preAniId = previousAniId;
        this.marks = kfg.marks;
        this.groupRef = kfg.groupRef;
        this.timingRef = kfg.timingRef;
        this.targetTrackId = targetTrackId;
        this.newTrack = kfg.newTrack;
        this.treeLevel = treeLevel;
        this.posiY = posiY;
        this.hasOffset = kfg.delayIcon;
        this.parentObj = parentObj;
        this.delay = kfg.delay;
        this.alignId = kfg.alignId;
        this.alignTarget = kfg.alignTarget;
        this.alignType = kfg.alignType;
        if (typeof kfg.merge !== 'undefined') {
            this.alignMerge = kfg.merge;
        }
        if (typeof kfg.refValue === 'undefined') {
            let classRecorder: Set<string> = new Set();
            this.marks.forEach((m: string) => {
                classRecorder.add(Animation.markClass.get(m));
            })
            let tmpTitle: string = [...classRecorder].join(', ');
            this.fullTitle = tmpTitle;
            if (tmpTitle.length > 23) {
                tmpTitle = tmpTitle.substring(0, 23) + '...';
            }
            this.title = tmpTitle;
        } else {
            this.refValue = kfg.refValue;
            this.fullTitle = kfg.refValue;
            this.title = kfg.refValue;
        }

        if (kfg.keyframes.length > 0) {
            this.childrenRef = kfg.keyframes[0].groupRef;
            this.childrenRefValues = kfg.keyframes.map((k: IKeyframe) => k.refValue);
        } else {
            if (kfg.children.length > 0) {
                this.childrenRef = kfg.children[0].groupRef;
                this.childrenRefValues = kfg.children.map((c: IKeyframeGroup) => c.refValue);
            }
        }

        if (typeof parentObj.container !== 'undefined') {
            this.rendered = true;
            this.renderGroup();
        }
    }

    public createBlankKfg(parentObj: KfTrack, targetGroupAniId: string, startX: number): void {
        this.parentObj = parentObj;
        this.aniId = targetGroupAniId;
        this.treeLevel = 0;
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.posiY = 2;
        this.translateContainer(startX, this.posiY);
        this.parentObj.children.push(this);
        this.groupBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.groupBg.setAttributeNS(null, 'stroke', '#898989');

        this.groupBg.setAttributeNS(null, 'fill', `rgb(${KfGroup.BASIC_GRAY - KfGroup.GRAY_STEP},${KfGroup.BASIC_GRAY - KfGroup.GRAY_STEP},${KfGroup.BASIC_GRAY - KfGroup.GRAY_STEP})`);
        this.groupBg.setAttributeNS(null, 'stroke-width', '1');
        this.groupBg.setAttributeNS(null, 'rx', `${KfGroup.GROUP_RX}`);
        this.groupBg.setAttributeNS(null, 'x', '0');
        this.container.appendChild(this.groupBg);
        this.parentObj.container.appendChild(this.container);
    }

    public restorePlusBtn() {
        if (typeof this.plusBtn !== 'undefined') {
            this.plusBtn.restoreBtn();
        }
    }

    public renderGroup() {
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.setAttributeNS(null, 'id', `group${this.id}`);
        if (this.parentObj instanceof KfTrack) {
            this.posiY = 1;
            if (typeof this.alignTarget !== 'undefined' && this.alignType === Animation.alignTarget.withEle) {
                //find the aligned group
                const alignWithGroup: KfGroup = this.fetchAlignWithGroup();

                if (this.alignMerge) {
                    //align to the lowest group
                    const lowestGroupBBox: DOMRect = alignWithGroup.fetchFirstKf().parentObj.container.getBoundingClientRect();//fixed
                    const transY: number = (this.parentObj.container.getBoundingClientRect().top - lowestGroupBBox.top) / state.zoomLevel + 2;
                    this.posiY -= transY;
                } else {
                    //translate the omit in alignWith group (on the lowest level, like OS example)
                    const lowestBranches: KfGroup[] = [];
                    alignWithGroup.fetchLowestSubBranch(lowestBranches);
                    const heightDiff: number = this.parentObj.trackPosiY - KfTrack.allTracks.get(alignWithGroup.targetTrackId).trackPosiY + KfTrack.TRACK_HEIGHT - KfGroup.TITLE_HEIHGT;
                    lowestBranches.forEach((lowestGroupInAlignWith: KfGroup) => {
                        if (lowestGroupInAlignWith.rendered) {
                            lowestGroupInAlignWith.kfOmits.forEach((omit: KfOmit) => {
                                const oriTrans: ICoord = Tool.extractTransNums(omit.container.getAttributeNS(null, 'transform'));
                                console.log('test0: ', oriTrans.x);
                                omit.updateTrans(oriTrans.x + KfGroup.PADDING, heightDiff / 2);
                                // omit.createUseTag();
                            })
                        }
                    })
                }
            }
            let transX: number = this.parentObj.availableInsert;
            if (this.preAniId !== '' && this.timingRef === TimingSpec.timingRef.previousStart) {
                transX = Tool.extractTransNums(KfGroup.allAniGroups.get(this.preAniId).container.getAttributeNS(null, 'transform')).x;
            }
            this.parentObj.availableInsert = transX;//need to  test!!!!!!!!
            this.translateContainer(transX, this.posiY);
            this.parentObj.children.push(this);
            this.idxInGroup = this.parentObj.children.length - 1;
        }
        if (this.hasOffset) {
            this.drawOffset(this.delay, 100, KfGroup.GROUP_RX);
            this.container.appendChild(this.offsetIllus);
        }
        this.drawGroupBg();

        if (this.treeLevel === 1 && this.parentObj instanceof KfGroup) {
            this.parentObj.container.insertBefore(this.container, this.parentObj.groupMenu.container);
        } else {
            if (this.treeLevel === 0 && !this.alignMerge) {
                this.drawGroupMenu();
                this.container.appendChild(this.groupMenu.container);
                this.container.onmouseover = () => {
                    if (typeof this.groupMenu !== 'undefined' && !state.mousemoving) {
                        this.groupMenu.showMenu();
                    }
                }
            }
            this.parentObj.container.appendChild(this.container);
        }

        //update group title width
        this.updateTitleWidth();

        this.container.onmouseleave = (leaveEvt: any) => {
            let flag: boolean = !this.isDragging
            if (typeof sortableSvgTable.container !== 'undefined') {
                flag = flag && !sortableSvgTable.container.contains(leaveEvt.toElement)
            }
            if (flag) {
                //this is the original element the event handler was assigned to
                var e = leaveEvt.relatedTarget;

                while (e != null) {
                    if (e == this.container) {
                        return;
                    }
                    e = (<HTMLElement>e).parentNode;
                }

                this.transHideTitle();
                if (this.treeLevel === 0 && typeof this.groupMenu !== 'undefined') {
                    if (typeof this.groupMenu.menuListContainer === 'undefined') {
                        this.groupMenu.hideMenu();
                    } else {
                        if (!this.groupMenu.menuListContainer.contains(leaveEvt.toElement))
                            this.groupMenu.hideMenu();
                    }
                }
            }
        }
    }

    public drawGroupMenu(): void {
        this.groupMenu = new GroupMenu(KfGroup.allActions.get(this.aniId), this.id, this.aniId);
        this.groupMenu.createAndRenderMenu();
    }

    public updateParentKfHasTiming(hasOffset: boolean, hasDuration: boolean): void {
        this.kfHasOffset = hasOffset;
        this.kfHasDuration = hasDuration;
        if (this.parentObj instanceof KfGroup) {
            if (this.parentObj.kfHasOffset !== hasOffset || this.parentObj.kfHasDuration !== hasDuration) {
                this.parentObj.updateParentKfHasTiming(hasOffset, hasDuration);
            }
        }
    }

    public updateTitleWidth() {
        if (typeof this.groupTitleContent !== 'undefined') {
            const textBBox: DOMRect = this.groupTitleContent.getBoundingClientRect();
            this.groupTitleBg.setAttributeNS(null, 'width', `${textBBox.width + 2 * KfGroup.GROUP_RX + KfGroup.TITLE_HEIHGT + KfGroup.PADDING}`);
            this.groupSortBtn.setAttributeNS(null, 'transform', `translate(${textBBox.width + 2 * KfGroup.GROUP_RX + KfGroup.TITLE_HEIHGT + KfGroup.PADDING - KfGroup.TITLE_HEIHGT + 2},2)`)
        }
    }

    public transShowTitle(): void {
        if (typeof this.groupTitle !== 'undefined') {
            const oriTransX: number = Tool.extractTransNums(this.groupTitle.getAttributeNS(null, 'transform')).x;
            if (this.parentObj instanceof KfGroup) {
                this.parentObj.transHideTitle();
            }
            this.groupTitle.setAttributeNS(null, 'transform', `translate(${oriTransX}, ${-KfGroup.TITLE_HEIHGT})`);
        }
    }

    public transHideTitle(): void {
        if (typeof this.groupTitle !== 'undefined') {
            const oriTransX: number = Tool.extractTransNums(this.groupTitle.getAttributeNS(null, 'transform')).x;
            this.groupTitle.setAttributeNS(null, 'transform', `translate(${oriTransX}, 2)`);
        }
        sortableSvgTable.removeTable();
    }

    public showTitle(): void {
        if (typeof this.groupTitle !== 'undefined') {
            this.groupTitle.setAttributeNS(null, 'opacity', '1');
        }
    }

    public hideTitle(): void {
        if (typeof this.groupTitle !== 'undefined') {
            this.groupTitle.setAttributeNS(null, 'opacity', '0');
        }
    }

    public showMenu(): void {
        if (typeof this.groupMenu !== 'undefined') {
            this.groupMenu.showMenu();
        }
    }

    public hideMenu(): void {
        if (typeof this.groupMenu !== 'undefined') {
            this.groupMenu.hideMenu();
        }
    }

    public bindTitleHover(): void {
        this.groupTitle.onmouseover = (overEvt) => {
            if (!state.mousemoving) {
                hintTag.createHint({ x: overEvt.pageX, y: overEvt.pageY }, `Marks this group: ${this.fullTitle}`);
            }
        }
        this.groupTitle.onmouseout = () => {
            hintTag.removeHint();
        }
    }

    public unbindTitleHover() {
        this.groupTitle.onmouseover = null;
        this.groupTitle.onmouseout = null;
    }

    public addGroupToPopLayerWhenDrag(): KfGroup[] {
        this.container.setAttributeNS(null, '_transform', this.container.getAttributeNS(null, 'transform'));
        const containerBBox: DOMRect = this.container.getBoundingClientRect();//fixed
        this.parentObj.container.removeChild(this.container);
        const popKfContainer: HTMLElement = document.getElementById(KfContainer.KF_POPUP);
        const popKfContainerBbox: DOMRect = document.getElementById(KfContainer.KF_FG).getBoundingClientRect();//fixed
        popKfContainer.appendChild(this.container);
        //set new transform
        this.translateContainer((containerBBox.left - popKfContainerBbox.left) / state.zoomLevel, KfGroup.TITLE_HEIHGT + (containerBBox.top - popKfContainerBbox.top) / state.zoomLevel);
        //check whether there are aligned kf groups
        const groupsAligned: KfGroup[] = [];
        if (typeof this.alignId !== 'undefined') {
            KfGroup.allAniGroups.forEach((aniGroup: KfGroup, tmpAniId: string) => {
                if (tmpAniId !== this.aniId && aniGroup.alignTarget === this.alignId && aniGroup.alignType === Animation.alignTarget.withEle) {
                    groupsAligned.push(aniGroup);
                    aniGroup.container.setAttributeNS(null, '_transform', aniGroup.container.getAttributeNS(null, 'transform'));
                    const tmpContainerBBox: DOMRect = aniGroup.container.getBoundingClientRect();//fixed
                    aniGroup.parentObj.container.removeChild(aniGroup.container);
                    popKfContainer.appendChild(aniGroup.container);
                    aniGroup.translateContainer((tmpContainerBBox.left - popKfContainerBbox.left) / state.zoomLevel, (tmpContainerBBox.top - popKfContainerBbox.top) / state.zoomLevel);
                }
            })
        }
        return groupsAligned;
    }

    public reinsertGroupToItsParent(alignedGroups: KfGroup[]): void {
        [this, ...alignedGroups].forEach((tmpKfGroup: KfGroup) => {
            tmpKfGroup.container.setAttributeNS(null, 'transform', tmpKfGroup.container.getAttributeNS(null, '_transform'));
            if (tmpKfGroup.treeLevel === 1 && tmpKfGroup.parentObj instanceof KfGroup) {
                tmpKfGroup.parentObj.container.insertBefore(tmpKfGroup.container, tmpKfGroup.parentObj.groupMenu.container);
            } else {
                tmpKfGroup.parentObj.container.appendChild(tmpKfGroup.container);
            }
        })
        this.kfOmits.forEach((omit: KfOmit) => {
            if (typeof omit.useTag !== 'undefined') {
                omit.updateUseTagPosi();
            }
        })
    }

    public bindGroupTitleDrag() {
        this.groupTitle.onmousedown = (downEvt) => {
            Reducer.triger(action.UPDATE_MOUSE_MOVING, true);
            this.isDragging = true;
            KfContainer.showPopCover();
            hintTag.removeHint();
            this.unbindTitleHover();
            let oriMousePosiRecord: ICoord = { x: downEvt.pageX, y: downEvt.pageY };
            let oriMousePosi: ICoord = { x: downEvt.pageX, y: downEvt.pageY };
            //add the dragged group together with groups aligned to it to the popup layer
            const groupsAligned: KfGroup[] = this.addGroupToPopLayerWhenDrag();

            let updateSpec: boolean = false;
            let actionType: string = '';
            let actionInfo: any = {};
            const preSibling: KfGroup = <KfGroup>this.parentObj.children[this.idxInGroup - 1];

            //if dragging ani group, create hint lines
            let hintLines: IntelliRefLine[] = [];
            if (this.groupRef === 'root') {
                hintLines = IntelliRefLine.hintAniPosis(this);
            }

            document.onmousemove = (moveEvt) => {
                const currentMousePosi: ICoord = { x: moveEvt.pageX, y: moveEvt.pageY };
                const posiDiff: ICoord = { x: (currentMousePosi.x - oriMousePosi.x) / state.zoomLevel, y: (currentMousePosi.y - oriMousePosi.y) / state.zoomLevel };
                const posiDiffToOri: ICoord = { x: (currentMousePosi.x - oriMousePosiRecord.x) / state.zoomLevel, y: (currentMousePosi.y - oriMousePosiRecord.y) / state.zoomLevel };
                const oriTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
                this.translateContainer(oriTrans.x + posiDiff.x, oriTrans.y + posiDiff.y);
                groupsAligned.forEach((alignedGroup: KfGroup) => {
                    const tmpOriTrans: ICoord = Tool.extractTransNums(alignedGroup.container.getAttributeNS(null, 'transform'));
                    alignedGroup.translateContainer(tmpOriTrans.x + posiDiff.x, tmpOriTrans.y + posiDiff.y);
                })
                if (this.idxInGroup > 0 && preSibling.rendered && this.groupRef !== 'root') {//group within animation
                    [updateSpec, actionType, actionInfo] = this.dragInnerGroup(preSibling);
                } else {
                    [updateSpec, actionType, actionInfo] = this.dragAniGroup(posiDiffToOri);
                    console.log('testing: ', updateSpec, actionType, actionInfo);
                }
                oriMousePosi = currentMousePosi;
            }

            document.onmouseup = () => {
                // console.log('mouse up: ', updateSpec, actionType, actionInfo);
                document.onmousemove = null;
                document.onmouseup = null;
                Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
                KfContainer.hidePopCover();
                this.bindTitleHover();
                this.isDragging = false;
                if (!updateSpec) {
                    hintLines.forEach((hl: IntelliRefLine) => {
                        hl.removeHintLine();
                    })
                    this.reinsertGroupToItsParent(groupsAligned);
                } else {
                    //triger action
                    State.tmpStateBusket.push({
                        historyAction: { actionType: action.UPDATE_SPEC_ANIMATIONS, actionVal: JSON.stringify(state.spec.animations) },
                        currentAction: { actionType: actionType, actionVal: actionInfo }
                    })
                    State.saveHistory();
                    Reducer.triger(actionType, actionInfo);
                }
                document.getElementById(KfContainer.KF_POPUP).innerHTML = '';
            }
        }
    }

    public unbindGroupTitleDrag() {
        this.groupTitle.onmousedown = null;
    }

    public createGroupTitle(): void {
        const groupTitleWrapper: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        groupTitleWrapper.setAttributeNS(null, 'transform', `translate(${this.alignMerge ? this.offsetWidth + KfGroup.PADDING : this.offsetWidth}, 0)`);
        this.groupTitle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.groupTitle.classList.add('kf-group-title', 'ease-transform', 'draggable-component');
        // this.groupTitle.classList.add();
        this.groupTitle.setAttributeNS(null, 'transform', 'translate(0, 2)');
        this.groupTitleBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.groupTitleBg.setAttributeNS(null, 'width', `${KfGroup.TITLE_CHAR_WIDTH * this.title.length + 2 * KfGroup.TITLE_PADDING + KfGroup.TITLE_HEIHGT + KfGroup.PADDING}`);
        this.groupTitleBg.setAttributeNS(null, 'height', `${KfGroup.TITLE_HEIHGT + 2 * KfGroup.PADDING}`);
        this.groupTitleBg.setAttributeNS(null, 'fill', '#676767');
        this.groupTitleBg.setAttributeNS(null, 'rx', `${KfGroup.GROUP_RX}`);
        this.groupTitle.appendChild(this.groupTitleBg);
        this.groupTitleContent = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.groupTitleContent.innerHTML = this.title;
        this.groupTitleContent.setAttributeNS(null, 'x', '6');
        this.groupTitleContent.setAttributeNS(null, 'y', `${KfGroup.TITLE_HEIHGT - 4}`);
        this.groupTitleContent.setAttributeNS(null, 'fill', '#fff');
        this.groupTitleContent.classList.add('monospace-font');
        this.groupTitleContent.setAttributeNS(null, 'font-size', '10pt');
        this.groupTitle.appendChild(this.groupTitleContent);
        this.bindTitleHover();
        this.bindGroupTitleDrag();
        groupTitleWrapper.appendChild(this.groupTitle);

        this.groupSortBtn = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.groupSortBtn.classList.add('clickable-component', 'title-btn');
        this.groupSortBtn.setAttributeNS(null, 'transform', `translate(${KfGroup.TITLE_CHAR_WIDTH * this.title.length + KfGroup.TITLE_PADDING + KfGroup.TITLE_HEIHGT + 2},2)`)
        const titleBtnBg: SVGCircleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const btnR: number = (KfGroup.TITLE_HEIHGT - 4) / 2;
        titleBtnBg.setAttributeNS(null, 'cx', `${btnR}`);
        titleBtnBg.setAttributeNS(null, 'cy', `${btnR}`);
        titleBtnBg.setAttributeNS(null, 'r', `${btnR}`);
        this.groupSortBtn.appendChild(titleBtnBg);
        for (let i = 0; i < 3; i++) {
            const tmpLine: SVGLineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tmpLine.setAttributeNS(null, 'stroke-linecap', 'round');
            tmpLine.setAttributeNS(null, 'stroke', '#fff');
            tmpLine.setAttributeNS(null, 'stroke-width', '1.4');
            tmpLine.setAttributeNS(null, 'x1', `${(i + 2) * btnR / 5}`)
            tmpLine.setAttributeNS(null, 'x2', `${(8 - i) * btnR / 5}`)
            tmpLine.setAttributeNS(null, 'y1', `${(2 + i) * btnR / 3}`)
            tmpLine.setAttributeNS(null, 'y2', `${(2 + i) * btnR / 3}`)
            this.groupSortBtn.appendChild(tmpLine);
        }
        this.groupSortBtn.onmouseenter = (enterEvt) => {
            this.unbindTitleHover();
            this.unbindGroupTitleDrag();
            if (!state.mousemoving) {
                hintTag.createHint({ x: enterEvt.pageX, y: enterEvt.pageY }, 'sort data attributes');
            }
        }
        this.groupSortBtn.onmouseleave = (leaveEvt) => {
            hintTag.removeHint();
            this.bindTitleHover();
            this.bindGroupTitleDrag();
        }
        this.groupSortBtn.onclick = () => {
            const btnBBox: DOMRect = this.groupSortBtn.getBoundingClientRect();
            sortableSvgTable.createTable(
                this.childrenRefValues, {
                x: btnBBox.left,
                y: btnBBox.top
            }, this)
        }
        this.groupTitle.appendChild(this.groupSortBtn);


        //add a title cover
        if (this.alignMerge) {
            this.groupTitleCover = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            this.groupTitleCover.setAttributeNS(null, 'width', `${KfGroup.TITLE_CHAR_WIDTH * this.title.length + 2 * KfGroup.TITLE_PADDING + KfGroup.TITLE_HEIHGT + KfGroup.PADDING}`);
            this.groupTitleCover.setAttributeNS(null, 'height', '34');
            this.groupTitleCover.setAttributeNS(null, 'y', '1');
            this.groupTitleCover.setAttributeNS(null, 'rx', `${KfGroup.GROUP_RX}`);
            groupTitleWrapper.appendChild(this.groupTitleCover);
        }
        this.container.appendChild(groupTitleWrapper);
    }

    /**
     * draw group bg as well as title
     */
    public drawGroupBg(): void {
        this.createGroupTitle();
        this.groupBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.groupBg.setAttributeNS(null, 'stroke', this.alignMerge ? '#00000000' : '#898989');
        this.groupBg.setAttributeNS(null, 'stroke-width', '1');
        this.groupBg.setAttributeNS(null, 'rx', `${KfGroup.GROUP_RX}`);
        this.groupBg.setAttributeNS(null, 'x', `${this.offsetWidth}`);
        this.bindBgHover();
        this.container.appendChild(this.groupBg);
    }

    public bindBgHover() {
        this.groupBg.onmouseover = () => {
            if (!state.mousemoving) {
                this.transShowTitle();
            }
        }
    }

    public unbindBgHover() {
        this.groupBg.onmouseover = null;
    }

    /**
     * returns: updateSpec:boolean, actionType: string, actionInfo: any
     */
    public dragAniGroup(posiDiffToOri: ICoord): [boolean, string, any] {
        const currentAniId: string = this.aniId;
        const sepCurrentAniMarks: { dataMarks: string[], nonDataMarks: string[] } = Util.separateDataAndNonDataMarks(KfGroup.allAniGroupInfo.get(currentAniId).marks);
        const currentGBBox: DOMRect = this.groupBg.getBoundingClientRect();//fixed
        const currentGPosi: ICoord = { x: currentGBBox.left, y: currentGBBox.top };
        let targetAni: { targetAniId: string, currentAniId: string, actionType: string };
        for (let i = 0, len = [...KfGroup.allAniGroups].length; i < len; i++) {
            const aniGroup: KfGroup = [...KfGroup.allAniGroups][i][1];
            if (this.id !== aniGroup.id) {
                const firstKf: KfItem = aniGroup.fetchFirstKf();
                const alignTargetGroup: boolean = typeof KfItem.allKfInfo.get(firstKf.id).alignTo === 'undefined';
                //judge the relative position between this one and aniGroup & the first Kf in aniGroup
                const aniGroupBBox: DOMRect = aniGroup.groupBg.getBoundingClientRect();//fixed
                const firstKfBBox: DOMRect = firstKf.container.getBoundingClientRect();//fixed
                const targetAniId: string = aniGroup.aniId;
                const sepTargetAniMarks: { dataMarks: string[], nonDataMarks: string[] } = Util.separateDataAndNonDataMarks(KfGroup.allAniGroupInfo.get(targetAniId).marks);
                //add orange lines according to drag position
                // const currentKfOffsetW: number = KfGroup.BASIC_OFFSET_DURATION_W > this.offsetWidth ? KfGroup.BASIC_OFFSET_DURATION_W : this.offsetWidth;
                if (typeof this.delay !== 'undefined' && this.delay > 0 && posiDiffToOri.x < 0) {
                    this.hideOffset();
                    targetAni = { targetAniId: targetAniId, currentAniId: currentAniId, actionType: action.UPDATE_ANI_ALIGN_AFTER_ANI };//after group has higher priority
                } else if (typeof this.delay !== 'undefined' && this.delay > 0 && posiDiffToOri.x >= 0) {
                    this.showOffset();
                }
                if (currentGPosi.x >= aniGroupBBox.right && currentGPosi.x <= aniGroupBBox.right + (6 * state.zoomLevel) && currentGPosi.y >= aniGroupBBox.top) {
                    targetAni = { targetAniId: targetAniId, currentAniId: currentAniId, actionType: action.UPDATE_ANI_ALIGN_AFTER_ANI_WITH_DELAY };//after group has higher priority
                    hintDrop.hintInsert({ x: aniGroupBBox.right, y: aniGroupBBox.top }, aniGroupBBox.height / state.zoomLevel, true, true);
                    break;
                } else {
                    if (currentGPosi.x >= aniGroupBBox.left && currentGPosi.x < aniGroupBBox.left + (6 * state.zoomLevel) && currentGPosi.y >= aniGroupBBox.top) {
                        targetAni = { targetAniId: targetAniId, currentAniId: currentAniId, actionType: action.UPDATE_ANI_ALIGN_WITH_ANI };
                        hintDrop.hintInsert({ x: aniGroupBBox.left, y: aniGroupBBox.top }, aniGroupBBox.height / state.zoomLevel, true, true);
                    } else if (currentGPosi.x >= firstKfBBox.left && currentGPosi.x < firstKfBBox.left + (30 * state.zoomLevel) && alignTargetGroup) {
                        targetAni = { targetAniId: targetAniId, currentAniId: currentAniId, actionType: (sepCurrentAniMarks.nonDataMarks.length > 0 || sepTargetAniMarks.nonDataMarks.length > 0) ? action.UPDATE_ANI_ALIGN_WITH_ANI : action.UPDATE_ANI_ALIGN_WITH_KF };
                        hintDrop.hintAlign({ x: firstKfBBox.left, y: firstKfBBox.top }, firstKfBBox.height / state.zoomLevel, true);
                    } else if (currentGPosi.x >= firstKfBBox.right && currentGPosi.x < firstKfBBox.right + (30 * state.zoomLevel) && alignTargetGroup) {
                        targetAni = { targetAniId: targetAniId, currentAniId: currentAniId, actionType: (sepCurrentAniMarks.nonDataMarks.length > 0 || sepTargetAniMarks.nonDataMarks.length > 0) ? action.UPDATE_ANI_ALIGN_AFTER_ANI_WITH_DELAY : action.UPDATE_ANI_ALIGN_AFTER_KF };
                        hintDrop.hintAlign({ x: firstKfBBox.right, y: firstKfBBox.top }, firstKfBBox.height / state.zoomLevel, true);
                    }
                }
                // }
            }
        }
        if (typeof targetAni === 'undefined') {
            hintDrop.removeHintLine();
            return [false, '', {}];
        } else {//triger action
            return [true, targetAni.actionType, { targetAniId: targetAni.targetAniId, currentAniId: targetAni.currentAniId }];
        }
    }

    public dragInnerGroup(preSibling: KfGroup): [boolean, string, any] {
        let updateSpec: boolean = false;
        let actionType: string = '';
        let actionInfo: any = {};
        const currentGroupBBox: DOMRect = this.groupBg.getBoundingClientRect();//fixed
        const preGroupBBox: DOMRect = preSibling.groupBg.getBoundingClientRect();//fixed
        const posiYDiff: number = currentGroupBBox.top - preGroupBBox.top;
        const posiXRightDiff: number = (currentGroupBBox.left - preGroupBBox.right) / state.zoomLevel;
        const posiXLeftDiff: number = (currentGroupBBox.left - preGroupBBox.left) / state.zoomLevel;
        const currentKfOffsetW: number = KfGroup.BASIC_OFFSET_DURATION_W > this.offsetWidth ? KfGroup.BASIC_OFFSET_DURATION_W : this.offsetWidth;
        let correctTimingRef: boolean = true;
        let compareXDiff: number = posiXRightDiff;
        let updateTimingRef: string = '';
        if (posiYDiff <= currentGroupBBox.height) {//timing ref should be start after
            if (this.timingRef !== TimingSpec.timingRef.previousEnd) {
                correctTimingRef = false;
                updateTimingRef = TimingSpec.timingRef.previousEnd;
            }
        } else {//create new track and change timing ref to start with
            if (this.timingRef !== TimingSpec.timingRef.previousStart) {
                correctTimingRef = false;
                updateTimingRef = TimingSpec.timingRef.previousStart;
            }
            compareXDiff = posiXLeftDiff;
        }
        if (compareXDiff >= currentKfOffsetW) {//show delay
            preSibling.cancelHighlightGroup();
            if (!this.hasOffset) {//add default delay
                if (typeof this.offsetIllus === 'undefined') {
                    this.drawOffset(KfGroup.minOffset, currentGroupBBox.height / state.zoomLevel, KfGroup.GROUP_RX, true);
                }
                this.container.prepend(this.offsetIllus);

                updateSpec = true;
                actionInfo.aniId = this.aniId;
                actionInfo.groupRef = this.groupRef;
                actionInfo.delay = 300;
                if (correctTimingRef) {
                    actionType = action.UPDATE_DELAY_BETWEEN_GROUP;
                } else {
                    actionType = action.UPDATE_DELAY_TIMING_REF_BETWEEN_GROUP;
                    actionInfo.ref = updateTimingRef;
                }
            } else {
                this.showOffset();
                if (correctTimingRef) {
                    updateSpec = false
                    actionInfo = {};
                } else {
                    updateSpec = true;
                    actionType = action.UPDATE_TIMEING_REF_BETWEEN_GROUP;
                    actionInfo.aniId = this.aniId;
                    actionInfo.groupRef = this.groupRef;
                    actionInfo.ref = updateTimingRef;
                }
            }
        } else if (compareXDiff < currentKfOffsetW && compareXDiff >= 0) {//remove delay
            preSibling.cancelHighlightGroup();
            if (this.hasOffset) {//remove delay
                this.hideOffset();

                updateSpec = true;
                actionInfo.aniId = this.aniId;
                actionInfo.groupRef = this.groupRef;
                if (correctTimingRef) {
                    actionType = action.REMOVE_DELAY_BETWEEN_GROUP;
                } else {
                    actionType = action.REMOVE_DELAY_UPDATE_TIMING_REF_GROUP;
                    actionInfo.ref = updateTimingRef;
                }
            } else {
                if (typeof this.offsetIllus !== 'undefined' && this.container.contains(this.offsetIllus)) {
                    this.container.removeChild(this.offsetIllus);
                }
                if (correctTimingRef) {
                    updateSpec = false
                    actionInfo = {};
                } else {
                    updateSpec = true;
                    actionType = action.UPDATE_TIMEING_REF_BETWEEN_GROUP;
                    actionInfo.aniId = this.aniId;
                    actionInfo.groupRef = this.groupRef;
                    actionInfo.ref = updateTimingRef;
                }
            }
        } else {//
            if (posiYDiff <= currentGroupBBox.height) {//timing ref should be start after
                preSibling.highlightGroup();
                updateSpec = true;
                actionType = action.MERGE_GROUP;
                actionInfo.aniId = this.aniId;
                actionInfo.groupRef = this.groupRef;
            } else {//create new track and change timing ref to start with
                preSibling.cancelHighlightGroup();
                if (this.hasOffset) {//remove delay
                    this.hideOffset();

                    updateSpec = true;
                    actionInfo.aniId = this.aniId;
                    actionInfo.groupRef = this.groupRef;
                    if (correctTimingRef) {
                        actionType = action.REMOVE_DELAY_BETWEEN_GROUP;
                    } else {
                        actionType = action.REMOVE_DELAY_UPDATE_TIMING_REF_GROUP;
                        actionInfo.ref = updateTimingRef;
                    }
                } else {
                    if (typeof this.offsetIllus !== 'undefined' && this.container.contains(this.offsetIllus)) {
                        this.container.removeChild(this.offsetIllus);
                    }
                    if (correctTimingRef) {
                        updateSpec = false
                        actionInfo = {};
                    } else {
                        updateSpec = true;
                        actionType = action.UPDATE_TIMEING_REF_BETWEEN_GROUP;
                        actionInfo.aniId = this.aniId;
                        actionInfo.groupRef = this.groupRef;
                        actionInfo.ref = updateTimingRef;
                    }
                }
            }
        }

        return [updateSpec, actionType, actionInfo];
    }

    public fetchAlignWithGroup(): KfGroup {
        let alignWithGroup: KfGroup;
        KfGroup.allAniGroups.forEach((aniGroup: KfGroup, aniId: string) => {
            if (aniGroup.alignId === this.alignTarget) {
                alignWithGroup = aniGroup;
            }
            // if (Tool.arrayContained(aniGroup.alignLines, this.alignLines)) {
            //     alignWithGroup = aniGroup;
            // }
        })
        return alignWithGroup;
    }

    public fetchAllKfs(): KfItem[] {
        const allKfs: KfItem[] = [];
        this.children.forEach((c: KfItem | KfOmit) => {
            if (c instanceof KfItem) {
                allKfs.push(c);
            }
        })
        return allKfs;
    }

    public fetchFirstKf(): KfItem {
        if (this.children[0] instanceof KfItem) {
            return this.children[0];
        } else {
            return (<KfGroup>this.children[0]).fetchFirstKf();
        }
    }
    public fetchAniGroup(): KfGroup {
        if (this.parentObj instanceof KfTrack) {
            return this;
        } else {
            return this.parentObj.fetchAniGroup();
        }
    }

    public hideOffset() {
        this.offsetIllus.setAttributeNS(null, 'opacity', '0');
    }

    public showOffset() {
        this.offsetIllus.setAttributeNS(null, 'opacity', '1');
    }

    public highlightGroup() {
        this.groupBg.classList.add('highlight-kf');
    }

    public cancelHighlightGroup() {
        this.groupBg.classList.remove('highlight-kf');
    }

    public showGroupBg() {
        this.groupBg.setAttributeNS(null, 'stroke', '#898989');
        if (this.groupBg.getAttributeNS(null, 'fill') === 'none') {
            this.groupBg.setAttributeNS(null, 'fill', this.groupBg.getAttributeNS(null, '_fill'));
        }
        this.groupBg.setAttributeNS(null, 'fill-opacity', '0.4');
    }

    public hideGroupBg() {
        this.groupBg.setAttributeNS(null, 'stroke', '#00000000');
        this.groupBg.setAttributeNS(null, '_fill', this.groupBg.getAttributeNS(null, 'fill'));
        this.groupBg.setAttributeNS(null, 'fill', 'none');
        this.groupBg.setAttributeNS(null, 'fill-opacity', undefined);
    }

    public rerenderGroupBg() {
        this.groupBg.setAttributeNS(null, 'fill-opacity', '1');
    }

    /**
     * when this group translates, translate the aligned elements: refLine, kfs and their group
     * @param transX 
     */
    public translateWholeGroup(transX: number, currentOneIncluded: boolean = false) {
        if (currentOneIncluded) {
            const oriTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
            this.translateContainer(oriTrans.x + transX, oriTrans.y);
        }
        //find all group ids in current group
        let allGroupIds: number[] = [];
        this.findAllGroups(allGroupIds);

        //according to reflines in this group, find all related kfs, then find their groups, then translate those groups
        const allAlignedKfs: Set<number> = new Set();
        this.alignLines.forEach((lId: number) => {
            const refLine: IntelliRefLine = IntelliRefLine.allLines.get(lId);
            //translate the line
            Tool.updateTranslate(refLine.line, { x: transX, y: 0 });
            IntelliRefLine.kfLineMapping.forEach((value: { theOtherEnd: number, lineId: number }, kfId: number) => {
                if (value.lineId === lId) {
                    allAlignedKfs.add(kfId);
                    allAlignedKfs.add(value.theOtherEnd);
                }
            })
        })

        //find their kfgroups
        let targetTransGroupIds: number[] = [];
        [...allAlignedKfs].forEach((kfId: number) => {
            const tmpGroup: KfGroup = KfItem.allKfItems.get(kfId).parentObj;
            const tmpGroupId: number = tmpGroup.id;
            if (!allGroupIds.includes(tmpGroupId) && !targetTransGroupIds.includes(tmpGroupId)) {
                targetTransGroupIds.push(tmpGroupId);
                // targetTransGroups.push(tmpGroup);
                Tool.updateTranslate(tmpGroup.container, { x: transX, y: 0 });
            }
        })
    }

    public findAllGroups(idArr: number[]): void {
        idArr.push(this.id);
        this.children.forEach((c: any) => {
            if (c instanceof KfGroup) {
                c.findAllGroups(idArr);
            }
        })
    }

    public findLastKf(): KfItem {
        let lastKf: KfItem;
        if (this.children[0] instanceof KfItem) {
            this.children.forEach((c: KfItem | KfOmit) => {
                if (c instanceof KfItem) {
                    lastKf = c;
                }
            })
        }
        return lastKf;
    }

    /**
     * set the translate value of the group container, translate the use tag of the omit if there is one
     * @param x 
     * @param y 
     */
    public translateContainer(x: number, y: number) {
        this.container.setAttributeNS(null, 'transform', `translate(${x} ${y})`);
        this.kfOmits.forEach((omit: KfOmit) => {
            if (typeof omit.useTag !== 'undefined') {
                omit.updateUseTagPosi();
            }
        })
    }

    /**
     * translate from a given kf in group, update size of this group, and size and position of siblings and parents
     * @param startTransItem 
     * @param transX 
     * @param updateAlignedKfs 
     */
    public translateGroup(startTransItem: KfItem | KfOmit, transX: number, updateAlignedKfs: boolean, updateStartItem: boolean, updateStartItemAligned: boolean, extraInfo: { lastItem: boolean, extraWidth: number } = { lastItem: false, extraWidth: 0 }): void {
        // console.log('translating group: ', this.container, this.children, startTransItem.container, transX, extraInfo);
        //translate kfitems after the input one within the same group
        let currentTransX: number = 0;
        const currentIdxInGroup: number = startTransItem.idxInGroup;
        if (!extraInfo.lastItem) {
            currentTransX = Tool.extractTransNums(startTransItem.container.getAttributeNS(null, 'transform')).x;
        } else {
            currentTransX = Tool.extractTransNums(startTransItem.container.getAttributeNS(null, 'transform')).x + (startTransItem.container.getBoundingClientRect().width / state.zoomLevel);//fixed
        }
        let count: number = 0;
        let comingThroughOmit: boolean = false;
        let cameThroughOmit: KfOmit;
        this.children.forEach((k: KfItem | KfOmit) => {
            // console.log('testing translate : ', k.container, k);
            if (k.rendered) {
                const tmpTrans: ICoord = Tool.extractTransNums(k.container.getAttributeNS(null, 'transform'));
                const tmpIdxInGroup: number = k.idxInGroup;
                if (updateStartItem) {//need to update startitem and its aligned elements too
                    if ((tmpTrans.x >= currentTransX || tmpIdxInGroup >= currentIdxInGroup) && !(count === 0 && k instanceof KfOmit)) {
                        k.translateContainer(tmpTrans.x + transX, tmpTrans.y);
                        if (k instanceof KfItem) {
                            k.transOmitsWithItem();
                        }
                        if (k instanceof KfItem && updateAlignedKfs) {
                            k.translateAlignedGroups(transX, updateAlignedKfs);
                        }
                        count++;
                    }
                } else {//dont update startitem
                    if (updateStartItemAligned) {//update its aligned elements
                        if ((tmpTrans.x >= currentTransX || tmpIdxInGroup >= currentIdxInGroup) && !(count === 0 && k instanceof KfOmit)) {
                            if (k.id !== startTransItem.id) {
                                k.translateContainer(tmpTrans.x + transX, tmpTrans.y);
                                if (k instanceof KfItem) {
                                    k.transOmitsWithItem();
                                }
                            }
                            if (k instanceof KfItem && updateAlignedKfs) {
                                k.translateAlignedGroups(transX, updateAlignedKfs);
                            }
                            count++;
                        }
                    } else {
                        if (k.id !== startTransItem.id && (tmpTrans.x >= currentTransX || tmpIdxInGroup >= currentIdxInGroup)) {
                            // console.log('translating kf: ', k.container, tmpTrans.x + transX, transX, tmpTrans.x);
                            k.translateContainer(tmpTrans.x + transX, tmpTrans.y);
                            if (k instanceof KfItem) {
                                k.transOmitsWithItem();
                                if (updateAlignedKfs) {
                                    k.translateAlignedGroups(transX, updateAlignedKfs);
                                }
                            }
                            count++;
                        }
                    }
                }
            }

            if (updateStartItem) {
                if (k instanceof KfOmit) {
                    comingThroughOmit = true;
                    cameThroughOmit = k;
                    transX += k.oWidth + KfGroup.PADDING;
                } else if (k instanceof KfItem && comingThroughOmit) {
                    comingThroughOmit = false;
                    const omitWidth: number = typeof cameThroughOmit === 'undefined' ? KfOmit.OMIT_WIDTH : cameThroughOmit.oWidth;
                    transX -= (omitWidth + KfGroup.PADDING);
                }
            }

        })
        // }
        //update the group size and position
        let extraWidth: number = extraInfo.lastItem ? extraInfo.extraWidth : 0;
        let [diffX, currentGroupWidth, childHeight] = this.updateSize(extraWidth);
        const oriTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
        this.translateContainer(oriTrans.x + diffX, oriTrans.y);

        //update parent group and siblings
        this.updateSiblingAndParentSizePosi(transX, updateAlignedKfs);
    }

    public updateSiblingAndParentSizePosi(transX: number, updateAlignedKfs: boolean) {
        const currentGroupBBox: DOMRect = this.container.getBoundingClientRect();//fixed
        this.parentObj.children.forEach((c: KfGroup | KfOmit) => {
            if (c.rendered) {
                const tmpGroupBBox: DOMRect = c.container.getBoundingClientRect();//fixed
                if (tmpGroupBBox.left >= currentGroupBBox.left && c.id !== this.id) {
                    if (c instanceof KfOmit || (c instanceof KfGroup && c.rendered)) {
                        const tmpTrans: ICoord = Tool.extractTransNums(c.container.getAttributeNS(null, 'transform'));
                        // console.log('trans child in sibling: ', c.container, tmpTrans.x + transX, transX);
                        c.translateContainer(tmpTrans.x + transX, tmpTrans.y);

                        if (c instanceof KfGroup) {
                            //translate plus btn is there is one
                            // console.log('translating sibling: ', c, c.plusBtn, typeof c.plusBtn);
                            if (typeof c.plusBtn !== 'undefined') {
                                c.plusBtn.translateBtn(transX);
                            }
                            if (c.children[0] instanceof KfItem && updateAlignedKfs) {//need to update the aligned kfs and their group
                                c.children.forEach((cc: KfItem | KfOmit) => {
                                    if (cc instanceof KfItem) {
                                        const tmpAlignTargetLeft: number = cc.kfBg.getBoundingClientRect().left;//fixed
                                        const tmpAlignTargetRight: number = cc.container.getBoundingClientRect().right;//fixed
                                        if (typeof KfItem.allKfInfo.get(cc.id).alignWithKfs !== 'undefined') {
                                            KfItem.allKfInfo.get(cc.id).alignWithKfs.forEach((kfId: number) => {
                                                const tmpKfItem: KfItem = KfItem.allKfItems.get(kfId);
                                                const tmpKfItemInfo: IKeyframe = KfItem.allKfInfo.get(kfId);
                                                if (typeof tmpKfItem !== 'undefined') {
                                                    const tmpKfItemBBox: DOMRect = tmpKfItem.container.getBoundingClientRect();//fixed
                                                    if (tmpKfItemInfo.timingRef === TimingSpec.timingRef.previousEnd) {
                                                        if (tmpKfItemBBox.left !== tmpAlignTargetRight) {//this kf together with its group need to be updated
                                                            tmpKfItem.parentObj.translateGroup(tmpKfItem, (tmpAlignTargetRight - tmpKfItemBBox.left) / state.zoomLevel, false, true, true);
                                                        }
                                                    } else {
                                                        if (tmpKfItemBBox.left !== tmpAlignTargetLeft) {//this kf together with its group need to be updated
                                                            tmpKfItem.parentObj.translateGroup(tmpKfItem, (tmpAlignTargetLeft - tmpKfItemBBox.left) / state.zoomLevel, false, true, true);
                                                        }
                                                    }
                                                }
                                            })
                                            IntelliRefLine.updateLine(cc.id);//cc is a alignwith kf, update refline
                                        }
                                    }
                                })
                            }
                        }
                    }
                }
            }
        })
        //update size and position of parent
        if (this.parentObj instanceof KfGroup) {
            this.parentObj.updateSize();
            this.parentObj.updateSiblingAndParentSizePosi(transX, updateAlignedKfs);
        }
    }

    /**
     * for merged aligned groups
     * @param extraWidth : width in visual pixel level
     */
    public extendSize(extraWidth: number): void {
        this.groupBg.setAttributeNS(null, 'width', `${parseFloat(this.groupBg.getAttributeNS(null, 'width')) + (extraWidth / state.zoomLevel)}`);
        //update available insert and groups in the tracks which current group prossesses
        if (this.parentObj instanceof KfTrack) {
            this.updateParentTrackInsert();
        }
    }

    public updateSize(extraWidth: number = 0): [number, number, number] {
        // console.log('updating size: ', this.container, extraWidth);
        //get size of all children (kfgroup or kfitem)
        let maxBoundry: {
            top: number
            right: number
            bottom: number
            left: number
        } = { top: 100000, right: 0, bottom: 0, left: 100000 }
        //the first child within group should have the translate as KfGroup.PADDING
        let diffX: number = 0;
        if (this.children[0] instanceof KfItem) {
            const currentTransX: number = Tool.extractTransNums(this.children[0].container.getAttributeNS(null, 'transform')).x;
            diffX = this.hasOffset ? currentTransX - KfGroup.PADDING - this.offsetWidth : currentTransX - KfGroup.PADDING;
        }
        let childHasHiddenDuration: boolean = false;
        // let tmpRightBoundary: number = 0;
        this.children.forEach((c: KfGroup | KfItem | KfOmit, idx: number) => {
            if (typeof c.container !== 'undefined') {
                if (c instanceof KfItem || c instanceof KfOmit) {
                    if (c instanceof KfItem && c.hasHiddenDuration) {
                        childHasHiddenDuration = true;
                    }
                    const currentTrans: ICoord = Tool.extractTransNums(c.container.getAttributeNS(null, 'transform'));
                    // console.log('trasnlateing in update size: ', c.container, currentTrans.x, diffX, currentTrans.x - diffX);
                    console.log('t5');
                    // if(c instanceof KfOmit){
                    //     diffX -= KfGroup.PADDING;
                    // }
                    c.translateContainer(currentTrans.x - diffX, currentTrans.y);
                    if (c instanceof KfItem) {
                        c.transOmitsWithItem();
                    }
                }
                let countingBBox: boolean = true;//check whether this child is counted for calculating bbox
                let kfsAlignToCurrentKf: KfItem[] = [];
                if (c instanceof KfItem) {
                    countingBBox = c.renderWhenZooming;
                    if (typeof KfItem.allKfInfo.get(c.id) !== 'undefined') {
                        if (typeof KfItem.allKfInfo.get(c.id).alignWithKfs !== 'undefined' && idx === this.children.length - 1) {
                            KfItem.allKfInfo.get(c.id).alignWithKfs.forEach((kfId: number) => {
                                const kfAligned: KfItem = KfItem.allKfItems.get(kfId);
                                if (typeof kfId !== 'undefined' && typeof kfAligned !== 'undefined') {
                                    if (kfAligned.parentObj.alignMerge) {
                                        kfsAlignToCurrentKf.push(kfAligned);
                                    }
                                }
                            })
                        }
                    }
                }
                if (countingBBox) {
                    const tmpBBox: DOMRect = c instanceof KfGroup ? c.groupBg.getBoundingClientRect() : c.container.getBoundingClientRect();//fixed
                    if (tmpBBox.top < maxBoundry.top && !(c instanceof KfOmit)) {
                        maxBoundry.top = tmpBBox.top;
                    }
                    if (tmpBBox.right > maxBoundry.right) {
                        maxBoundry.right = tmpBBox.right;
                        // tmpRightBoundary = tmpBBox.right;
                        if (idx === this.children.length - 1) {
                            kfsAlignToCurrentKf.forEach((kfAligned: KfItem) => {
                                maxBoundry.right += kfAligned.container.getBoundingClientRect().width;
                            })
                        }
                    }
                    if (tmpBBox.bottom > maxBoundry.bottom && !(c instanceof KfOmit)) {
                        maxBoundry.bottom = tmpBBox.bottom;
                    }
                    if (tmpBBox.left < maxBoundry.left) {
                        maxBoundry.left = tmpBBox.left;
                    }
                }
            }
        })

        //check for merged alignto kfs

        let currentGroupWidth: number = (maxBoundry.right - maxBoundry.left) / state.zoomLevel + 2 * KfGroup.PADDING + extraWidth;
        let childHeight: number = (maxBoundry.bottom - maxBoundry.top) / state.zoomLevel + 2 * KfGroup.PADDING;
        if (childHasHiddenDuration) {
            childHeight -= KfTimingIllus.EXTRA_HEIGHT;
        }
        if (childHeight < 0) {
            childHeight = 0;
        }
        if (currentGroupWidth < 0) {
            currentGroupWidth = 0;
        }

        //update size
        this.groupBg.setAttributeNS(null, 'height', `${childHeight}`);
        this.groupBg.setAttributeNS(null, 'width', `${currentGroupWidth}`);
        if (this.hasOffset) {
            this.updateOffset(childHeight);
            currentGroupWidth += this.offsetWidth;
        }

        //update available insert and groups in the tracks which current group prossesses
        if (this.parentObj instanceof KfTrack) {
            this.updateParentTrackInsert();
        }

        return [diffX, currentGroupWidth, childHeight];
    }

    public updateParentTrackInsert() {
        if (typeof KfTrack.aniTrackMapping.get(this.aniId) !== 'undefined') {
            [...KfTrack.aniTrackMapping.get(this.aniId)].forEach((kfTrack: KfTrack) => {
                const tmpBBox: DOMRect = this.container.getBoundingClientRect();//fixed
                const rightBoundary: number = tmpBBox.right;
                const kftStart: number = document.getElementById(KfContainer.KF_BG).getBoundingClientRect().left;//fixed
                if ((rightBoundary - kftStart) / state.zoomLevel > kfTrack.availableInsert) {
                    kfTrack.availableInsert = (rightBoundary - kftStart) / state.zoomLevel;
                }
            })
        }
    }

    public updateGroupPosiAndSize(lastGroupStart: number, lastGroupWidth: number, lastGroup: boolean, rootGroup: boolean = false): void {
        if (this.children) {
            if (this.children[0] instanceof KfGroup) {//children are kfgroups
                this.children.forEach((c: KfGroup, i: number) => {
                    if (i === 0 || i === 1 || i === this.children.length - 1) {
                        if (i === 0) {
                            (<KfGroup>this.children[i]).updateGroupPosiAndSize(KfGroup.PADDING + this.offsetWidth, 0, false);
                        } else {
                            if (this.children.length > 3 && i === this.children.length - 1) {
                                (<KfGroup>this.children[i]).updateGroupPosiAndSize((<KfGroup>this.children[1]).posiX, (<KfGroup>this.children[1]).width + this.kfOmits[0].oWidth, true);
                            } else {
                                (<KfGroup>this.children[i]).updateGroupPosiAndSize((<KfGroup>this.children[i - 1]).posiX, (<KfGroup>this.children[i - 1]).width, false);
                            }
                        }
                    } else if (this.children.length > 3 && i === this.children.length - 2) {
                        this.kfOmits.forEach((kfO: KfOmit) => {
                            kfO.updateThumbnail(this.kfHasOffset, this.kfHasDuration);
                            // kfO.updateNum(this.kfNum - 3);
                            kfO.updateTrans((<KfGroup>this.children[1]).posiX + (<KfGroup>this.children[1]).width, KfGroup.PADDING + (<KfGroup>this.children[1]).posiY + (this.children[1].container.getBoundingClientRect().height / state.zoomLevel / 2));//fixed
                        })
                    }
                    if (c instanceof KfGroup) {
                        this.alignLines = [...this.alignLines, ...c.alignLines];
                    }
                })
            }

            //update size
            const oriW: number = this.width;
            let [diffX, currentGroupWidth, gHeight] = this.updateSize();


            //update position of menu if there is one
            if (typeof this.groupMenu !== 'undefined') {
                this.groupMenu.updatePosition(this.offsetWidth, gHeight);
            }

            //update position
            const transPosiY = rootGroup ? this.posiY + 1 : this.posiY + KfGroup.PADDING;
            if (this.newTrack) {
                this.translateContainer(lastGroupStart + diffX, transPosiY);
                this.posiX = lastGroupStart + this.offsetWidth;
                this.width = currentGroupWidth > lastGroupWidth ? currentGroupWidth : lastGroupWidth;
            } else {
                this.translateContainer(lastGroupStart + lastGroupWidth + diffX, transPosiY);
                this.posiX = lastGroupStart + lastGroupWidth;
                this.width = currentGroupWidth;
            }

            //check whther need to update the available insert of kftrack
            if (this.parentObj instanceof KfTrack && typeof this.alignTarget !== 'undefined' && !this.alignMerge) {
                this.updateParentTrackInsert();
            }

            //update background color
            const grayColor: number = KfGroup.BASIC_GRAY - KfGroup.GRAY_STEP * (KfGroup.leafLevel - this.treeLevel);
            if (typeof this.groupTitleCover !== 'undefined') {
                this.groupTitleCover.setAttributeNS(null, 'fill', `rgb(${grayColor}, ${grayColor}, ${grayColor})`);
            }
            if (this.alignMerge) {
                this.groupBg.setAttributeNS(null, 'fill', 'none');
                this.groupBg.setAttributeNS(null, '_fill', `rgb(${grayColor}, ${grayColor}, ${grayColor})`);
                //extend the gorup with of the alignWith group
                const alignWithGroup: KfGroup = this.fetchAlignWithGroup();
                const alignWithGroupBBox: DOMRect = alignWithGroup.container.getBoundingClientRect();
                const currentBBox: DOMRect = this.container.getBoundingClientRect();
                const diffW: number = currentBBox.right - alignWithGroupBBox.right;
                // console.log('extending group size: ', alignWithGroup, this, currentBBox, alignWithGroupBBox, diffW);
                if (diffW > 0) {
                    alignWithGroup.extendSize(diffW);
                }

            } else {
                this.groupBg.setAttributeNS(null, 'fill', `rgb(${grayColor}, ${grayColor}, ${grayColor})`);
            }
        }
    }

    public marksThisAni(): string[] {
        if (this.parentObj instanceof KfGroup) {
            return this.parentObj.marksThisAni();
        } else {
            return this.marks;
        }
    }

    /**
     * check whether the index of omits are correct within group
     */
    public checkChildrenOrder(): boolean {
        let omitRightPosi: boolean = true, omitCount: number = 0;
        for (let i = 0, len = this.children.length; i < len; i++) {
            if (this.children[i] instanceof KfOmit) {
                omitRightPosi = i === (2 + omitCount * 4);
                if (!omitRightPosi) {
                    break;
                }
                omitCount++;
            }
        }
        return omitRightPosi;
    }

    /**
     * if the omits within group are not in the right position, re-insert the omits into the group
     */
    public reorderKfChildren() {
        //delete all omits in the group 
        for (let i = 0, len = this.children.length; i < len;) {
            if (this.children[i] instanceof KfOmit) {
                this.children.splice(i, 1);
            } else {
                i++;
            }
        }
        //re-insert omits 
        this.kfOmits.forEach((omit: KfOmit, idx: number) => {
            this.children.splice(2 + idx * 4, 0, omit);
        })

        //reset idxInGroup
        this.children.forEach((c: KfItem | KfOmit, idx: number) => {
            c.idxInGroup = idx;
        })
    }

    public insertChild(child: KfGroup | KfItem | KfOmit, idx: number): void {
        //update ori idx
        for (let i = idx, len = this.children.length; i < len; i++) {
            this.children[i].idxInGroup++;
        }
        this.children.splice(idx, 0, child);
    }

    public removeChild(idx: number): void {
        //update ori idx
        for (let i = idx + 1, len = this.children.length; i < len; i++) {
            this.children[i].idxInGroup--;
        }
        this.children.splice(idx, 1);
    }

    /**
     * current group align to others 
     */
    public updateAlignGroupKfPosis() {
        this.children.forEach((c: KfItem | KfOmit) => {
            if (c instanceof KfItem) {
                const alignRange: [number, number] = c.calAlignRange();
                const currentBBox: DOMRect = c.container.getBoundingClientRect();
                // const timingRef: string = c.timingType;
                const timingRef: string = KfGroup.allAniGroups.get(c.aniId).timingRef;
                const diffX: number = timingRef === TimingSpec.timingRef.previousEnd ? (alignRange[1] - currentBBox.left) / state.zoomLevel : (alignRange[0] - currentBBox.left) / state.zoomLevel;
                if (diffX !== 0) {
                    const oriTrans: ICoord = Tool.extractTransNums(c.container.getAttributeNS(null, 'transform'));
                    c.translateContainer(oriTrans.x + diffX, oriTrans.y);
                }
            }
        })
        let diffX = this.updateSize()[0];
        const oriTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
        // console.log('going to translating group conatiner: ', this.container, oriTrans.x + diffX, oriTrans.x, diffX);

        this.translateContainer(oriTrans.x + diffX, oriTrans.y);
    }

    /**
     * 
     * @param kzl : levels deeper than kzl will be simplified
     */
    public zoomGroup(kzl: number, showThumbnail: number) {
        if (this.children.length > 0) {
            if (this.children[0] instanceof KfGroup) {
                let kfGroupCount: number = 0;
                this.children.forEach((c: KfGroup | KfOmit, idx: number) => {
                    if (c instanceof KfGroup && c.rendered) {
                        // console.log('current group: ', c.container, )
                        if (c.treeLevel > kzl) {//hide kfs whose level is deeper than level of this group
                            if (kfGroupCount === 1 && idx !== this.children.length - 1) {
                                c.renderWhenZooming = false;
                            } else {
                                c.zoomGroup(kzl, showThumbnail);
                            }
                        } else {
                            if (!c.renderWhenZooming) {
                                c.renderWhenZooming = true;
                            }
                            c.zoomGroup(kzl, showThumbnail);
                        }
                        kfGroupCount++;
                    }
                })
            } else {//children are kfitems
                let leafLevel: number = this.treeLevel + 1;
                //check whther the position of the kfomits are correct 
                const omitRightPosi: boolean = this.checkChildrenOrder();
                if (!omitRightPosi) {
                    this.reorderKfChildren();
                }

                const kfItemsInChildren: number[] = [];
                this.children.forEach((c: KfItem | KfOmit, idx: number) => {
                    if (c instanceof KfItem) {
                        kfItemsInChildren.push(c.id);
                    }
                })
                kfItemsInChildren.forEach((cId: number, idx: number) => {
                    const tmpKf: KfItem = KfItem.allKfItems.get(cId);
                    //whether this kf is aligned to other kfs
                    const alignToOthers: boolean = (typeof KfGroup.allAniGroups.get(tmpKf.aniId).alignTarget !== 'undefined' && KfGroup.allAniGroups.get(tmpKf.aniId).alignType === Animation.alignTarget.withEle);
                    let hidingThisKf = false;
                    if (alignToOthers) {
                        const alignTargetKf: KfItem = KfItem.allKfItems.get(KfItem.allKfInfo.get(cId).alignTo);
                        hidingThisKf = !alignTargetKf.renderWhenZooming || !alignTargetKf.checkParentRenderedWhenZooming();
                        leafLevel = KfItem.allKfItems.get(KfItem.allKfInfo.get(cId).alignTo).parentObj.treeLevel + 1;
                    } else {
                        hidingThisKf = ((idx === 1 || idx === 2) && idx !== kfItemsInChildren.length - 1);
                    }
                    // console.log('test hiding kf: ', tmpKf.container, hidingThisKf);

                    if (leafLevel > kzl) {//hide kfs whose level is deeper than leafLevel
                        if (hidingThisKf) {
                            tmpKf.renderWhenZooming = false;
                        } else {
                            tmpKf.renderWhenZooming = true;
                        }
                    } else {
                        if (!tmpKf.renderWhenZooming) {
                            tmpKf.renderWhenZooming = true;
                        }
                    }

                    //show the corresponding thumbnail of this level
                    if (tmpKf.rendered && tmpKf.renderWhenZooming) {
                        tmpKf.zoomItem(showThumbnail);
                    }
                })

                //update kfomit position, cause there might be newly added omits, so need to go through the children again 
                let preVisibleKfs: KfItem[] = [], visKfRecorder: KfItem;
                let numVisKfAfterLastOmit: number = 0;
                this.children.forEach((c: KfItem | KfOmit, idx: number) => {
                    // omitIsLast = (idx === this.children.length - 1 && c instanceof KfOmit);
                    if (c instanceof KfOmit) {
                        numVisKfAfterLastOmit = 0;
                        preVisibleKfs.push(visKfRecorder);
                    } else if (c instanceof KfItem && c.rendered && c.renderWhenZooming) {
                        visKfRecorder = c;
                        numVisKfAfterLastOmit++;
                        // c.checkMalposition();
                    }
                })

                if (this.kfOmits.length > 0) {
                    let diffX: number = 0;
                    if (numVisKfAfterLastOmit === 0) {//omit becomes the last child
                        this.kfOmits.forEach((omit: KfOmit, idx: number) => {
                            omit.correctTrans(preVisibleKfs[idx]);
                        })
                        //calculate the distance difference between omits of this group and the group it aligns to
                        // console.log(this, KfGroup.allAniGroupInfo.get(this.aniId), KfGroup.allAniGroups);
                        // const alignWithGroup: KfGroup = this.fetchAlignWithGroup();
                        // console.log('group this group aligned to : ', this.container, alignWithGroup.container);
                        // const currentGroupOmitPosiX: number = this.kfOmits[this.kfOmits.length - 1].container.getBoundingClientRect().right;
                        // const lastSubBranchInAlignWith: KfGroup = alignWithGroup.fetchLastSubBranch();
                        // const alignWithGroupOmitPosiX: number = lastSubBranchInAlignWith.kfOmits[lastSubBranchInAlignWith.kfOmits.length - 1].container.getBoundingClientRect().right;
                        // this.updateSize((alignWithGroupOmitPosiX - currentGroupOmitPosiX) / state.zoomLevel);
                        diffX = this.updateSize(KfOmit.maxOmitWidth - this.kfOmits[0].oWidth)[0];
                    } else {
                        diffX = this.updateSize()[0];
                    }

                    // let [diffX, currentGroupWidth, childHeight] = this.updateSize(extraWidth);
                    const oriTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
                    // console.log('translating in zoom group: ', this.container, diffX, oriTrans.x + diffX);
                    this.translateContainer(oriTrans.x + diffX, oriTrans.y);

                }
            }
        }
    }

    public fetchLastSubBranch(): KfGroup {
        if (this.children.length > 0) {
            if (this.children[this.children.length - 1] instanceof KfGroup) {
                return (<KfGroup>this.children[this.children.length - 1]).fetchLastSubBranch();
            } else {
                return this;
            }
        }
    }

    public fetchLowestSubBranch(lowestLevelBranch: KfGroup[]): void {
        if (this.children.length > 0) {
            if (this.children[0] instanceof KfGroup) {
                this.children.forEach((c: KfGroup | KfOmit) => {
                    if (c instanceof KfGroup) {
                        c.fetchLowestSubBranch(lowestLevelBranch);
                    }
                })
            } else {
                lowestLevelBranch.push(this);
            }
        }
    }

    public showGroupWhenZooming() {
        if (this.rendered) {
            const groupWidth: number = parseFloat(this.groupBg.getAttributeNS(null, 'width'));
            if (!this.renderWhenZooming) {//rendered -> not rendered
                if ((<KfGroup>this.parentObj).kfOmits.length === 0) {
                    const groupTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
                    const kfOmit: KfOmit = new KfOmit();
                    kfOmit.createOmit(KfOmit.KF_GROUP_OMIT, groupTrans.x + groupWidth, 1, <KfGroup>this.parentObj, false, false, parseFloat(this.groupBg.getAttributeNS(null, 'height')) / 2, this.idxInGroup);
                    (<KfGroup>this.parentObj).insertChild(kfOmit, this.idxInGroup + 1);
                    kfOmit.idxInGroup = this.idxInGroup + 1;
                    (<KfGroup>this.parentObj).kfOmits.push(kfOmit);
                    this.translateGroup(kfOmit, -groupWidth + kfOmit.oWidth, false, false, false);
                    //update the position of omits
                    const oriOmitTrans: ICoord = Tool.extractTransNums(kfOmit.container.getAttributeNS(null, 'transform'));
                    kfOmit.updateTrans(oriOmitTrans.x - kfOmit.oWidth - KfGroup.PADDING, oriOmitTrans.y + kfOmit.oHeight / 2);
                } else {
                    (<KfGroup>this.parentObj).kfOmits[0].updateNum((<KfGroup>this.parentObj).kfOmits[0].omittedNum + 1);

                    this.translateGroup((<KfGroup>this.parentObj).kfOmits[0], -groupWidth, true, false, false);
                }
                this.container.setAttributeNS(null, 'display', 'none');
                this.kfOmits.forEach((omit: KfOmit) => {
                    omit.container.setAttributeNS(null, 'display', 'none');
                })
            } else {//not rendered -> rendered
                this.container.setAttributeNS(null, 'display', '');
                this.kfOmits.forEach((omit: KfOmit) => {
                    omit.container.setAttributeNS(null, 'display', '');
                })
                if ((<KfGroup>this.parentObj).kfOmits[0].omittedNum === 1) {//remove kfOmit
                    // console.log('removing group omit: ', this.container, groupWidth - (<KfGroup>this.parentObj).kfOmits[0].oWidth, groupWidth, (<KfGroup>this.parentObj).kfOmits[0].oWidth)
                    const tmpOmit: KfOmit = (<KfGroup>this.parentObj).kfOmits[0];
                    // this.translateGroup(tmpOmit, groupWidth - (<KfGroup>this.parentObj).kfOmits[0].oWidth, false, false, false);//this doesn't work on mushroom example 
                    this.translateGroup(tmpOmit, groupWidth - KfGroup.PADDING, false, false, false);
                    tmpOmit.removeOmit(this.parentObj);
                    (<KfGroup>this.parentObj).removeChild((<KfGroup>this.parentObj).kfOmits[0].idxInGroup);//test if it is +1
                    (<KfGroup>this.parentObj).kfOmits.splice(0, 1);
                } else {//update number
                    (<KfGroup>this.parentObj).kfOmits[0].updateNum((<KfGroup>this.parentObj).kfOmits[0].omittedNum - 1);
                    //restore the omit position to the right side of its preItem
                    this.translateGroup((<KfGroup>this.parentObj).kfOmits[0], groupWidth, false, false, false);
                    // console.log('pre item is: ', (<KfGroup>this.parentObj).kfOmits[0].container, (<KfGroup>this.parentObj).kfOmits[0].preItem);
                    const preItemTrans: ICoord = Tool.extractTransNums((<KfGroup>this.parentObj).kfOmits[0].preItem.container.getAttributeNS(null, 'transform'));
                    const oriOmitTrans: ICoord = Tool.extractTransNums((<KfGroup>this.parentObj).kfOmits[0].container.getAttributeNS(null, 'transform'));
                    const preKfWidth: number = (<KfGroup>(<KfGroup>this.parentObj).kfOmits[0].preItem).container.getBoundingClientRect().width / state.zoomLevel;
                    (<KfGroup>this.parentObj).kfOmits[0].updateTrans(preItemTrans.x + preKfWidth, oriOmitTrans.y + (<KfGroup>this.parentObj).kfOmits[0].oHeight / 2);
                }
            }
        }
    }


}

export class GroupMenu {
    static BTN_SIZE: number = 16;
    static PADDING: number = 4;
    static PADDING_LEFT: number = 6;
    static MENU_RX: number = 8;
    static MENU_BG_COLOR: string = '#676767';
    static MENU_ICON_COLOR: string = '#a3a3a3';
    static MENU_ITEM_ICON_COLOR: string = '#a3a3a3';
    static MENU_ICON_HIGHLIGHT_COLOR: string = '#ededed';
    static MENU_LIST_WIDTH: number = 120;
    static EASING_MENU_LIST_WIDTH: number = 156;
    static MENU_LIST_ITEM_HEIGHT: number = 20;
    static EFFECT_FADE: string = 'fade';
    static EFFECT_WIPE_LEFT: string = 'wipe left';
    static EFFECT_WIPE_RIGHT: string = 'wipe right';
    static EFFECT_WIPE_TOP: string = 'wipe top';
    static EFFECT_WIPE_BOTTOM: string = 'wipe bottom';
    static EFFECT_WHEEL: string = 'wheel';
    static EFFECT_CIRCLE: string = 'circle';
    static EFFECT_GROW: string = 'grow';
    static EFFECT_TRANSITION: string = 'custom';
    static EASING_LINEAR: string = 'easeLinear';
    static EASING_IN_QUAD: string = 'easeInQuad';
    static EASING_OUT_QUAD: string = 'easeOutQuad';
    static EASING_INOUT_QUAD: string = 'easeInOutQuad';
    static EASING_IN_CUBIC: string = 'easeInCubic';
    static EASING_OUT_CUBIC: string = 'easeOutCubic';
    static EASING_INOUT_CUBIC: string = 'easeInOutCubic';
    static DURATION: string = 'duration';
    static EFFECTS: string[] = [GroupMenu.EFFECT_FADE, GroupMenu.EFFECT_CIRCLE, GroupMenu.EFFECT_GROW, GroupMenu.EFFECT_WHEEL, GroupMenu.EFFECT_WIPE_LEFT, GroupMenu.EFFECT_WIPE_RIGHT, GroupMenu.EFFECT_WIPE_TOP, GroupMenu.EFFECT_WIPE_BOTTOM];
    static EASINGS: string[] = [GroupMenu.EASING_LINEAR, GroupMenu.EASING_IN_CUBIC, GroupMenu.EASING_OUT_CUBIC, GroupMenu.EASING_INOUT_CUBIC, GroupMenu.EASING_IN_QUAD, GroupMenu.EASING_OUT_QUAD, GroupMenu.EASING_INOUT_QUAD];

    public action: any;
    public groupId: number;
    public aniId: string;
    public container: SVGGElement;
    public menuListContainer: SVGGElement;
    // public mask: SVGRectElement;

    constructor(action: any, groupId: number, aniId: string) {
        this.action = action;
        this.groupId = groupId;
        this.aniId = aniId;
    }

    public createAndRenderMenu(): SVGGElement {
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.classList.add('ease-fade');
        this.container.setAttributeNS(null, 'opacity', '0');
        const menuBg: SVGPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        menuBg.setAttributeNS(null, 'fill', GroupMenu.MENU_BG_COLOR);
        menuBg.setAttributeNS(null, 'd', `M0,0 H${GroupMenu.BTN_SIZE + GroupMenu.PADDING_LEFT + GroupMenu.PADDING - GroupMenu.MENU_RX} A${GroupMenu.MENU_RX} ${GroupMenu.MENU_RX} ${Math.PI / 2} 0 1 ${GroupMenu.BTN_SIZE + GroupMenu.PADDING_LEFT + GroupMenu.PADDING},${GroupMenu.MENU_RX} V${2 * GroupMenu.BTN_SIZE + 4 * GroupMenu.PADDING - GroupMenu.MENU_RX} A${GroupMenu.MENU_RX} ${GroupMenu.MENU_RX} ${Math.PI / 2} 0 1 ${GroupMenu.BTN_SIZE + GroupMenu.PADDING_LEFT + GroupMenu.PADDING - GroupMenu.MENU_RX},${2 * GroupMenu.BTN_SIZE + 4 * GroupMenu.PADDING} H0 Z`)
        // menuBg.setAttributeNS(null, 'd', `M0,0 H${GroupMenu.BTN_SIZE + GroupMenu.PADDING_LEFT + GroupMenu.PADDING - GroupMenu.MENU_RX} A${GroupMenu.MENU_RX} ${GroupMenu.MENU_RX} ${Math.PI / 2} 0 1 ${GroupMenu.BTN_SIZE + GroupMenu.PADDING_LEFT + GroupMenu.PADDING},${GroupMenu.MENU_RX} V${3 * GroupMenu.BTN_SIZE + 6 * GroupMenu.PADDING - GroupMenu.MENU_RX} A${GroupMenu.MENU_RX} ${GroupMenu.MENU_RX} ${Math.PI / 2} 0 1 ${GroupMenu.BTN_SIZE + GroupMenu.PADDING_LEFT + GroupMenu.PADDING - GroupMenu.MENU_RX},${3 * GroupMenu.BTN_SIZE + 6 * GroupMenu.PADDING} H0 Z`)
        this.container.appendChild(menuBg);

        if (typeof this.action !== 'undefined') {
            const effectTypeBtn: SVGGElement = this.createBtn(this.action.oriActionType);
            effectTypeBtn.setAttributeNS(null, 'transform', `translate(${GroupMenu.PADDING_LEFT}, ${GroupMenu.PADDING})`);
            this.container.appendChild(effectTypeBtn);
            this.container.appendChild(this.createSplit(1));
            const easingBtn: SVGGElement = this.createBtn(this.action.easing);
            easingBtn.setAttributeNS(null, 'transform', `translate(${GroupMenu.PADDING_LEFT}, ${3 * GroupMenu.PADDING + GroupMenu.BTN_SIZE})`);
            this.container.appendChild(easingBtn);
        }
        // this.container.appendChild(this.createSplit(2));
        // const durationBtn: SVGGElement = this.createBtn(GroupMenu.DURATION, this.action.duration);
        // durationBtn.setAttributeNS(null, 'transform', `translate(${GroupMenu.PADDING_LEFT}, ${5 * GroupMenu.PADDING + 2 * GroupMenu.BTN_SIZE})`);
        // this.container.appendChild(durationBtn);

        this.showMenu();
        return this.container;
    }

    public showMenu() {
        if (typeof this.container !== 'undefined') {
            this.container.setAttributeNS(null, 'opacity', '1');
        }
    }

    public hideMenu() {
        // if (typeof this.container !== 'undefined') {
        //     this.container.setAttributeNS(null, 'opacity', '0');
        // }
    }

    public updatePosition(parentOffset: number, parentHeight: number) {
        this.container.setAttributeNS(null, 'transform', `translate(${parentOffset}, ${parentHeight / 2 - (2 * GroupMenu.BTN_SIZE + 4 * GroupMenu.PADDING) / 2})`);
    }

    public createBtn(btnType: string, duration?: number): SVGGElement {
        const btnContainer: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        btnContainer.classList.add('menu-btn');
        const btnBg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        btnBg.setAttributeNS(null, 'width', `${GroupMenu.BTN_SIZE}`);
        btnBg.setAttributeNS(null, 'height', `${GroupMenu.BTN_SIZE}`);
        btnBg.setAttributeNS(null, 'fill', GroupMenu.MENU_BG_COLOR);
        btnContainer.appendChild(btnBg);
        const icon: SVGPathElement = this.createBtnIcon(btnType);
        btnContainer.appendChild(icon);
        btnContainer.onmouseenter = () => {
            if (!state.mousemoving) {
                icon.setAttributeNS(null, 'fill', GroupMenu.MENU_ICON_HIGHLIGHT_COLOR);
            }
        }
        btnContainer.onmouseleave = (leaveEvt: any) => {
            icon.setAttributeNS(null, 'fill', GroupMenu.MENU_ICON_COLOR);
            if (typeof this.menuListContainer !== 'undefined') {
                if (!this.menuListContainer.contains(leaveEvt.toElement)) {
                    document.getElementById(KfContainer.KF_MENU).innerHTML = '';
                }
            }
        }
        btnContainer.onclick = () => {
            const btnContainerBBox: DOMRect = btnContainer.getBoundingClientRect();//fixed
            this.createMenuList({ x: btnContainerBBox.left + btnContainerBBox.width, y: btnContainerBBox.top + btnContainerBBox.height / 2 }, btnType);
        }
        return btnContainer;
    }

    public createBtnIcon(btnType: string): SVGPathElement {
        const icon: SVGPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        icon.setAttributeNS(null, 'fill', GroupMenu.MENU_ICON_COLOR);
        switch (btnType) {
            case GroupMenu.EFFECT_FADE:
                icon.setAttributeNS(null, 'd', 'M7.37,0.29C7.09,0.31,6.82,0.35,6.55,0.41v15.19c0.27,0.05,0.54,0.09,0.82,0.12V0.29z M3.45,14.18c0.26,0.2,0.53,0.38,0.82,0.54V1.27C3.98,1.44,3.71,1.62,3.45,1.82V14.18z M5.82,0.59C5.54,0.68,5.26,0.79,5,0.9v14.2c0.27,0.12,0.54,0.22,0.82,0.31V0.59z M1.17,4.56C0.65,5.6,0.35,6.76,0.35,8s0.3,2.4,0.82,3.44V4.56z M8.1,0.25C8.1,0.25,8.1,0.25,8.1,0.25l0,15.5c0,0,0,0,0,0c4.27,0,7.75-3.48,7.75-7.75S12.37,0.25,8.1,0.25z M2.72,2.44c-0.3,0.29-0.57,0.6-0.82,0.93v9.26c0.25,0.33,0.52,0.65,0.82,0.93V2.44z');
                break;
            case GroupMenu.EFFECT_WIPE_LEFT:
                icon.setAttributeNS(null, 'd', 'M8,0.25C3.73,0.25,0.25,3.73,0.25,8c0,4.27,3.48,7.75,7.75,7.75c4.27,0,7.75-3.48,7.75-7.75C15.75,3.73,12.27,0.25,8,0.25z M8,15c-1.01,0-1.97-0.22-2.84-0.61V8.38c0,0,0,0,0,0h5.44l-2.58,2.39l0.56,0.6L12.21,8L8.58,4.63l-0.56,0.6l2.58,2.39H5.16c0,0,0,0,0,0V1.61C6.03,1.22,6.99,1,8,1c3.86,0,7,3.14,7,7S11.86,15,8,15z');
                break;
            case GroupMenu.EFFECT_WIPE_RIGHT:
                icon.setAttributeNS(null, 'd', 'M0.25,8c0,4.27,3.48,7.75,7.75,7.75s7.75-3.48,7.75-7.75S12.27,0.25,8,0.25S0.25,3.73,0.25,8z M1,8 c0-3.86,3.14-7,7-7c1.01,0,1.97,0.22,2.84,0.61v6.01l0,0H5.4l2.58-2.39l-0.56-0.6L3.79,8l3.63,3.37l0.56-0.6L5.4,8.38h5.44l0,0v6.01 C9.97,14.78,9.01,15,8,15C4.14,15,1,11.86,1,8z');
                break;
            case GroupMenu.EFFECT_WIPE_TOP:
                icon.setAttributeNS(null, 'd', 'M8,15.75c4.27,0,7.75-3.48,7.75-7.75S12.27,0.25,8,0.25S0.25,3.73,0.25,8S3.73,15.75,8,15.75z M8,15 c-3.86,0-7-3.14-7-7c0-1.01,0.22-1.97,0.61-2.84h6.01l0,0v5.44L5.23,8.02l-0.6,0.56L8,12.21l3.37-3.63l-0.6-0.56L8.38,10.6V5.16l0,0 h6.01C14.78,6.03,15,6.99,15,8C15,11.86,11.86,15,8,15z');
                break;
            case GroupMenu.EFFECT_WIPE_BOTTOM:
                icon.setAttributeNS(null, 'd', 'M8,0.25C3.73,0.25,0.25,3.73,0.25,8S3.73,15.75,8,15.75s7.75-3.48,7.75-7.75S12.27,0.25,8,0.25z M8,1 c3.86,0,7,3.14,7,7c0,1.01-0.22,1.97-0.61,2.84H8.38l0,0V5.4l2.39,2.58l0.6-0.56L8,3.79L4.63,7.42l0.6,0.56L7.62,5.4v5.44l0,0H1.61 C1.22,9.97,1,9.01,1,8C1,4.14,4.14,1,8,1z');
                break;
            case GroupMenu.EFFECT_GROW:
                icon.setAttributeNS(null, 'd', 'M8,0.25C3.73,0.25,0.25,3.73,0.25,8c0,4.27,3.48,7.75,7.75,7.75c4.27,0,7.75-3.48,7.75-7.75C15.75,3.73,12.27,0.25,8,0.25z M8,15c-3.86,0-7-3.14-7-7s3.14-7,7-7s7,3.14,7,7S11.86,15,8,15z M13.99,7.91c0-0.13-0.12-0.24-0.25-0.24H8.17c-0.14,0-0.25,0.11-0.25,0.25V9.9c0,0.14,0.11,0.25,0.25,0.25h2.79c-0.25,0.43-0.56,0.75-0.93,0.97C9.58,11.41,9,11.55,8.32,11.55c-1.06,0-1.93-0.34-2.65-1.04C5.1,9.95,4.78,9.31,4.66,8.57l0.8,0.65l0.17-0.21L4.57,8.14C4.54,8.1,4.5,8.07,4.46,8.05l-0.1-0.08L4.3,8.04c-0.11,0.03-0.2,0.13-0.19,0.25c0,0.01,0,0.01,0,0.02L3.41,9.32l0.23,0.16l0.55-0.78c0.14,0.82,0.52,1.56,1.14,2.17c0.81,0.79,1.82,1.18,3,1.18c0.77,0,1.44-0.17,1.97-0.5c0.54-0.33,0.98-0.85,1.31-1.54c0.04-0.08,0.03-0.17-0.02-0.24s-0.13-0.12-0.21-0.12H8.42V8.17h5.08l0.01,0.22c0,0.92-0.24,1.8-0.72,2.63c-0.48,0.82-1.1,1.46-1.86,1.9c-0.76,0.43-1.66,0.65-2.68,0.65c-1.1,0-2.09-0.24-2.95-0.72c-0.86-0.47-1.54-1.16-2.04-2.04C2.75,9.93,2.5,8.96,2.5,7.94c0-1.4,0.47-2.63,1.39-3.66c1.09-1.23,2.54-1.85,4.3-1.85c0.92,0,1.8,0.17,2.6,0.51c0.61,0.26,1.23,0.7,1.83,1.32l-1.13,1.12C10.54,4.46,9.43,4,8.2,4C8.06,4,7.95,4.11,7.95,4.25S8.06,4.5,8.2,4.5c1.19,0,2.2,0.46,3.1,1.41c0.05,0.05,0.11,0.08,0.18,0.08c0.09,0,0.13-0.02,0.18-0.07l1.48-1.47c0.1-0.09,0.1-0.25,0.01-0.35c-0.7-0.76-1.43-1.3-2.16-1.61c-0.87-0.37-1.81-0.55-2.8-0.55c-1.91,0-3.48,0.68-4.67,2.02C2.51,5.08,2,6.42,2,7.94c0,1.11,0.28,2.16,0.82,3.11c0.54,0.96,1.3,1.71,2.23,2.23c0.93,0.52,2.01,0.78,3.2,0.78c1.11,0,2.1-0.24,2.93-0.72c0.83-0.48,1.52-1.18,2.04-2.08C13.74,10.36,14,9.4,14,8.38L13.99,7.91z');
                break;
            case GroupMenu.EFFECT_CIRCLE:
                icon.setAttributeNS(null, 'd', 'M8.08,0.29c-4.27,0-7.73,3.46-7.73,7.73s3.47,7.73,7.73,7.73s7.73-3.46,7.73-7.73S12.35,0.29,8.08,0.29z M8.08,13.79c-3.18,0-5.77-2.58-5.77-5.77S4.9,2.25,8.08,2.25s5.77,2.58,5.77,5.77S11.27,13.79,8.08,13.79z M8.08,3.14 c-2.7,0-4.88,2.19-4.88,4.88s2.19,4.88,4.88,4.88c2.7,0,4.88-2.19,4.88-4.88S10.78,3.14,8.08,3.14z M8.08,11.66 c-2.01,0-3.64-1.63-3.64-3.64s1.63-3.64,3.64-3.64S11.73,6,11.73,8.02S10.1,11.66,8.08,11.66z M8.08,5.18 c-1.56,0-2.83,1.27-2.83,2.83s1.27,2.83,2.83,2.83s2.83-1.27,2.83-2.83S9.65,5.18,8.08,5.18z M8.08,10.13 c-1.17,0-2.11-0.94-2.11-2.11S6.91,5.9,8.08,5.9s2.11,0.94,2.11,2.11S9.25,10.13,8.08,10.13z')
                break;
            case GroupMenu.EFFECT_WHEEL:
                icon.setAttributeNS(null, 'd', 'M8,0.25C3.73,0.25,0.25,3.73,0.25,8c0,4.27,3.48,7.75,7.75,7.75c4.27,0,7.75-3.48,7.75-7.75C15.75,3.73,12.27,0.25,8,0.25z M8,1c0,2.33,0,4.67,0,7c-1.91,1.33-3.83,2.66-5.74,4C1.47,10.86,1,9.49,1,8C1,4.14,4.14,1,8,1z M4.04,10.45c0.04,0,0.08-0.01,0.12-0.03c0.12-0.07,0.16-0.22,0.1-0.34C3.9,9.44,3.71,8.72,3.71,8c0-1.87,1.25-3.52,3.01-4.08L5.98,5.21L6.29,5.4L7.4,3.5L7.16,3.39C7.14,3.37,7.12,3.36,7.09,3.35L5.43,2.54L5.27,2.87L6.5,3.47C4.58,4.11,3.21,5.94,3.21,8c0,0.81,0.21,1.61,0.6,2.32C3.87,10.4,3.95,10.45,4.04,10.45z');
                break;
            case GroupMenu.EFFECT_TRANSITION:
                icon.setAttributeNS(null, 'd', 'M11.71,7.98L8.9,5.17L8.9,7.21L5,7.21L5,8.69L8.9,8.69L8.9,10.79z M8.88,0.27v4.22l3.49,3.49l-3.49,3.49v4.22c3.92-0.39,6.98-3.69,6.98-7.71C15.85,3.96,12.79,0.66,8.88,0.27z M7.71,9.38H4.22V6.59h3.49V0.25c-4.1,0.2-7.36,3.58-7.36,7.73c0,4.15,3.26,7.53,7.36,7.73V9.38z');
                break;
            case GroupMenu.EASING_LINEAR:
                icon.setAttributeNS(null, 'd', 'M4.02,12.92c-0.09,0-0.19-0.04-0.26-0.11c-0.15-0.14-0.15-0.38-0.01-0.53l8.18-8.38c0.15-0.15,0.38-0.15,0.53-0.01c0.15,0.14,0.15,0.38,0.01,0.53l-8.18,8.38C4.22,12.89,4.12,12.92,4.02,12.92z M11.93,14.87H4.29c-1.74,0-3.15-1.42-3.15-3.15V4.07c0-1.74,1.41-3.15,3.15-3.15h7.64c1.74,0,3.15,1.41,3.15,3.15v7.64C15.09,13.46,13.67,14.87,11.93,14.87z M4.29,1.67c-1.33,0-2.4,1.08-2.4,2.4v7.64c0,1.33,1.08,2.4,2.4,2.4h7.64c1.33,0,2.4-1.08,2.4-2.4V4.07c0-1.33-1.08-2.4-2.4-2.4H4.29z');
                break;
            case GroupMenu.EASING_IN_QUAD:
                icon.setAttributeNS(null, 'd', 'M12.21,3.79c0.03,0,0.06,0,0.08,0.01c0.2,0.05,0.33,0.25,0.28,0.45c-0.32,1.4-1.68,6.13-5.89,7.98 c-0.82,0.36-1.7,0.59-2.62,0.69c-0.22,0.02-0.39-0.13-0.41-0.33s0.13-0.39,0.33-0.41c0.84-0.09,1.65-0.3,2.4-0.63 c3.89-1.71,5.16-6.14,5.46-7.46C11.88,3.9,12.04,3.79,12.21,3.79z M11.93,0.92H4.29c-1.74,0-3.15,1.41-3.15,3.15v7.65c0,1.73,1.41,3.15,3.15,3.15h7.64 c1.74,0,3.16-1.41,3.15-3.16V4.07C15.08,2.33,13.67,0.92,11.93,0.92z M14.33,11.71c0,1.32-1.07,2.4-2.4,2.4H4.29 c-1.32,0-2.4-1.07-2.4-2.4V4.07c0-1.32,1.07-2.4,2.4-2.4h7.64c1.32,0,2.4,1.07,2.4,2.4V11.71z');
                break;
            case GroupMenu.EASING_OUT_QUAD:
                icon.setAttributeNS(null, 'd', 'M4.02,12.92c-0.03,0-0.06,0-0.08-0.01c-0.2-0.05-0.33-0.25-0.28-0.45c0.32-1.4,1.68-6.13,5.89-7.98c0.82-0.36,1.7-0.59,2.62-0.69c0.22-0.02,0.39,0.13,0.41,0.33s-0.13,0.39-0.33,0.41c-0.84,0.09-1.65,0.3-2.4,0.63c-3.89,1.71-5.16,6.14-5.46,7.46C4.35,12.81,4.19,12.92,4.02,12.92z M11.93,14.87H4.29c-1.74,0-3.15-1.42-3.15-3.15V4.07c0-1.74,1.41-3.15,3.15-3.15h7.64c1.74,0,3.15,1.41,3.15,3.15v7.64C15.09,13.46,13.67,14.87,11.93,14.87z M4.29,1.67c-1.33,0-2.4,1.08-2.4,2.4v7.64c0,1.33,1.08,2.4,2.4,2.4h7.64c1.33,0,2.4-1.08,2.4-2.4V4.07c0-1.33-1.08-2.4-2.4-2.4H4.29z');
                break;
            case GroupMenu.EASING_INOUT_QUAD:
                icon.setAttributeNS(null, 'd', 'M4.02,12.92c-0.18,0-0.35-0.14-0.37-0.32c-0.03-0.21,0.12-0.39,0.32-0.42c1.02-0.14,1.84-0.5,2.46-1.08c0.93-0.87,1.17-2.06,1.4-3.2c0.25-1.25,0.51-2.53,1.64-3.37C10.18,4,11.1,3.76,12.22,3.79c0.21,0.01,0.37,0.18,0.36,0.39c-0.01,0.21-0.2,0.36-0.39,0.36c-0.96-0.03-1.71,0.16-2.27,0.58C9.02,5.8,8.81,6.84,8.56,8.05c-0.24,1.21-0.52,2.57-1.63,3.6c-0.73,0.68-1.69,1.11-2.87,1.27C4.05,12.92,4.04,12.92,4.02,12.92z M11.93,14.87H4.29c-1.74,0-3.15-1.42-3.15-3.15V4.07c0-1.74,1.41-3.15,3.15-3.15h7.64c1.74,0,3.15,1.41,3.15,3.15v7.64C15.09,13.46,13.67,14.87,11.93,14.87z M4.29,1.67c-1.33,0-2.4,1.08-2.4,2.4v7.64c0,1.33,1.08,2.4,2.4,2.4h7.64c1.33,0,2.4-1.08,2.4-2.4V4.07c0-1.33-1.08-2.4-2.4-2.4H4.29z');
                break;
            case GroupMenu.EASING_IN_CUBIC:
                icon.setAttributeNS(null, 'd', 'M12.21,3.79c0.03,0,0.06,0,0.08,0.01c0.2,0.05,0.33,0.25,0.28,0.45c-0.32,1.4-1.68,6.13-5.89,7.98 c-0.82,0.36-1.7,0.59-2.62,0.69c-0.22,0.02-0.39-0.13-0.41-0.33s0.13-0.39,0.33-0.41c0.84-0.09,1.65-0.3,2.4-0.63 c3.89-1.71,5.16-6.14,5.46-7.46C11.88,3.9,12.04,3.79,12.21,3.79z M11.93,0.92H4.29c-1.74,0-3.15,1.41-3.15,3.15v7.65c0,1.73,1.41,3.15,3.15,3.15h7.64 c1.74,0,3.16-1.41,3.15-3.16V4.07C15.08,2.33,13.67,0.92,11.93,0.92z M14.33,11.71c0,1.32-1.07,2.4-2.4,2.4H4.29 c-1.32,0-2.4-1.07-2.4-2.4V4.07c0-1.32,1.07-2.4,2.4-2.4h7.64c1.32,0,2.4,1.07,2.4,2.4V11.71z');
                break;
            case GroupMenu.EASING_OUT_CUBIC:
                icon.setAttributeNS(null, 'd', 'M4.02,12.92c-0.03,0-0.06,0-0.08-0.01c-0.2-0.05-0.33-0.25-0.28-0.45c0.32-1.4,1.68-6.13,5.89-7.98c0.82-0.36,1.7-0.59,2.62-0.69c0.22-0.02,0.39,0.13,0.41,0.33s-0.13,0.39-0.33,0.41c-0.84,0.09-1.65,0.3-2.4,0.63c-3.89,1.71-5.16,6.14-5.46,7.46C4.35,12.81,4.19,12.92,4.02,12.92z M11.93,14.87H4.29c-1.74,0-3.15-1.42-3.15-3.15V4.07c0-1.74,1.41-3.15,3.15-3.15h7.64c1.74,0,3.15,1.41,3.15,3.15v7.64C15.09,13.46,13.67,14.87,11.93,14.87z M4.29,1.67c-1.33,0-2.4,1.08-2.4,2.4v7.64c0,1.33,1.08,2.4,2.4,2.4h7.64c1.33,0,2.4-1.08,2.4-2.4V4.07c0-1.33-1.08-2.4-2.4-2.4H4.29z');
                break;
            case GroupMenu.EASING_INOUT_CUBIC:
                icon.setAttributeNS(null, 'd', 'M4.02,12.92c-0.18,0-0.35-0.14-0.37-0.32c-0.03-0.21,0.12-0.39,0.32-0.42c1.02-0.14,1.84-0.5,2.46-1.08c0.93-0.87,1.17-2.06,1.4-3.2c0.25-1.25,0.51-2.53,1.64-3.37C10.18,4,11.1,3.76,12.22,3.79c0.21,0.01,0.37,0.18,0.36,0.39c-0.01,0.21-0.2,0.36-0.39,0.36c-0.96-0.03-1.71,0.16-2.27,0.58C9.02,5.8,8.81,6.84,8.56,8.05c-0.24,1.21-0.52,2.57-1.63,3.6c-0.73,0.68-1.69,1.11-2.87,1.27C4.05,12.92,4.04,12.92,4.02,12.92z M11.93,14.87H4.29c-1.74,0-3.15-1.42-3.15-3.15V4.07c0-1.74,1.41-3.15,3.15-3.15h7.64c1.74,0,3.15,1.41,3.15,3.15v7.64C15.09,13.46,13.67,14.87,11.93,14.87z M4.29,1.67c-1.33,0-2.4,1.08-2.4,2.4v7.64c0,1.33,1.08,2.4,2.4,2.4h7.64c1.33,0,2.4-1.08,2.4-2.4V4.07c0-1.33-1.08-2.4-2.4-2.4H4.29z');
                break;
            case GroupMenu.DURATION:
                icon.setAttributeNS(null, 'd', 'M8.26,0.68C8.17,0.67,8.09,0.65,8,0.65c-4.12,0-7.46,3.34-7.46,7.46c0,4.12,3.34,7.46,7.46,7.46c2.54,0,4.78-1.28,6.12-3.22c0.84-1.2,1.33-2.66,1.33-4.24C15.46,4.08,12.26,0.82,8.26,0.68z M8,14.81c-3.7,0-6.71-3.01-6.71-6.71c0-3.53,2.75-6.44,6.22-6.69v6.7V8.5l0.31,0.22l1.41,1.02l3.82,2.76C11.79,13.96,9.95,14.81,8,14.81z M13.32,11.8c-0.07,0.1-0.19,0.16-0.3,0.16c-0.08,0-0.15-0.02-0.22-0.07L7.84,8.31V2.03c0-0.21,0.17-0.38,0.38-0.38s0.38,0.17,0.38,0.38v5.9l4.64,3.35C13.4,11.39,13.44,11.63,13.32,11.8z');
                break;
            default:
        }
        return icon;
    }

    public createSplit(idx: number): SVGLineElement {
        const splitLine: SVGLineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        splitLine.setAttributeNS(null, 'stroke', GroupMenu.MENU_ITEM_ICON_COLOR);
        splitLine.setAttributeNS(null, 'stroke-width', '.6');
        splitLine.setAttributeNS(null, 'x1', `${GroupMenu.PADDING_LEFT}`);
        splitLine.setAttributeNS(null, 'x2', `${GroupMenu.PADDING_LEFT + GroupMenu.BTN_SIZE}`);
        splitLine.setAttributeNS(null, 'y1', `${idx * (2 * GroupMenu.PADDING + GroupMenu.BTN_SIZE)}`);
        splitLine.setAttributeNS(null, 'y2', `${idx * (2 * GroupMenu.PADDING + GroupMenu.BTN_SIZE)} `);
        return splitLine;
    }

    public createMenuList(posi: ICoord, btnType: string) {
        const menuLayer: HTMLElement = document.getElementById(KfContainer.KF_MENU);
        menuLayer.innerHTML = '';
        const menuLayerBBox: DOMRect = menuLayer.getBoundingClientRect();//fixed
        this.menuListContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.menuListContainer.onmouseleave = () => {
            menuLayer.innerHTML = '';
        }

        const pointer: SVGPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pointer.setAttributeNS(null, 'd', `M0,3 L5,6 V0 Z`);
        // pointer.setAttributeNS(null, 'transform', `translate(${hintWidth / 2 - 6}, ${Hint.HINT_HEIGHT + 2 * Hint.PADDING})`);
        pointer.setAttributeNS(null, 'fill', GroupMenu.MENU_BG_COLOR);
        this.menuListContainer.appendChild(pointer);
        menuLayer.appendChild(this.menuListContainer);

        let menuListHeight: number = 0;
        let menuContent: string[] = [];
        let itemWidth: number = 0;
        let actionType: string = '';
        if (GroupMenu.EFFECTS.includes(btnType)) {
            menuListHeight = GroupMenu.EFFECTS.length * GroupMenu.MENU_LIST_ITEM_HEIGHT;
            menuContent = GroupMenu.EFFECTS;
            itemWidth = GroupMenu.MENU_LIST_WIDTH;
            actionType = action.UPDATE_EFFECT_TYPE;
        } else if (GroupMenu.EASINGS.includes(btnType)) {
            menuListHeight = GroupMenu.EASINGS.length * GroupMenu.MENU_LIST_ITEM_HEIGHT;
            menuContent = GroupMenu.EASINGS;
            itemWidth = GroupMenu.EASING_MENU_LIST_WIDTH;
            actionType = action.UPDATE_EFFECT_EASING;
        }
        this.menuListContainer.setAttributeNS(null, 'transform', `translate(${(posi.x - menuLayerBBox.left) / state.zoomLevel + 4}, ${(posi.y - menuLayerBBox.top) / state.zoomLevel - menuListHeight / 2})`);
        pointer.setAttributeNS(null, 'transform', `translate(0, ${menuListHeight / 2 - 3})`);

        const fakeBg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        fakeBg.setAttributeNS(null, 'fill', '#00000000');
        fakeBg.setAttributeNS(null, 'width', '10');
        fakeBg.setAttributeNS(null, 'height', `${menuListHeight}`);
        fakeBg.setAttributeNS(null, 'transform', 'translate(-6, 0)');
        this.menuListContainer.appendChild(fakeBg);

        menuContent.forEach((content: string, idx: number) => {
            const listItem: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            listItem.classList.add('clickable-component');
            listItem.setAttributeNS(null, 'transform', `translate(3, ${idx * GroupMenu.MENU_LIST_ITEM_HEIGHT})`);

            const itemBg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            itemBg.setAttributeNS(null, 'width', `${itemWidth}`);
            itemBg.setAttributeNS(null, 'height', `${GroupMenu.MENU_LIST_ITEM_HEIGHT}`);
            itemBg.setAttributeNS(null, 'fill', GroupMenu.MENU_BG_COLOR);
            listItem.appendChild(itemBg);


            listItem.onclick = () => {
                menuLayer.innerHTML = '';
                const aniIds: string[] = [this.aniId];
                KfGroup.allAniGroups.forEach((tmpAniGroup: KfGroup, tmpAniId: string) => {
                    if (tmpAniGroup.alignTarget === KfGroup.allAniGroups.get(this.aniId).alignId && typeof tmpAniGroup.alignTarget !== 'undefined' && tmpAniGroup.alignMerge) {
                        aniIds.push(tmpAniId);
                    }
                })
                const actionInfo: any = { aniIds: aniIds, effectPropValue: content };
                State.tmpStateBusket.push({
                    historyAction: { actionType: action.UPDATE_SPEC_ANIMATIONS, actionVal: JSON.stringify(state.spec.animations) },
                    currentAction: { actionType: actionType, actionVal: actionInfo }
                })
                State.saveHistory();
                Reducer.triger(actionType, actionInfo);
            }

            if (idx > 0) {
                const splitLine: SVGLineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                splitLine.setAttributeNS(null, 'x1', '0');
                splitLine.setAttributeNS(null, 'x2', `${itemWidth}`);
                splitLine.setAttributeNS(null, 'y1', '0');
                splitLine.setAttributeNS(null, 'y2', '0');
                listItem.appendChild(splitLine);
            }

            const icon: SVGPathElement = this.createBtnIcon(content);
            icon.setAttributeNS(null, 'fill', GroupMenu.MENU_ITEM_ICON_COLOR);
            icon.setAttributeNS(null, 'transform', `translate(2, 2)`);
            listItem.appendChild(icon);

            const text: SVGTextContentElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttributeNS(null, 'x', '26');
            text.setAttributeNS(null, 'y', `${GroupMenu.MENU_LIST_ITEM_HEIGHT - 4}`);
            text.setAttributeNS(null, 'fill', GroupMenu.MENU_ITEM_ICON_COLOR);
            text.classList.add('monospace-font');
            text.setAttributeNS(null, 'font-size', '10pt');
            text.innerHTML = GroupMenu.EASINGS.includes(btnType) ? Tool.translateEasing(content) : content;
            listItem.appendChild(text);
            this.menuListContainer.appendChild(listItem);

            listItem.onmouseenter = () => {
                text.setAttributeNS(null, 'fill', GroupMenu.MENU_ICON_HIGHLIGHT_COLOR);
                icon.setAttributeNS(null, 'fill', GroupMenu.MENU_ICON_HIGHLIGHT_COLOR);
            }
            listItem.onmouseleave = () => {
                text.setAttributeNS(null, 'fill', GroupMenu.MENU_ITEM_ICON_COLOR);
                icon.setAttributeNS(null, 'fill', GroupMenu.MENU_ITEM_ICON_COLOR);
            }
        })
    }
}