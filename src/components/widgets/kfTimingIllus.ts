import '../../assets/style/kfTimingIllus.scss'
import { hintTag } from "./hint";
import { ICoord } from "../../util/ds";
import Reducer from "../../app/reducer";
import * as action from "../../app/action";
import KfTrack from "./kfTrack";
import Tool from "../../util/tool";
import { state, State } from "../../app/state";
import KfItem from './kfItem';
import KfOmit from './kfOmit';

export default class KfTimingIllus {
    static SCALE_DOWN: string = 'scaleDown';
    static SCALE_UP: string = 'scaleUp';

    static BASIC_OFFSET_DURATION_W: number = 20;
    static OFFSET_COLOR: string = '#ff9246';
    static OFFSET_STRETCH_COLOR: string = '#ea5514';
    static DURATION_COLOR: string = '#71b1ed';
    static DURATION_STRETCH_COLOR: string = '#358bcb';
    static TIMING_TYPE_OFFSET: string = 'offset';
    static TIMING_TYPE_DURATION: string = 'duration';
    static EXTRA_HEIGHT: number = 7;//for hidden duration
    static minDuration: number = 300;
    static maxDuration: number = 0;
    static minOffset: number = 300;
    static maxOffset: number = 0;

    public isDragging: boolean = false;
    public aniId: string;
    public parentObj: any;
    public id: number;
    public groupRef: string;
    public timingType: string;

    public mouseIsOver: boolean = false;

    public hasOffset: boolean = false;
    public offsetNum: number = 0;
    public _offsetDiff: number = 0;
    public offsetIllus: SVGGElement
    public offsetBg: SVGRectElement
    public offsetWidth: number = 0
    public groupRx: number = 0;
    public offsetIcon: SVGGElement

    public hasHiddenDuration: boolean = false;//previous start + delay
    public hasDuration: boolean = false;
    public durationNum: number = 0;
    public _durationDiff: number = 0;
    public durationIllus: SVGGElement
    public durationBg: SVGRectElement
    public durationIcon: SVGGElement
    public textWrapper: SVGGElement
    public textInput: HTMLInputElement
    public durationWidth: number = 0

    public container: SVGGElement;
    public stretchBar: SVGRectElement;

    set offsetDiff(od: number) {
        this._offsetDiff = od;
        Tool.transNodeElements(this.container, od, true);
    }
    get offsetDiff(): number {
        return this._offsetDiff;
    }

    set durationDiff(dd: number) {
        this._durationDiff = dd;
    }

    get durationDiff(): number {
        return this._durationDiff;
    }

    public addEasingTransform() { }
    public removeEasingTransform() { }

    public bindOffsetHover(type: string, groupRef: string) {
        this.offsetIllus.onmouseenter = (enterEvt) => {
            if (!state.mousemoving && !this.mouseIsOver) {
                hintTag.removeTimingHint();
                const timingBBox: DOMRect = this.offsetBg.getBoundingClientRect();//fixed
                let actionType: string = '';
                let actionInfo: any = {};
                switch (type) {
                    case 'offset-animation':
                        actionType = action.UPDATE_ANI_OFFSET;
                        actionInfo = { aniId: this.aniId }
                        break;
                    case 'offset-group':
                        actionType = action.UPDATE_DELAY_BETWEEN_GROUP;
                        actionInfo = { aniId: this.aniId, groupRef: groupRef }
                        break;
                    case 'offset-kf':
                        actionType = action.UPDATE_DELAY_BETWEEN_KF;
                        actionInfo = { aniId: this.aniId }
                        break;
                }
                hintTag.createTimingHint({ x: timingBBox.left + timingBBox.width / 2, y: timingBBox.top }, `delay:${this.offsetNum}ms`, actionType, actionInfo);
            }
            this.mouseIsOver = true;
        }
        this.offsetIllus.onmouseleave = (leaveEvt: any) => {
            if (!hintTag.container.contains(leaveEvt.toElement)) {
                hintTag.removeTimingHint();
            }
            this.mouseIsOver = false;
        }
    }

    public unbindOffsetHover() {
        this.offsetIllus.onmouseenter = null;
        this.offsetIllus.onmouseleave = null;
    }

    public drawOffset(offset: number, widgetHeight: number, groupRx: number, fake: boolean = false): void {
        this.timingType = KfTimingIllus.TIMING_TYPE_OFFSET;
        this.offsetNum = offset;
        this.groupRx = groupRx;
        if (KfTimingIllus.minOffset === 0) {
            this.offsetWidth = KfTimingIllus.BASIC_OFFSET_DURATION_W;
        } else {
            this.offsetWidth = KfTimingIllus.BASIC_OFFSET_DURATION_W * this.offsetNum / KfTimingIllus.minOffset;
        }
        this.offsetIllus = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.offsetBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        if (fake) {
            this.offsetBg.setAttributeNS(null, 'x', `${-KfTimingIllus.BASIC_OFFSET_DURATION_W}`);
        } else {
            this.offsetBg.setAttributeNS(null, 'x', '0');
        }
        this.offsetBg.setAttributeNS(null, 'y', '0');
        this.offsetBg.setAttributeNS(null, 'width', `${this.offsetWidth + this.groupRx}`);
        this.offsetBg.setAttributeNS(null, 'height', `${widgetHeight}`);
        this.offsetBg.setAttributeNS(null, 'fill', KfTimingIllus.OFFSET_COLOR);
        this.offsetIllus.appendChild(this.offsetBg);
        if (this.offsetWidth / 2 - 6 >= 0 && !fake) {
            this.drawArrowIcon({ x: this.offsetWidth / 2 - 6, y: widgetHeight / 2 - 6 }, KfTimingIllus.TIMING_TYPE_OFFSET);
            this.offsetIllus.appendChild(this.offsetIcon);
        }

        //create stretchable bar
        let offsetType: string = 'offset';
        let actionInfo: any = {};
        if (this.parentObj instanceof KfTrack) {
            offsetType += '-animation';
        } else {
            if (typeof this.groupRef !== 'undefined') {//this is kfgroup
                offsetType += '-group';
                actionInfo.groupRef = this.groupRef;
            } else {//this is kfitem
                offsetType += '-kf';
            }
        }
        this.stretchBar = this.createStretchBar(widgetHeight, offsetType, false, actionInfo);
        this.offsetIllus.appendChild(this.stretchBar);
        this.bindOffsetHover(offsetType, actionInfo.groupRef);
    }

    public updateOffset(widgetHeight: number): void {
        this.offsetBg.setAttributeNS(null, 'height', `${widgetHeight}`);
        this.stretchBar.setAttributeNS(null, 'height', `${widgetHeight}`);
        if (typeof this.offsetIcon !== 'undefined') {
            this.offsetIcon.setAttributeNS(null, 'transform', `translate(${this.offsetWidth / 2 - 6}, ${widgetHeight / 2 - 6})`)
        }
    }

    public bindDurationHover() {
        this.durationIllus.onmouseenter = (enterEvt) => {
            if (!state.mousemoving && !this.mouseIsOver) {
                hintTag.removeTimingHint();
                const timingBBox: DOMRect = this.durationBg.getBoundingClientRect();//fixed
                hintTag.createTimingHint({ x: timingBBox.left + timingBBox.width / 2, y: timingBBox.top }, `duration:${this.durationNum}ms`, action.UPDATE_DURATION, { aniId: this.aniId });
            }
            this.mouseIsOver = true;
        }
        this.durationIllus.onmouseleave = (leaveEvt: any) => {
            if (typeof hintTag.container !== 'undefined') {
                if (!hintTag.container.contains(leaveEvt.toElement)) {
                    hintTag.removeTimingHint();
                }
            }
            this.mouseIsOver = false;
        }
    }

    public unbindDurationHover() {
        this.durationIllus.onmouseenter = null;
        this.durationIllus.onmouseleave = null;
    }

    public drawDuration(duration: number, widgetX: number, widgetHeight: number, hiddenDuration: boolean): void {
        this.timingType = KfTimingIllus.TIMING_TYPE_DURATION;
        this.durationNum = duration
        if (KfTimingIllus.minDuration === 0) {
            this.durationWidth = KfTimingIllus.BASIC_OFFSET_DURATION_W;
        } else {
            this.durationWidth = KfTimingIllus.BASIC_OFFSET_DURATION_W * this.durationNum / KfTimingIllus.minDuration;
        }
        this.durationIllus = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const transX: number = typeof this.offsetIllus === 'undefined' ? widgetX : widgetX + this.offsetWidth;
        this.durationIllus.setAttributeNS(null, 'transform', `translate(${transX}, 0)`);
        this.durationBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.durationBg.setAttributeNS(null, 'x', '0');
        this.durationBg.setAttributeNS(null, 'y', hiddenDuration ? `${-KfTimingIllus.EXTRA_HEIGHT}` : '0');
        this.durationBg.setAttributeNS(null, 'fill', KfTimingIllus.DURATION_COLOR);
        this.durationBg.setAttributeNS(null, 'width', `${this.durationWidth}`);
        this.durationBg.setAttributeNS(null, 'height', `${hiddenDuration ? widgetHeight + KfTimingIllus.EXTRA_HEIGHT : widgetHeight}`);
        this.durationIllus.appendChild(this.durationBg);
        if (this.durationWidth / 2 - 6 >= 0) {
            this.drawArrowIcon({ x: this.durationWidth / 2 - 6, y: widgetHeight / 2 - 6 }, KfTimingIllus.TIMING_TYPE_DURATION);
            this.durationIllus.appendChild(this.durationIcon);
        }

        // this.createTimeText({ x: this.durationWidth / 2 - 6, y: widgetHeight / 2 - 26 });
        // this.durationIllus.appendChild(this.textWrapper);

        this.stretchBar = this.createStretchBar(widgetHeight, 'duration', hiddenDuration);
        this.durationIllus.appendChild(this.stretchBar);

        this.bindDurationHover();
    }

    public startAdjustingTime() { }
    public findNextSibling(): KfItem | KfOmit { return }
    public bindHoverBtn() { }
    public unbindHoverBtn() { }

    public hideArrow() {
        switch (this.timingType) {
            case KfTimingIllus.TIMING_TYPE_OFFSET:
                if (typeof this.offsetIcon !== 'undefined') {
                    this.offsetIcon.setAttributeNS(null, 'opacity', '0');
                }
                break;
            case KfTimingIllus.TIMING_TYPE_DURATION:
                if (typeof this.durationIcon !== 'undefined') {
                    this.durationIcon.setAttributeNS(null, 'opacity', '0');
                }
                break;
        }
    }

    public showArrow() {
        switch (this.timingType) {
            case KfTimingIllus.TIMING_TYPE_OFFSET:
                if (typeof this.offsetIcon !== 'undefined') {
                    this.offsetIcon.setAttributeNS(null, 'opacity', '1');
                }
                break;
            case KfTimingIllus.TIMING_TYPE_DURATION:
                if (typeof this.durationIcon !== 'undefined') {
                    this.durationIcon.setAttributeNS(null, 'opacity', '1');
                }
                break;
        }
    }

    public createStretchBar(barHeight: number, type: string, hiddenDuration: boolean, actionInfo: any = {}): SVGRectElement {
        //create stretchable bar
        const stretchBar: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        stretchBar.setAttributeNS(null, 'x', type === 'duration' ? `${this.durationWidth - 4}` : `${this.offsetWidth - 4}`);
        stretchBar.setAttributeNS(null, 'y', hiddenDuration ? `${-KfTimingIllus.EXTRA_HEIGHT}` : '0');
        stretchBar.setAttributeNS(null, 'width', '4');
        stretchBar.setAttributeNS(null, 'height', hiddenDuration ? `${barHeight + KfTimingIllus.EXTRA_HEIGHT}` : `${barHeight}`);
        stretchBar.setAttributeNS(null, 'fill', type === 'duration' ? KfTimingIllus.DURATION_STRETCH_COLOR : KfTimingIllus.OFFSET_STRETCH_COLOR);
        stretchBar.classList.add('ease-fade', 'stretchable-component', 'fadein-ele');

        stretchBar.onmousedown = (downEvt) => {
            Reducer.triger(action.UPDATE_MOUSE_MOVING, true);
            hintTag.removeHint();
            this.startAdjustingTime();
            this.removeEasingTransform();//eg: groupTitle
            this.unbindHoverBtn();
            this.hideArrow();//hide the arrow
            const strectchBarBBox: DOMRect = stretchBar.getBoundingClientRect();//fixed
            const timingBBox: DOMRect = type === 'duration' ? this.durationBg.getBoundingClientRect() : this.offsetBg.getBoundingClientRect();//fixed
            const timingWidth: number = timingBBox.width;
            let currentTiming: number = this.widthToTiming(timingWidth);
            if (type === 'duration') {
                hintTag.createTimingHint({ x: timingBBox.left + timingBBox.width / 2, y: strectchBarBBox.top }, `duration:${this.durationNum}ms`, action.UPDATE_DURATION, { aniId: this.aniId });
                this.unbindDurationHover();
            } else {
                let actionType: string = '';
                let aInfo: any = {};
                switch (type) {
                    case 'offset-animation':
                        actionType = action.UPDATE_ANI_OFFSET;
                        aInfo = { aniId: this.aniId }
                        break;
                    case 'offset-group':
                        actionType = action.UPDATE_DELAY_BETWEEN_GROUP;
                        aInfo = { aniId: this.aniId, groupRef: actionInfo.groupRef }
                        break;
                    case 'offset-kf':
                        actionType = action.UPDATE_DELAY_BETWEEN_KF;
                        aInfo = { aniId: this.aniId }
                        break;
                }
                hintTag.createTimingHint({ x: timingBBox.left + timingBBox.width / 2, y: strectchBarBBox.top }, `delay:${this.offsetNum}ms`, actionType, aInfo);
                this.unbindOffsetHover();
                //remove the extra width of the offset
                this.offsetBg.setAttributeNS(null, 'width', `${this.offsetWidth}`);
            }
            downEvt.stopPropagation();
            let oriPosiX: number = downEvt.pageX;
            document.onmousemove = (moveEvt) => {
                moveEvt.stopPropagation();
                const currentPosiX: number = moveEvt.pageX;
                const diffX: number = (currentPosiX - oriPosiX) / state.zoomLevel;
                const barX: number = parseFloat(stretchBar.getAttributeNS(null, 'x'));

                const timingWidth: number = type === 'duration' ? parseFloat(this.durationBg.getAttributeNS(null, 'width')) : parseFloat(this.offsetBg.getAttributeNS(null, 'width'));
                if (timingWidth + diffX > 0) {
                    if (type === 'duration') {
                        currentTiming = this.widthToTiming(timingWidth + diffX);
                        hintTag.updateTimingHint(diffX / 2, `duration:${currentTiming}ms`)
                        this.durationBg.setAttributeNS(null, 'width', `${timingWidth + diffX}`);
                        this.durationDiff = diffX;
                    } else {
                        currentTiming = this.widthToTiming(timingWidth + diffX);
                        hintTag.updateTimingHint(diffX / 2, `delay:${currentTiming}ms`)
                        this.offsetBg.setAttributeNS(null, 'width', `${timingWidth + diffX}`);
                        //translate corresponding group or item
                        this.offsetDiff = diffX;
                    }
                    stretchBar.setAttributeNS(null, 'x', `${diffX + barX}`);
                    oriPosiX = currentPosiX;
                }
            }
            document.onmouseup = () => {
                Reducer.triger(action.UPDATE_MOUSE_MOVING, false);
                hintTag.removeTimingHint();
                document.onmousemove = null;
                document.onmouseup = null;
                this.addEasingTransform();
                this.bindHoverBtn();
                this.showArrow();//show the arrow
                //triger action to update spec
                if (type === 'duration') {
                    this.bindDurationHover();
                    const durationTime: number = this.widthToTiming(parseFloat(this.durationBg.getAttributeNS(null, 'width')));
                    State.tmpStateBusket.push({
                        historyAction: { actionType: action.UPDATE_SPEC_ANIMATIONS, actionVal: JSON.stringify(state.spec.animations) },
                        currentAction: { actionType: action.UPDATE_DURATION, actionVal: { aniId: this.aniId, duration: durationTime } }
                    })
                    State.saveHistory();
                    Reducer.triger(action.UPDATE_DURATION, { aniId: this.aniId, duration: durationTime });
                } else {
                    this.bindOffsetHover(type, actionInfo.groupRef);
                    const delayTime: number = this.widthToTiming(parseFloat(this.offsetBg.getAttributeNS(null, 'width')));
                    switch (type) {
                        case 'offset-animation':
                            State.tmpStateBusket.push({
                                historyAction: { actionType: action.UPDATE_SPEC_ANIMATIONS, actionVal: JSON.stringify(state.spec.animations) },
                                currentAction: { actionType: action.UPDATE_ANI_OFFSET, actionVal: { aniId: this.aniId, offset: delayTime } }
                            })
                            State.saveHistory();
                            Reducer.triger(action.UPDATE_ANI_OFFSET, { aniId: this.aniId, offset: delayTime });
                            break;
                        case 'offset-group':
                            State.tmpStateBusket.push({
                                historyAction: { actionType: action.UPDATE_SPEC_ANIMATIONS, actionVal: JSON.stringify(state.spec.animations) },
                                currentAction: { actionType: action.UPDATE_DELAY_BETWEEN_GROUP, actionVal: { aniId: this.aniId, groupRef: actionInfo.groupRef, delay: delayTime } }
                            })
                            State.saveHistory();
                            Reducer.triger(action.UPDATE_DELAY_BETWEEN_GROUP, { aniId: this.aniId, groupRef: actionInfo.groupRef, delay: delayTime });
                            break;
                        case 'offset-kf':
                            State.tmpStateBusket.push({
                                historyAction: { actionType: action.UPDATE_SPEC_ANIMATIONS, actionVal: JSON.stringify(state.spec.animations) },
                                currentAction: { actionType: action.UPDATE_DELAY_BETWEEN_KF, actionVal: { aniId: this.aniId, delay: delayTime } }
                            })
                            State.saveHistory();
                            Reducer.triger(action.UPDATE_DELAY_BETWEEN_KF, { aniId: this.aniId, delay: delayTime });
                            break;
                    }
                }
            }
        }
        return stretchBar;
    }

    public widthToTiming(w: number): number {
        return Math.floor(KfTimingIllus.minDuration * 100 * w / KfTimingIllus.BASIC_OFFSET_DURATION_W) / 100;
    }

    public drawArrowIcon(trans: ICoord, type: string): void {
        const iconPolygon: SVGPolygonElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        iconPolygon.setAttributeNS(null, 'fill', '#fff');
        iconPolygon.setAttributeNS(null, 'points', '10.1,0 10.1,4.1 5.6,0.1 4.3,1.5 8.3,5.1 0,5.1 0,6.9 8.3,6.9 4.3,10.5 5.6,11.9 10.1,7.9 10.1,12 12,12 12,0 ');

        switch (type) {
            case KfTimingIllus.TIMING_TYPE_OFFSET:
                this.offsetIcon = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                this.offsetIcon.classList.add('ease-fade');
                this.offsetIcon.setAttributeNS(null, 'transform', `translate(${trans.x}, ${trans.y})`);
                this.offsetIcon.appendChild(iconPolygon);
                break;
            case KfTimingIllus.TIMING_TYPE_DURATION:
                this.durationIcon = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                this.durationIcon.classList.add('ease-fade');
                this.durationIcon.setAttributeNS(null, 'transform', `translate(${trans.x}, ${trans.y})`);
                this.durationIcon.appendChild(iconPolygon);
                break;
        }

    }


}