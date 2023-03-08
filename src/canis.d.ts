declare module 'canis_toolkit' {
    export default class Canis {
        public canisObj: any;
        public frameRate: number;
        duration(): number;
        renderSpec(spec: any, callback: any): any;
        reset(): void;
        exportJSON(): string;
        test(): void;
    }
    export class ActionSpec {
        static actionTypes: any;
        static actionTargets: any;
        static targetAnimationType: any;
        static easingType: any;
        public chartIdx: number;
        public _type: string;
        public animationType: string
        public _easing: string;
        public _duration: number;
        public startTime: number;
        public attribute: any;
    }
    export class ChartSpec {
        static CHART_URL: string;
        static CHART_CONTENT: string;
        static dataMarkDatum: Map<string, any>;
        static nonDataMarkDatum: Map<string, any>;
        static chartUnderstanding: {
            [propName: string]: string[]
        };
    }
    export class Animation {
        static FIRST_ANI_ID: string;
        static frameTime: Map<number, boolean>;
        static animations: Map<string, any>;
        static allMarkAni: Map<string, any>;
        static allMarks: string[];
        static markClass: Map<string, string>;
        static alignTarget: {
            withEle: string
            withObj: string
        }
    }
    export class TimingSpec {
        static timingRef: {
            previousStart: string
            previousEnd: string
        }
    }
}