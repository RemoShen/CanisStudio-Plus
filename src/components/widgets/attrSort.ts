import '../../assets/style/attrSort.scss'

export default class AttrSort {
    static ASSCENDING_ORDER: string = 'asscending';
    static DESCENDING_ORDER: string = 'descending';
    static INDEX_ORDER: string = 'dataIndex';
    selectInput: HTMLSpanElement;

    public createAttrSort(attrName: string) {
        this.selectInput = document.createElement('span');
        this.selectInput.className = 'attr-sort';
        const select: HTMLSelectElement = document.createElement('select');
        select.name = attrName;
        [AttrSort.INDEX_ORDER, AttrSort.ASSCENDING_ORDER, AttrSort.DESCENDING_ORDER].forEach(order => {
            const option: HTMLOptionElement = document.createElement('option');
            option.innerText = order;
            option.value = order;
            select.appendChild(option);
        })
        select.onchange = () => {
            
        }
        this.selectInput.appendChild(select);
    }


}