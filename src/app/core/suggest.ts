import { ChartSpec } from 'canis_toolkit';
import Tool from '../../util/tool';
import Util from './util';
import { IDataItem, IPath, IKeyframe } from './ds';
import KfGroup from '../../components/widgets/kfGroup';

export default class Suggest {
    static NUMERIC_CAT_ATTRS: string[] = ['Year', 'year', 'Month', 'month', 'Day', 'day'];
    static allPaths: IPath[] = [];

    
    /**
     * find attributes with different values in the given mark arrays
     * @param markIdArr1 
     * @param markIdArr2 
     * @param dataEncode 
     */
    public static findAttrWithDiffValue(markIdArr1: string[], markIdArr2: string[], dataEncode: boolean): string[] {
        let attrDiffValues: string[] = [];
        const dataAttrArr: string[] = dataEncode ? Util.dataAttrs : Util.nonDataAttrs;
        const dataTable: Map<string, IDataItem> = dataEncode ? Util.filteredDataTable : Util.nonDataTable;
        dataAttrArr.forEach((aName: string) => {
            if (Util.attrType[aName] === Util.CATEGORICAL_ATTR) {
                let valueRecord1: Set<string> = new Set(), valueRecord2: Set<string> = new Set();
                markIdArr1.forEach((mId: string) => {
                    valueRecord1.add(`${dataTable.get(mId)[aName]}`);
                })
                markIdArr2.forEach((mId: string) => {
                    valueRecord2.add(`${dataTable.get(mId)[aName]}`);
                })
                if (!Tool.identicalArrays([...valueRecord1], [...valueRecord2])) {
                    attrDiffValues.push(aName);
                }
            }
        })

        return attrDiffValues;
    }

    public static removeEmptyCell(firstKfMarks: string[], attrToSec: string[], sameAttrs: string[], diffAttrs: string[], dataEncode: boolean): string[] {
        const tmpMarkRecord: string[] = [];
        const dataTable: Map<string, IDataItem> = dataEncode ? Util.filteredDataTable : Util.nonDataTable;
        dataTable.forEach((d: IDataItem, mId: string) => {
            let flag: boolean = true;
            sameAttrs.forEach((aName: string) => {
                if (d[aName] !== dataTable.get(firstKfMarks[0])[aName]) {
                    flag = false;
                }
            })
            if (flag) {
                tmpMarkRecord.push(mId);
            }
        })
        if (Tool.identicalArrays(firstKfMarks, tmpMarkRecord)) {//remove same attrs from attrToSecs
            diffAttrs.forEach((aName: string) => {
                if (attrToSec.includes(aName)) {
                    attrToSec.splice(attrToSec.indexOf(aName), 1);
                }
            })
        }
        return attrToSec;
    }

    /**
     * find the same and different attributes of the given marks
     * @param markIdArr 
     * @param dataEncode 
     */
    public static findSameDiffAttrs(markIdArr: string[], dataEncode: boolean): [string[], string[]] {
        let sameAttrs: string[] = [], diffAttrs: string[] = [];
        const dataAttrArr: string[] = dataEncode ? Util.dataAttrs : Util.nonDataAttrs;
        const dataTable: Map<string, IDataItem> = dataEncode ? Util.filteredDataTable : Util.nonDataTable;
        dataAttrArr.forEach((aName: string) => {
            if (Util.attrType[aName] === Util.CATEGORICAL_ATTR) {
                let flag: boolean = true;
                let firstValue: string | number = dataTable.get(markIdArr[0])[aName];
                for (let i = 1, len = markIdArr.length; i < len; i++) {
                    if (dataTable.get(markIdArr[i])[aName] !== firstValue) {
                        flag = false;
                        break;
                    }
                }
                if (flag) {
                    sameAttrs.push(aName);
                } else {
                    diffAttrs.push(aName);
                }
            }
        })
        return [sameAttrs, diffAttrs];
    }

    /**
     * filter the attribute names according to the effectiveness ranking of visual channels
     * @param attrArr 
     */
    // public static filterAttrs(attrArr: string[]): string[] {
    //     let filteredAttrs: string[] = [];
    //     let typeRecorder: string = '';
    //     Util.EFFECTIVENESS_RANKING.forEach((channel: string) => {
    //         attrArr.forEach((aName: string) => {
    //             const tmpAttrChannel: string = ChartSpec.chartUnderstanding[aName];
    //             if (tmpAttrChannel === channel && (tmpAttrChannel === typeRecorder || typeRecorder === '')) {
    //                 filteredAttrs.push(aName);
    //                 typeRecorder = tmpAttrChannel;
    //             }
    //         })
    //     })
    //     return filteredAttrs;
    // }

    /**
     * order the attribute names according to the effectiveness ranking of visual channels 
     * @param attrArr 
     */
    public static sortAttrs(attrArr: string[]): Map<string, string[]> {
        let orderedAttrs: Map<string, string[]> = new Map();
        Util.EFFECTIVENESS_RANKING.forEach((channel: string) => {
            attrArr.forEach((aName: string) => {
                let tmpAttrChannel: string[] = ChartSpec.chartUnderstanding[aName];
                if (typeof tmpAttrChannel !== 'undefined') {
                    if (tmpAttrChannel.includes(channel)) {
                        if (typeof orderedAttrs.get(channel) === 'undefined') {
                            orderedAttrs.set(channel, []);
                        }
                        orderedAttrs.get(channel).push(aName);
                    }
                }
            })
        })

        return orderedAttrs;
    }

    public static assignChannelName(attrArr: string[]): Map<string, string[]> {
        let channelAttrs: Map<string, string[]> = new Map();
        attrArr.forEach((aName: string) => {
            const tmpAttrChannels: string[] = ChartSpec.chartUnderstanding[aName];
            tmpAttrChannels.forEach((tmpAttrChannel: string) => {
                if (typeof channelAttrs.get(tmpAttrChannel) === 'undefined') {
                    channelAttrs.set(tmpAttrChannel, []);
                }
                channelAttrs.get(tmpAttrChannel).push(aName);
            })

        })
        return channelAttrs;
    }

    /**
     * 
     * @param {Map} sortedAttrs : key: visual channel, value : Array<String> attr names
     */
    public static generateAttrCombs(sortedAttrs: Map<string, string[]>) {
        let visualChannelNum: number = sortedAttrs.size;
        let allCombinations: string[][] = [];
        while (visualChannelNum > 0) {
            let count: number = 0;
            let candidateAttrs: string[] = [];
            let multiPosiAttrs: boolean = false, positionAttrs: string[] = [];
            for (let [channelName, attrs] of sortedAttrs) {
                candidateAttrs = [...candidateAttrs, ...attrs];
                count++;
                if (count === 1 && visualChannelNum !== 1 && channelName === 'position' && attrs.length > 1) {
                    multiPosiAttrs = true;
                    positionAttrs = attrs;
                } else if (count === visualChannelNum) {
                    let tmpCombRecord = Util.perm(candidateAttrs);
                    if (multiPosiAttrs) {//check for attr continuity
                        tmpCombRecord = Util.checkConti(tmpCombRecord, positionAttrs);
                    }
                    allCombinations = [...allCombinations, ...tmpCombRecord.map((oneComb: string[]) => [...new Set(oneComb)])];
                    break;
                }
            }

            visualChannelNum--;
        }
        return allCombinations;
    }

    /**
     * 
     * @param sortedAttrs
     * @param valueIdx 
     * @param firstKfMarks 
     * @param lastKfMarks 
     * @param hasOneMrak 
     */
    public static generateRepeatKfs(
        sortedAttrs: Map<string, string[]>,
        valueIdx: Map<string, number>,
        firstKfMarks: string[],
        lastKfMarks: string[],
        hasOneMrak: boolean = false): Array<[string[], Map<string, string[]>, string[]]> {

        let possibleKfs: Array<[string[], Map<string, string[]>, string[]]> = [];

        //get all possible combinations of attrs
        const allCombinations: string[][] = this.generateAttrCombs(sortedAttrs);

        //get values of the attrs in 1st kf
        let valuesFirstKf: Set<string | number> = new Set();
        let mShapes: Set<string> = new Set();
        sortedAttrs.forEach((attrArr: string[], channel: string) => {
            attrArr.forEach((aName: string) => {
                firstKfMarks.forEach((mId: string) => {
                    const attrValue: string | number = Util.filteredDataTable.get(mId)[aName];
                    valuesFirstKf.add(attrValue);
                    if (aName === 'mShape') {
                        mShapes.add(`${attrValue}`);
                    }
                })
            })
        })

        allCombinations.forEach((attrComb: string[]) => {//attrs to create sections
            let sections: Map<string, string[]> = new Map();//key: section id, value: mark array
            let sectionIdRecord: (string | number)[][] = [];
            let timeSecIdx: number[] = [];
            let tmpValueIdx: Map<number, number> = new Map();
            attrComb.forEach((aName: string, idx: number) => {
                tmpValueIdx.set(idx, valueIdx.get(aName));
                if (Util.timeAttrs.includes(aName)) {
                    timeSecIdx.push(idx);
                }
            })

            let asscendingOrder: boolean = false;
            lastKfMarks.forEach((mId: string, idx: number) => {
                let sectionId: string = '';
                let sepSecIdRecord: Set<string> = new Set();
                let seperateSecId: Set<string> = new Set(); //for ordering section ids
                // let secIsFirstKf: boolean = false;
                attrComb.forEach((aName: string) => {
                    let tmpValue: string | number = Util.filteredDataTable.get(mId)[aName];
                    sectionId = [...sepSecIdRecord.add(`${tmpValue}`)].join(',');
                    if (valuesFirstKf.has(tmpValue)) {
                        //check whether this sec is the firstKf
                        const isFirstKf: boolean = [...seperateSecId].every((attrVal: string) => { return (attrVal.includes('000_')) });
                        // const isFirstKf: boolean = seperateSecId.every((attrVal: string) => { return (attrVal.includes('zzz_') || attrVal.includes('000_')) });
                        if (isFirstKf) {
                            tmpValue = '000_' + tmpValue
                            let orderDirect: number = valueIdx.get(aName);
                            if (orderDirect === 1) {
                                asscendingOrder = false;
                                // secIsFirstKf = false;
                                // tmpValue = 'zzz_' + tmpValue;//for ordering 
                            } else {
                                asscendingOrder = true;
                                // secIsFirstKf = true;
                                // tmpValue = '000_' + tmpValue;//for ordering 

                            }
                        }
                    }
                    Util.addAttrValue(seperateSecId, `${tmpValue}`);
                    // seperateSecId.add(`${tmpValue}`);
                })

                if (typeof sections.get(sectionId) === 'undefined') {
                    sections.set(sectionId, []);
                    sectionIdRecord.push([...seperateSecId]);
                    // if (asscendingOrder && secIsFirstKf) {
                    //     firstKfIdx = sectionIdRecord.length - 1;
                    // }
                }
                sections.get(sectionId).push(mId);
            })

            if (hasOneMrak) {
                let flag: boolean = false;//whether this one mark in the 1st kf is a section
                for (let [sectionId, markIdArr] of sections) {
                    if (markIdArr.includes(firstKfMarks[0]) && markIdArr.length === 1) {
                        flag = true;
                        break;
                    }
                }
                if (!flag) {//if this one mark cannot form a section, we need to add markid into section id
                    sections.clear();
                    sectionIdRecord = [];
                    lastKfMarks.forEach((mId: string) => {
                        let sectionId: string = '';
                        let sepSecIdRecord: Set<string> = new Set();
                        let seperateSecId: Set<string> = new Set();
                        // let secIsFirstKf: boolean = false;
                        attrComb.forEach((aName: string) => {
                            let tmpValue: string | number = Util.filteredDataTable.get(mId)[aName];
                            sectionId = [...sepSecIdRecord.add(`${tmpValue}`)].join(',');
                            if (valuesFirstKf.has(tmpValue)) {
                                tmpValue = '000_' + tmpValue
                                let orderDirect: number = valueIdx.get(aName);
                                if (orderDirect === 1) {
                                    asscendingOrder = false;
                                    // secIsFirstKf = false;
                                    // tmpValue = 'zzz_' + tmpValue;//for ordering 
                                } else {
                                    asscendingOrder = true;
                                    // secIsFirstKf = true;
                                    // tmpValue = '000_' + tmpValue;//for ordering 
                                }
                            }
                            Util.addAttrValue(seperateSecId, `${tmpValue}`);
                            // seperateSecId.add(`${tmpValue}`);
                        })
                        if (hasOneMrak) {
                            sectionId = `${sectionId},${mId}`;
                            seperateSecId.add(mId);
                        }
                        if (typeof sections.get(sectionId) === 'undefined') {
                            sections.set(sectionId, []);
                            sectionIdRecord.push([...seperateSecId]);
                            // if (asscendingOrder && secIsFirstKf) {
                            //     firstKfIdx = seperateSecId.length - 1;
                            // }
                        }
                        sections.get(sectionId).push(mId);
                    })
                }
            }

            //first round sorting sectionIds
            sectionIdRecord.sort(function (a, b) {
                let diffValueIdx: number = 0;
                let diffAttr: string = '';
                for (let i = 0, len = attrComb.length; i < len; i++) {
                    if (a[i] !== b[i]) {
                        diffValueIdx = i;
                        diffAttr = attrComb[i];
                        break;
                    }
                }

                let aComp: string | number = a[diffValueIdx], bComp: string | number = b[diffValueIdx];
                if ((<string>aComp).includes('000_')) {
                    aComp = (<string>aComp).substring(4);
                }
                if ((<string>bComp).includes('000_')) {
                    bComp = (<string>bComp).substring(4);
                }
                if (timeSecIdx.includes(diffValueIdx)) {
                    aComp = Util.fetchTimeNum(<string>aComp);
                    bComp = Util.fetchTimeNum(<string>bComp);
                } else {
                    aComp = isNaN(parseFloat(`${aComp}`)) ? aComp : parseFloat(`${aComp}`);
                    bComp = isNaN(parseFloat(`${bComp}`)) ? bComp : parseFloat(`${bComp}`);
                }

                if (diffAttr === 'mShape') {
                    const aCompStr: string = `${aComp}`, bCompStr: string = `${bComp}`;
                    const aShapeName: string = (aCompStr.includes('000_') || aCompStr.includes('zzz_')) ? aCompStr.substring(4) : aCompStr;
                    const bShapeName: string = (bCompStr.includes('000_') || bCompStr.includes('zzz_')) ? bCompStr.substring(4) : bCompStr;
                    //put the same mark shape as those in the firstKfMarks i nthe front
                    if (mShapes.has(aShapeName) && !mShapes.has(bShapeName)) {
                        return -1;
                    } else if (!mShapes.has(aShapeName) && mShapes.has(bShapeName)) {
                        return 1;
                    } else if (!mShapes.has(aShapeName) && !mShapes.has(bShapeName)) {
                        if (aShapeName.toLocaleLowerCase().includes('link') && !bShapeName.toLocaleLowerCase().includes('link')) {
                            return 1;
                        } else if (!aShapeName.toLocaleLowerCase().includes('link') && bShapeName.toLocaleLowerCase().includes('link')) {
                            return -1;
                        } else {
                            return 0;
                        }
                    } else {
                        return 0;
                    }
                }

                if (bComp > aComp) {
                    switch (tmpValueIdx.get(diffValueIdx)) {
                        case 0:
                        case 2:
                            return -1;
                        case 1:
                            return 1;
                    }
                } else {
                    switch (tmpValueIdx.get(diffValueIdx)) {
                        case 0:
                        case 2:
                            return 1;
                        case 1:
                            return -1;
                    }
                }
            })
            //find the first kf index
            let firstKfIdx: number = -1;
            for (let i = 0, len = sectionIdRecord.length; i < len; i++) {
                // sectionIdRecord.forEach((separaSecIds: (string | number)[], idx: number) => {
                const separaSecIds: (string | number)[] = sectionIdRecord[i];
                if (separaSecIds.every((attrVal: string) => (attrVal.includes('000_')))) {
                    firstKfIdx = i;
                    break;
                }
            }
            if (asscendingOrder) {
                const sectionsBefore: (string | number)[][] = sectionIdRecord.slice(0, firstKfIdx);
                const sectionsAfter: (string | number)[][] = sectionIdRecord.slice(firstKfIdx);
                sectionIdRecord = [...sectionsAfter, ...sectionsBefore];
            }
            //remove 000_ and zzz_ added for ordering
            for (let i = 0, len = sectionIdRecord.length; i < len; i++) {
                for (let j = 0, len2 = sectionIdRecord[i].length; j < len2; j++) {
                    // if ((<string>sectionIdRecord[i][j]).includes('000_') || (<string>sectionIdRecord[i][j]).includes('zzz_')) {
                    if ((<string>sectionIdRecord[i][j]).indexOf('_') === 3) {
                        const checkStr: string = (<string>sectionIdRecord[i][j]).substring(0, 3);
                        if (checkStr === 'zzz' || !isNaN(parseInt(checkStr))) {
                            sectionIdRecord[i][j] = (<string>sectionIdRecord[i][j]).substring(4);
                        }
                    }
                }
            }
            if (mShapes.size > 1) {//deal with mark shape situations
                const mShapeIdx: number = attrComb.indexOf('mShape');
                let sectionMarksToMerge: string[] = [];
                let valExceptShape: string[] = [];
                let mergeIdxs: [number, (string | number)[]][] = [];
                let mergeSecId: string = [...mShapes].join('+');
                let sectionsToDelete: string[] = [];
                sectionIdRecord.forEach((valComb: (string | number)[], idx: number) => {
                    const correspondingSecId: string = valComb.join(',');
                    const tmpShape: string = `${valComb[mShapeIdx]}`;
                    let tmpValExceptShape: Set<string> = new Set();
                    valComb.forEach((val: string | number, valIdx: number) => {
                        if (valIdx !== mShapeIdx) {
                            tmpValExceptShape.add(`${val}`);
                        }
                    })
                    if (!Tool.identicalArrays(valExceptShape, [...tmpValExceptShape]) || idx === sectionIdRecord.length - 1) {
                        if (valExceptShape.length !== 0) {//add new section
                            valExceptShape.splice(mShapeIdx, 0, mergeSecId);
                            const tmpSecId: string = [...new Set(valExceptShape)].join(',');
                            sections.set(tmpSecId, sectionMarksToMerge);
                        }
                        valExceptShape = [...tmpValExceptShape];
                        sectionMarksToMerge = sections.get(correspondingSecId);
                        sectionsToDelete.push(correspondingSecId);
                        let tmpValExceptShapeArr: string[] = [...tmpValExceptShape];
                        tmpValExceptShapeArr.splice(mShapeIdx, 0, mergeSecId)
                        mergeIdxs.push([idx, [...new Set(tmpValExceptShapeArr)]]);
                    } else {
                        if (mShapes.has(tmpShape)) {
                            sectionsToDelete.push(correspondingSecId);
                            sectionMarksToMerge = [...sectionMarksToMerge, ...sections.get(correspondingSecId)];
                        }
                    }
                })
                if (valExceptShape.length !== 0) {//add new section
                    valExceptShape.splice(mShapeIdx, 0, mergeSecId);
                    const tmpSecId: string = [...new Set(valExceptShape)].join(',');
                    if (typeof sections.get(tmpSecId) !== 'undefined') {
                        sectionMarksToMerge = [...new Set([...sectionMarksToMerge, ...sections.get(tmpSecId)])];
                    }
                    sections.set(tmpSecId, sectionMarksToMerge);
                }

                mergeIdxs.reverse().forEach((secIdxAndId: [number, (string | number)[]]) => {
                    sectionIdRecord.splice(secIdxAndId[0], mShapes.size, secIdxAndId[1]);
                })
                sectionsToDelete.forEach((secIdToDelete: string) => {
                    sections.delete(secIdToDelete);
                })
            }
            let orderedSectionIds: string[] = sectionIdRecord.map(a => a.join(','));
            possibleKfs.push([attrComb, sections, orderedSectionIds]);
        })

        // console.log('possible kfs: ', possibleKfs);
        return possibleKfs;
    }

    /**
     * find the next unique kf after kfStartIdx
     * @param allPath 
     * @param kfStartIdx 
     */
    public static findNextUniqueKf(allPaths: IPath[], kfStartIdx: number): number {
        let len: number = 0;
        if (typeof allPaths !== 'undefined') {
            allPaths.forEach((p: IPath) => {
                if (p.kfMarks.length > len) {
                    len = p.kfMarks.length;
                }
            })
        }
        for (let i = kfStartIdx + 1; i < len; i++) {
            for (let j = 1, len2 = allPaths.length; j < len2; j++) {
                if (!Tool.identicalArrays(allPaths[j].kfMarks[i], allPaths[0].kfMarks[i])) {
                    return i;
                }
            }
        }
        return -1;
    }

    public static findUniqueKfs(allPaths: IPath[], kfStartIdx: number): { uniqueKfIdxs: number[], hasNextUniqueKf: boolean } {
        let len: number = 0;
        if (typeof allPaths !== 'undefined') {
            allPaths.forEach((p: IPath) => {
                if (p.kfMarks.length > len) {
                    len = p.kfMarks.length;
                }
            })
        }
        //pre kfs
        const uniqueKfs: number[] = [];
        for (let i = 0; i <= kfStartIdx; i++) {
            for (let j = 1, len2 = allPaths.length; j < len2; j++) {
                if (!Tool.identicalArrays(allPaths[j].kfMarks[i], allPaths[0].kfMarks[i])) {
                    uniqueKfs.push(i);
                    break;
                }
            }
        }
        //next kf
        const nextKf: number = this.findNextUniqueKf(allPaths, kfStartIdx);
        if (nextKf !== -1) {
            uniqueKfs.push(nextKf);
        }
        return { uniqueKfIdxs: uniqueKfs, hasNextUniqueKf: nextKf !== -1 };
    }

    // /**
    //  * return index of the unique kfs in each path
    //  * @param {*} repeatKfRecord 
    //  */
    // public static findUniqueKfs(repeatKfRecord: string[][][]): number[][] {
    //     let pathWithUniqueAndMissingKfs: number[][] = [];
    //     for (let i = 0, len = repeatKfRecord.length; i < len; i++) {
    //         let uniqueKf: number[] = []; //record unique kf idx of this path
    //         let removeIdx = [i];//index of the paths that don't need to compare
    //         //kf index currently being compared
    //         for (let compareKfIdx = 0, len2 = repeatKfRecord[i].length; compareKfIdx < len2; compareKfIdx++) {
    //             let flag = true;//if the kf is the same in all paths
    //             for (let j = 0; j < len; j++) {
    //                 if (!removeIdx.includes(j)) {
    //                     //compare the current kf
    //                     let tmpFlag = Tool.identicalArrays(repeatKfRecord[i][compareKfIdx], repeatKfRecord[j][compareKfIdx]);
    //                     if (!tmpFlag) {//this path in this kf is different from others
    //                         flag = false;
    //                         removeIdx.push(j);
    //                     } else {
    //                         continue;
    //                     }
    //                 }
    //             }
    //             if (!flag) {
    //                 uniqueKf.push(compareKfIdx);
    //             }
    //         }
    //         pathWithUniqueAndMissingKfs.push(uniqueKf);
    //     }
    //     return pathWithUniqueAndMissingKfs;
    // }

    public static generateSuggestionPath(selectedMarks: string[], firstKfInfoInParent: IKeyframe, targetKfg: KfGroup): boolean {
        //create suggestion list if there is one, judge whether to use current last kf as last kf or the current first as last kf
        const [clsSelMarks, containNonDataMarkInSel] = Util.extractClsFromMarks(selectedMarks);
        const [clsFirstKf, containNonDataMarkFirstKf] = Util.extractClsFromMarks(firstKfInfoInParent.marksThisKf);
        let suggestOnFirstKf: boolean = false;
        if (Tool.arrayContained(firstKfInfoInParent.marksThisKf, selectedMarks) && Tool.identicalArrays(clsSelMarks, clsFirstKf)) {//suggest based on first kf in animation
            suggestOnFirstKf = true;
            Suggest.suggestPaths(selectedMarks, firstKfInfoInParent.marksThisKf);
        } else {//suggest based on all marks in animation
            const marksThisAni: string[] = targetKfg.marksThisAni();
            Suggest.suggestPaths(selectedMarks, marksThisAni);
        }
        return suggestOnFirstKf;
    }

    /**
     * check the numeric order with the mark in first kf (only mark in the first kf)
     * @param firstKfMark 
     */
    public static checkNumbericOrder(firstKfMark: string): [boolean, { attr: string, order: number, marks: string[] }[]] {
        const firstMarkDatum: IDataItem = Util.filteredDataTable.get(firstKfMark);
        const numericAttrs: string[] = Util.fetchNumericAttrs(firstMarkDatum);
        let hasOrder: boolean = false;
        const result: { attr: string, order: number, marks: string[] }[] = [];
        numericAttrs.forEach((attrName: string) => {
            const orderOfThisAttr: string[] = Util.numericAttrOrder.get(attrName);
            const idxOfCurrentMark: number = orderOfThisAttr.indexOf(firstKfMark);
            if (idxOfCurrentMark === 0 || idxOfCurrentMark === orderOfThisAttr.length - 1) {
                hasOrder = true;
                result.push({
                    attr: attrName,
                    order: idxOfCurrentMark === 0 ? 0 : 1,
                    marks: orderOfThisAttr
                })
            }
        })
        return [hasOrder, result];
    }

    public static suggestPaths(firstKfMarks: string[], lastKfMarks: string[]) {
        this.allPaths = [];
        const sepFirstKfMarks: { dataMarks: string[], nonDataMarks: string[] } = Util.separateDataAndNonDataMarks(firstKfMarks);
        const sepLastKfMarks: { dataMarks: string[], nonDataMarks: string[] } = Util.separateDataAndNonDataMarks(lastKfMarks);
        if (sepFirstKfMarks.dataMarks.length > 0 && sepFirstKfMarks.nonDataMarks.length > 0) {//there are both data encoded and non data encoded marks in the first kf
            //no suggestion

        } else if (sepFirstKfMarks.dataMarks.length > 0 && sepFirstKfMarks.nonDataMarks.length === 0) {
            //suggest based on data attrs
            const firstKfDataMarks: string[] = sepFirstKfMarks.dataMarks;
            const lastKfDataMarks: string[] = sepLastKfMarks.dataMarks;


            if (Tool.identicalArrays(firstKfDataMarks, lastKfDataMarks)) {
                //refresh current spec

            } else {
                let attrWithDiffValues: string[] = this.findAttrWithDiffValue(firstKfDataMarks, lastKfDataMarks, true);
                const [sameAttrs, diffAttrs] = this.findSameDiffAttrs(firstKfDataMarks, true);
                let flag: boolean = false;
                if (attrWithDiffValues.length === 0) {
                    flag = true;
                    const filteredDiffAttrs: string[] = Util.filterAttrs(diffAttrs);
                    attrWithDiffValues = [...sameAttrs, ...filteredDiffAttrs];
                }
                //remove empty cell problem
                attrWithDiffValues = this.removeEmptyCell(firstKfMarks, attrWithDiffValues, sameAttrs, diffAttrs, true);
                let valueIdx: Map<string, number> = new Map();//key: attr name, value: index of the value in all values
                attrWithDiffValues.forEach((aName: string) => {
                    const targetValue: string | number = Util.filteredDataTable.get(firstKfDataMarks[0])[aName];
                    const tmpIdx: number = Util.dataValues.get(aName).indexOf(targetValue);
                    if (tmpIdx === 0) {
                        valueIdx.set(aName, 0);//this value is the 1st in all values
                    } else if (tmpIdx === Util.dataValues.get(aName).length - 1) {
                        valueIdx.set(aName, 1);//this value is the last in all values
                    } else {
                        valueIdx.set(aName, 2);//this value is in the middle of all values
                    }
                })

                //sortedAttrs: key: channel, value: attr array
                const sortedAttrs: Map<string, string[]> = flag ? this.assignChannelName(attrWithDiffValues) : this.sortAttrs(attrWithDiffValues);
                // console.log('sorted attrs: ', sortedAttrs);
                const oneMarkInFirstKf: boolean = firstKfDataMarks.length === 1;
                let allPossibleKfs = this.generateRepeatKfs(sortedAttrs, valueIdx, firstKfDataMarks, lastKfDataMarks, oneMarkInFirstKf);
                let repeatKfRecord: any[] = [];
                let filterAllPaths: number[] = [], count = 0;//record the index of the path that should be removed: not all selected & not one mark in 1st kf
                allPossibleKfs.forEach((possiblePath: any[]) => {
                    let attrComb: string[] = possiblePath[0];
                    let sections: Map<string, string[]> = possiblePath[1];
                    let orderedSectionIds: string[] = possiblePath[2];
                    let repeatKfs = [];
                    let allSelected = false;
                    let oneMarkFromEachSec = false, oneMarkEachSecRecorder: Set<string> = new Set();
                    let numberMostMarksInSec = 0, selectedMarks: Map<string, string[]> = new Map();//in case of one mark from each sec

                    orderedSectionIds.forEach((sectionId: string) => {
                        let tmpSecMarks = sections.get(sectionId);
                        if (tmpSecMarks.length > numberMostMarksInSec) {
                            numberMostMarksInSec = tmpSecMarks.length;
                        }

                        //check if marks in 1st kf are one from each sec
                        firstKfMarks.forEach((mId: string) => {
                            if (tmpSecMarks.includes(mId)) {
                                selectedMarks.set(sectionId, [mId]);
                                oneMarkEachSecRecorder.add(sectionId);
                            }
                        })
                    })

                    if (oneMarkEachSecRecorder.size === sections.size && firstKfMarks.length === sections.size) {
                        oneMarkFromEachSec = true;
                    }

                    if (oneMarkFromEachSec) {
                        for (let i = 0; i < numberMostMarksInSec - 1; i++) {
                            let tmpKfMarks = [];
                            for (let j = 0; j < orderedSectionIds.length; j++) {
                                let tmpSecMarks = sections.get(orderedSectionIds[j]);
                                let tmpSelected = selectedMarks.get(orderedSectionIds[j]);
                                for (let z = 0; z < tmpSecMarks.length; z++) {
                                    if (!tmpSelected.includes(tmpSecMarks[z])) {
                                        tmpKfMarks.push(tmpSecMarks[z]);
                                        selectedMarks.get(orderedSectionIds[j]).push(tmpSecMarks[z]);
                                        break;
                                    }
                                }
                            }
                            repeatKfs.push(tmpKfMarks);
                        }
                    } else {
                        for (let i = 0, len = orderedSectionIds.length; i < len; i++) {
                            let tmpSecMarks = sections.get(orderedSectionIds[i]);
                            let judgeSame = Tool.identicalArrays(firstKfMarks, tmpSecMarks);
                            if (!allSelected && judgeSame && !oneMarkInFirstKf) {
                                allSelected = true;
                            }
                            if (!judgeSame) {//dont show the 1st kf twice
                                repeatKfs.push(tmpSecMarks);
                            }
                        }
                    }

                    let samePath = false;
                    for (let i = 0; i < this.allPaths.length; i++) {
                        if (Tool.identicalArrays(repeatKfs, this.allPaths[i].kfMarks)) {
                            samePath = true;
                            break;
                        }
                    }
                    // repeatKfRecord.push(repeatKfs);
                    this.allPaths.push({ attrComb: attrComb, sortedAttrValueComb: orderedSectionIds, kfMarks: repeatKfs, firstKfMarks: firstKfDataMarks, lastKfMarks: lastKfDataMarks });
                    //check if the selection is one mark from each sec
                    if ((!allSelected && !oneMarkInFirstKf && !oneMarkFromEachSec) || samePath) {
                        filterAllPaths.push(count);
                    }
                    count++;
                })

                //filter all paths
                filterAllPaths.sort(function (a, b) {
                    return b - a;
                })
                for (let i = 0; i < filterAllPaths.length; i++) {
                    this.allPaths.splice(filterAllPaths[i], 1);
                }

                //check numeric ordering
                let hasNumericOrder: boolean = false;
                let numericOrders: { attr: string, order: number, marks: string[] }[];
                if (firstKfDataMarks.length === 1) {
                    [hasNumericOrder, numericOrders] = this.checkNumbericOrder(firstKfDataMarks[0]);
                }

                if (hasNumericOrder) {//generate path according to the order of values of numeric attributes
                    numericOrders.forEach((ordering: { attr: string, order: number, marks: string[] }) => {
                        let orderedMarks: string[] = ordering.order === 0 ? ordering.marks : ordering.marks.reverse();
                        let orderedKfMarks: string[][] = orderedMarks.map((a: string) => [a]);
                        // orderedMarks = orderedMarks.slice(1, orderedMarks.length);
                        // orderedKfMarks = orderedKfMarks.slice(1, orderedKfMarks.length);
                        this.allPaths.push({
                            attrComb: ['id'],
                            sortedAttrValueComb: orderedMarks,
                            kfMarks: orderedKfMarks,
                            firstKfMarks: firstKfDataMarks,
                            lastKfMarks: lastKfDataMarks,
                            ordering: {
                                attr: ordering.attr,
                                order: ordering.order === 0 ? 'asscending' : 'descending'
                            }
                        })
                    })
                }

                // console.log('all paths: ', this.allPaths);
            }
        } else if (sepFirstKfMarks.dataMarks.length === 0 && sepFirstKfMarks.nonDataMarks.length > 0) {
            //suggest based on non data attrs
            const firstKfNonDataMarks: string[] = sepFirstKfMarks.nonDataMarks;
            const lastKfNonDataMarks: string[] = sepLastKfMarks.nonDataMarks;

            if (!Tool.identicalArrays(firstKfNonDataMarks, lastKfNonDataMarks)) {
                //count the number of types in first kf
                const typeCount: Map<string, string[]> = new Map();
                const attrValstrs: Set<string> = new Set();
                firstKfNonDataMarks.forEach((mId: string) => {
                    let attrValStr: string = '';
                    const tmpDatum: IDataItem = Util.nonDataTable.get(mId);
                    Object.keys(tmpDatum).forEach((attr: string) => {
                        if (Util.isNonDataAttr(attr) && attr !== 'text') {
                            attrValStr += `*${tmpDatum[attr]}`;
                        }
                    })
                    if (typeof typeCount.get(attrValStr) === 'undefined') {
                        typeCount.set(attrValStr, []);
                    }
                    typeCount.get(attrValStr).push(mId);
                    attrValstrs.add(attrValStr);
                })
                // const attrValStr = [...typeCount][0][0];
                //check whether there is one from each type
                let oneFromEachType: boolean = true;
                typeCount.forEach((mIds: string[], mType: string) => {
                    if (mIds.length > 1) {
                        oneFromEachType = false;
                    }
                })

                // if (typeCount.size === 1 && [...typeCount][0][1] === 1) {
                if (oneFromEachType) {
                    //fetch all marks with the same attr values
                    let suggestionLastKfMarks: Map<string, string[]> = new Map();//key: attrValStr, value: marks have those attr values
                    Util.nonDataTable.forEach((datum: IDataItem, mId: string) => {
                        let tmpAttrValStr: string = '';
                        Object.keys(datum).forEach((attr: string) => {
                            if (Util.isNonDataAttr(attr) && attr !== 'text') {
                                tmpAttrValStr += `*${datum[attr]}`;
                            }
                        })
                        if (attrValstrs.has(tmpAttrValStr)) {
                            // if (tmpAttrValStr === attrValStr) {
                            if (typeof suggestionLastKfMarks.get(tmpAttrValStr) === 'undefined') {
                                suggestionLastKfMarks.set(tmpAttrValStr, []);
                            }
                            suggestionLastKfMarks.get(tmpAttrValStr).push(mId);
                        }
                    })

                    //sort marks from each type
                    let kfBefore: string[][] = [];
                    let kfAfter: string[][] = [];
                    let targetIdx: number = -100;
                    let allLastKfMarks: string[] = [];
                    let reverseIdx: boolean = false;

                    suggestionLastKfMarks.forEach((mIds: string[], attrValStr: string) => {
                        mIds.forEach((mId: string, idx: number) => {
                            if (mId === typeCount.get(attrValStr)[0] && targetIdx === -100) {
                                targetIdx = idx;
                                if (targetIdx === mIds.length - 1) {
                                    reverseIdx = true;
                                }
                            }
                            if (targetIdx === -100 || idx < targetIdx) {
                                if (typeof kfBefore[idx] === 'undefined') {
                                    kfBefore[idx] = [];
                                }
                                kfBefore[idx].push(mId);
                            } else {
                                if (typeof kfAfter[idx - targetIdx] === 'undefined') {
                                    kfAfter[idx - targetIdx] = [];
                                }
                                kfAfter[idx - targetIdx].push(mId);
                            }
                            allLastKfMarks.push(mId);
                        })
                    })
                    let tmpKfMarks: string[][] = reverseIdx ? [...kfAfter, ...kfBefore.reverse()] : [...kfAfter, ...kfBefore];
                    let sortedAttrValueComb: string[] = tmpKfMarks.map((mIds: string[]) => mIds.join(','));
                    if (typeCount.size === 1) {
                        sortedAttrValueComb = tmpKfMarks.map((mIds: string[]) => mIds[0]);
                    } else {
                        sortedAttrValueComb = tmpKfMarks.map((mIds: string[]) => `${Util.nonDataTable.get(mIds[0]).clsIdx}`);
                    }
                    const attrComb: string[] = typeCount.size === 1 ? ['id'] : ['clsIdx'];
                    this.allPaths = [{ attrComb: attrComb, sortedAttrValueComb: sortedAttrValueComb, kfMarks: tmpKfMarks, firstKfMarks: firstKfNonDataMarks, lastKfMarks: allLastKfMarks }];
                }
            }
        }
    }
}