const MAPPING = new Map([
    ["jan", 1],
    ["feb", 2],
    ["mar", 3],
    ["apr", 4],
    ["may", 5],
    ["jun", 6],
    ["jul", 7],
    ["aug", 8],
    ["sep", 9],
    ["oct", 10],
    ["nov", 11],
    ["dec", 12],
    ["january", 1],
    ["february", 2],
    ["march", 3],
    ["april", 4],
    ["may", 5],
    ["june", 6],
    ["july", 7],
    ["august", 8],
    ["september", 9],
    ["october", 10],
    ["november", 11],
    ["december", 12],
    ["mon", 1],
    ["tue", 2],
    ["wed", 3],
    ["thu", 4],
    ["fri", 5],
    ["sat", 6],
    ["sun", 7],
    ["monday", 1],
    ["tuesday", 2],
    ["wednesday", 3],
    ["thursday", 4],
    ["friday", 5],
    ["saturday", 6],
    ["sunday", 7],
])

export const sortStrings = (value: string[]) => {
    if (value.every(i => MAPPING.has(i.toLowerCase()))) {
        value.sort((a: string, b: string) => {
            return MAPPING.get(a) - MAPPING.get(b);
        })
    } else {
        return value.sort();
    }
}