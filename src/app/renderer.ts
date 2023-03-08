import { state, IState, State } from './state'
import { IDataItem, ISortDataAttr, IKeyframeGroup, IKeyframe, IKfGroupSize, IPath, IOmitPattern } from './core/ds'
import { ChartSpec, Animation, TimingSpec } from 'canis_toolkit'
import CanisGenerator, { canis, ICanisSpec } from './core/canisGenerator'
import ViewWindow, { ViewToolBtn, ViewContent } from '../components/viewWindow'
import AttrSort from '../components/widgets/attrSort'
import Util from './core/util'
import Reducer from './reducer'
import * as action from './action'
import SelectableTable from '../components/widgets/selectableTable'
import Lottie from '../../node_modules/lottie-web/build/player/lottie'
import { Player, player } from '../components/player'
import KfItem from '../components/widgets/kfItem'
import KfTrack from '../components/widgets/kfTrack'
import KfGroup from '../components/widgets/kfGroup'
import { KfContainer, kfContainer } from '../components/kfContainer'
import KfOmit from '../components/widgets/kfOmit'
import PlusBtn from '../components/widgets/plusBtn'
import { suggestBox } from '../components/widgets/suggestBox'
import { Loading } from '../components/widgets/loading'

/**
 * render html according to the state
 */
export default class Renderer {
    /**
     * test rendering spec
     * @param spec 
     */
    public static async renderSpec(spec: ICanisSpec, callback: any = () => { }) {
        console.log('going to render spec: ', spec.animations);
        const lottieSpec = await canis.renderSpec(spec, () => {
            if (spec.animations[0].selector === '.mark') {//special triger, can not triger action
                state.spec.animations[0].selector = `#${Animation.allMarks.join(', #')}`;
            }
            Util.extractAttrValueAndDeterminType(ChartSpec.dataMarkDatum);
            Util.extractNonDataAttrValue(ChartSpec.nonDataMarkDatum);

            const dataOrder: string[] = Array.from(Util.filteredDataTable.keys());
            const dataTable: Map<string, IDataItem> = Util.filteredDataTable;
            const sortDataAttrs: ISortDataAttr[] = ['markId', ...Object.keys(Util.attrType)].map(attrName => {
                const sortType: string = attrName === 'markId' ? AttrSort.ASSCENDING_ORDER : AttrSort.INDEX_ORDER;
                return {
                    attr: attrName,
                    sort: sortType
                }
            })
            //these actions are coupling with others, so they are not recorded in history
            Reducer.triger(action.UPDATE_DATA_ORDER, dataOrder);
            Reducer.triger(action.UPDATE_DATA_TABLE, dataTable);
            Reducer.triger(action.UPDATE_DATA_SORT, sortDataAttrs);
        });
        //add highlight box on the chart
        const svg: HTMLElement = document.getElementById('visChart');
        if (svg) {
            //create the highlight box
            const highlightBox: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            highlightBox.setAttributeNS(null, 'id', 'highlightSelectionFrame');
            highlightBox.setAttributeNS(null, 'fill', 'none');
            highlightBox.setAttributeNS(null, 'stroke', '#2196f3');
            highlightBox.setAttributeNS(null, 'stroke-width', '2');
            svg.appendChild(highlightBox);
        }
        //render video view
        Reducer.triger(action.UPDATE_LOTTIE_SPEC, lottieSpec);
        player.resetPlayer({
            frameRate: canis.frameRate,
            currentTime: 0,
            totalTime: canis.duration()
        })

        if (state.charts.length > 1) {//remove the visChart and add multi-charts
            if (document.getElementById('visChart')) {
                document.getElementById('visChart').remove();
            }
            this.renderMultiCharts();
        }

        callback();
    }

    public static renderMultiCharts() {
        //create container
        const multiChartContainer: HTMLDivElement = ViewContent.createMultiChartContainer();
        //render charts, remove the visChart id in each chart since it might confuse the compiler
        let currentRow: HTMLDivElement;
        for (let i = 0, len = state.charts.length; i < len && i < 9; i++) {
            const chartItemContainer: HTMLDivElement = document.createElement('div');
            chartItemContainer.className = 'chart-item-container';
            if (i < 8) {
                const chart: string = state.charts[i].replace('id="visChart"', '');
                chartItemContainer.innerHTML = chart;
            } else {
                chartItemContainer.innerHTML = `<p>+${state.charts.length - 8} charts<br>...</p>`;
            }
            if (i % 3 === 0) {
                currentRow = document.createElement('div');
                currentRow.className = 'row-chart-container';
                multiChartContainer.appendChild(currentRow);
            }
            currentRow.appendChild(chartItemContainer);
        }
    }

    public static renderLoading(wrapper: HTMLElement, content: string) {
        const loadingBlock: Loading = new Loading();
        loadingBlock.createLoading(wrapper, content);
    }

    public static removeLoading() {
        Loading.removeLoading();
    }

    public static renderVideo(lottieSpec: any): void {
        document.getElementById(ViewContent.VIDEO_VIEW_CONTENT_ID).innerHTML = '';

        Reducer.triger(action.UPDATE_LOTTIE, Lottie.loadAnimation({
            container: document.getElementById(ViewContent.VIDEO_VIEW_CONTENT_ID),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            animationData: lottieSpec // the animation data
        }));
        //start to play animation
        document.getElementById(Player.PLAY_BTN_ID).click();

        const staticMarks: string[] = [];
        Reducer.triger(action.UPDATE_STATIC_KEYFRAME, staticMarks);
        Reducer.triger(action.UPDATE_KEYFRAME_TRACKS, Animation.animations);
    }

    public static renderKfContainerSliders(kfgSize: IKfGroupSize) {
        //reset the transform of kfcontainer
        kfContainer.resetContainerTrans();
        kfContainer.updateKfSlider(kfgSize);
    }

    public static renderStaticKf(staticMarks: string[]) {
        //reset
        document.getElementById(KfContainer.KF_BG).innerHTML = '';
        document.getElementById(KfContainer.KF_FG).innerHTML = '';
        document.getElementById(KfContainer.KF_OMIT).innerHTML = '';
        const placeHolder: SVGRectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        placeHolder.setAttributeNS(null, 'width', '1');
        placeHolder.setAttributeNS(null, 'height', '18');
        placeHolder.setAttributeNS(null, 'fill', '#00000000');
        document.getElementById(KfContainer.KF_FG).appendChild(placeHolder);
        KfTrack.reset();
        KfGroup.reset();
        KfOmit.reset();

        const firstTrack: KfTrack = new KfTrack();
        firstTrack.createTrack();
    }

    public static renderKeyframeTracks(kfgs: IKeyframeGroup[]): void {
        if (state.charts.length === 1) {
            //save kf group info
            kfgs.forEach((kfg: IKeyframeGroup) => {
                KfGroup.allAniGroupInfo.set(kfg.aniId, kfg);
            })

            kfgs.forEach((kfg: IKeyframeGroup, i: number) => {
                KfGroup.leafLevel = 0;
                let treeLevel = 0;//use this to decide the background color of each group
                //top-down to init group and kf
                const rootGroup: KfGroup = this.renderKeyframeGroup(0, kfgs[i - 1], 1, kfg, treeLevel);
                //bottom-up to update size and position
                rootGroup.updateGroupPosiAndSize([...KfTrack.aniTrackMapping.get(rootGroup.aniId)][0].availableInsert, 0, false, true);
                KfGroup.allAniGroups.set(rootGroup.aniId, rootGroup);
            })
        } else {
            const rootGroup: KfGroup = this.renderKeyframeGroup(0, undefined, 1, kfgs[0], 0);
            rootGroup.updateGroupPosiAndSize([...KfTrack.aniTrackMapping.get(rootGroup.aniId)][0].availableInsert, 0, false, true);
            KfGroup.allAniGroups.set(rootGroup.aniId, rootGroup);
        }

        //update align id
        // KfGroup.allAniGroups.forEach((tmpAniGroup: KfGroup, tmpAniId: string) => {
        //     if (typeof tmpAniGroup.alignTarget !== 'undefined') {
        //         KfGroup.allAniGroups.forEach((tmpAniGroup2: KfGroup, tmpAniId2: string) => {
        //             if (tmpAniGroup2.alignId === tmpAniGroup.alignTarget) {
        //                 KfGroup.allAniGroups.get(tmpAniId2).alignId = tmpAniGroup2.aniId;
        //                 KfGroup.allAniGroups.get(tmpAniId).alignTarget = tmpAniGroup2.aniId;
        //             }
        //         })
        //     }
        // })

        const rootGroupBBox: DOMRect = document.getElementById(KfContainer.KF_FG).getBoundingClientRect();
        Reducer.triger(action.UPDATE_KEYFRAME_CONTAINER_SLIDER, { width: rootGroupBBox.width, height: rootGroupBBox.height });
        Reducer.triger(action.KEYFRAME_ZOOM_LEVEL, state.zoomLevel);
        Reducer.triger(action.UPDATE_LOADING_STATUS, { il: false });
    }

    public static renderKeyframeGroup(kfgIdx: number, previousKfg: IKeyframeGroup, totalKfgNum: number, kfg: IKeyframeGroup, treeLevel: number, parentObj?: KfGroup): KfGroup {
        //draw group container
        let kfGroup: KfGroup = new KfGroup();
        if (kfgIdx === 0 || kfgIdx === 1 || kfgIdx === totalKfgNum - 1) {
            let targetTrack: KfTrack; //foreground of the track used to put the keyframe group
            if (kfg.newTrack) {
                //judge whether the new track is already in this animation
                if (typeof parentObj !== 'undefined') {
                    let lastChild: KfGroup;
                    for (let i = parentObj.children.length - 1; i >= 0; i--) {
                        if (parentObj.children[i] instanceof KfGroup) {
                            lastChild = <KfGroup>parentObj.children[i];
                            break;
                        }
                    }
                    let allTracksThisAni: KfTrack[] = [...KfTrack.aniTrackMapping.get(kfg.aniId)];
                    let lastTrack: KfTrack = KfTrack.allTracks.get(lastChild.targetTrackId);
                    if (typeof lastTrack !== 'undefined') {
                        allTracksThisAni.forEach((kft: KfTrack) => {
                            if (kft.trackPosiY - lastTrack.trackPosiY > 0 && kft.trackPosiY - lastTrack.trackPosiY <= KfTrack.TRACK_HEIGHT) {
                                targetTrack = kft;
                            }
                        })
                    }
                    if (typeof targetTrack === 'undefined') {
                        targetTrack = new KfTrack();
                        let createFakeTrack: boolean = false;
                        if (typeof kfg.merge !== 'undefined') {
                            createFakeTrack = kfg.merge;
                        }
                        targetTrack.createTrack(createFakeTrack);
                    }
                } else {
                    targetTrack = new KfTrack();
                    let createFakeTrack: boolean = false;
                    if (typeof kfg.merge !== 'undefined') {
                        createFakeTrack = kfg.merge;
                    }
                    targetTrack.createTrack(createFakeTrack);
                }
            } else {
                if (typeof KfTrack.aniTrackMapping.get(kfg.aniId) !== 'undefined') {
                    targetTrack = [...KfTrack.aniTrackMapping.get(kfg.aniId)][0];//this is the group within an existing animation
                } else {
                    // //target track is the last track
                    // let maxTrackPosiY: number = 0;
                    // KfTrack.allTracks.forEach((kft: KfTrack, trackId: string) => {
                    //     if (kft.trackPosiY >= maxTrackPosiY) {
                    //         maxTrackPosiY = kft.trackPosiY;
                    //         targetTrack = kft;
                    //     }
                    // })
                    //target track is the one with the max available insert
                    let maxAvailableInsert: number = 0;
                    KfTrack.allTracks.forEach((kft: KfTrack, trackId: string) => {
                        if (kft.availableInsert >= maxAvailableInsert) {
                            maxAvailableInsert = kft.availableInsert;
                            targetTrack = kft;
                        }
                    })
                }
            }
            if (typeof KfTrack.aniTrackMapping.get(kfg.aniId) === 'undefined') {
                KfTrack.aniTrackMapping.set(kfg.aniId, new Set());
            }
            KfTrack.aniTrackMapping.get(kfg.aniId).add(targetTrack);
            let minTrackPosiYThisGroup: number = [...KfTrack.aniTrackMapping.get(kfg.aniId)][0].trackPosiY;

            //check whether this is the group of animation, and whether to add a plus button or not
            let plusBtn: PlusBtn, addedPlusBtn: boolean = false;
            if (treeLevel === 0) {//this is the root group
                //find the keyframes of the first group
                const tmpKfs: IKeyframe[] = Util.findFirstKfs(kfg);
                let [addingPlusBtn, acceptableMarkClasses] = PlusBtn.detectAdding(kfg, tmpKfs);
                if (addingPlusBtn) {
                    addedPlusBtn = addingPlusBtn;
                    plusBtn = new PlusBtn()
                    plusBtn.createBtn(kfGroup, tmpKfs, targetTrack, targetTrack.availableInsert, { w: KfItem.KF_WIDTH - KfItem.KF_W_STEP, h: KfItem.KF_HEIGHT - 2 * KfItem.KF_H_STEP }, acceptableMarkClasses);
                    targetTrack.availableInsert += PlusBtn.PADDING * 4 + PlusBtn.BTN_SIZE;
                }
            }
            const previousAniId: string = typeof previousKfg === 'undefined' ? '' : previousKfg.aniId
            kfGroup.createGroup(kfg, previousAniId, parentObj ? parentObj : targetTrack, targetTrack.trackPosiY - minTrackPosiYThisGroup, treeLevel, targetTrack.trackId);
            if (addedPlusBtn) {
                plusBtn.aniId = kfGroup.aniId;
                PlusBtn.plusBtnMapping.set(plusBtn.aniId, plusBtn);
                if (treeLevel === 0) {
                    plusBtn.fakeKfg.marks = kfGroup.marks;
                    plusBtn.fakeKfg.aniId = kfGroup.aniId;
                }
            }
        } else if (totalKfgNum > 3 && kfgIdx === totalKfgNum - 2) {
            let kfOmit: KfOmit = new KfOmit();
            kfOmit.createOmit(KfOmit.KF_GROUP_OMIT, 0, totalKfgNum - 3, parentObj, false, false, 0);
            parentObj.children.push(kfOmit);//why comment this out!!!!
            kfOmit.idxInGroup = parentObj.children.length - 1;
            parentObj.kfOmits.push(kfOmit);
        }

        treeLevel++;
        if (treeLevel > KfGroup.leafLevel) {
            KfGroup.leafLevel = treeLevel;
        }
        if (kfg.keyframes.length > 0) {
            kfGroup.kfNum = kfg.keyframes.length;
            //choose the keyframes to draw
            let alignWithAnis: Map<string, number[]> = new Map();
            let alignToAni: number[] = [];
            kfg.keyframes.forEach((k: any, i: number) => {
                if (typeof k.alignWith !== 'undefined') {
                    k.alignWith.forEach((aniId: string) => {
                        if (typeof alignWithAnis.get(aniId) === 'undefined') {
                            alignWithAnis.set(aniId, [100000, 0]);
                        }
                        if (i < alignWithAnis.get(aniId)[0]) {
                            alignWithAnis.get(aniId)[0] = i;
                        }
                        if (i > alignWithAnis.get(aniId)[1]) {
                            alignWithAnis.get(aniId)[1] = i;
                        }
                    })
                } else if (typeof k.alignTo !== 'undefined') {
                    if (typeof KfItem.allKfItems.get(k.alignTo) !== 'undefined') {
                        if (KfItem.allKfItems.get(k.alignTo).rendered) {
                            alignToAni.push(i);
                        }
                    }
                }
            })
            let kfIdxToDraw: number[] = [0, 1, kfg.keyframes.length - 1];
            let isAlignWith: number = 0;//0 -> neither align with nor align to, 1 -> align with, 2 -> align to 
            let kfOmitType: string = KfOmit.KF_OMIT;
            let omitPattern: IOmitPattern[] = [];
            //this group is the align target
            if (alignWithAnis.size > 0) {
                isAlignWith = 1;
                kfOmitType = KfOmit.KF_ALIGN;
                omitPattern.push({
                    merge: typeof kfg.merge === 'undefined' ? false : kfg.merge,
                    timing: kfg.timingRef,
                    hasOffset: kfg.offsetIcon,
                    hasDuration: true
                })

                alignWithAnis.forEach((se: number[], aniId: string) => {
                    const tmpKfg: IKeyframeGroup = KfGroup.allAniGroupInfo.get(aniId);
                    omitPattern.push({
                        merge: typeof tmpKfg.merge === 'undefined' ? false : tmpKfg.merge,
                        timing: tmpKfg.timingRef,
                        hasOffset: tmpKfg.offsetIcon,
                        hasDuration: true
                    });
                    kfIdxToDraw.push(se[0]);
                    kfIdxToDraw.push(se[1]);
                    if (se[0] + 1 < se[1]) {
                        kfIdxToDraw.push(se[0] + 1);
                    }
                })
            } else if (alignToAni.length > 0) {
                //this group aligns to other group
                isAlignWith = 2;
                kfIdxToDraw = [...kfIdxToDraw, ...alignToAni];
            }
            kfIdxToDraw = [...new Set(kfIdxToDraw)].sort((a: number, b: number) => a - b);

            //rendering kf
            //check whether there should be a plus btn
            let kfPosiX = kfGroup.offsetWidth;
            kfg.keyframes.forEach((k: IKeyframe, i: number) => {
                //whether to draw this kf or not
                let kfOmit: KfOmit;
                if (kfIdxToDraw.includes(i) || state.charts.length > 1) {
                    //whether to draw '...'
                    if (i > 0 && kfIdxToDraw[kfIdxToDraw.indexOf(i) - 1] !== i - 1 && state.charts.length === 1) {
                        const omitNum: number = i - kfIdxToDraw[kfIdxToDraw.indexOf(i) - 1] - 1;
                        if (omitNum > 0) {
                            kfOmit = new KfOmit();
                            if (kfOmitType === KfOmit.KF_ALIGN) {
                                kfOmit.omitPattern = omitPattern;
                            }
                            if (kfg.keyframes[1].hiddenDurationIcon) {
                                kfPosiX += (<KfItem>kfGroup.children[kfGroup.children.length - 1]).durationWidth;
                            }
                            console.log('creating omit: ', kfPosiX);
                            kfOmit.createOmit(kfOmitType, kfPosiX, omitNum, kfGroup, kfg.keyframes[1].delayIcon, kfg.keyframes[1].durationIcon, (<KfItem>kfGroup.children[1]).kfHeight / 2);
                            kfGroup.children.push(kfOmit);
                            kfOmit.idxInGroup = kfGroup.children.length - 1;
                            kfGroup.kfOmits.push(kfOmit);
                            kfPosiX += kfOmit.oWidth;
                        }
                    }
                    //draw render
                    const kfItem: KfItem = new KfItem();
                    let targetSize: { w: number, h: number } = { w: 0, h: 0 }
                    if (isAlignWith === 2) {
                        const tmpAlignToKf: KfItem = KfItem.allKfItems.get(k.alignTo);
                        if (typeof tmpAlignToKf !== 'undefined') {
                            if (tmpAlignToKf.rendered) {
                                const alignedKf: DOMRect = tmpAlignToKf.kfBg.getBoundingClientRect();//fixed
                                targetSize.w = alignedKf.width / state.zoomLevel;
                                targetSize.h = alignedKf.height / state.zoomLevel;
                            }
                        }
                        kfItem.createItem(k, treeLevel, kfGroup, kfPosiX, targetSize);
                    } else {
                        kfItem.createItem(k, treeLevel, kfGroup, kfPosiX);
                    }
                    if (typeof kfOmit !== 'undefined') {
                        kfItem.preOmit = kfOmit;
                    }

                    // KfItem.allKfItems.set(k.id, kfItem);
                    kfGroup.children.push(kfItem);
                    kfItem.idxInGroup = kfGroup.children.length - 1;
                    kfPosiX += kfItem.totalWidth;
                    console.log('updateing kfposix: ', kfPosiX, kfItem.totalWidth);
                }
            })
        } else if (kfg.children.length > 0) {
            //rendering kf group
            kfg.children.forEach((c: any, i: number) => {
                const tmpKfGroup: KfGroup = this.renderKeyframeGroup(i, kfg.children[i - 1], kfg.children.length, c, treeLevel, kfGroup);
                kfGroup.children.push(tmpKfGroup);
                tmpKfGroup.idxInGroup = kfGroup.children.length - 1;
                kfGroup.kfNum += tmpKfGroup.kfNum;
            });
        }
        return kfGroup;
    }

    // public static renderDataAttrs(sdaArr: ISortDataAttr[]): void {
    //     if (sdaArr.length > 0) {
    //         // document.getElementById('attrBtnContainer').innerHTML = '';
    //         // document.getElementById('sortInputContainer').innerHTML = '';
    //         // sdaArr.forEach(sda => {
    //         //     if (sda.attr !== 'markId') {
    //         //         const attrBtn: AttrBtn = new AttrBtn();
    //         //         attrBtn.createAttrBtn(sda.attr);
    //         //         document.getElementById('attrBtnContainer').appendChild(attrBtn.btn);
    //         //         const attrSort: AttrSort = new AttrSort();
    //         //         attrSort.createAttrSort(sda.attr);
    //         //         document.getElementById('sortInputContainer').appendChild(attrSort.selectInput);
    //         //     }
    //         // })
    //     }
    // }

    public static renderDataTable(dt: Map<string, IDataItem>): void {
        if (dt.size > 0) {
            const dataTable: SelectableTable = new SelectableTable();
            document.getElementById('dataTabelContainer').innerHTML = '';
            document.getElementById('dataTabelContainer').appendChild(dataTable.createTable(dt));
            SelectableTable.renderSelection(state.selection);
        }
    }

    /**
     * set the selection tool status
     * @param t 
     */
    public static renderChartTool(t: string): void {
        switch (t) {
            case ViewToolBtn.SINGLE:
                (<HTMLElement>document.getElementsByClassName('arrow-icon')[0]).click();
                break;
            case ViewToolBtn.LASSO:
                (<HTMLElement>document.getElementsByClassName('lasso-icon')[0]).click();
                break;
            case ViewToolBtn.DATA:
                (<HTMLElement>document.getElementsByClassName('table-icon')[0]).click();
                break;
        }
    }

    public static zoomKfContainer(zl: number): void {
        kfContainer.kfTrackScaleContainer.setAttributeNS(null, 'transform', `scale(${zl}, ${zl})`);
        //set visbility of chart thumbnails
        if (zl === ViewWindow.MAX_ZOOM_LEVEL) {
            zl -= 0.001;
        }
        const shownThumbnail: number = Math.floor((zl - ViewWindow.MIN_ZOOM_LEVEL) / ((ViewWindow.MAX_ZOOM_LEVEL - ViewWindow.MIN_ZOOM_LEVEL) / (state.chartThumbNailZoomLevels / 2)));
        const kfZoomLevel: number = Math.floor((zl - ViewWindow.MIN_ZOOM_LEVEL) / ((ViewWindow.MAX_ZOOM_LEVEL - ViewWindow.MIN_ZOOM_LEVEL) / state.chartThumbNailZoomLevels));
        // KfItem.allKfItems.forEach((kfItem: KfItem) => {
        //     kfItem.chartThumbnails.forEach((ct: SVGImageElement, i: number) => {
        //         if (i === shownThumbnail) {
        //             ct.classList.remove('no-display-ele');
        //         } else {
        //             ct.classList.add('no-display-ele');
        //         }
        //     })
        // })

        let sortedAniGroupAniIds: string[] = [...KfGroup.allAniGroups.keys()].sort((a: string, b: string) => {
            if (KfGroup.allAniGroups.get(a).alignType === Animation.alignTarget.withEle && KfGroup.allAniGroups.get(b).alignType !== Animation.alignTarget.withEle) {
                return 1;
            } else if (KfGroup.allAniGroups.get(a).alignType !== Animation.alignTarget.withEle && KfGroup.allAniGroups.get(b).alignType === Animation.alignTarget.withEle) {
                return -1;
            } else if (KfGroup.allAniGroups.get(a).alignType === Animation.alignTarget.withEle && KfGroup.allAniGroups.get(b).alignType === Animation.alignTarget.withEle) {
                const bbox1: DOMRect = KfGroup.allAniGroups.get(a).container.getBoundingClientRect();
                const bbox2: DOMRect = KfGroup.allAniGroups.get(b).container.getBoundingClientRect();
                return bbox1.top - bbox2.top;
            } else {
                return 0;
            }
            return -1;
        })

        //set visibility of kfgroups and kfitems
        // KfGroup.allAniGroups.forEach((aniKfGroup: KfGroup) => {
        sortedAniGroupAniIds.forEach((aniKfGroupAniId: string) => {
            const aniKfGroup: KfGroup = KfGroup.allAniGroups.get(aniKfGroupAniId);
            aniKfGroup.zoomGroup(kfZoomLevel, shownThumbnail);
            if (aniKfGroup.alignType === Animation.alignTarget.withEle) {//check kf positions
                aniKfGroup.updateAlignGroupKfPosis();
            }

        })
    }

    /**
     * set the style of the selected marks and the highlight box
     * @param selection 
     */
    public static renderSelectedMarks(selection: string[]): void {
        const svg = document.getElementById('visChart');
        //remove the dragAreas
        Array.from(document.getElementsByClassName('highlight-selection-frame')).forEach((da: HTMLElement) => {
            da.remove();
        })

        let highlightSelectionBox: HTMLElement = document.getElementById('highlightSelectionFrame');
        //highlight selection in data table
        SelectableTable.renderSelection(selection);
        if (selection.length === 0) {//no mark is selected
            if (highlightSelectionBox) {
                //reset highlightselectionbox
                highlightSelectionBox.setAttributeNS(null, 'x', '0');
                highlightSelectionBox.setAttributeNS(null, 'y', '0');
                highlightSelectionBox.setAttributeNS(null, 'width', '0');
                highlightSelectionBox.setAttributeNS(null, 'height', '0');
            }
            //reset all marks to un-selected
            Array.from(document.getElementsByClassName('non-framed-mark')).forEach((m: HTMLElement) => m.classList.remove('non-framed-mark'))
        } else {
            //find the boundary of the selected marks
            let minX = 10000, minY = 10000, maxX = -10000, maxY = -10000;
            Array.from(document.getElementsByClassName('mark')).forEach((m: HTMLElement) => {
                const markId: string = m.id;
                if (selection.includes(markId)) {//this is a selected mark
                    m.classList.remove('non-framed-mark');
                    const tmpBBox = (<SVGGraphicsElement><unknown>m).getBBox();
                    minX = tmpBBox.x < minX ? tmpBBox.x : minX;
                    minY = tmpBBox.y < minY ? tmpBBox.y : minY;
                    maxX = tmpBBox.x + tmpBBox.width > maxX ? (tmpBBox.x + tmpBBox.width) : maxX;
                    maxY = tmpBBox.y + tmpBBox.height > maxY ? (tmpBBox.y + tmpBBox.height) : maxY;

                    //render a dragable area
                    const mDragArea = <SVGElement>m.cloneNode(true);
                    mDragArea.setAttributeNS(null, 'class', 'highlight-selection-frame');
                    mDragArea.id = null;
                    mDragArea.setAttributeNS(null, 'fill', '#000');
                    mDragArea.setAttributeNS(null, 'stroke', '#000');
                    mDragArea.setAttributeNS(null, 'stroke-width', '4');
                    mDragArea.setAttributeNS(null, 'opacity', '0');
                    svg.appendChild(mDragArea);
                } else {//this is not a selected mark
                    m.classList.add('non-framed-mark');
                }
            })
            if (highlightSelectionBox) {
                //set the highlightSelectionFrame
                highlightSelectionBox.setAttributeNS(null, 'x', (minX - 5).toString());
                highlightSelectionBox.setAttributeNS(null, 'y', (minY - 5).toString());
                highlightSelectionBox.setAttributeNS(null, 'width', (maxX - minX + 10).toString());
                highlightSelectionBox.setAttributeNS(null, 'height', (maxY - minY + 10).toString());
            }
        }

    }

    public static renderActivatedPlusBtn() {
        this.renderStaticKf([]);
        this.renderKeyframeTracks(state.keyframeGroups);
        suggestBox.removeSuggestBox();
        const activatedPlusBtn: PlusBtn = PlusBtn.plusBtnMapping.get(state.activatePlusBtn.aniId);
        if (typeof activatedPlusBtn !== 'undefined') {
            activatedPlusBtn.dropSelOn();
        }
    }
}