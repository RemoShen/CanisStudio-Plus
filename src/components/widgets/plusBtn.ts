import KfGroup from "./kfGroup";
import { Animation, ChartSpec } from 'canis_toolkit';
import Tool from "../../util/tool";
import KfItem from "./kfItem";
import { state, State } from "../../app/state";
import { IKeyframe, IKeyframeGroup } from "../../app/core/ds";
import Suggest from "../../app/core/suggest";
import KfTrack from "./kfTrack";
import { ICoord, ISize } from "../../util/ds";
import { suggestBox } from "./suggestBox";
import KfOmit from "./kfOmit";

export default class PlusBtn {
    static BTN_SIZE: number = 16;
    static PADDING: number = 6;
    static BTN_COLOR: string = '#9fa0a0';
    static BTN_HIGHLIGHT_COLOR: string = '#358bcb';
    static BTN_DRAGOVER_COLOR: string = '#ea5514';
    static allPlusBtn: PlusBtn[] = [];
    static plusBtnMapping: Map<string, PlusBtn> = new Map();//key: aniId, value: index in allPlusBtn
    static dragoverBtn: PlusBtn;
    static BTN_IDX: number = 0;

    // public parentObj: KfGroup;
    public onShow: boolean = true;
    public parentTrack: KfTrack;
    public targetKfg: KfGroup;
    public firstKfArrInTargetKfg: IKeyframe[];
    public fakeKfg: KfGroup;
    public id: number;
    public aniId: string;
    public kfSize: ISize;
    public acceptableCls: string[];
    public isHighlighted: boolean = false;
    public container: SVGGElement;
    public btnBg: SVGRectElement;
    public btnIcon: SVGTextElement;

    public static highlightPlusBtns(selectedCls: string[]): void {
        //filter which button to highlight (has the same accepatable classes)
        this.allPlusBtn.forEach((pb: PlusBtn) => {
            if (Tool.arrayContained(pb.acceptableCls, selectedCls) && pb.onShow) {
                pb.highlightBtn();
                let transX: number = pb.kfSize.w - this.BTN_SIZE;
                // pb.targetKfg.translateWholeGroup(transX, true);
                const firstKf: KfItem = pb.targetKfg.fetchFirstKf();
                pb.targetKfg.translateGroup(firstKf, transX, true, true, true);
            }
        })
    }

    public static cancelHighlightPlusBtns(): void {
        this.allPlusBtn.forEach((pb: PlusBtn) => {
            if (pb.isHighlighted && pb.onShow) {
                pb.cancelHighlightBtn();
                let transX: number = pb.kfSize.w - this.BTN_SIZE;
                // pb.targetKfg.translateWholeGroup(-transX, true);
                const firstKf: KfItem = pb.targetKfg.fetchFirstKf();
                pb.targetKfg.translateGroup(firstKf, -transX, true, true, true);
            }
        })
    }

    public static detectAdding(kfg: IKeyframeGroup, kfs: IKeyframe[]): [boolean, string[]] {
        const kf0Marks = kfs[0].marksThisKf;
        let mClassCount: string[] = [];
        kf0Marks.forEach((mId: string) => {
            mClassCount.push(Animation.markClass.get(mId));
        })
        mClassCount = [...new Set(mClassCount)];
        if (state.charts.length > 1) {
            return [false, []]
        } else {
            if (typeof kfg.merge !== 'undefined' && kfg.merge) {
                return [false, []];
            } else {
                if (mClassCount.length === 1) {
                    let allDataEncoded: boolean = true;
                    let hasDiffAttrValue: boolean = false;
                    let datum0: any = ChartSpec.dataMarkDatum.get(kf0Marks[0]);
                    for (let i = 1, len = kf0Marks.length; i < len; i++) {
                        if (typeof ChartSpec.dataMarkDatum.get(kf0Marks[i]) === 'undefined') {
                            allDataEncoded = false;
                            break;
                        } else {
                            const datum: any = ChartSpec.dataMarkDatum.get(kf0Marks[i]);
                            for (let key in datum) {
                                if (datum[key] !== datum0[key] && typeof datum0[key] !== 'undefined') {
                                    hasDiffAttrValue = true;
                                }
                            }
                            if (hasDiffAttrValue) {
                                break;
                            }
                        }
                    }
                    if (hasDiffAttrValue || (kfs.length === 1 && kf0Marks.length > 1)) {
                        return [true, mClassCount];
                    } else {
                        return [false, []]
                    }
                } else {
                    return [true, mClassCount];
                }
            }
        }

    }

    /**
     * 
     * @param targetKfg : root group
     * @param parentTrack 
     * @param startX 
     * @param kfSize 
     * @param acceptableCls 
     */
    public createBtn(targetKfg: KfGroup, firstKfArrInTargetKfg: IKeyframe[], parentTrack: KfTrack, startX: number, kfSize: ISize, acceptableCls: string[]): void {
        //create a blank kfg
        this.fakeKfg = new KfGroup();
        this.fakeKfg.createBlankKfg(parentTrack, targetKfg.aniId, startX + KfGroup.PADDING);
        this.aniId = targetKfg.aniId;
        this.targetKfg = targetKfg;
        this.targetKfg.plusBtn = this;
        this.firstKfArrInTargetKfg = firstKfArrInTargetKfg;
        this.parentTrack = parentTrack;
        this.kfSize = kfSize;
        this.id = PlusBtn.BTN_IDX;
        PlusBtn.BTN_IDX++;
        this.acceptableCls = acceptableCls;
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.setAttributeNS(null, 'transform', `translate(${PlusBtn.PADDING},${PlusBtn.PADDING + this.kfSize.h / 2 - PlusBtn.BTN_SIZE / 2})`);
        this.btnBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.btnBg.setAttributeNS(null, 'x', '0');
        this.btnBg.setAttributeNS(null, 'y', '0');
        this.btnBg.setAttributeNS(null, 'width', `${PlusBtn.BTN_SIZE}`);
        this.btnBg.setAttributeNS(null, 'height', `${PlusBtn.BTN_SIZE}`);
        this.btnBg.setAttributeNS(null, 'rx', `${PlusBtn.BTN_SIZE / 2}`);
        this.btnBg.setAttributeNS(null, 'fill', 'none');
        this.btnBg.setAttributeNS(null, 'stroke', `${PlusBtn.BTN_COLOR}`);
        this.btnBg.setAttributeNS(null, 'stroke-dasharray', '4 3');
        this.container.appendChild(this.btnBg);
        this.btnIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.btnIcon.setAttributeNS(null, 'text-anchor', 'middle');
        this.btnIcon.setAttributeNS(null, 'x', `${PlusBtn.BTN_SIZE / 2}`);
        this.btnIcon.setAttributeNS(null, 'y', `${PlusBtn.BTN_SIZE / 2 + 7}`);
        this.btnIcon.setAttributeNS(null, 'fill', `${PlusBtn.BTN_COLOR}`);
        this.btnIcon.setAttributeNS(null, 'font-size', '16pt');
        this.btnIcon.innerHTML = '+';
        this.container.appendChild(this.btnIcon);
        this.fakeKfg.container.appendChild(this.container);
        this.fakeKfg.plusBtn = this;

        PlusBtn.allPlusBtn.push(this);
    }

    public removeBtn(): void {
        for (let i = 0, len = PlusBtn.allPlusBtn.length; i < len; i++) {
            if (PlusBtn.allPlusBtn[i].id === this.id) {
                PlusBtn.allPlusBtn[i].onShow = false;
                break;
            }
        }
        if (this.fakeKfg.container.contains(this.container)) {
            this.fakeKfg.container.removeChild(this.container);
        }
    }

    public restoreBtn(): void {
        this.onShow = true;
        this.fakeKfg.container.appendChild(this.container);
    }

    public translateBtn(transX: number): void {
        const oriTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
        this.container.setAttributeNS(null, 'transform', `translate(${oriTrans.x + transX}, ${oriTrans.y})`);
    }

    public highlightBtn(): void {
        this.isHighlighted = true;
        const oriTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
        this.container.setAttributeNS(null, 'transform', `translate(${oriTrans.x},${PlusBtn.PADDING + 2})`);
        this.btnBg.setAttributeNS(null, 'width', `${this.kfSize.w}`);
        this.btnBg.setAttributeNS(null, 'height', `${this.kfSize.h}`);
        this.btnBg.setAttributeNS(null, 'stroke', `${PlusBtn.BTN_HIGHLIGHT_COLOR}`);
        this.btnIcon.setAttributeNS(null, 'x', `${this.kfSize.w / 2}`);
        this.btnIcon.setAttributeNS(null, 'y', `${this.kfSize.h / 2 + 6}`);
        this.btnIcon.setAttributeNS(null, 'fill', `${PlusBtn.BTN_HIGHLIGHT_COLOR}`);
    }

    public cancelHighlightBtn(): void {
        this.isHighlighted = false;
        const oriTrans: ICoord = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform'));
        this.container.setAttributeNS(null, 'transform', `translate(${oriTrans.x},${PlusBtn.PADDING + this.kfSize.h / 2 - PlusBtn.BTN_SIZE / 2})`);
        this.btnBg.setAttributeNS(null, 'width', `${PlusBtn.BTN_SIZE}`);
        this.btnBg.setAttributeNS(null, 'height', `${PlusBtn.BTN_SIZE}`);
        this.btnBg.setAttributeNS(null, 'stroke', `${PlusBtn.BTN_COLOR}`);
        this.btnIcon.setAttributeNS(null, 'x', `${PlusBtn.BTN_SIZE / 2}`);
        this.btnIcon.setAttributeNS(null, 'y', `${PlusBtn.BTN_SIZE / 2 + 6}`);
        this.btnIcon.setAttributeNS(null, 'fill', `${PlusBtn.BTN_COLOR}`);
    }

    public dragSelOver(): void {
        this.btnBg.setAttributeNS(null, 'stroke', `${PlusBtn.BTN_DRAGOVER_COLOR}`);
        this.btnIcon.setAttributeNS(null, 'fill', `${PlusBtn.BTN_DRAGOVER_COLOR}`);
        Tool.clearDragOver();
        PlusBtn.dragoverBtn = this;
    }

    public dragSelOut(): void {
        this.btnBg.setAttributeNS(null, 'stroke', `${PlusBtn.BTN_HIGHLIGHT_COLOR}`);
        this.btnIcon.setAttributeNS(null, 'fill', `${PlusBtn.BTN_HIGHLIGHT_COLOR}`);
        PlusBtn.dragoverBtn = undefined;
    }

    public dropSelOn(): void {
        const selectedMarks: string[] = state.activatePlusBtn.selection;
        let firstKfInfoInParent: IKeyframe = this.firstKfArrInTargetKfg[0];
        const tmpKfInfo: IKeyframe = KfItem.createKfInfo(selectedMarks,
            {
                duration: firstKfInfoInParent.duration,
                allCurrentMarks: firstKfInfoInParent.allCurrentMarks,
                allGroupMarks: firstKfInfoInParent.allGroupMarks
            });
        KfItem.allKfInfo.set(tmpKfInfo.id, tmpKfInfo);

        //create a kf and replace the plus btn
        const btnX: number = Tool.extractTransNums(this.container.getAttributeNS(null, 'transform')).x;
        this.removeBtn();
        let tmpKf: KfItem = new KfItem();
        tmpKf.createItem(tmpKfInfo, 1, this.fakeKfg, btnX);
        //update other idxInGroup
        this.fakeKfg.children.forEach((c: KfGroup | KfItem | KfOmit) => {
            c.idxInGroup++;
        })
        this.fakeKfg.children.unshift(tmpKf);
        tmpKf.idxInGroup = 0;
        this.fakeKfg.updateSize();

        const suggestOnFirstKf: boolean = Suggest.generateSuggestionPath(selectedMarks, firstKfInfoInParent, this.targetKfg);
        // const actionInfo: any = { ap: Suggest.allPaths, kfIdxInPath: state.activatePlusBtn.renderedUniqueIdx, startKf: tmpKf, kfGroup: this.fakeKfg, suggestOnFirstKf: suggestOnFirstKf, selectedMarks: selectedMarks };
        // State.tmpStateBusket.push({
        //     historyAction: { actionType: action.UPDATE_SUGGESTION_PATH, actionVal: { ap: undefined, kfIdxInPath: -1, startKf: tmpKf, suggestOnFirstKf: false, selectedMarks: [] } },
        //     currentAction: { actionType: action.UPDATE_SUGGESTION_PATH, actionVal: actionInfo }
        // })
        // State.saveHistory();
        // Reducer.triger(action.UPDATE_SUGGESTION_PATH, actionInfo);
        // Reducer.triger(action.UPDATE_SUGGESTION_PATH, Suggest.allPaths);
        suggestBox.renderKfOnPathAndSuggestionBox(Suggest.allPaths, tmpKf, this.fakeKfg, suggestOnFirstKf);
        // suggestBox.lastUpdateSuggestionPathActionInfo = actionInfo;
    }
}