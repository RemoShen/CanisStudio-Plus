import { KfContainer } from "../kfContainer";
import KfGroup from "./kfGroup";
import KfItem from "./kfItem";

export default class KfTrack {
    static TRACK_PADDING_TOP: number = 16;
    static TRACK_WIDTH: number = 20000;
    static TRACK_HEIGHT: number = 180;
    static trackIdx: number = 0;
    static allTracks: Map<string, KfTrack> = new Map();//key:id, value: kftrack
    static aniTrackMapping: Map<string, Set<KfTrack>> = new Map();//key: aniId, value: tracks this animation possesses

    public trackId: string;
    public trackBgContainer: SVGGElement;
    public trackPosiY: number;
    public container: SVGGElement;
    public trackBg: SVGRectElement;
    public splitLineTop: SVGLineElement;
    public splitLineBottom: SVGLineElement;
    public availableInsert: number = KfItem.PADDING;
    // public availableInsert: number = KfItem.KF_WIDTH + KfItem.PADDING;
    public children: KfGroup[] = [];

    public static reset() {
        this.trackIdx = 0;
        this.allTracks.clear();
        this.aniTrackMapping.clear();
    }

    public createTrack(fake: boolean = false): void {
        //TODO: consider insert new tracks
        const numExistTracks: number = document.querySelectorAll('.kf-track:not(.fake-track)').length;
        // const numExistTracks: number = document.getElementsByClassName('kf-track').length;
        this.trackPosiY = numExistTracks * KfTrack.TRACK_HEIGHT + KfTrack.TRACK_PADDING_TOP;
        this.trackBgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.trackBgContainer.setAttributeNS(null, 'transform', `translate(0, ${this.trackPosiY})`);
        this.trackBgContainer.setAttributeNS(null, 'id', `trackBg${KfTrack.trackIdx}`);
        document.getElementById(KfContainer.KF_BG).appendChild(this.trackBgContainer);

        this.trackId = `trackFg${KfTrack.trackIdx}`;
        this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.container.setAttributeNS(null, 'transform', `translate(0, ${numExistTracks * KfTrack.TRACK_HEIGHT + KfTrack.TRACK_PADDING_TOP})`);
        this.container.setAttributeNS(null, 'id', this.trackId);
        this.container.setAttributeNS(null, 'class', `kf-track ${fake ? 'fake-track' : ''}`);
        document.getElementById(KfContainer.KF_FG).appendChild(this.container);

        KfTrack.trackIdx++;

        //draw track bg
        this.trackBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.trackBg.setAttributeNS(null, 'x', '0');
        this.trackBg.setAttributeNS(null, 'y', '0');
        this.trackBg.setAttributeNS(null, 'width', `${KfTrack.TRACK_WIDTH}`);
        this.trackBg.setAttributeNS(null, 'height', fake ? '0' : `${KfTrack.TRACK_HEIGHT}`);
        this.trackBg.setAttributeNS(null, 'fill', '#efefef');
        this.trackBgContainer.appendChild(this.trackBg);

        if (!fake) {
            //draw split line
            this.splitLineTop = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            this.splitLineTop.setAttributeNS(null, 'x1', '0');
            this.splitLineTop.setAttributeNS(null, 'x2', '20000');
            this.splitLineTop.setAttributeNS(null, 'y1', '0');
            this.splitLineTop.setAttributeNS(null, 'y2', '0');
            this.splitLineTop.setAttributeNS(null, 'stroke', '#c9c9c9');
            this.trackBgContainer.appendChild(this.splitLineTop);
            this.splitLineBottom = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            this.splitLineBottom.setAttributeNS(null, 'x1', '0');
            this.splitLineBottom.setAttributeNS(null, 'x2', '20000');
            this.splitLineBottom.setAttributeNS(null, 'y1', `${KfTrack.TRACK_HEIGHT}`);
            this.splitLineBottom.setAttributeNS(null, 'y2', `${KfTrack.TRACK_HEIGHT}`);
            this.splitLineBottom.setAttributeNS(null, 'stroke', '#c9c9c9');
            this.trackBgContainer.appendChild(this.splitLineBottom);

            KfTrack.allTracks.set(this.trackId, this);
        }

    }

    // public hightLightTrack() {
    //     this.trackBg.setAttributeNS(null, 'fill', 'blue');
    //     this.splitLine.setAttributeNS(null, 'stroke', 'blue');
    // }
}