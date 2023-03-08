import KfGroup from "./kfGroup";
import KfItem from "./kfItem";
import { ICoord } from "../../util/ds";
import Tool from "../../util/tool";
import { state } from "../../app/state";
import { Animation, TimingSpec } from 'canis_toolkit'
import { IOmitPattern } from "../../app/core/ds";
import IntelliRefLine from "./intelliRefLine";
import { KfContainer } from "../kfContainer";
import KfTrack from "./kfTrack";

export default class KfOmit {
    static OMIT_WIDTH: number = 36;
    static OMIT_W_UNIT: number = KfOmit.OMIT_WIDTH / 6;
    static OMIT_SUB_WIDTH: number = 24;
    static OMIT_SUB_W_UNIT: number = KfOmit.OMIT_SUB_WIDTH / 6;
    static OMIT_HEIGHT: number = 20;
    static OMIT_SUB_HEIGHT: number = 14;
    static KF_OMIT: string = 'kfOmit';
    static KF_GROUP_OMIT: string = 'kfGroupOmit';
    static KF_ALIGN: string = 'kfAlign';
    static omitIdx: number = 0;
    static maxOmitWidth: number = KfOmit.OMIT_WIDTH;

    public id: string;
    public idxInGroup: number = -1;
    public isHidden: boolean = false;
    public oWidth: number = KfOmit.OMIT_WIDTH;
    public oHeight: number = KfOmit.OMIT_HEIGHT;
    public container: SVGGElement;
    public num: SVGTextElement;
    public hasOffset: boolean;
    public hasDuration: boolean;
    public iconContainer: SVGGElement;
    public parentObj: KfGroup;
    public preItem: KfItem | KfGroup;
    public startX: number;
    public startY: number;
    public omitType: string;
    public omitPattern: {
        merge: boolean
        timing: string
        hasOffset: boolean
        hasDuration: boolean
    }[] = [];
    public omittedNum: number;//could be kfitem or kfgroup
    public kfIcon: SVGRectElement;
    public offsetIcon: SVGRectElement;
    public durationIcon: SVGRectElement;
    public IconComb: SVGGElement;
    public rendered: boolean = true;
    public useTag: SVGUseElement;

    public static reset() {
        this.omitIdx = 0;
        this.maxOmitWidth = KfOmit.OMIT_WIDTH;
    }

    public createOmit(omitType: string, startX: number, omittedNum: number, parentObj: KfGroup, hasOffset: boolean, hasDuration: boolean, startY: number, preItemIdx: number = -1): void {
        this.omitType = omitType;
        this.hasOffset = hasOffset;
        this.hasDuration = hasDuration;
        this.parentObj = parentObj;
        // this.preItem = preItemIdx === -1 ? <KfGroup | KfItem>this.parentObj.children[this.parentObj.children.length - 1] : <KfGroup | KfItem>this.parentObj.children[preItemIdx];
        this.omittedNum = omittedNum;
        this.startX = startX;
        this.startY = startY;
        this.id = `kfOmit${KfOmit.omitIdx}`;
        KfOmit.omitIdx++;

        //assign pre item
        if (preItemIdx !== -1 && this.parentObj.children[preItemIdx].rendered) {
            this.preItem = <KfGroup | KfItem>this.parentObj.children[preItemIdx];
        } else {
            let lastRenderedItem: KfGroup | KfItem;
            this.parentObj.children.forEach((c: KfGroup | KfItem | KfOmit) => {
                if ((c instanceof KfGroup || c instanceof KfItem) && c.rendered) {
                    lastRenderedItem = c;
                }
            })
            this.preItem = lastRenderedItem;
        }

        if (this.preItem instanceof KfItem) {
            if (this.preItem.hasHiddenDuration) {
                this.startX -= this.preItem.durationWidth;
            }
        }

        if (typeof this.parentObj.container !== 'undefined') {
            this.renderOmit();
        }
    }

    public renderOmit() {
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.id = this.id;
        //create thumbnail
        this.createThumbnail(this.omittedNum);
        //create dots
        this.createDots();
        this.parentObj.container.appendChild(this.container);
        // if (this.parentObj.children[this.parentObj.children.length - 1] instanceof KfItem) {
        // this.correctTrans(this.startY - this.oHeight / 2);
        // }
        if (typeof this.parentObj.alignTarget !== 'undefined' && this.parentObj.alignType === Animation.alignTarget.withEle) {
            this.hideOmit();
        }
        console.log('init omit position: ', this.startX+KfGroup.PADDING);
        this.translateContainer(this.startX + KfGroup.PADDING, this.startY - this.oHeight / 2);
        if (this.omitType === KfOmit.KF_ALIGN) {
            this.createUseTag();
        }
    }

    public createUseTag() {
        this.useTag = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        this.useTag.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${this.id}`);
        document.getElementById(KfContainer.KF_OMIT).appendChild(this.useTag);
        this.updateUseTagPosi();
        // this.hideOmit();
    }

    public updateUseTagPosi() {
        const kfFgBbox: DOMRect = document.getElementById(KfContainer.KF_FG).getBoundingClientRect();
        const parentBbox: DOMRect = this.parentObj.groupBg.getBoundingClientRect();
        this.useTag.setAttributeNS(null, 'x', `${(parentBbox.x - kfFgBbox.x) / state.zoomLevel}`);
        this.useTag.setAttributeNS(null, 'y', `${(parentBbox.y - kfFgBbox.y) / state.zoomLevel}`);
    }

    public createThumbnail(omittedNum: number): void {
        this.iconContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.iconContainer.setAttributeNS(null, 'transform', `translate(${KfOmit.OMIT_W_UNIT / 2}, 0)`);
        switch (this.omitType) {
            case KfOmit.KF_OMIT:
                this.kfIcon = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                this.kfIcon.setAttributeNS(null, 'y', '0');
                this.kfIcon.setAttributeNS(null, 'fill', '#fff');
                this.kfIcon.setAttributeNS(null, 'height', `${this.oHeight}`);
                this.iconContainer.appendChild(this.kfIcon);
                break;
            case KfOmit.KF_ALIGN:
                this.createThumbnailComb();
                this.iconContainer.appendChild(this.IconComb);
                break;
            case KfOmit.KF_GROUP_OMIT:
                this.kfIcon = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                this.kfIcon.setAttributeNS(null, 'y', '0');
                this.kfIcon.setAttributeNS(null, 'fill', 'rgb(239, 239, 239)');
                this.kfIcon.setAttributeNS(null, 'stroke', '#898989');
                this.kfIcon.setAttributeNS(null, 'height', `${this.oHeight}`);
                this.kfIcon.setAttributeNS(null, 'width', `${KfOmit.OMIT_W_UNIT * 5}`);
                this.kfIcon.setAttributeNS(null, 'rx', `${KfGroup.GROUP_RX / 2}`);
                this.iconContainer.appendChild(this.kfIcon);
                break;
        }

        this.offsetIcon = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.offsetIcon.setAttributeNS(null, 'x', '0');
        this.offsetIcon.setAttributeNS(null, 'y', '0');
        this.offsetIcon.setAttributeNS(null, 'fill', KfItem.OFFSET_COLOR);
        this.offsetIcon.setAttributeNS(null, 'height', `${this.oHeight}`);
        this.durationIcon = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        console.log('omit pattern: ', this.preItem)
        if (typeof this.preItem !== 'undefined') {
            this.durationIcon.setAttributeNS(null, 'y', this.preItem.hasHiddenDuration ? `${-this.oHeight / 4}` : '0');
            this.durationIcon.setAttributeNS(null, 'height', this.preItem.hasHiddenDuration ? `${5 * this.oHeight / 4}` : `${this.oHeight}`);
        } else {
            this.durationIcon.setAttributeNS(null, 'y', '0');
            this.durationIcon.setAttributeNS(null, 'height', `${this.oHeight}`);
        }
        this.durationIcon.setAttributeNS(null, 'fill', KfItem.DURATION_COLOR);
        this.iconContainer.appendChild(this.offsetIcon);
        this.iconContainer.appendChild(this.durationIcon);
        this.updateThumbnail(this.hasOffset, this.hasDuration);
        this.createNum(omittedNum);
        this.container.appendChild(this.iconContainer);
    }

    public createThumbnailComb() {
        this.IconComb = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        let trackCount: number = 0;
        this.oWidth = KfOmit.OMIT_SUB_WIDTH;
        this.oHeight = KfOmit.OMIT_SUB_HEIGHT;
        this.omitPattern.forEach((ommittedKf: IOmitPattern, idx: number) => {
            let trackNum: number = 1;
            if (ommittedKf.timing === TimingSpec.timingRef.previousStart || !ommittedKf.merge) {
                trackCount++;
                trackNum = trackCount;
            }
            // const trackNum: number = ((!ommittedKf.merge && ommittedKf.timing === TimingSpec.timingRef.previousEnd) || ommittedKf.timing === TimingSpec.timingRef.previousStart) ? trackCount : 0;
            this.IconComb.appendChild(this.createSubThumbnail(
                ommittedKf.hasOffset,
                trackNum,
                idx,
                ommittedKf.timing === TimingSpec.timingRef.previousEnd,
                ommittedKf.merge
            ))
        })
        if (this.oWidth > KfOmit.maxOmitWidth) {
            KfOmit.maxOmitWidth = this.oWidth;
        }
    }

    /**
     * create single thumbnail in the combination
     * @param hasOffset 
     * @param index 
     */
    public createSubThumbnail(hasOffset: boolean, trackNum: number, index: number, afterPre: boolean, merge: boolean): SVGGElement {
        const tmpContainer: SVGGElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tmpContainer.setAttributeNS(null, 'transform', `translate(${(afterPre && index > 0) ? this.oWidth : 0}, ${trackNum * (KfOmit.OMIT_SUB_HEIGHT + 2)})`);
        //update the omit size 
        this.oWidth = (afterPre && index > 0) ? this.oWidth + KfOmit.OMIT_SUB_WIDTH : this.oWidth;
        this.oHeight = (trackNum + 1) * KfOmit.OMIT_SUB_HEIGHT > this.oHeight ? (trackNum + 1) * (KfOmit.OMIT_SUB_HEIGHT + 2) : this.oHeight;
        if (hasOffset) {
            const offsetBg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            offsetBg.setAttributeNS(null, 'fill', KfItem.OFFSET_COLOR);
            offsetBg.setAttributeNS(null, 'width', `${KfOmit.OMIT_SUB_W_UNIT}`);
            offsetBg.setAttributeNS(null, 'height', `${KfOmit.OMIT_SUB_HEIGHT}`);
            tmpContainer.appendChild(offsetBg);
        }
        const kfBg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        kfBg.setAttributeNS(null, 'fill', '#ffffff');
        kfBg.setAttributeNS(null, 'x', `${hasOffset ? KfOmit.OMIT_SUB_W_UNIT : 0}`);
        kfBg.setAttributeNS(null, 'width', `${hasOffset ? KfOmit.OMIT_SUB_W_UNIT * 4 : KfOmit.OMIT_SUB_W_UNIT * 5}`);
        kfBg.setAttributeNS(null, 'height', `${KfOmit.OMIT_SUB_HEIGHT}`);
        tmpContainer.appendChild(kfBg);
        const duraitonBg: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        duraitonBg.setAttributeNS(null, 'fill', KfItem.DURATION_COLOR);
        duraitonBg.setAttributeNS(null, 'x', `${KfOmit.OMIT_SUB_W_UNIT * 5}`);
        duraitonBg.setAttributeNS(null, 'height', `${KfOmit.OMIT_SUB_HEIGHT}`);
        duraitonBg.setAttributeNS(null, 'width', `${KfOmit.OMIT_SUB_W_UNIT}`);
        tmpContainer.appendChild(duraitonBg);

        if (index > 0 && afterPre && merge) {
            const frame: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            frame.setAttributeNS(null, 'width', `${KfOmit.OMIT_SUB_WIDTH}`);
            frame.setAttributeNS(null, 'height', `${KfOmit.OMIT_SUB_HEIGHT}`);
            frame.setAttributeNS(null, 'fill', 'none');
            frame.setAttributeNS(null, 'stroke', IntelliRefLine.STROKE_COLOR);
            frame.setAttributeNS(null, 'stroke-dasharray', '2 1');
            tmpContainer.appendChild(frame);
        } else if (index > 0 && afterPre && !merge) {
            const lineStartY: number = -(trackNum - 1) * KfOmit.OMIT_SUB_HEIGHT;
            const lineHeight: number = (trackNum + 1) * KfOmit.OMIT_SUB_HEIGHT;
            const refLine: SVGLineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            refLine.setAttributeNS(null, 'x1', '0');
            refLine.setAttributeNS(null, 'x2', '0');
            refLine.setAttributeNS(null, 'y1', `${lineStartY}`);
            refLine.setAttributeNS(null, 'y2', `${KfOmit.OMIT_SUB_HEIGHT}`);
            refLine.setAttributeNS(null, 'stroke', IntelliRefLine.STROKE_COLOR);
            refLine.setAttributeNS(null, 'stroke-dasharray', '2 1');
            tmpContainer.appendChild(refLine);
        }
        return tmpContainer;
    }

    public updateThumbnail(hasOffset: boolean, hasDuration: boolean): void {
        switch (this.omitType) {
            case KfOmit.KF_OMIT:
                this.hasOffset = hasOffset;
                this.hasDuration = hasDuration;
                if (this.hasOffset) {
                    this.offsetIcon.setAttributeNS(null, 'width', `${KfOmit.OMIT_W_UNIT}`);
                    this.kfIcon.setAttributeNS(null, 'x', `${KfOmit.OMIT_W_UNIT}`);
                    // if (this.hasDuration) {
                        this.kfIcon.setAttributeNS(null, 'width', `${KfOmit.OMIT_W_UNIT * 3}`);
                        this.durationIcon.setAttributeNS(null, 'x', `${KfOmit.OMIT_W_UNIT * 4}`);
                        this.durationIcon.setAttributeNS(null, 'width', `${KfOmit.OMIT_W_UNIT}`);
                    // } else {
                    //     this.kfIcon.setAttributeNS(null, 'width', `${KfOmit.OMIT_W_UNIT * 4}`);
                    //     this.durationIcon.setAttributeNS(null, 'width', '0');
                    // }
                } else {
                    this.offsetIcon.setAttributeNS(null, 'width', '0');
                    this.kfIcon.setAttributeNS(null, 'x', '0');
                    // if (this.hasDuration) {
                        this.kfIcon.setAttributeNS(null, 'width', `${KfOmit.OMIT_W_UNIT * 4}`);
                        this.durationIcon.setAttributeNS(null, 'x', `${KfOmit.OMIT_W_UNIT * 4}`);
                        this.durationIcon.setAttributeNS(null, 'width', `${KfOmit.OMIT_W_UNIT}`);
                    // } else {
                    //     this.kfIcon.setAttributeNS(null, 'width', `${KfOmit.OMIT_W_UNIT * 5}`);
                    //     this.durationIcon.setAttributeNS(null, 'width', '0');
                    // }
                }
                break;
        }
    }

    /**
     * when this group is aligned to other groups, then the startX is not correct
     */
    public correctTrans(targetKf: KfItem): void {
        const targetKfTrans: ICoord = Tool.extractTransNums(targetKf.container.getAttributeNS(null, 'transform'));
        const targetKfBBox: DOMRect = targetKf.container.getBoundingClientRect();
        const currentOmitBbox: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
        console.log('updateing omit x1: ', targetKfTrans.x + targetKfBBox.width / state.zoomLevel + KfGroup.PADDING);
        this.translateContainer(targetKfTrans.x + targetKfBBox.width / state.zoomLevel + KfGroup.PADDING, currentOmitBbox.y);
    }

    public updateTrans(startX: number, startY: number): void {
        console.log('updateing omit x2: ', startX);
        this.translateContainer(startX, startY - this.oHeight / 2);
    }

    public translateContainer(x: number, y: number) {
        console.log('fuck: ', x);
        this.container.setAttributeNS(null, 'transform', `translate(${x}, ${y})`);
    }

    public createNum(omittedNum: number): void {
        this.num = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.num.setAttributeNS(null, 'x', `${this.oWidth / 2}`);
        this.num.setAttributeNS(null, 'y', `${this.omitType === KfOmit.KF_ALIGN ? this.oHeight + 15 : 15}`);
        this.num.setAttributeNS(null, 'font-size', '12px');
        this.num.setAttributeNS(null, 'text-anchor', 'middle');
        this.num.innerHTML = `x${omittedNum}`;
        this.iconContainer.appendChild(this.num);
    }

    public updateNum(omittedNum: number): void {
        this.omittedNum = omittedNum;
        this.num.innerHTML = `x${omittedNum}`;
    }

    public createDots(): void {
        const dots: SVGTextElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dots.setAttributeNS(null, 'x', `${this.oWidth / 2}`);
        dots.setAttributeNS(null, 'y', `${this.omitType === KfOmit.KF_ALIGN ? this.oHeight + 25 : this.oHeight + 10}`);
        dots.setAttributeNS(null, 'font-size', '32px');
        dots.setAttributeNS(null, 'text-anchor', 'middle');
        dots.innerHTML = '...';
        this.container.appendChild(dots);
    }

    public showOmit(): void {
        if (typeof this.container !== 'undefined') {
            this.isHidden = false;
            this.container.setAttributeNS(null, 'opacity', '1');
        }
    }

    public hideOmit(): void {
        if (typeof this.container !== 'undefined') {
            this.isHidden = true;
            this.container.setAttributeNS(null, 'opacity', '0');
        }
    }

    public removeOmit(parentObj: KfGroup | KfTrack): void {
        if (parentObj.container.contains(this.container)) {
            parentObj.container.removeChild(this.container);
        }
    }
}