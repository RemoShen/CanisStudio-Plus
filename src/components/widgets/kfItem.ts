import '../../assets/style/keyframeItem.scss'
import Tool from '../../util/tool'
import { IKeyframe, IOmitPattern } from '../../app/core/ds';
import KfGroup from './kfGroup';
import KfTimingIllus from './kfTimingIllus';
import KfOmit from './kfOmit';
import { ICoord, ISize } from '../../util/ds';
import IntelliRefLine from './intelliRefLine';
import { KfContainer, kfContainer } from '../kfContainer';
import * as action from '../../app/action';
import Reducer from '../../app/reducer';
import { Animation, TimingSpec } from 'canis_toolkit';
import { state, State } from '../../app/state';
import KfTrack from './kfTrack';
import { hintTag } from './hint';
import { player } from '../player';
import ViewWindow from '../viewWindow';
import { ValueKeyIteratee } from 'lodash';

export default class KfItem extends KfTimingIllus {
    static KF_HEIGHT: number = 178;
    static KF_WIDTH: number = 240;
    static KF_H_STEP: number = 6;
    static KF_W_STEP: number = 8;
    static PADDING: number = 6;
    static STATIC_KF_ID: number = -100;
    static FRAME_COLOR: string = '#676767';
    static allKfInfo: Map<number, IKeyframe> = new Map();//contains both fake and real info
    static allKfItems: Map<number, KfItem> = new Map();//contains both fake and real kf
    static staticKf: KfItem;
    static dragoverKf: KfItem;
    static fakeKfIdx: number = 10000;

    // public id: number;
    public treeLevel: number;
    public parentObj: KfGroup;
    public rendered: boolean = false;
    public idxInGroup: number = 0;
    public isHighlighted: boolean = false;
    public kfInfo: {
        delay: number
        groupRef: string
        refValue: string
        duration: number
        allCurrentMarks: string[]
        allGroupMarks: string[]
        marksThisKf: string[]
        alignTo?: number
    }
    public preOmit: KfOmit;

    //widgets
    // public container: SVGGElement
    public kfHeight: number
    public hoverBtnContainer: SVGGElement
    public hoverBtnBg: SVGRectElement
    public hoverBtnTxt: SVGTextContentElement
    public playBtn: SVGGElement
    public playIcon: SVGPathElement
    public dragBtn: SVGGElement
    public kfBg: SVGRectElement
    public kfWidth: number
    public alignFrame: SVGRectElement
    public totalWidth: number = 0
    public chartThumbnails: SVGImageElement[] = []
    public _renderWhenZooming: boolean = true;

    set offsetDiff(od: number) {
        this._offsetDiff = od;
        Tool.transNodeElements(this.container, od, true);
        this.parentObj.translateGroup(this, od, true, false, true);
    }

    get offsetDiff(): number {
        return this._offsetDiff;
    }

    set durationDiff(dd: number) {
        this._durationDiff = dd;
        this.parentObj.translateGroup(this, dd, true, false, true);
    }

    get durationDiff(): number {
        return this._durationDiff;
    }

    set renderWhenZooming(rwz: boolean) {
        const changed: boolean = rwz !== this.renderWhenZooming;
        this._renderWhenZooming = rwz;
        if (changed) {
            this.showItemWhenZooming();
        }
    }

    get renderWhenZooming(): boolean {
        return this._renderWhenZooming;
    }

    public static highlightKfs(selectedCls: string[]) {
        //highlight static kf
        // if (typeof KfItem.staticKf !== 'undefined') {
        //     KfItem.staticKf.highlightKf();
        // }
        //filter which kf to highlight
    }

    public static cancelHighlightKfs() {
        this.allKfItems.forEach((kf: KfItem) => {
            if (kf.isHighlighted) {
                kf.cancelHighlightKf();
            }
        })
    }

    public static createKfInfo(selectedMarks: string[], basicInfo: { duration: number, allCurrentMarks: string[], allGroupMarks: string[] }): IKeyframe {
        KfItem.fakeKfIdx++;
        return {
            id: KfItem.fakeKfIdx,
            groupRef: 'id',
            timingRef: TimingSpec.timingRef.previousEnd,
            duration: basicInfo.duration,
            allCurrentMarks: [...basicInfo.allCurrentMarks, ...selectedMarks],
            allGroupMarks: basicInfo.allGroupMarks,
            marksThisKf: selectedMarks,
            durationIcon: true,
            hiddenDurationIcon: false,
            delay: 0,
            delayIcon: false
        }
    }

    // /**
    //  * 
    //  */
    // public static recordZoomPosis(kfZoomLevel: number) {
    //     // if (typeof this.allKfItems.get([...this.allKfItems.keys()][0]).zoomPosis.get(kfZoomLevel) === 'undefined') {
    //     this.allKfItems.forEach((kf: KfItem, kfId: number) => {
    //         const tmpTrans: ICoord = Tool.extractTransNums(kf.container.getAttributeNS(null, 'transform'));
    //         this.allKfItems.get(kfId).zoomPosis.set(kfZoomLevel, {
    //             posi: tmpTrans,
    //             size: { w: 0, h: 0 }
    //         });
    //     })
    //     // }
    // }

    // public static restoreZoomPosis(kfZoomLevel: number) {
    //     this.allKfItems.forEach((kf: KfItem, kfId: number) => {
    //         this.allKfItems.get(kfId).container.setAttributeNS(null, 'transform', `translate(${kf.zoomPosis.get(kfZoomLevel).posi.x} ${kf.zoomPosis.get(kfZoomLevel).posi.y})`);
    //     })
    // }

    public createOptionKfItem(allCurrentMarks: string[], allGroupMarks: string[], marksThisKf: string[], kfWidth: number, kfHeight: number) {
        this.kfWidth = kfWidth;
        this.kfHeight = kfHeight;
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.translateContainer(KfItem.PADDING, KfItem.PADDING);
        this.drawKfBg(-1, { w: kfWidth, h: kfHeight });
        this.container.appendChild(this.kfBg);
        this.drawChart(allCurrentMarks, allGroupMarks, marksThisKf);
    }

    public createItem(kf: IKeyframe, treeLevel: number, parentObj: KfGroup, startX: number, size?: ISize): void {
        this.hasOffset = kf.delayIcon;
        this.hasDuration = kf.durationIcon;
        this.hasHiddenDuration = kf.hiddenDurationIcon;
        this.parentObj = parentObj;
        this.aniId = this.parentObj.aniId;
        if (this.parentObj.kfHasOffset !== this.hasOffset || this.parentObj.kfHasDuration !== this.hasDuration) {
            this.parentObj.updateParentKfHasTiming(this.hasOffset, this.hasDuration);
        }
        this.id = kf.id;
        this.treeLevel = treeLevel;

        if (typeof size !== 'undefined') {
            this.kfHeight = size.h;
        } else {
            this.kfHeight = KfItem.KF_HEIGHT - 2 * treeLevel * KfItem.KF_H_STEP;
        }
        this.kfInfo = {
            delay: kf.delay,
            groupRef: typeof kf.groupRef === 'undefined' ? 'id' : kf.groupRef,
            refValue: typeof kf.refValue === 'undefined' ? '' : kf.refValue,
            duration: kf.duration,
            allCurrentMarks: kf.allCurrentMarks,
            allGroupMarks: kf.allGroupMarks,
            marksThisKf: kf.marksThisKf,
        }
        if (typeof kf.alignTo !== 'undefined') {
            this.kfInfo.alignTo = kf.alignTo;
        }
        if (typeof parentObj.container !== 'undefined') {
            this.rendered = true;
            this.renderItem(startX, size);
            if (typeof this.kfInfo.alignTo !== 'undefined') {//this kf is align to others
                const aniGroup: KfGroup = this.parentObj.fetchAniGroup();
                if (aniGroup.alignMerge) {
                    this.showAlignFrame();
                }
            }
        } else {
            KfItem.allKfItems.set(this.id, this);
        }
    }

    public bindHoverBtn() {
        this.container.onmouseenter = () => {
            this.container.classList.add('drop-shadow-ele');
            this.hoverBtnContainer.setAttributeNS(null, 'opacity', '1');
            if (!state.mousemoving) {
                if (typeof this.kfInfo.alignTo !== 'undefined') {//this kf is align to others
                    const aniGroup: KfGroup = this.parentObj.fetchAniGroup();
                    aniGroup.transShowTitle();
                } else {
                    this.parentObj.transShowTitle();
                }
            }
        }
        this.container.onmouseleave = () => {
            this.container.classList.remove('drop-shadow-ele');
            this.hoverBtnContainer.setAttributeNS(null, 'opacity', '0');
        }
    }

    public unbindHoverBtn() {
        this.container.classList.remove('drop-shadow-ele');
        this.hoverBtnContainer.setAttributeNS(null, 'opacity', '0');
        this.container.onmouseenter = null;
        this.container.onmouseleave = null;
    }

    public renderItem(startX: number, size?: ISize) {
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.translateContainer(startX + KfItem.PADDING, KfItem.PADDING);
        this.bindHoverBtn();

        if (this.hasOffset) {
            this.drawOffset(this.kfInfo.delay, this.kfHeight, 0);
            this.container.appendChild(this.offsetIllus);
            this.totalWidth += this.offsetWidth;
        }
        this.drawKfBg(this.treeLevel, size);
        this.container.appendChild(this.kfBg);
        if (this.hasDuration) {
            this.drawDuration(this.kfInfo.duration, this.kfWidth, this.kfHeight, false);
            this.container.appendChild(this.durationIllus);
            this.totalWidth += this.durationWidth;
        } else if (this.hasHiddenDuration) {
            this.drawDuration(this.kfInfo.duration, this.kfWidth, this.kfHeight, true);
            this.container.appendChild(this.durationIllus);
        }

        this.drawChart(this.kfInfo.allCurrentMarks, this.kfInfo.allGroupMarks, this.kfInfo.marksThisKf, KfItem.allKfInfo.get(this.id).thumbnail);
        // this.container.appendChild(this.chartThumbnail);
        // this.container.appendChild(this.chartSmallThumbnail);
        if (this.treeLevel === 1) {
            if (typeof this.parentObj.groupMenu === 'undefined') {//fake groups
                this.parentObj.container.appendChild(this.container);
            } else {
                this.parentObj.container.insertBefore(this.container, this.parentObj.groupMenu.container);
            }
        } else {
            this.parentObj.container.appendChild(this.container);
        }

        //create play button and draggable button
        this.drawHoverBtns();



        //if this kfItem is aligned to previous kfItems, update positions
        KfItem.allKfItems.set(this.id, this);
        if (typeof this.kfInfo.alignTo !== 'undefined') {
            this.updateAlignPosi(this.kfInfo.alignTo);
            // KfItem.allKfItems.set(this.id, this);
            //check whether there is already a line
            if (typeof IntelliRefLine.kfLineMapping.get(this.id) !== 'undefined') {//already a line
                // if (typeof IntelliRefLine.kfLineMapping.get(this.kfInfo.alignTo) !== 'undefined') {//already a line
                const refLineId: number = IntelliRefLine.kfLineMapping.get(this.kfInfo.alignTo).lineId;
                const oriToKf: number = IntelliRefLine.kfLineMapping.get(this.kfInfo.alignTo).theOtherEnd;
                const oriToKfBottom: number = KfItem.allKfItems.get(oriToKf).container.getBoundingClientRect().bottom;//fixed
                const currentKfBottom: number = this.container.getBoundingClientRect().bottom;//fixed
                if (currentKfBottom > oriToKfBottom) {//update the line info
                    IntelliRefLine.kfLineMapping.get(this.kfInfo.alignTo).theOtherEnd = this.id;
                    IntelliRefLine.kfLineMapping.delete(oriToKf);
                    IntelliRefLine.kfLineMapping.set(this.id, { theOtherEnd: this.kfInfo.alignTo, lineId: refLineId });
                    IntelliRefLine.updateLine(this.kfInfo.alignTo);
                }
            } else {// create a line
                let refLine: IntelliRefLine = new IntelliRefLine();
                refLine.createLine(this.kfInfo.alignTo, this.id);
                KfItem.allKfItems.get(this.kfInfo.alignTo).parentObj.alignLines.push(refLine.id);
                this.parentObj.alignLines.push(refLine.id);
            }
        } else {
            // KfItem.allKfItems.set(this.id, this);
        }
    }

    public showAlignFrame() {
        if (typeof this.alignFrame === 'undefined') {
            const itemBBox: DOMRect = this.container.getBoundingClientRect();//fixed
            this.alignFrame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            this.alignFrame.setAttributeNS(null, 'width', `${itemBBox.width / state.zoomLevel}`);
            this.alignFrame.setAttributeNS(null, 'height', `${itemBBox.height / state.zoomLevel}`);
            this.alignFrame.setAttributeNS(null, 'stroke', KfItem.FRAME_COLOR);
            this.alignFrame.setAttributeNS(null, 'stroke-width', '1');
            this.alignFrame.setAttributeNS(null, 'stroke-dasharray', '4 2');
            this.alignFrame.setAttributeNS(null, 'fill', 'none');
            this.container.appendChild(this.alignFrame);
        } else {
            this.alignFrame.setAttributeNS(null, 'opacity', '1');
        }
    }

    public hideAlignFrame() {
        if (typeof this.alignFrame !== 'undefined') {
            this.alignFrame.setAttributeNS(null, 'opacity', '0');
        }
    }

    public hideDuration() {
        this.durationIllus.setAttributeNS(null, 'opacity', '0');
    }

    public showDuration() {
        this.durationIllus.setAttributeNS(null, 'opacity', '1');
    }

    public hideOffset() {
        this.offsetIllus.setAttributeNS(null, 'opacity', '0');
    }

    public showOffset() {
        this.offsetIllus.setAttributeNS(null, 'opacity', '1');
    }

    public kfDragoverKf() {
        this.kfBg.classList.add('dragover-kf');
    }

    public cancelKfDragoverKf() {
        this.kfBg.classList.remove('dragover-kf');
    }

    public updateAlignPosi(alignTo: number) {
        //use bbox to compare position
        const currentPosiX: number = this.container.getBoundingClientRect().left;//fixed
        const currentKfInfo: IKeyframe = KfItem.allKfInfo.get(this.id);
        const alignedKfInfo: IKeyframe = KfItem.allKfInfo.get(alignTo);
        const alignedKfItem: KfItem = KfItem.allKfItems.get(alignTo);
        if (typeof alignedKfItem !== 'undefined') {

            if (alignedKfItem.rendered) {
                let alignedKfBgX: number = 0;
                if (currentKfInfo.timingRef === TimingSpec.timingRef.previousStart) {
                    alignedKfBgX = alignedKfItem.kfBg.getBoundingClientRect().left;//fixed
                } else {
                    alignedKfBgX = alignedKfItem.container.getBoundingClientRect().right;//fixed
                    KfItem.allKfInfo.get(alignedKfItem.id).alignWithKfs.forEach((kfId: number) => {
                        if (kfId !== this.id) {
                            const tmpKf: KfItem = KfItem.allKfItems.get(kfId);
                            if (typeof tmpKf !== 'undefined' && tmpKf.rendered) {
                                const tmpKfBBox: DOMRect = tmpKf.container.getBoundingClientRect();//fixed
                                if (tmpKfBBox.right > alignedKfBgX) {
                                    alignedKfBgX = tmpKfBBox.right;
                                }
                            }
                        }
                    })
                }
                const bgDiffX: number = Math.abs((currentPosiX - alignedKfBgX) / state.zoomLevel);
                if (currentPosiX > alignedKfBgX) { //translate aligned kf and its group
                    // if (currentPosiX > alignedKfBgX && (currentPosiX - alignedKfBgX >= 1)) { //translate aligned kf and its group
                    let posiXForNextKf: number = this.container.getBoundingClientRect().right;//fixed

                    //update aligned kfs, together with those kfs after it, and those in its parent group
                    const currentAlignedKfTransX: number = Tool.extractTransNums(alignedKfItem.container.getAttributeNS(null, 'transform')).x;
                    alignedKfItem.translateContainer(currentAlignedKfTransX + bgDiffX, KfItem.PADDING);
                    const alignedKfItemBBox: DOMRect = alignedKfItem.container.getBoundingClientRect();//fixed
                    if (alignedKfItemBBox.right > posiXForNextKf) {
                        posiXForNextKf = alignedKfItemBBox.right;
                    }

                    //find the next kf in aligned group
                    let flag: boolean = false;
                    let transXForNextKf: number = 0;
                    let nextKf: KfItem;
                    for (let i: number = 0, len: number = alignedKfItem.parentObj.children.length; i < len; i++) {
                        const c: KfItem | KfOmit = <KfItem | KfOmit>alignedKfItem.parentObj.children[i];
                        if (flag) {
                            if (c instanceof KfOmit) {
                                transXForNextKf = bgDiffX;
                                const tmpTrans: ICoord = Tool.extractTransNums(c.container.getAttributeNS(null, 'transform'));
                                c.translateContainer(tmpTrans.x + transXForNextKf, tmpTrans.y);
                            } else {
                                const tmpBBox: DOMRect = c.container.getBoundingClientRect();//fixed
                                if (tmpBBox.left + transXForNextKf * state.zoomLevel < posiXForNextKf) {
                                    transXForNextKf = (posiXForNextKf - tmpBBox.left) / state.zoomLevel;
                                }
                                nextKf = c;
                                break;
                            }
                        }
                        if (c instanceof KfItem) {
                            flag = c.id === alignedKfItem.id
                        }
                    }

                    //update position of next kf in aligned group
                    if (transXForNextKf > 0) {
                        nextKf.parentObj.translateGroup(nextKf, transXForNextKf, true, true, true);
                    }
                } else if (currentPosiX <= alignedKfBgX) {//translate current kf
                    const currentTransX: number = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform')).x;
                    this.translateContainer(currentTransX + bgDiffX, KfItem.PADDING);
                    this.transOmitsWithItem();
                    this.totalWidth += bgDiffX;

                    //find the next kf in aligned group
                    let reachTarget: boolean = false;
                    let transXForNextKf: number = 0;
                    let nextKf: KfItem;
                    let passedOmit: KfOmit;
                    for (let i: number = 0, len: number = alignedKfItem.parentObj.children.length; i < len; i++) {
                        const c: KfItem | KfOmit = <KfItem | KfOmit>alignedKfItem.parentObj.children[i];
                        if (reachTarget) {
                            if (c instanceof KfOmit) {
                                // transXForNextKf += KfOmit.OMIT_W + KfGroup.PADDING;
                                passedOmit = c;
                            } else {
                                const currentBBox: DOMRect = this.container.getBoundingClientRect();//fixed
                                const tmpBBox: DOMRect = c.container.getBoundingClientRect();//fixed
                                if (tmpBBox.left < currentBBox.right) {
                                    transXForNextKf = (currentBBox.right - tmpBBox.left) / state.zoomLevel;
                                }
                                nextKf = c;
                                break;
                            }
                        }
                        if (c instanceof KfItem) {
                            reachTarget = c.id === alignedKfItem.id
                        }
                    }

                    //update position of next kf in aligned group
                    if (transXForNextKf > 0) {
                        alignedKfItem.parentObj.translateGroup(nextKf, transXForNextKf, true, true, true);
                    }
                }
                //update the refline
                IntelliRefLine.updateLine(alignTo);
            }
        }

    }

    /**
     * reset the omit position to the left side of the kf
     */
    public transOmitsWithItem(): void {
        if (typeof this.preOmit !== 'undefined' && this.rendered && this.renderWhenZooming) {
            // if (typeof this.preOmit !== 'undefined') {
            const currentKfTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
            const oriTrans: ICoord = Tool.extractTransNums(this.preOmit.container.getAttributeNS(null, 'transform'));
            this.preOmit.translateContainer(this.preOmit.omitType === KfOmit.KF_ALIGN ? currentKfTrans.x - this.preOmit.oWidth - KfGroup.PADDING : currentKfTrans.x - this.preOmit.oWidth, oriTrans.y);
            // this.preOmit.updateTrans(oriTrans.x + transX, oriTrans.y + KfOmit.OMIT_H / 1);
        }
    }

    public translateContainer(x: number, y: number) {
        this.container.setAttributeNS(null, 'transform', `translate(${x}, ${y})`);
        //translate the refline if there is one
        IntelliRefLine.updateLine(this.id);
    }

    /**
     * calcualte the align range based on the alignwith kf and kfs aligned to this kf which are before the current kf
     */
    public calAlignRange(): [number, number] {
        const currentKfInfo: IKeyframe = KfItem.allKfInfo.get(this.id);
        const currentKfBBox: DOMRect = this.container.getBoundingClientRect();
        let minX: number = 10000000, maxX: number = -1;
        if (typeof currentKfInfo !== 'undefined') {
            const alignTargetKf: KfItem = KfItem.allKfItems.get(currentKfInfo.alignTo);
            const alignTargetKfInfo: IKeyframe = KfItem.allKfInfo.get(alignTargetKf.id);
            if (typeof alignTargetKf !== 'undefined') {
                if (alignTargetKf.rendered && alignTargetKf.renderWhenZooming) {//this kf is visible
                    const alignTargetKfBBox: DOMRect = alignTargetKf.container.getBoundingClientRect();
                    const alignTargetKfThumbnailBBox: DOMRect = alignTargetKf.kfBg.getBoundingClientRect();
                    minX = alignTargetKfThumbnailBBox.left;
                    maxX = alignTargetKfBBox.right;
                    for (let i = 0, len = alignTargetKfInfo.alignWithKfs.length; i < len; i++) {
                        const kfId: number = alignTargetKfInfo.alignWithKfs[i];
                        if (kfId === this.id) {
                            break;
                        }
                        const tmpKf: KfItem = KfItem.allKfItems.get(kfId);
                        if (typeof tmpKf !== 'undefined') {
                            if (tmpKf.rendered && tmpKf.renderWhenZooming && tmpKf.id !== this.id) {
                                const tmpBBox: DOMRect = tmpKf.container.getBoundingClientRect();
                                // if (tmpBBox.y <= currentKfBBox.y) {//kfs above this one
                                if (tmpBBox.right > maxX) {
                                    maxX = tmpBBox.right;
                                }
                                // }
                            }
                        }
                    }
                    // alignTargetKfInfo.alignWithKfs.forEach((kfId: number) => {
                    //     const tmpKf: KfItem = KfItem.allKfItems.get(kfId);
                    //     if (typeof tmpKf !== 'undefined') {
                    //         if (tmpKf.rendered && tmpKf.renderWhenZooming && tmpKf.id !== this.id) {
                    //             const tmpBBox: DOMRect = tmpKf.container.getBoundingClientRect();
                    //             if (tmpBBox.y <= currentKfBBox.y && ) {//kfs above this one
                    //                 if (tmpBBox.right > maxX) {
                    //                     maxX = tmpBBox.right;
                    //                 }
                    //             }
                    //         }
                    //     }
                    // })
                }
            }
        }
        return [minX, maxX];
    }

    public findNextSibling(): KfItem | KfOmit {
        return <KfItem | KfOmit>this.parentObj.children[this.idxInGroup + 1];
    }

    public bindDragBarHover() {
        this.dragBtn.onmouseenter = (enterEvt: MouseEvent) => {
            if (!state.mousemoving) {
                hintTag.createHint({ x: enterEvt.pageX, y: enterEvt.pageY }, 'Drag to change the relative starting time', 240);
            }
        }
        this.dragBtn.onmouseleave = () => {
            hintTag.removeHint();
        }
    }

    public unbindDragBarHover() {
        this.dragBtn.onmouseenter = null;
        this.dragBtn.onmouseleave = null;
    }

    public drawHoverBtns(): void {
        this.hoverBtnContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.hoverBtnContainer.classList.add('ease-fade');
        this.hoverBtnContainer.setAttributeNS(null, 'opacity', '0');
        this.hoverBtnTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.hoverBtnTxt.setAttributeNS(null, 'x', `${this.kfWidth / 2 - 90 + this.offsetWidth}`);
        this.hoverBtnTxt.setAttributeNS(null, 'y', `${this.kfHeight / 2}`);
        this.hoverBtnTxt.setAttributeNS(null, 'font-size', '12pt');
        this.hoverBtnTxt.setAttributeNS(null, 'font-weight', 'bold');
        this.hoverBtnTxt.setAttributeNS(null, 'fill', '#484848');
        this.hoverBtnTxt.innerHTML = 'Click to preview from here';
        this.hoverBtnContainer.appendChild(this.hoverBtnTxt);
        this.hoverBtnBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.hoverBtnBg.setAttributeNS(null, 'x', `${typeof this.offsetIllus === 'undefined' ? 0 : this.offsetWidth}`);
        this.hoverBtnBg.setAttributeNS(null, 'y', '0');
        this.hoverBtnBg.setAttributeNS(null, 'width', `${this.kfWidth}`);
        this.hoverBtnBg.setAttributeNS(null, 'height', `${this.kfHeight}`);
        this.hoverBtnBg.setAttributeNS(null, 'fill', 'rgba(200,200,200,0.3)');
        this.hoverBtnBg.classList.add('clickable-component');
        // this.bindHoverBgHover();
        this.hoverBtnBg.onclick = () => {
            //play animation from this keyframe
            if (state.charts.length === 1) {
                const startTimeThisKf: number = Animation.allMarkAni.get(this.kfInfo.marksThisKf[0]).startTime;
                player.currentTime = startTimeThisKf;
                player.playAnimation();
            } else {
                const tmpIdx: number = this.idxInGroup;
                player.currentTime = this.durationNum * tmpIdx;
                player.playAnimation();
            }
        }
        this.hoverBtnContainer.appendChild(this.hoverBtnBg);

        //draggable button
        this.dragBtn = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.dragBtn.setAttributeNS(null, 'transform', `translate(0 ${this.kfHeight - 20})`);
        this.dragBtn.classList.add('draggable-component');
        const btnBg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        btnBg.classList.add('ease-fill', 'drag-bar');
        btnBg.setAttributeNS(null, 'x', '0');
        btnBg.setAttributeNS(null, 'y', '0');
        btnBg.setAttributeNS(null, 'width', `${this.totalWidth}`);
        btnBg.setAttributeNS(null, 'height', '20');
        btnBg.setAttributeNS(null, 'fill', 'rgb(180, 180, 180)');
        btnBg.setAttributeNS(null, 'opacity', '0.9');
        this.bindDragBarHover();
        this.dragBtn.appendChild(btnBg);
        let dotR: number = 1.5;
        let dotMargin: number = 1.5 * 2 * dotR;
        for (let i = 0; i < 8; i++) {
            const circle: SVGCircleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttributeNS(null, 'cx', `${this.kfWidth / 2 - 4 * dotR - 1.5 * dotMargin + dotR + (i % 4) * (dotR + dotMargin)}`);
            circle.setAttributeNS(null, 'cy', `${(20 - 4 * dotR - dotMargin) / 2 + Math.floor(i / 4) * (dotR + dotMargin) + dotR}`);
            circle.setAttributeNS(null, 'r', `${dotR}`);
            circle.setAttributeNS(null, 'fill', '#484848');
            this.dragBtn.appendChild(circle);
        }

        if (state.charts.length === 1) {//cant drag kfitem when the animation is transition
            this.dragBtn.onmousedown = (downEvt) => {
                Reducer.triger(action.UPDATE_MOUSE_MOVING, true);
                this.parentObj.transHideTitle();
                this.unbindDragBarHover();
                let oriMousePosi: ICoord = { x: downEvt.pageX, y: downEvt.pageY };
                hintTag.removeHint();
                const targetMoveItem: KfGroup | KfItem = typeof this.kfInfo.alignTo !== 'undefined' ? this.parentObj.fetchAniGroup() : this;
                //move the entire group
                targetMoveItem.container.setAttributeNS(null, '_transform', targetMoveItem.container.getAttributeNS(null, 'transform'));
                const tmpContainerBBox: DOMRect = targetMoveItem.container.getBoundingClientRect();//fixed
                const containerBBox: any = {
                    top: targetMoveItem instanceof KfItem ? targetMoveItem.kfBg.getBoundingClientRect().top : tmpContainerBBox.top,
                    left: tmpContainerBBox.left,
                    right: tmpContainerBBox.right,
                    width: tmpContainerBBox.width,
                    height: tmpContainerBBox.height,
                    x: tmpContainerBBox.x,
                    y: tmpContainerBBox.y
                }
                if (targetMoveItem.parentObj.container.contains(targetMoveItem.container)) {
                    targetMoveItem.parentObj.container.removeChild(targetMoveItem.container);
                }
                const popKfContainer: HTMLElement = document.getElementById(KfContainer.KF_POPUP);
                const popKfContainerBbox: DOMRect = popKfContainer.getBoundingClientRect();//fixed
                popKfContainer.appendChild(targetMoveItem.container);

                //add hint line if moving a single kf
                let hintPosiLine: IntelliRefLine = new IntelliRefLine();
                if (targetMoveItem instanceof KfItem) {
                    hintPosiLine.hintAlign({ x: containerBBox.left, y: containerBBox.top }, containerBBox.height, false);
                }

                //set new transform
                if (targetMoveItem instanceof KfGroup) {
                    targetMoveItem.translateContainer((containerBBox.left - popKfContainerBbox.left) / state.zoomLevel, (containerBBox.top - popKfContainerBbox.top + KfGroup.TITLE_HEIHGT) / state.zoomLevel);
                } else {
                    targetMoveItem.translateContainer((containerBBox.left - popKfContainerBbox.left) / state.zoomLevel, (containerBBox.top - popKfContainerBbox.top) / state.zoomLevel);
                }

                let updateSpec: boolean = false;
                let actionType: string = '';
                let actionInfo: any = {};
                const preSibling: KfItem | KfOmit = <KfItem | KfOmit>this.parentObj.children[this.idxInGroup - 1];
                const nextSibling: KfItem | KfOmit = <KfItem | KfOmit>this.parentObj.children[this.idxInGroup + 1];
                const firstSibling: KfItem = <KfItem>this.parentObj.children[0];
                let preKfRight: number = containerBBox.left;
                // let visualPresiblingDurationW: number = 0;
                if (typeof preSibling !== 'undefined' && typeof firstSibling !== 'undefined') {
                    // visualPresiblingDurationW = preSibling.container.getBoundingClientRect().right - preSibling.kfBg.getBoundingClientRect().right;
                    if (preSibling instanceof KfItem) {
                        preKfRight = preSibling.kfBg.getBoundingClientRect().right;
                    } else {
                        preKfRight = containerBBox.left - (firstSibling.container.getBoundingClientRect().right - firstSibling.kfBg.getBoundingClientRect().right);
                    }
                }
                if (targetMoveItem instanceof KfGroup) {//this kf is align to others
                    //find all kfs in this kfgroup
                    const allKfItems: KfItem[] = targetMoveItem.fetchAllKfs();

                    //set visible
                    targetMoveItem.showGroupBg();
                    targetMoveItem.hideTitle();
                    targetMoveItem.hideMenu();
                    targetMoveItem.unbindBgHover();
                    document.onmousemove = (moveEvt) => {
                        const alignWithGroupBBox: DOMRect = targetMoveItem.fetchAlignWithGroup().container.getBoundingClientRect();//fixed
                        const currentMousePosi: ICoord = { x: moveEvt.pageX, y: moveEvt.pageY };
                        const posiDiff: ICoord = { x: (currentMousePosi.x - oriMousePosi.x) / state.zoomLevel, y: (currentMousePosi.y - oriMousePosi.y) / state.zoomLevel };
                        const oriTrans: ICoord = Tool.extractTransNums(targetMoveItem.container.getAttributeNS(null, 'transform'));
                        targetMoveItem.translateContainer(oriTrans.x, oriTrans.y + posiDiff.y);

                        const currentBBox: DOMRect = targetMoveItem.container.getBoundingClientRect();//fixed
                        if ((currentBBox.top - alignWithGroupBBox.top) / state.zoomLevel <= KfTrack.TRACK_HEIGHT * 0.6 && (currentBBox.top - alignWithGroupBBox.top) / state.zoomLevel >= 0) {//set merge to true
                            //change ref line to align frame
                            allKfItems.forEach((kf: KfItem) => {
                                kf.showAlignFrame();
                                if (typeof IntelliRefLine.kfLineMapping.get(kf.id) !== 'undefined') {
                                    const corresRefLine: IntelliRefLine = IntelliRefLine.allLines.get(IntelliRefLine.kfLineMapping.get(kf.id).lineId);
                                    if (typeof corresRefLine !== 'undefined') {
                                        corresRefLine.hideLine();
                                    }
                                }
                            })
                            //triger action
                            if (targetMoveItem.alignMerge) {
                                updateSpec = false;
                            } else {
                                updateSpec = true;
                                actionType = action.UPDATE_ALIGN_MERGE;
                                actionInfo = { aniId: this.aniId, merge: true }
                            }
                        } else if ((currentBBox.top - alignWithGroupBBox.top) / state.zoomLevel >= KfTrack.TRACK_HEIGHT * 0.6) {//set merge to false
                            //change align frame to ref line
                            allKfItems.forEach((kf: KfItem) => {
                                kf.hideAlignFrame();
                                if (typeof IntelliRefLine.kfLineMapping.get(kf.id) !== 'undefined') {
                                    const corresRefLine: IntelliRefLine = IntelliRefLine.allLines.get(IntelliRefLine.kfLineMapping.get(kf.id).lineId);
                                    if (typeof corresRefLine !== 'undefined') {
                                        corresRefLine.showLine();
                                    }
                                }
                            })
                            //triger action
                            if (targetMoveItem.alignMerge) {
                                updateSpec = true;
                                actionType = action.UPDATE_ALIGN_MERGE;
                                actionInfo = { aniId: this.aniId, merge: false }
                            } else {
                                updateSpec = false;
                            }
                        }

                        oriMousePosi = currentMousePosi;
                    }
                    document.onmouseup = () => {
                        document.onmousemove = null;
                        document.onmouseup = null;
                        this.bindDragBarHover();
                        Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
                        if (!updateSpec) {
                            targetMoveItem.container.setAttributeNS(null, 'transform', targetMoveItem.container.getAttributeNS(null, '_transform'));
                            targetMoveItem.parentObj.container.appendChild(targetMoveItem.container);
                            if (targetMoveItem.alignMerge) {
                                targetMoveItem.hideGroupBg();
                                targetMoveItem.showTitle();
                            } else {
                                targetMoveItem.rerenderGroupBg();
                                targetMoveItem.showTitle();
                                targetMoveItem.showMenu();
                            }
                            targetMoveItem.bindBgHover();
                        } else {
                            Reducer.triger(actionType, actionInfo);
                            popKfContainer.removeChild(targetMoveItem.container);
                        }
                    }
                } else {//this kf is not aligned to others
                    let looseFocus: boolean = false;
                    document.onmousemove = (moveEvt) => {
                        const currentMousePosi: ICoord = { x: moveEvt.pageX, y: moveEvt.pageY };
                        const posiDiff: ICoord = { x: (currentMousePosi.x - oriMousePosi.x) / state.zoomLevel, y: (currentMousePosi.y - oriMousePosi.y) / state.zoomLevel };

                        //check whether the kf is still inside its group
                        looseFocus = this.checkDragOutOfGroup(posiDiff);

                        if (!looseFocus) {
                            const oriTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
                            this.translateContainer(oriTrans.x + posiDiff.x, oriTrans.y);
                            if (this.idxInGroup > 0) {//this is not the first kf in group, need to check the position relation with previous kf
                                // if (this.idxInGroup > 0 && preSibling instanceof KfItem) {//this is not the first kf in group, need to check the position relation with previous kf
                                const currentKfLeft: number = this.kfBg.getBoundingClientRect().left;//fixed
                                // const preKfRight: number = preSibling.kfBg.getBoundingClientRect().right;//fixed
                                const preKfDurationW: number = KfItem.BASIC_OFFSET_DURATION_W > this.durationWidth ? KfItem.BASIC_OFFSET_DURATION_W : this.durationWidth;
                                const posiXDiff: number = (currentKfLeft - preKfRight) / state.zoomLevel;
                                const currentKfOffsetW: number = KfItem.BASIC_OFFSET_DURATION_W > this.offsetWidth ? KfItem.BASIC_OFFSET_DURATION_W : this.offsetWidth;
                                if (posiXDiff >= currentKfOffsetW + preKfDurationW) {//show both pre duration and current offset
                                    if (this.hasOffset) {
                                        this.showOffset();
                                    } else {
                                        if (typeof this.offsetIllus === 'undefined') {
                                            this.drawOffset(KfItem.minOffset, this.kfHeight, 0, true);
                                        }
                                        this.container.appendChild(this.offsetIllus);
                                    }
                                    //show pre duration
                                    if (preSibling instanceof KfItem) {
                                        preSibling.cancelKfDragoverKf();
                                        this.cancelKfDragoverKf();
                                        if (preSibling.hasDuration || preSibling.hasHiddenDuration) {
                                            preSibling.showDuration();
                                        } else {
                                            if (typeof preSibling.durationIllus === 'undefined') {
                                                preSibling.drawDuration(KfItem.minDuration, this.kfWidth, this.kfHeight, false);
                                            }
                                            preSibling.container.appendChild(preSibling.durationIllus);
                                        }
                                    } else if (preSibling instanceof KfOmit) {
                                        //show fake duration
                                        hintPosiLine.showFakeDuration({ x: containerBBox.left, y: containerBBox.top }, containerBBox.height);
                                    }

                                    //target actions
                                    if (!this.hasOffset && preSibling.hasDuration) {
                                        updateSpec = true;//add default offset between kfs
                                        actionType = action.UPDATE_DELAY_BETWEEN_KF;
                                        actionInfo.aniId = this.parentObj.aniId;
                                        actionInfo.delay = 300;
                                    } else if (!preSibling.hasDuration && this.hasOffset) {
                                        updateSpec = true;//change timing ref from with to after
                                        actionType = action.UPDATE_KF_TIMING_REF;
                                        actionInfo.aniId = this.parentObj.aniId;
                                        actionInfo.ref = TimingSpec.timingRef.previousEnd;
                                    } else {
                                        updateSpec = false;
                                        actionInfo = {};
                                    }
                                } else if (posiXDiff >= preKfDurationW && posiXDiff < currentKfOffsetW + preKfDurationW) {//show pre duration
                                    if (this.hasOffset) {
                                        this.hideOffset();
                                    } else {
                                        if (typeof this.offsetIllus !== 'undefined' && this.container.contains(this.offsetIllus)) {
                                            this.container.removeChild(this.offsetIllus);
                                        }
                                    }
                                    //show pre duration 
                                    if (preSibling instanceof KfItem) {
                                        preSibling.cancelKfDragoverKf();
                                        this.cancelKfDragoverKf();
                                        if (preSibling.hasDuration || preSibling.hasHiddenDuration) {
                                            preSibling.showDuration();
                                        } else {
                                            if (typeof preSibling.durationIllus === 'undefined') {
                                                preSibling.drawDuration(KfItem.minDuration, this.kfWidth, this.kfHeight, false);
                                            }
                                            preSibling.container.appendChild(preSibling.durationIllus);
                                        }
                                    } else if (preSibling instanceof KfOmit) {
                                        //show fake duration
                                        hintPosiLine.showFakeDuration({ x: containerBBox.left, y: containerBBox.top }, containerBBox.height);
                                    }

                                    //target actions
                                    if (this.hasOffset && preSibling.hasDuration) {
                                        updateSpec = true;//remove offset between kfs
                                        actionType = action.REMOVE_DELAY_BETWEEN_KF;
                                        actionInfo.aniId = this.parentObj.aniId;
                                    } else if (this.hasOffset && !preSibling.hasDuration) {
                                        updateSpec = true;//change timing ref from with to after and remove offset
                                        actionType = action.UPDATE_TIMING_REF_DELAY_KF;
                                        actionInfo.aniId = this.parentObj.aniId;
                                        actionInfo.ref = TimingSpec.timingRef.previousEnd;
                                        // actionInfo.delay = 300;
                                    } else {
                                        updateSpec = false;
                                        actionInfo = {};
                                    }
                                } else if (posiXDiff < preKfDurationW && posiXDiff >= 0) {//show current offset and hide pre duration
                                    if (this.hasOffset) {
                                        this.showOffset();
                                    } else {
                                        if (typeof this.offsetIllus === 'undefined') {
                                            this.drawOffset(KfItem.minOffset, this.kfHeight, 0, true);
                                        }
                                        this.container.appendChild(this.offsetIllus);
                                    }
                                    //hide pre duration
                                    if (preSibling instanceof KfItem) {
                                        preSibling.cancelKfDragoverKf();
                                        this.cancelKfDragoverKf();
                                        if (preSibling.hasDuration || preSibling.hasHiddenDuration) {
                                            preSibling.hideDuration();
                                        } else {
                                            if (typeof preSibling.durationIllus !== 'undefined' && preSibling.container.contains(preSibling.durationIllus)) {
                                                preSibling.container.removeChild(preSibling.durationIllus);
                                            }
                                        }
                                    } else if (preSibling instanceof KfOmit) {
                                        //hide fake duration
                                        hintPosiLine.removeFakeDuration();
                                    }

                                    //target actions
                                    if (!this.hasOffset && preSibling.hasDuration) {
                                        updateSpec = true;//change timing ref from after to with, and add default offset
                                        actionType = action.UPDATE_TIMING_REF_DELAY_KF;
                                        actionInfo.aniId = this.parentObj.aniId;
                                        actionInfo.ref = TimingSpec.timingRef.previousStart;
                                        actionInfo.delay = 300;
                                    } else if (this.hasOffset && preSibling.hasDuration) {
                                        updateSpec = true; //change timing ref from after to with
                                        actionType = action.UPDATE_KF_TIMING_REF;
                                        actionInfo.aniId = this.parentObj.aniId;
                                        actionInfo.ref = TimingSpec.timingRef.previousStart;
                                    } else {
                                        updateSpec = false;
                                        actionInfo = {};
                                    }
                                } else {//hide pre duration, this offset and highlight them
                                    if (this.hasOffset) {
                                        this.hideOffset();
                                    } else {
                                        if (typeof this.offsetIllus !== 'undefined' && this.container.contains(this.offsetIllus)) {
                                            this.container.removeChild(this.offsetIllus);
                                        }
                                    }

                                    //hide pre duration
                                    if (preSibling instanceof KfItem) {
                                        preSibling.kfDragoverKf();
                                        this.kfDragoverKf();
                                        if (preSibling.hasDuration || preSibling.hasHiddenDuration) {
                                            preSibling.hideDuration();
                                        } else {
                                            if (typeof preSibling.durationIllus !== 'undefined' && preSibling.container.contains(preSibling.durationIllus)) {
                                                preSibling.container.removeChild(preSibling.durationIllus);
                                            }
                                        }
                                    } else if (preSibling instanceof KfOmit) {
                                        //hide fake duration
                                        this.kfDragoverKf();
                                        hintPosiLine.removeFakeDuration();
                                    }

                                    //target actions
                                    updateSpec = true;//remove lowest level grouping
                                    actionType = action.REMOVE_LOWESTGROUP;
                                    actionInfo.aniId = this.parentObj.aniId;
                                }
                            }
                            oriMousePosi = currentMousePosi;
                        }
                    }
                    document.onmouseup = () => {
                        document.onmousemove = null;
                        document.onmouseup = null;
                        this.bindDragBarHover();
                        hintPosiLine.removeHintLine();
                        hintPosiLine.removeFakeDuration();
                        Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
                        if (!updateSpec || looseFocus) {
                            if (typeof preSibling !== 'undefined' && preSibling instanceof KfItem) {
                                preSibling.cancelKfDragoverKf();
                                this.cancelKfDragoverKf();
                                preSibling.showDuration();
                            }
                            this.container.setAttributeNS(null, 'transform', this.container.getAttributeNS(null, '_transform'));
                            if (this.treeLevel === 1) {
                                // this.parentObj.container.insertBefore(this.container, this.parentObj.groupMenu.container);
                                if (typeof nextSibling !== 'undefined') {
                                    this.parentObj.container.insertBefore(this.container, nextSibling.container);
                                } else {
                                    this.parentObj.container.insertBefore(this.container, this.parentObj.groupMenu.container);
                                }
                            } else {
                                if (typeof nextSibling !== 'undefined') {
                                    this.parentObj.container.insertBefore(this.container, nextSibling.container);
                                } else {
                                    this.parentObj.container.appendChild(this.container);
                                }
                            }
                        } else {
                            State.tmpStateBusket.push({
                                historyAction: { actionType: action.UPDATE_SPEC_ANIMATIONS, actionVal: JSON.stringify(state.spec.animations) },
                                currentAction: { actionType: actionType, actionVal: actionInfo }
                            })
                            State.saveHistory();
                            Reducer.triger(actionType, actionInfo);
                            popKfContainer.removeChild(this.container);
                        }
                    }
                }

            }
        }


        this.hoverBtnContainer.appendChild(this.dragBtn);

        this.container.appendChild(this.hoverBtnContainer);
    }

    /**
     * when dragging a group, check whether it is outside its parent group
     */
    public checkDragOutOfGroup(posiDiff: ICoord): boolean {
        const parentBBox: DOMRect = this.parentObj.container.getBoundingClientRect();
        const tmpCurrentBBox: DOMRect = this.container.getBoundingClientRect();

        if (tmpCurrentBBox.top + posiDiff.y < parentBBox.top ||
            tmpCurrentBBox.bottom + posiDiff.y > parentBBox.bottom ||
            tmpCurrentBBox.left + posiDiff.x < parentBBox.left ||
            tmpCurrentBBox.right + posiDiff.x > parentBBox.right) {
            return true;
        }
        return false;
    }

    public drawKfBg(treeLevel: number, size?: ISize): void {
        if (typeof size !== 'undefined') {
            this.kfWidth = size.w;
        } else {
            this.kfWidth = KfItem.KF_WIDTH - treeLevel * KfItem.KF_W_STEP;
        }
        this.kfBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.kfBg.setAttributeNS(null, 'fill', '#fff');
        this.kfBg.setAttributeNS(null, 'x', `${typeof this.offsetIllus === 'undefined' ? 0 : this.offsetWidth}`);
        this.kfBg.setAttributeNS(null, 'y', '0');
        this.kfBg.setAttributeNS(null, 'width', `${this.kfWidth}`);
        this.kfBg.setAttributeNS(null, 'height', `${this.kfHeight}`);
        this.totalWidth += this.kfWidth;
    }

    public drawChart(allMarks: string[], allGroupMarks: string[], marksThisKf: string[], chartThumbnail?: string): void {
        if (typeof chartThumbnail === 'undefined') {
            const svg: HTMLElement = document.getElementById('visChart');
            Array.from(svg.getElementsByClassName('mark')).forEach((m: HTMLElement) => {
                if (!allMarks.includes(m.id) && !marksThisKf.includes(m.id)) {
                    m.setAttributeNS(null, '_opacity', m.getAttributeNS(null, 'opacity') ? m.getAttributeNS(null, 'opacity') : '1');
                    m.setAttributeNS(null, 'opacity', '0');
                    m.classList.add('translucent-mark');
                } else if (allMarks.includes(m.id) && !marksThisKf.includes(m.id) && !allGroupMarks.includes(m.id)) {
                    m.setAttributeNS(null, '_opacity', m.getAttributeNS(null, 'opacity') ? m.getAttributeNS(null, 'opacity') : '1');
                    m.setAttributeNS(null, 'opacity', '0.4');
                    m.classList.add('translucent-mark');
                }
            })
            this.renderChartToCanvas(svg, true);
            Array.from(svg.getElementsByClassName('translucent-mark')).forEach((m: HTMLElement) => {
                m.classList.remove('translucent-mark');
                m.setAttributeNS(null, 'opacity', m.getAttributeNS(null, '_opacity'));
            })
        } else {
            const tmpContainer: HTMLDivElement = document.createElement('div');
            tmpContainer.innerHTML = chartThumbnail;
            this.renderChartToCanvas(<HTMLElement>tmpContainer.children[0], false);
        }
    }

    public renderChartToCanvas(svg: HTMLElement, doEnlarge: boolean): void {
        const shownThumbnail: number = Math.floor((state.zoomLevel - ViewWindow.MIN_ZOOM_LEVEL) / ((ViewWindow.MAX_ZOOM_LEVEL - ViewWindow.MIN_ZOOM_LEVEL) / (state.chartThumbNailZoomLevels / 2)));
        for (let i = 0; i < state.chartThumbNailZoomLevels / 2; i++) {
            if (doEnlarge) {
                Tool.enlargeMarks(svg, 'translucent-mark', state.chartThumbNailZoomLevels / 2 - i, false);
            }
            this.chartThumbnails.push(this.createImage(svg, shownThumbnail - 1 === i));
            if (doEnlarge) {
                Tool.resetTxtCover(svg);
            }
        }
        if (doEnlarge) {
            Tool.resetMarkSize(svg, 'translucent-mark', false);
        }
    }

    public createImage(svg: HTMLElement, shown: boolean): SVGImageElement {
        const imgSrc: string = Tool.svg2url(svg);
        const chartThumbnail: SVGImageElement = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        if (!shown) {
            chartThumbnail.classList.add('no-display-ele');
        }
        chartThumbnail.setAttributeNS(null, 'x', `${typeof this.offsetIllus === 'undefined' ? 0 : this.offsetWidth}`);
        chartThumbnail.setAttributeNS(null, 'y', '0');
        chartThumbnail.setAttributeNS(null, 'width', `${this.kfWidth}`);
        chartThumbnail.setAttributeNS(null, 'height', `${this.kfHeight}`);
        chartThumbnail.setAttributeNS(null, 'href', imgSrc);
        this.container.appendChild(chartThumbnail);
        return chartThumbnail;
    }

    public highlightKf() {
        this.isHighlighted = true;
        this.kfBg.setAttributeNS(null, 'class', 'highlight-kf');
    }

    public cancelHighlightKf() {
        this.isHighlighted = false;
        this.kfBg.classList.remove('highlight-kf');
    }

    public transNextKf(transX: number) {
        let nextKf: KfItem | KfOmit;
        for (let i = 0, len = this.parentObj.children.length; i < len; i++) {
            if (this.parentObj.children[i].id === this.id) {
                nextKf = <KfItem | KfOmit>this.parentObj.children[i + 1];
                break;
            }
        }
        // this.parentObj.translateGroup(nextKf, transX, true);
        const oriTrans: ICoord = Tool.extractTransNums(nextKf.container.getAttributeNS(null, 'transform'));
        nextKf.translateContainer(oriTrans.x + transX, oriTrans.y);
        this.parentObj.updateSize();
    }

    public startAdjustingTime() {
        this.parentObj.transHideTitle();
    }

    public dragSelOver() {
        Tool.clearDragOver();
        this.kfBg.setAttributeNS(null, 'class', 'dragover-kf');
        KfItem.dragoverKf = this;
    }

    public dragSelOut() {
        this.kfBg.classList.remove('dragover-kf');
        KfItem.dragoverKf = undefined;
    }

    public dropSelOn() { }

    /**
     * translate kfs and groups aligned to this kf
     * @param transX 
     * @param updateAlignedKfs: might further influence other aligned elements 
     */
    public translateAlignedGroups(transX: number, updateAlignedKfs: boolean): void {
        if (typeof KfItem.allKfInfo.get(this.id).alignWithKfs !== 'undefined') {
            IntelliRefLine.updateLine(this.id);//k is a alignwith kf, update refline
            KfItem.allKfInfo.get(this.id).alignWithKfs.forEach((kfId: number) => {
                const tmpKfItem = KfItem.allKfItems.get(kfId);
                if (typeof tmpKfItem !== 'undefined') {
                    // tmpKfItem.parentObj.translateGroup(tmpKfItem, transX, updateAlignedKfs, true, true);
                    const tmpTrans: ICoord = Tool.extractTransNums(tmpKfItem.container.getAttributeNS(null, 'transform'));
                    tmpKfItem.translateContainer(tmpTrans.x + transX, tmpTrans.y);
                    let [diffX, currentGroupWidth, childHeight] = tmpKfItem.parentObj.updateSize();
                    const oriTrans: ICoord = Tool.extractTransNums(tmpKfItem.parentObj.container.getAttributeNS(null, 'transform'));
                    tmpKfItem.parentObj.translateContainer(oriTrans.x + diffX, oriTrans.y);
                    //check whether need to update omit
                    tmpKfItem.parentObj.kfOmits.forEach((kfo: KfOmit) => {
                        const omitTrans: ICoord = Tool.extractTransNums(kfo.container.getAttributeNS(null, 'transform'));
                        if (omitTrans.x >= tmpTrans.x) {
                            let omitTransX: number = diffX === 0 ? transX : 0;
                            kfo.translateContainer(omitTrans.x + omitTransX, omitTrans.y);
                        }
                    })
                }
            })
        }
    }

    public zoomItem(shownThumbnail: number): void {
        this.chartThumbnails.forEach((ct: SVGImageElement, i: number) => {
            if (i === shownThumbnail) {
                ct.classList.remove('no-display-ele');
            } else {
                ct.classList.add('no-display-ele');
            }
        })
    }

    /**
     * check whether there are ancessters which are not rendered when zoomming
     */
    public checkParentRenderedWhenZooming(): boolean {
        let parent: KfGroup | KfTrack = this.parentObj;
        while (true) {
            if (parent instanceof KfTrack) {
                break;
            } else {
                if (!parent.renderWhenZooming || !parent.rendered) {
                    return false;
                }
                parent = parent.parentObj;
            }
        }
        return true;
    }

    /**
     * return omit pattern and total height, currnet kf is the alignwith kf
     */
    public findOmitPattern(): [IOmitPattern[], number] {
        const currentKfInfo: IKeyframe = KfItem.allKfInfo.get(this.id);
        const omitPattern: IOmitPattern[] = [];
        let totalHeight: number = 0;
        if (typeof currentKfInfo !== 'undefined') {
            omitPattern.push({
                merge: false,
                timing: TimingSpec.timingRef.previousStart,
                hasOffset: this.hasOffset,
                hasDuration: true
            })
            totalHeight = KfTrack.TRACK_HEIGHT;
            currentKfInfo.alignWithKfs.forEach((tmpKfId: number) => {
                const tmpKf: KfItem = KfItem.allKfItems.get(tmpKfId);
                const tmpKfInfo: IKeyframe = KfItem.allKfInfo.get(tmpKfId);
                const tmpKfGroup: KfGroup = tmpKf.parentObj;
                if (!tmpKfGroup.alignMerge) {
                    totalHeight += KfTrack.TRACK_HEIGHT;
                }
                omitPattern.push({
                    merge: tmpKfGroup.alignMerge,
                    timing: tmpKfInfo.timingRef,
                    hasOffset: tmpKf.hasOffset,
                    hasDuration: true
                })
            })
        }
        return [omitPattern, totalHeight];
    }

    public showItemWhenZooming(): void {
        if (this.rendered && state.charts.length === 1) {
            const currentKfWidth: number = this.container.getBoundingClientRect().width / state.zoomLevel;//current width with no white space (when align to others, the white space is included in the totalWidth attrbute)
            let kfWidthWithWhiteSpace: number = currentKfWidth;
            const currentKfTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
            let currentKfIdx: number = this.idxInGroup;
            let passedOmits: number = 0;
            let omitWidth: number = KfOmit.OMIT_WIDTH;

            while (true) {
                if (currentKfIdx - 1 >= 0) {
                    const preChild: KfItem | KfOmit = <KfItem | KfOmit>this.parentObj.children[currentKfIdx - 1];
                    let preChildWidth: number = preChild.container.getBoundingClientRect().width / state.zoomLevel;
                    let preChildTrans: ICoord = Tool.extractTransNums(preChild.container.getAttributeNS(null, 'transform'));
                    if (preChild instanceof KfItem) {
                        if (preChildTrans.x + preChildWidth + passedOmits * (KfGroup.PADDING * 2 + omitWidth) === currentKfTrans.x) {
                            break;
                        } else if (currentKfTrans.x > preChildTrans.x + preChildWidth + passedOmits * (KfGroup.PADDING * 2 + omitWidth)) {
                            kfWidthWithWhiteSpace += (currentKfTrans.x - preChildTrans.x - preChildWidth - passedOmits * (KfGroup.PADDING * 2 + omitWidth));
                            break;
                        }
                    } else if (preChild instanceof KfOmit) {
                        omitWidth = KfOmit.maxOmitWidth;
                        // omitWidth = preChild.oWidth;
                        passedOmits++;
                    }
                    currentKfIdx--;
                } else {
                    break;
                }
            }

            //if this kf is aligned to or with some kf, fetch the line
            let refLine: IntelliRefLine;
            if (typeof IntelliRefLine.kfLineMapping.get(this.id) !== 'undefined') {
                refLine = IntelliRefLine.allLines.get(IntelliRefLine.kfLineMapping.get(this.id).lineId);
            } else {
                //check whether this is an alignto kf
                if (typeof KfItem.allKfInfo.get(this.id).alignTo !== 'undefined' && typeof IntelliRefLine.kfLineMapping.get(KfItem.allKfInfo.get(this.id).alignTo) !== 'undefined') {
                    refLine = IntelliRefLine.allLines.get(IntelliRefLine.kfLineMapping.get(KfItem.allKfInfo.get(this.id).alignTo).lineId);
                }
            }
            const kfZoomLevel: number = Tool.calKfZoomLevel();
            if (!this.renderWhenZooming) {//rendered -> not rendered : scale down
                this.container.setAttributeNS(null, 'display', 'none');
                if (typeof refLine !== 'undefined') {
                    refLine.zoomHideLine();
                }
                if (this.parentObj.kfOmits.length === 0) {
                    const kfTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
                    const kfOmit: KfOmit = new KfOmit();
                    //decide the omit pattern
                    let omitType: string = KfOmit.KF_OMIT;
                    let omitStartY: number = this.kfHeight / 2;
                    if (typeof KfItem.allKfInfo.get(this.id).alignWithKfs !== 'undefined') {
                        if (KfItem.allKfInfo.get(this.id).alignWithKfs.length > 0) {
                            omitType = KfOmit.KF_ALIGN;
                            [kfOmit.omitPattern, omitStartY] = this.findOmitPattern();
                            omitStartY /= 2;
                        }
                    }
                    kfOmit.createOmit(omitType, kfTrans.x + kfWidthWithWhiteSpace - KfGroup.PADDING, 1, this.parentObj, this.hasOffset, this.hasDuration, omitStartY, this.idxInGroup);
                    this.parentObj.insertChild(kfOmit, this.idxInGroup + 1)
                    kfOmit.idxInGroup = this.idxInGroup + 1;
                    this.parentObj.kfOmits.push(kfOmit);
                    this.parentObj.translateGroup(this, -kfWidthWithWhiteSpace + KfOmit.maxOmitWidth, false, false, false);
                    //update the position of omits
                    const oriOmitTrans: ICoord = Tool.extractTransNums(kfOmit.container.getAttributeNS(null, 'transform'));
                    kfOmit.updateTrans(oriOmitTrans.x - KfOmit.maxOmitWidth, oriOmitTrans.y + kfOmit.oHeight / 2);
                } else {
                    this.parentObj.kfOmits[0].updateNum(this.parentObj.kfOmits[0].omittedNum + 1);
                    this.parentObj.translateGroup(this, -kfWidthWithWhiteSpace, false, false, false);
                }
            } else {//not rendered -> rendered: scale up
                this.container.setAttributeNS(null, 'display', '');
                if (typeof refLine !== 'undefined') {
                    refLine.zoomShowLine();
                }
                if (this.parentObj.kfOmits[0].omittedNum === 1) {//remove kfOmit
                    const tmpOmit: KfOmit = this.parentObj.kfOmits[0];
                    tmpOmit.removeOmit(this.parentObj);
                    this.parentObj.removeChild(this.parentObj.kfOmits[0].idxInGroup);
                    this.parentObj.translateGroup(<KfItem | KfOmit>this.parentObj.children[this.idxInGroup - 1], -omitWidth, false, false, false);
                    this.parentObj.translateGroup(this, kfWidthWithWhiteSpace, false, false, false);
                    this.parentObj.kfOmits.splice(0, 1);
                } else {//update number
                    this.parentObj.kfOmits[0].updateNum(this.parentObj.kfOmits[0].omittedNum - 1);
                    this.parentObj.translateGroup(this, kfWidthWithWhiteSpace, false, false, false);
                    //restore the omit position to the right side of its preItem
                    // const preItemTrans: ICoord = Tool.extractTransNums(this.parentObj.kfOmits[0].preItem.container.getAttributeNS(null, 'transform'));
                    // const oriOmitTrans: ICoord = Tool.extractTransNums(this.parentObj.kfOmits[0].container.getAttributeNS(null, 'transform'));
                    // const preKfWidth: number = (<KfItem>this.parentObj.kfOmits[0].preItem).container.getBoundingClientRect().width / state.zoomLevel;
                    // this.parentObj.kfOmits[0].updateTrans(preItemTrans.x + preKfWidth, oriOmitTrans.y + this.parentObj.kfOmits[0].oHeight / 2);
                    this.transOmitsWithItem();
                }
            }
        }
    }
}