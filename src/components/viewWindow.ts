import '../assets/style/view-window.scss'
import { player } from './player'
import Slider from './widgets/slider'
import Tool from '../util/tool'
import { state, State } from '../app/state'
import * as action from '../app/action'
import Reducer from '../app/reducer'
import { kfContainer } from './kfContainer'

interface IViewBtnProp {
    title?: string,
    clickEvtType: string,
    clickEvt?: () => void,
    iconClass: string
}

export default class ViewWindow {
    static DATA_VIEW_TITLE: string = 'data';
    static CHART_VIEW_TITLE: string = 'chart';
    static VIDEO_VIEW_TITLE: string = 'animation';
    static HIDDEN_LOTTIE_ID: string = 'hiddenLottie';
    static KF_VIEW_TITLE: string = 'keyframe';
    static MIN_ZOOM_LEVEL: number = 0.6
    static MAX_ZOOM_LEVEL: number = 1
    static ZOOM_STEP: number = 0.05;

    viewTitle: string;
    view: HTMLDivElement;
    constructor(title: string) {
        this.viewTitle = title;
    }
    public createView() {
        this.view = document.createElement('div');
        this.view.className = 'view';

        const viewTitleContainer: HTMLDivElement = document.createElement('div');
        viewTitleContainer.className = 'view-title-container';
        if (this.viewTitle !== '') {
            const viewTitleText: HTMLSpanElement = document.createElement('span');
            viewTitleText.className = 'view-title-text';
            let titleText:string = this.viewTitle;
            switch (titleText) {
                case ViewWindow.KF_VIEW_TITLE:
                    titleText = "Animation Specification";
                    break;
                case ViewWindow.VIDEO_VIEW_TITLE:
                    titleText = "Animation Preview";
                    break;
                default:
                    break;
            }
            viewTitleText.innerHTML = Tool.firstLetterUppercase(titleText);
            viewTitleContainer.appendChild(viewTitleText);
        }

        this.view.appendChild(viewTitleContainer);

        const viewContent = new ViewContent();
        viewContent.createViewContent(this.viewTitle);
        this.view.appendChild(viewContent.container);

        //create tools on the title
        switch (this.viewTitle) {
            case ViewWindow.CHART_VIEW_TITLE:
                viewTitleContainer.appendChild(this.createSelectionTools());
                break;
            case ViewWindow.VIDEO_VIEW_TITLE:
                this.view.appendChild(this.createPlayerWidget());
                break;
            case ViewWindow.KF_VIEW_TITLE:
                viewTitleContainer.classList.add('keyframe-title-container');
                viewTitleContainer.appendChild(this.createKfTools());
                break;
        }
    }

    public createSelectionTools(): HTMLDivElement {
        const toolContainer: HTMLDivElement = document.createElement('div');
        toolContainer.className = 'view-tool-container';
        toolContainer.appendChild(this.createSeparator());
        toolContainer.appendChild(this.createBtn({
            title: 'Selection',
            clickEvtType: ViewToolBtn.SINGLE,
            iconClass: 'arrow-icon'
        }));
        toolContainer.appendChild(this.createBtn({
            title: 'Lasso Selection',
            clickEvtType: ViewToolBtn.LASSO,
            iconClass: 'lasso-icon'
        }));
        toolContainer.appendChild(this.createSeparator());
        toolContainer.appendChild(this.createBtn({
            title: 'Selection Suggestion',
            clickEvtType: ViewToolBtn.SUGGEST,
            iconClass: 'selection-suggestion-icon'
        }));

        return toolContainer;
    }

    public createKfTools(): HTMLDivElement {
        const toolContainer = document.createElement('div');
        toolContainer.className = 'view-tool-container';
        toolContainer.appendChild(this.createBtn({
            clickEvtType: ViewToolBtn.ZOOM,
            iconClass: 'zoom-icon'
        }));
        //create zooming slider

        const slider: Slider = new Slider([ViewWindow.MIN_ZOOM_LEVEL, ViewWindow.MAX_ZOOM_LEVEL], ViewWindow.MAX_ZOOM_LEVEL);
        slider.createSlider()
        slider.callbackFunc = (zl: number) => {
            Reducer.triger(action.KEYFRAME_ZOOM_LEVEL, zl);
        };
        toolContainer.appendChild(this.createBtn({
            title: 'Zoom Out',
            clickEvtType: ViewToolBtn.CUSTOM,
            clickEvt: () => {
                if (state.zoomLevel - ViewWindow.ZOOM_STEP >= ViewWindow.MIN_ZOOM_LEVEL) {
                    slider.moveSlider(state.zoomLevel - ViewWindow.ZOOM_STEP);
                } else {
                    slider.moveSlider(ViewWindow.MIN_ZOOM_LEVEL);
                }
            },
            iconClass: 'zoom-out-icon'
        }));
        toolContainer.appendChild(slider.sliderContainer);
        toolContainer.appendChild(this.createBtn({
            title: 'Zoom In',
            clickEvtType: ViewToolBtn.CUSTOM,
            clickEvt: () => {
                if (state.zoomLevel + ViewWindow.ZOOM_STEP <= ViewWindow.MAX_ZOOM_LEVEL) {
                    slider.moveSlider(state.zoomLevel + ViewWindow.ZOOM_STEP);
                } else {
                    slider.moveSlider(ViewWindow.MAX_ZOOM_LEVEL);
                }
            },
            iconClass: 'zoom-in-icon'
        }));
        return toolContainer;
    }

    public createSeparator(): HTMLSpanElement {
        const separator: HTMLSpanElement = document.createElement('span');
        separator.className = 'tool-separator';
        return separator;
    }

    public createBtn(props: IViewBtnProp): HTMLSpanElement {
        const btn: HTMLSpanElement = new ViewToolBtn().btn(props);
        return btn;
    }

    public createPlayerWidget(): HTMLDivElement {
        const container: HTMLDivElement = document.createElement('div');
        container.className = 'widget';
        container.appendChild(player.widget);
        return container;
    }
}


export class ViewToolBtn {
    //static vars
    static SINGLE: string = 'single';
    static LASSO: string = 'lasso';
    static DATA: string = 'data';
    static ZOOM: string = 'zoom';
    static SUGGEST: string = 'suggest';
    static ZOOM_OUT: string = 'zoomOut';
    static ZOOM_IN: string = 'zoomIn';
    static CUSTOM: string = 'custom';

    public btn(props: IViewBtnProp): HTMLSpanElement {
        const btn: HTMLSpanElement = document.createElement('span');
        btn.className = 'tool-btn';
        if (props.title) {
            btn.title = props.title;
        }
        const btnIcon: HTMLSpanElement = document.createElement('span');
        btnIcon.className = 'svg-icon ' + props.iconClass;
        btn.appendChild(btnIcon);

        switch (props.clickEvtType) {
            case ViewToolBtn.SINGLE:
                btn.onclick = () => this.singleSelect();
                break;
            case ViewToolBtn.LASSO:
                btn.onclick = () => this.lassoSelect();
                break;
            case ViewToolBtn.SUGGEST:
                btnIcon.classList.add('no-hover-icon');
                btn.onclick = () => this.suggestSelection(btnIcon);
                break;
            case ViewToolBtn.ZOOM:
                btn.setAttribute('disabled', 'true');
                break;
            case ViewToolBtn.ZOOM_IN:
                btn.classList.add('narrow-tool-btn');
                btn.onclick = () => this.zoomIn();
                break;
            case ViewToolBtn.ZOOM_OUT:
                btn.classList.add('narrow-tool-btn');
                btn.onclick = () => this.zoomOut();
                break;
            case ViewToolBtn.CUSTOM:
                btn.classList.add('narrow-tool-btn');
                btn.onclick = props.clickEvt;
                break;
        }

        return btn;
    }

    // btn listeners
    public suggestSelection(btnIcon: HTMLSpanElement): void {
        if (state.suggestion) {
            btnIcon.classList.add('selection-non-suggestion-icon');
            btnIcon.classList.remove('selection-suggestion-icon');
            State.tmpStateBusket.push({
                historyAction: { actionType: action.TOGGLE_SUGGESTION, actionVal: true },
                currentAction: { actionType: action.TOGGLE_SUGGESTION, actionVal: false }
            })
            State.saveHistory();
            Reducer.triger(action.TOGGLE_SUGGESTION, false);
        } else {
            btnIcon.classList.remove('selection-non-suggestion-icon');
            btnIcon.classList.add('selection-suggestion-icon');
            State.tmpStateBusket.push({
                historyAction: { actionType: action.TOGGLE_SUGGESTION, actionVal: false },
                currentAction: { actionType: action.TOGGLE_SUGGESTION, actionVal: true }
            })
            State.saveHistory();
            Reducer.triger(action.TOGGLE_SUGGESTION, true);
        }
    }

    public singleSelect(): void {
        if (!document.getElementById('chartContainer').classList.contains('single-select')) {
            //change cursor
            document.getElementById('chartContainer').classList.add('single-select');
            document.getElementById('chartContainer').classList.remove('lasso-select');
            //change button status
            if (document.getElementsByClassName('selected-tool').length > 0) {
                document.getElementsByClassName('selected-tool')[0].classList.remove('selected-tool');
            }
            document.getElementsByClassName('arrow-icon')[0].classList.add('selected-tool');
            //init rectangular selection
            Tool.initRectangularSelection('chartContainer');
        }
    }

    public lassoSelect(): void {
        if (!document.getElementById('chartContainer').classList.contains('lasso-select')) {
            //change cursor
            document.getElementById('chartContainer').classList.remove('single-select');
            document.getElementById('chartContainer').classList.add('lasso-select');
            //change button status
            if (document.getElementsByClassName('selected-tool').length > 0) {
                document.getElementsByClassName('selected-tool')[0].classList.remove('selected-tool');
            }
            document.getElementsByClassName('lasso-icon')[0].classList.add('selected-tool');
            //init lasso selection
            Tool.initLassoSelection('chartContainer');
        }
    }

    public zoomIn(): void { }
    public zoomOut(): void { }
}

export class ViewContent {
    static VIEW_CONTENT_CLS: string = 'view-content';
    static DATA_VIEW_CONTENT_ID: string = 'dataContainer';
    static DATA_VIEW_CONTENT_CLS: string = 'data-view-content';
    static CHART_VIEW_CONTENT_ID: string = 'chartContainer';
    static CHART_VIEW_CONTENT_CLS: string = 'chart-view-content';
    static VIDEO_VIEW_CONTENT_ID: string = 'videoContainer';
    static VIDEO_VIEW_CONTENT_CLS: string = 'video-view-content';
    static KF_VIEW_CONTENT_ID: string = 'kfContainer';
    static KF_VIEW_CONTENT_CLS: string = 'kf-view-content';

    container: HTMLDivElement;

    public static createMultiChartContainer(): HTMLDivElement {
        const chartPanel: HTMLElement = document.getElementById(this.CHART_VIEW_CONTENT_ID);
        const multiChartContainer: HTMLDivElement = document.createElement('div');
        multiChartContainer.className = 'multi-charts-cover';
        chartPanel.innerHTML = '';
        chartPanel.appendChild(multiChartContainer);
        return multiChartContainer;
    }

    public createViewContent(contentType: string) {
        switch (contentType) {
            case ViewWindow.DATA_VIEW_TITLE:
                this.createViewContainer(ViewContent.DATA_VIEW_CONTENT_ID, ViewContent.DATA_VIEW_CONTENT_CLS);
                this.createDataDashboard();
                break;
            case ViewWindow.CHART_VIEW_TITLE:
                this.createViewContainer(ViewContent.CHART_VIEW_CONTENT_ID, ViewContent.CHART_VIEW_CONTENT_CLS);
                break;
            case ViewWindow.VIDEO_VIEW_TITLE:
                this.createViewContainer(ViewContent.VIDEO_VIEW_CONTENT_ID, ViewContent.VIDEO_VIEW_CONTENT_CLS);
                break;
            case ViewWindow.KF_VIEW_TITLE:
                this.createViewContainer(ViewContent.KF_VIEW_CONTENT_ID, ViewContent.KF_VIEW_CONTENT_CLS);
                this.container.appendChild(this.createKeyframeListContainer());
                break;
        }
    }

    public createViewContainer(id: string, className: string): void {
        this.container = document.createElement('div');
        this.container.id = id;
        this.container.className = ViewContent.VIEW_CONTENT_CLS + ' ' + className;
        // if (id === ViewContent.CHART_VIEW_CONTENT_ID) {
        //     const multiChartCover: HTMLDivElement = document.createElement('div');
        //     multiChartCover.className = 'multi-charts-cover';
        //     this.container.appendChild(multiChartCover);
        // }
    }

    public createKeyframeListContainer(): HTMLDivElement {
        const keyframePanel: HTMLDivElement = document.createElement('div');
        keyframePanel.className = 'kf-panel';
        kfContainer.createKfContainer();
        keyframePanel.appendChild(kfContainer.kfWidgetContainer);

        return keyframePanel;
    }

    public createDataDashboard() {
        //attribute container, for data binding
        // const attrWrapper: HTMLDivElement = document.createElement('div');
        // attrWrapper.className = 'attr-wrapper non-sortable-attr-wrapper';
        // const attrBtnWrapper: HTMLDivElement = document.createElement('div');
        // const titleColumn: HTMLSpanElement = document.createElement('span');
        // titleColumn.className = 'data-column-title';
        // titleColumn.innerText = 'columns';
        // attrBtnWrapper.appendChild(titleColumn);
        // const attrBtnContainer: HTMLDivElement = document.createElement('div');
        // attrBtnContainer.id = 'attrBtnContainer';
        // attrBtnWrapper.appendChild(attrBtnContainer);
        // attrWrapper.appendChild(attrBtnWrapper);

        // const sortInputWrapper: HTMLDivElement = document.createElement('div');
        // sortInputWrapper.id = 'sortInputWrapper';
        // const titleSort: HTMLSpanElement = document.createElement('span');
        // titleSort.innerText = 'sort';
        // titleSort.className = 'data-column-title';
        // sortInputWrapper.appendChild(titleSort);
        // const sortInputContainer: HTMLDivElement = document.createElement('div');
        // sortInputContainer.id = 'sortInputContainer';
        // sortInputWrapper.appendChild(sortInputContainer);
        // attrWrapper.appendChild(sortInputWrapper);
        // this.container.appendChild(attrWrapper);

        //data table container
        const dataTableWrapper: HTMLDivElement = document.createElement('div');
        dataTableWrapper.className = 'data-table-wrapper';
        //for data binding
        // const dataTableTitle: HTMLDivElement = document.createElement('div');
        // dataTableTitle.className = 'data-table-title';
        // const dataTableTitleText: HTMLSpanElement = document.createElement('span');
        // dataTableTitleText.innerText = 'table';
        // dataTableTitleText.className = 'data-table-title-text';
        // dataTableTitle.appendChild(dataTableTitleText);
        // const dataTableTitleDropdown: HTMLSpanElement = document.createElement('span');
        // dataTableTitleDropdown.className = 'drop-down left-up-icon';
        // dataTableTitleDropdown.onclick = () => {
        //     dataTableTitleDropdown.classList.toggle('left-up-icon');
        //     dataTableContainer.classList.toggle('hidden-data-table');
        //     // attrWrapper.classList.toggle('non-sortable-attr-wrapper');
        // }
        // dataTableTitle.appendChild(dataTableTitleDropdown);
        // dataTableWrapper.appendChild(dataTableTitle);
        const dataTableContainer: HTMLDivElement = document.createElement('div');
        dataTableContainer.id = 'dataTabelContainer';
        dataTableContainer.className = 'data-table-container';
        // dataTableContainer.className = 'data-table-container hidden-data-table';//for data binding
        dataTableWrapper.appendChild(dataTableContainer);
        this.container.appendChild(dataTableWrapper);
    }


}