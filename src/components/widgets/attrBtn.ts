import '../../assets/style/attrBtn.scss'

export default class AttrBtn {
    btn: HTMLSpanElement;

    public createAttrBtn(attrName: string) {
        this.btn = document.createElement('span');
        this.btn.className = 'attr-btn';
        this.btn.innerText = attrName;
    }
}