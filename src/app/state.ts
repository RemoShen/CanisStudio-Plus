import { ViewToolBtn } from '../components/viewWindow'
import Renderer from './renderer'
import Tool from '../util/tool'
import { ISortDataAttr, IDataItem, IKeyframeGroup, IKfGroupSize, IPath, IInteractionRecord, IActivatePlusBtn } from './core/ds'
import Util from './core/util'
import Reducer from './reducer'
import * as action from './action'
import { AnimationItem } from '../../node_modules/lottie-web/build/player/lottie';
import CanisGenerator, { ICanisSpec } from './core/canisGenerator'


export interface IState {
    sortDataAttrs: ISortDataAttr[]
    dataTable: Map<string, IDataItem>
    dataOrder: string[]

    //chart status
    charts: string[]
    tool: string
    selection: string[]
    suggestion: boolean
    isLoading: boolean

    spec: ICanisSpec
    activatePlusBtn: IActivatePlusBtn
    // activatePlusBtnAniId: string
    // selectedMarksForPlusBtn: string[]
    // renderedSuggestionUniqueIdx: number
    allPaths: IPath[]//for kf suggestion
    //keyframe status
    kfGroupSize: IKfGroupSize // size of all kf groups

    //video
    lottieAni: AnimationItem
    lottieSpec: any
    keyframeGroups: IKeyframeGroup[]//each keyframe group correspond to one root from one aniunit
    staticMarks: string[]

    //status
    mousemoving: boolean
    zoomLevel: number
    chartThumbNailZoomLevels: number
}

/**
 * re-render parts when the state changes
 */
export class State implements IState {
    _sortDataAttrs: ISortDataAttr[] = [];
    _dataTable: Map<string, IDataItem> = new Map();
    _dataOrder: string[]

    _charts: string[]
    _tool: string
    _selection: string[]
    _suggestion: boolean
    _isLoading: boolean
    _spec: ICanisSpec
    _activatePlusBtn: IActivatePlusBtn
    _allPaths: IPath[]
    _kfGroupSize: IKfGroupSize

    _lottieAni: AnimationItem
    _lottieSpec: any
    _keyframeGroups: IKeyframeGroup[]
    _staticMarks: string[]
    // _groupingAndTiming: any

    _mousemoving: boolean = false
    _zoomLevel: number = 1;
    chartThumbNailZoomLevels: number = 4;

    set sortDataAttrs(sda: ISortDataAttr[]) {
        //compare incoming
        let sameAttrs: boolean = true;
        if (this._sortDataAttrs.length !== 0) {
            if (sda.length !== this._sortDataAttrs.length) {
                sameAttrs = false;
            } else {
                let oriAttrs: string[] = this._sortDataAttrs.map(a => { return a.attr });
                let newAttrs: string[] = sda.map(a => { return a.attr });
                sameAttrs = Tool.identicalArrays(oriAttrs, newAttrs);
            }
        }
        if (!sameAttrs) {
            // Renderer.renderDataAttrs(sda);//for data binding
        } else {
            //find sort reference
            const [found, attrAndOrder] = Util.findUpdatedAttrOrder(sda);
            //reorder data items
            if (found) {
                this._sortDataAttrs = sda;
                Reducer.triger(action.UPDATE_DATA_ORDER, Util.sortDataTable(attrAndOrder));
                Renderer.renderDataTable(this.dataTable);
            }
        }
        this._sortDataAttrs = sda;
    }
    get sortDataAttrs(): ISortDataAttr[] {
        return this._sortDataAttrs;
    }
    set dataTable(dt: Map<string, IDataItem>) {
        //State.saveHistory(action.UPDATE_DATA_TABLE, this._dataTable);
        this._dataTable = dt;
        Renderer.renderDataTable(this.dataTable);
    }
    get dataTable(): Map<string, IDataItem> {
        return this._dataTable;
    }
    set dataOrder(dord: string[]) {
        this._dataOrder = dord;
    }
    get dataOrder(): string[] {
        return this._dataOrder;
    }
    set charts(cs: string[]) {
        //State.saveHistory(action.LOAD_CHARTS, this._charts);
        this._charts = cs;
        Reducer.triger(action.UPDATE_SPEC_CHARTS, this.charts);
        // Renderer.generateAndRenderSpec(this);
    }
    get charts(): string[] {
        return this._charts;
    }
    set tool(t: string) {
        this._tool = t;
        Renderer.renderChartTool(this.tool);
    }
    get tool(): string {
        return this._tool;
    }
    set selection(sel: string[]) {
        //State.saveHistory(action.UPDATE_SELECTION, this._selection);
        this._selection = sel;
        Renderer.renderSelectedMarks(this.selection);
    }
    get selection(): string[] {
        return this._selection;
    }
    set suggestion(sug: boolean) {
        //State.saveHistory(action.TOGGLE_SUGGESTION, this._suggestion);
        this._suggestion = sug;
        // Renderer.renderSuggestionCheckbox(this.suggestion);
    }
    get suggestion(): boolean {
        return this._suggestion;
    }
    set kfGroupSize(kfgSize: IKfGroupSize) {
        this._kfGroupSize = kfgSize;
        Renderer.renderKfContainerSliders(this.kfGroupSize);
    }
    get kfGroupSize(): IKfGroupSize {
        return this._kfGroupSize;
    }
    set lottieAni(lai: AnimationItem) {
        this._lottieAni = lai;
    }
    get lottieAni(): AnimationItem {
        return this._lottieAni;
    }
    set lottieSpec(ls: any) {
        this._lottieSpec = ls;
        Renderer.renderVideo(ls);
    }
    get lottieSpec(): any {
        return this._lottieSpec;
    }
    set keyframeGroups(kfts: IKeyframeGroup[]) {
        if (kfts) {
            this._keyframeGroups = kfts;
            //render keyframes
            Renderer.renderKeyframeTracks(this.keyframeGroups);
        }
    }
    get keyframeGroups(): IKeyframeGroup[] {
        return this._keyframeGroups;
    }
    set staticMarks(sm: string[]) {
        this._staticMarks = sm;
        Renderer.renderStaticKf(this.staticMarks);
    }
    get staticMarks(): string[] {
        return this._staticMarks;
    }
    set isLoading(il: boolean) {
        this._isLoading = il;
    }
    get isLoading(): boolean {
        return this._isLoading;
    }
    set spec(canisSpec: ICanisSpec) {
        //add loading
        console.log('going to validate spec: ', canisSpec);
        //validate spec before render
        const validSpec: boolean = CanisGenerator.validate(canisSpec);
        if (validSpec) {
            this._spec = canisSpec;
            Renderer.renderSpec(this.spec);
        }
    }
    get spec(): ICanisSpec {
        return this._spec;
    }
    set activatePlusBtn(plusBtnInfo: IActivatePlusBtn) {
        this._activatePlusBtn = plusBtnInfo;
        Renderer.renderActivatedPlusBtn();
    }
    get activatePlusBtn(): IActivatePlusBtn {
        return this._activatePlusBtn;
    }

    set allPaths(ap: IPath[]) {
        this._allPaths = ap;
    }
    get allPaths(): IPath[] {
        return this._allPaths;
    }
    set mousemoving(mm: boolean) {
        this._mousemoving = mm;
    }
    get mousemoving(): boolean {
        return this._mousemoving;
    }
    set zoomLevel(zl: number) {
        this._zoomLevel = zl;
        Renderer.zoomKfContainer(zl);
    }
    get zoomLevel(): number {
        return this._zoomLevel;
    }

    public reset(): void {
        this.sortDataAttrs = [];
        this.dataTable = new Map();
        this.dataOrder = [];

        this.charts = [];
        this.tool = ViewToolBtn.SINGLE;
        this.selection = [];
        this.suggestion = true;

        this.keyframeGroups = null;
        // this.groupingAndTiming = null;
    }

    /*
     * each interaction node is an array of interaction records, each record contains the history value and current value,
     * revert: rerender the history value in the record where the pointer points at then move the pointer to the previous record
     * redo: move the pointer back to the next record and render the current value in the record
     */
    static stateHistory: IInteractionRecord[][] = [];//each step might triger multiple actions, thus each step correspond to one Array<[actionType, stateAttrValue]>
    static stateHistoryIdx: number = -1;
    static tmpStateBusket: IInteractionRecord[] = [];
    public static saveHistory(insertHistory: boolean = false) {
        if (insertHistory) {
            this.stateHistory[this.stateHistoryIdx] = [...this.stateHistory[this.stateHistoryIdx], ...this.tmpStateBusket];
        } else {
            this.stateHistoryIdx++;
            this.stateHistory = this.stateHistory.slice(0, this.stateHistoryIdx);
            this.stateHistory.push(this.tmpStateBusket);
            console.log('saving history: ', this.stateHistory, this.tmpStateBusket, this.stateHistoryIdx);
        }
        this.tmpStateBusket = [];
    }

    public static revertHistory() {
        if (this.stateHistoryIdx >= 0) {
            const actionAndValues: IInteractionRecord[] = this.stateHistory[this.stateHistoryIdx];
            let i = actionAndValues.length - 1;
            this.runRevertHistory(actionAndValues, i);
            this.stateHistoryIdx--;
        }
    }

    public static runRevertHistory(actionAndValues: IInteractionRecord[], i: number) {
        if (i >= 0) {
            new Promise((resolve, reject) => {
                Reducer.triger(actionAndValues[i].historyAction.actionType, actionAndValues[i].historyAction.actionVal);
                setTimeout(() => {
                    resolve();
                }, 1);
            }).then(() => {
                i--;
                this.runRevertHistory(actionAndValues, i);
            })
        }
    }

    public static redoHistory() {
        if (this.stateHistoryIdx < this.stateHistory.length - 1) {
            this.stateHistoryIdx++;
            const actionAndValues: IInteractionRecord[] = this.stateHistory[this.stateHistoryIdx];
            let i = 0;
            this.runRedoHistory(actionAndValues, i);
            // actionAndValues.forEach((interactionRecord: IInteractionRecord) => {
            //     console.log('redo history: ', interactionRecord.currentAction.actionType, interactionRecord.currentAction.actionVal);
            //     Reducer.triger(interactionRecord.currentAction.actionType, interactionRecord.currentAction.actionVal);
            // })

        }
    }

    public static runRedoHistory(actionAndValues: IInteractionRecord[], i: number) {
        if (i < actionAndValues.length) {
            new Promise((resolve, reject) => {
                Reducer.triger(actionAndValues[i].currentAction.actionType, actionAndValues[i].currentAction.actionVal);
                setTimeout(() => {
                    resolve();
                }, 1);
            }).then(() => {
                i++;
                this.runRedoHistory(actionAndValues, i);
            })
        }
    }

}

export let state = new State();