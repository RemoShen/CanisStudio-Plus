import '../assets/style/floating-window.scss'
import MushroomImg from '../assets/img/examples/mushroom.png'
import MushroomChart from '../assets/charts/mushrooms.svg'
import OsImg from '../assets/img/examples/os.png'
import OsChart from '../assets/charts/os.svg'
import PurchasesImg from '../assets/img/examples/purchases.png'
import PurchasesChart from '../assets/charts/purchases.svg'
import NightingaleImg from '../assets/img/examples/nightingale.png'
import NightingaleChart from '../assets/charts/nightingale.svg'
import Co2Img from '../assets/img/examples/co2.png'
import Co2Chart from '../assets/charts/co2.svg'
import DessertImg from '../assets/img/examples/dessert.png'
import DessertChart from '../assets/charts/desserts.svg'
import BostonImg from '../assets/img/examples/bostonWeather.png'
import BostonChart from '../assets/charts/bostonWeather.svg'
import WorldPopuImg from '../assets/img/examples/worldPopulation.png'
import WorldPopuChart from '../assets/charts/worldPopulation.svg'
import PolioImg from '../assets/img/examples/polio.png'
import PolioChart from '../assets/charts/polio_black.svg'
import DrivingImg from '../assets/img/examples/driving.png'
import DrivingChart from '../assets/charts/driving.svg'
import FlareImg from '../assets/img/examples/flare.png'
import FlareChart from '../assets/charts/flare.svg'
import GanttImg from '../assets/img/examples/gantt.png'
import GanttChart from '../assets/charts/gantt.svg'
import UsPopulationImg from '../assets/img/examples/usPopulation.png'
import UsPopulationChart from '../assets/charts/usPopulation.svg'
import ChinaPmImg from '../assets/img/examples/chinapm.png'
import ChinaPmChart from '../assets/charts/chinapm.svg'
import HiringImg from '../assets/img/examples/hiring.png'
import HiringChart from '../assets/charts/hiring.svg'
import TScoreImg from '../assets/img/examples/tscore.png'
import TScoreChart from '../assets/charts/tScore.svg'
import FruitSaleImg from '../assets/img/examples/fruitsale.png'
import FruitSaleChart from '../assets/charts/fruit.svg'
import WeatherImg from '../assets/img/examples/weather.png'
import WeatherChart from '../assets/charts/weather.svg'
import EducationImg from '../assets/img/examples/education.png'
import EducationChart from '../assets/charts/education.svg'
import GdpChart from '../assets/charts/GDPofRegions.svg'
import GdpImg from '../assets/img/examples/GDPofRegions.png'
import StackedChart from '../assets/charts/food_supply.svg'
import StackedImg from '../assets/img/examples/food_supply.png'
import { ViewContent } from './viewWindow'
import { Loading } from './widgets/loading'
import { chartManager } from '../app/chartManager'

export default class FloatingWindow {
    static TYPE_EXAMPLE: string = 'exampleContainer';//type of the floating window is example
    // static TYPE_SPEC: string = 'SpecContainer';//type of the floating window is spec test
    static CLICKABLE_AREA_CHART: string = 'inputChart';
    static CLICKABLE_AREA_PROJECT: string = 'inputProject';

    static MUSHROOM_CHART: string = 'mushroom';
    static GANTT_CHART: string = 'gantt';
    static OS_CHART: string = 'mobileOS';
    static PURCHASE_CHART: string = 'purchases';
    static NIGHTINGALE_CHART: string = 'nightingale';
    static CO2_CHART: string = 'co2';
    static DESSERT_CHART: string = 'dessert';
    static BOSTON_CHART: string = 'boston';
    static CHINAPM_CHART: string = 'chinapm';
    static WORLDPOPULATION_CHART: string = 'worldPopulation';
    static POLIO_CHART: string = 'polio';
    static DRIVING_CHART: string = 'driving';
    static FLARE_CHART: string = 'flare';
    static USPOPULATION_CHART: string = 'uspopulation';
    static HIRING_CHART: string = 'hiring';
    static TSCORE_CHART: string = 'tscore';
    static FRUITSALE_CHART: string = 'fruitSale';
    static WEATHER_CHART: string = 'weather';
    static EDUCATION_CHART: string = 'education';
    static GDP_CHART: string = 'gdp';
    static STACKED_CHART: string = 'stacked';
    floatingWindow: HTMLDivElement;

    public createFloatingWindow(id: string) {
        //create the background container
        this.floatingWindow = document.createElement('div');
        this.floatingWindow.id = id;
        this.floatingWindow.className = 'floating-container';
        const windowBg: HTMLDivElement = document.createElement('div');
        windowBg.className = 'floating-bg';
        this.floatingWindow.appendChild(windowBg);

        //create window
        const fWindow: HTMLDivElement = document.createElement('div');
        fWindow.className = 'f-window';
        const windowTitle: HTMLDivElement = document.createElement('div');
        windowTitle.className = 'title-wrapper';
        const titleContent: HTMLDivElement = document.createElement('div');
        titleContent.className = 'title-content';

        windowTitle.appendChild(titleContent);
        const closeBtn: HTMLSpanElement = document.createElement('span');
        closeBtn.className = 'title-btn';
        const closeIcon: HTMLSpanElement = document.createElement('span');
        closeIcon.className = 'btn-icon close-icon';
        closeBtn.appendChild(closeIcon);
        closeBtn.onclick = () => {
            this.floatingWindow.remove();
        }
        windowTitle.appendChild(closeBtn);
        fWindow.appendChild(windowTitle);
        //create window content
        const windowContent: HTMLDivElement = document.createElement('div');
        windowContent.className = 'content-wrapper';
        switch (id) {
            case FloatingWindow.TYPE_EXAMPLE:
                titleContent.innerHTML = '';
                windowContent.appendChild(this.createExampleList());
                break;
            // case FloatingWindow.TYPE_SPEC:
            //     titleContent.innerHTML = 'spec';
            //     windowContent.appendChild(this.createSpecPanel());
            //     break;
            default:
                break;
        }

        fWindow.appendChild(windowContent);
        this.floatingWindow.appendChild(fWindow);
    }

    public createExampleList(): HTMLDivElement {
        const exampleList: HTMLDivElement = document.createElement('div');
        exampleList.className = 'example-list';

        const clickableAreaContainer: HTMLDivElement = document.createElement('div');
        clickableAreaContainer.className = 'click-to-open-area-container';

        const clickableAreaSubContainerChart: HTMLDivElement = document.createElement('div');
        clickableAreaSubContainerChart.className = 'click-to-open-area-subcontainer';
        const openchartTitle: HTMLHeadingElement = document.createElement('h3');
        openchartTitle.innerText = 'Load Charts';
        clickableAreaSubContainerChart.appendChild(openchartTitle);
        clickableAreaSubContainerChart.appendChild(this.createClickableArea(FloatingWindow.CLICKABLE_AREA_CHART));
        clickableAreaContainer.appendChild(clickableAreaSubContainerChart);

        const clickableAreaSubContainerProj: HTMLDivElement = document.createElement('div');
        clickableAreaSubContainerProj.className = 'click-to-open-area-subcontainer';
        const projectTitle: HTMLHeadingElement = document.createElement('h3');
        projectTitle.innerText = 'Open Project';
        clickableAreaSubContainerProj.appendChild(projectTitle);
        clickableAreaSubContainerProj.appendChild(this.createClickableArea(FloatingWindow.CLICKABLE_AREA_PROJECT));
        clickableAreaContainer.appendChild(clickableAreaSubContainerProj);
        exampleList.appendChild(clickableAreaContainer);

        const sep: HTMLHRElement = document.createElement('hr');
        sep.className = 'floating-window-sep';
        exampleList.appendChild(sep);

        const chartTitle: HTMLHeadingElement = document.createElement('h3');
        chartTitle.innerText = 'Load Example Project';
        exampleList.appendChild(chartTitle);
        //add chart examples
        const exampleItemContainer1: HTMLDivElement = document.createElement('div');
        exampleItemContainer1.className = 'list-item-container';
        exampleItemContainer1.appendChild(this.createExampleItem(FloatingWindow.NIGHTINGALE_CHART, 'Nightingale'));
        exampleItemContainer1.appendChild(this.createExampleItem(FloatingWindow.HIRING_CHART, 'hiring'));
        exampleItemContainer1.appendChild(this.createExampleItem(FloatingWindow.OS_CHART, 'Mobile OS'));
        exampleItemContainer1.appendChild(this.createExampleItem(FloatingWindow.GANTT_CHART, 'eventPlan'));
        exampleList.appendChild(exampleItemContainer1);
        const exampleItemContainer2: HTMLDivElement = document.createElement('div');
        exampleItemContainer2.className = 'list-item-container';
        exampleItemContainer2.appendChild(this.createExampleItem(FloatingWindow.GDP_CHART, 'gdp of region'));
        exampleItemContainer2.appendChild(this.createExampleItem(FloatingWindow.MUSHROOM_CHART, 'Mushroom'));
        exampleItemContainer2.appendChild(this.createExampleItem(FloatingWindow.DESSERT_CHART, 'Dessert'))
        exampleItemContainer2.appendChild(this.createExampleItem(FloatingWindow.DRIVING_CHART, 'Driving'));
        exampleList.appendChild(exampleItemContainer2);
        const exampleItemContainer3: HTMLDivElement = document.createElement("div");
        exampleItemContainer3.className = 'list-item-container';
        exampleItemContainer3.appendChild(this.createExampleItem(FloatingWindow.FRUITSALE_CHART, 'fruitSale'));
        exampleItemContainer3.appendChild(this.createExampleItem(FloatingWindow.WEATHER_CHART, 'september weather'));
        exampleItemContainer3.appendChild(this.createExampleItem(FloatingWindow.STACKED_CHART, 'Food Supply'));
        exampleItemContainer3.appendChild(this.createExampleItem(FloatingWindow.PURCHASE_CHART, 'Doughnut Purchases'));
        exampleList.appendChild(exampleItemContainer3);
        const exampleItemContainer4: HTMLDivElement = document.createElement('div');
        exampleItemContainer4.className = 'list-item-container';
        exampleItemContainer4.appendChild(this.createExampleItem(FloatingWindow.USPOPULATION_CHART, 'usPopulation'));
        exampleItemContainer4.appendChild(this.createExampleItem(FloatingWindow.CHINAPM_CHART, 'chinaPm'));
        exampleItemContainer4.appendChild(this.createExampleItem(FloatingWindow.CO2_CHART, 'CO2 Emissions'));
        exampleItemContainer4.appendChild(this.createExampleItem(FloatingWindow.EDUCATION_CHART, 'Higher Education v.s. Obesity'))
        exampleList.appendChild(exampleItemContainer4);
        const exampleItemContainer5: HTMLDivElement = document.createElement('div');
        exampleItemContainer5.className = 'list-item-container';
        exampleItemContainer5.appendChild(this.createExampleItem(FloatingWindow.WORLDPOPULATION_CHART, 'World Population Pyramid'));
        exampleItemContainer5.appendChild(this.createExampleItem(FloatingWindow.TSCORE_CHART, 'tScore'));
        exampleItemContainer5.appendChild(this.createExampleItem(FloatingWindow.FLARE_CHART, 'Flare'));
        exampleItemContainer5.appendChild(this.createExampleItem(FloatingWindow.POLIO_CHART, 'Polio Incidence Rates'));
        // exampleItemContainer5.appendChild(this.createExampleItem(FloatingWindow.BOSTON_CHART, 'Boston Weather'));
        exampleList.appendChild(exampleItemContainer5);
        return exampleList;
    }

    public createClickableArea(type: string): HTMLDivElement {
        const clickableArea: HTMLDivElement = document.createElement('div');
        clickableArea.className = 'click-to-open-area';
        clickableArea.ondragover = (overEvt) => {
            overEvt.preventDefault();
        }
        clickableArea.ondragenter = () => {
            clickableArea.classList.add('drag-over-area');
        }
        clickableArea.ondragleave = () => {
            clickableArea.classList.remove('drag-over-area');
        }

        switch (type) {
            case FloatingWindow.CLICKABLE_AREA_CHART:
                clickableArea.innerHTML = 'Drop or Open File (.dsvg)';
                clickableArea.ondrop = (dropEvt) => {
                    const that = this;
                    dropEvt.preventDefault();
                    let projectFile = dropEvt.dataTransfer.files[0];
                    const fr = new FileReader();
                    fr.readAsText(projectFile);
                    fr.onload = function () {
                        const chart: string = <string>fr.result;
                        that.loadExampleChart(chart);
                    }
                }
                clickableArea.onclick = (clickEvt) => {
                    const that = this;
                    const input: HTMLInputElement = document.createElement("input");
                    input.setAttribute('type', 'file');
                    input.setAttribute('multiple', 'multiple');
                    input.onchange = (changeEvt) => {
                        let charts: string[] = [];
                        for (let i = 0, len = input.files.length; i < len; i++) {
                            const chartFile: File = input.files[i];
                            const fr = new FileReader();
                            fr.readAsText(chartFile);
                            fr.onload = function () {
                                const chart: string = <string>fr.result;
                                that.loadExampleChart(chart);
                            }
                        }


                    }
                    input.click();
                    return false;
                }
                break;
            case FloatingWindow.CLICKABLE_AREA_PROJECT:
                clickableArea.innerHTML = 'Drop or Open File (.cpro)';
                clickableArea.ondrop = (dropEvt) => {
                    const that = this;
                    dropEvt.preventDefault();
                    let projectFile = dropEvt.dataTransfer.files[0];
                    const fr = new FileReader();
                    fr.readAsText(projectFile);
                    fr.onload = function () {
                        const spec: string = <string>fr.result;
                        // TODO:load canis spec
                        that.floatingWindow.remove();
                    }
                }
                clickableArea.onclick = (clickEvt) => {
                    const that = this;
                    const input: HTMLInputElement = document.createElement("input");
                    input.setAttribute('type', 'file');
                    input.onchange = (changeEvt) => {
                        let projectFile = input.files[0];
                        const fr = new FileReader();
                        fr.readAsText(projectFile);
                        fr.onload = function () {
                            const spec: string = <string>fr.result;
                            // TODO: load canis spec
                            that.floatingWindow.remove();
                        }
                    }
                    input.click();
                    return false;
                }
                break;
        }
        const uploadIcon: HTMLDivElement = document.createElement('div');
        uploadIcon.className = 'upload-icon';
        clickableArea.appendChild(uploadIcon);

        return clickableArea;
    }

    public createExampleItem(name: string, caption: string): HTMLDivElement {
        const item: HTMLDivElement = document.createElement('div');
        item.className = 'example-list-item';
        const imgWrapper: HTMLDivElement = document.createElement('div');
        const img: HTMLImageElement = document.createElement('img');
        switch (name) {
            case FloatingWindow.MUSHROOM_CHART:
                img.src = MushroomImg;
                item.onclick = () => this.loadExampleChart(MushroomChart);
                break;
            case FloatingWindow.DRIVING_CHART:
                img.src = DrivingImg;
                item.onclick = () => this.loadExampleChart(DrivingChart);
                break;
            case FloatingWindow.OS_CHART:
                img.src = OsImg;
                item.onclick = () => this.loadExampleChart(OsChart);
                break;
            case FloatingWindow.PURCHASE_CHART:
                img.src = PurchasesImg;
                item.onclick = () => this.loadExampleChart(PurchasesChart);
                break;
            case FloatingWindow.NIGHTINGALE_CHART:
                img.src = NightingaleImg;
                item.onclick = () => this.loadExampleChart(NightingaleChart);
                break;
            case FloatingWindow.CO2_CHART:
                img.src = Co2Img;
                item.onclick = () => this.loadExampleChart(Co2Chart);
                break;
            case FloatingWindow.DESSERT_CHART:
                img.src = DessertImg;
                item.onclick = () => this.loadExampleChart(DessertChart);
                break;
            case FloatingWindow.BOSTON_CHART:
                img.src = BostonImg;
                item.onclick = () => this.loadExampleChart(BostonChart);
                break;
            case FloatingWindow.WORLDPOPULATION_CHART:
                img.src = WorldPopuImg;
                item.onclick = () => this.loadExampleChart(WorldPopuChart);
                break;
            case FloatingWindow.POLIO_CHART:
                img.src = PolioImg;
                item.onclick = () => this.loadExampleChart(PolioChart);
                break;
            case FloatingWindow.FLARE_CHART:
                img.src = FlareImg;
                item.onclick = () => this.loadExampleChart(FlareChart);
                break;
            case FloatingWindow.USPOPULATION_CHART:
                img.src = UsPopulationImg;
                item.onclick = () => this.loadExampleChart(UsPopulationChart);
                break;
            case FloatingWindow.CHINAPM_CHART:
                img.src = ChinaPmImg;
                item.onclick = () => this.loadExampleChart(ChinaPmChart);
                break;
            case FloatingWindow.HIRING_CHART:
                img.src = HiringImg;
                item.onclick = () => this.loadExampleChart(HiringChart);
                break;
            case FloatingWindow.TSCORE_CHART:
                img.src = TScoreImg;
                item.onclick = () => this.loadExampleChart(TScoreChart);
                break;
            case FloatingWindow.GANTT_CHART:
                img.src = GanttImg;
                item.onclick = () => this.loadExampleChart(GanttChart);
                break;
            case FloatingWindow.FRUITSALE_CHART:
                img.src = FruitSaleImg;
                item.onclick = () => this.loadExampleChart(FruitSaleChart);
                break;
            case FloatingWindow.WEATHER_CHART:
                img.src = WeatherImg;
                item.onclick = () => this.loadExampleChart(WeatherChart);
                break;
            case FloatingWindow.EDUCATION_CHART:
                img.src = EducationImg;
                item.onclick = () => this.loadExampleChart(EducationChart);
                break;
            case FloatingWindow.GDP_CHART:
                img.src = GdpImg;
                item.onclick = () => this.loadExampleChart(GdpChart);
                break;
            case FloatingWindow.STACKED_CHART:
                img.src = StackedImg;
                item.onclick = () => this.loadExampleChart(StackedChart);
                break;
        }
        imgWrapper.appendChild(img);
        item.appendChild(imgWrapper);
        const captionWrapper: HTMLParagraphElement = document.createElement('p');
        captionWrapper.innerText = caption;
        item.appendChild(captionWrapper);
        return item;
    }

    public loadExampleChart(chart: any) {
        chartManager.loadChart(chart);
        this.floatingWindow.remove();
    }
}