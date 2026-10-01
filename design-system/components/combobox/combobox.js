class PSCombobox extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<span class="ps-masked-wrap"><input class="ps-input" role="combobox" aria-expanded="false" aria-autocomplete="list" placeholder="Buscar…"><span class="ps-combobox__list" role="listbox" hidden></span></span>`;
  }
}
customElements.define("ps-combobox", PSCombobox);
