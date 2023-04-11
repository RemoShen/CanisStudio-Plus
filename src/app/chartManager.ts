import Lottie from "lottie-web";
import { IChartSpec } from "../app_backup/core/canisGenerator";
import { Player, player } from "../components/player";
import { ViewContent } from "../components/viewWindow";
import CanisGenerator, { canis, ICanisSpec } from "./core/canisGenerator";
import { clearKfTrees } from "./kfTree";
import { MarkSelector, MarkSelectorMode } from "./markSelector";
import { fromPairs } from "lodash";
import { markTableManager } from "./markTableManager";

export const MARKID = "_MARKID";

class MarkTable {
    markType: Set<string> = new Set();
    fieldNames: string[] = [];
    fieldType: string[] = [];
    items: { id: string, attributes: string[] }[] = [];

    constructor(firstMark: Map<string, string>, id: string) {
        this.fieldNames.push(MARKID);
        for (let [k, v] of firstMark) {
            if (k == MARKID) {
                continue;
            }
            this.fieldNames.push(k);
        }
        this.tryToAddMark(firstMark, id);
    }

    tryToAddMark(mark: Map<string, string>, id: string) {
        if (mark.size != this.fieldNames.length) {
            return false;
        }

        for (let name of this.fieldNames) {
            if (!mark.has(name)) {
                return false;
            }
        }

        const attributes: string[] = [];
        for (let i of this.fieldNames) {
            attributes.push(mark.get(i));
        }
        this.items.push({ id, attributes });
        this.markType.add(mark.get(MARKID));
        return true;
    }
}

class ChartManager {
    canisSpec: ICanisSpec;
    marks: Map<string, Map<string, string>> = new Map();
    isText: Map<string, boolean> = new Map();
    markTables: MarkTable[];
    lottieSpec: any;
    lottieAnimation: any;

    async loadChart(chart: string) {
        const chartSpec: IChartSpec[] = CanisGenerator.generateChartSpec([chart]);
        const spec: ICanisSpec = { charts: chartSpec, animations: [] };
        this.marks.clear();
        this.canisSpec = spec;
        const lottieSpec = await canis.renderSpec(this.canisSpec, () => { });
        // console.log('lottiespec', lottieSpec);

        this.updateAnimation(lottieSpec);

        const marks = document.getElementsByClassName("mark");
        for (let i = 0, l = marks.length; i < l; i++) {
            const mark = marks[i];
            this.isText.set(mark.id, mark.tagName == "text");
            const markAttributes = JSON.parse(mark.getAttribute("data-datum"));
            const attributeMap = new Map<string, string>();
            attributeMap.set(MARKID, markAttributes[MARKID]);
            for (let name in markAttributes) {
                if (name[0] == "_") {
                    continue;
                }
                if (parseFloat(markAttributes[name]) == Number(markAttributes[name])) {
                    continue;
                }
                let value: string = markAttributes[name];
                if (value[0] == "_") {
                    value = value.slice(1);
                }
                attributeMap.set(name, value);
            }
            this.marks.set(mark.id, attributeMap);
        }

        // MarkSelector.reset(new Set(), new Map(), []);
        this.loadMarkTables();
        clearKfTrees();
    }

    loadMarkTables() {
        const markTables: MarkTable[] = [];
        for (let [id, mark] of this.marks) {
            let flag: boolean = false;
            for (let markTable of markTables) {
                if (markTable.tryToAddMark(mark, id)) {
                    flag = true;
                    break;
                }
            }
            if (flag) {
                continue;
            }
            markTables.push(new MarkTable(mark, id));
        }
        console.log('markTables',markTables);
        this.markTables = markTables;
        markTableManager.render();
    }

    async updateCanisSpec(animations: any[]) {
        if (!this.canisSpec) {
            return;
        }
        this.canisSpec.animations = animations;
        // console.log(JSON.stringify(this.canisSpec));
        const lottieSpec = await canis.renderSpec(this.canisSpec, () => { });
        // console.log(lottieSpec);
        this.updateAnimation(lottieSpec);
    }

    updateAnimation(lottieSpec: any) {
        this.lottieSpec = lottieSpec;
        // console.log(JSON.stringify(lottieSpec));
        document.getElementById(ViewContent.VIDEO_VIEW_CONTENT_ID).innerHTML = '';
        this.lottieAnimation = Lottie.loadAnimation({
            container: document.getElementById(ViewContent.VIDEO_VIEW_CONTENT_ID),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            animationData: lottieSpec // the animation data
        })
        player.resetPlayer({
            frameRate: canis.frameRate,
            currentTime: 0,
            totalTime: canis.duration()
        })
        // document.getElementById(Player.PLAY_BTN_ID).click();
    }

}

export const chartManager = new ChartManager();