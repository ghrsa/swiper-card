// noinspection CssUnresolvedCustomProperty

import {
    LitElement,
    html,
    css,
    unsafeCSS,
    type CSSResultGroup,
    type PropertyValues,
    type TemplateResult
} from 'lit'
import { customElement, property } from 'lit/decorators.js'

import Swiper from 'swiper'
import SwiperCSS from 'swiper/swiper-bundle.css'
import deepcopy from 'deep-clone-simple'
import { type HomeAssistant, type LovelaceCard, type LovelaceCardConfig } from 'custom-card-helpers'
import { type SwiperOptions } from 'swiper/types'

const CARD_VERSION = '0.0.1'
const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : Promise.reject(Error('swiper-card could not load card helpers'));

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
    type: 'swiper-card',
    name: 'Swiper Card',
    description: 'A card which lets you swipe through multiple Lovelace cards.'
})

const computeCardSize = (card: LovelaceCard | HTMLElement): number | Promise<number> => {
    if ('getCardSize' in card && typeof card.getCardSize === 'function') {
        return card.getCardSize()
    }
    if (customElements.get(card.localName)) {
        return 1
    }
    return customElements
        .whenDefined(card.localName)
        .then(async () => await computeCardSize(card))
}

export interface SwiperCardConfig extends LovelaceCardConfig {
    cards: LovelaceCardConfig[]
    style?: string
    parameters?: SwiperOptions
    start_card?: number
    reset_after?: number
}

@customElement('swiper-card')
export class SwiperCard extends LitElement implements LovelaceCard {
    @property({}) _config?: SwiperCardConfig
    @property({}) _cards?: Array<LovelaceCard | HTMLElement>
    #parameters: SwiperOptions = {}
    #hass?: HomeAssistant

    #swiper?: Swiper
    #loaded = false
    #updated = false
    #resetTimer = -1
    #cardPromises?: Promise<any[]>
    #ro?: ResizeObserver

    get hass (): HomeAssistant | undefined {
        return this.#hass
    }

    @property({ attribute: false })
    set hass (hass: HomeAssistant | undefined) {
        this.#hass = hass

        if (!this._cards) {
            return
        }

        this._cards.forEach((element) => {
            if ('hass' in element) { element.hass = this.#hass }
        })
    }

    public static getStubConfig (): Record<string, unknown> {
        return { cards: [] }
    }

    override shouldUpdate (changedProps: PropertyValues): boolean {
        if (!this._config) {
            return false
        }
        return changedProps.has('_config') || changedProps.has('_cards')
    }

    public setConfig (config: SwiperCardConfig): void {
        if (!config?.cards || !Array.isArray(config.cards)) {
            throw new Error('Card config incorrect')
        }
        this._config = config
        this.#parameters = deepcopy(this._config.parameters) || {}
        this._cards = []
        if (window.ResizeObserver) {
            this.#ro = new ResizeObserver(() => {
                this.#swiper?.update()
            })
        }
        void this.createCards()
    }

    override connectedCallback (): void {
        super.connectedCallback()
        if (this._config && this.#hass && this.#updated && !this.#loaded) {
            void this.initialLoad()
        } else {
            this.#swiper?.update()
        }
    }

    override updated (changedProperties: PropertyValues): void {
        super.updated(changedProperties)
        this.#updated = true
        if (this._config && this.#hass && this.isConnected && !this.#loaded) {
            void this.initialLoad()
        } else {
            this.#swiper?.update()
        }
    }

    static override get styles (): CSSResultGroup {
        return css`
            ${unsafeCSS(SwiperCSS)}
            :host {
                --swiper-theme-color: var(--primary-color);
            }
        `
    }

    override render (): TemplateResult {
        if (!this._config || !this.#hass) {
            return html``
        }

        return html`
        <div class="swiper" dir="${this.#hass.translationMetadata.translations[this.#hass.selectedLanguage ?? this.#hass.language].isRTL || false ? 'rtl' : 'ltr'}">
            <div class="swiper-wrapper">${this._cards}</div>
            ${'pagination' in this.#parameters ? html` <div class="swiper-pagination"></div> ` : ''}
            ${'navigation' in this.#parameters ? html`<div class="swiper-button-next"></div><div class="swiper-button-prev"></div>` : ''}
            ${'scrollbar' in this.#parameters ? html` <div class="swiper-scrollbar"></div>` : ''}
        </div>
        ${'style' in this._config ? html`<style>${this._config.style}</style>` : html``}
    `
    }

    private async initialLoad (): Promise<void> {
        const container = this.shadowRoot?.querySelector<HTMLElement>('.swiper')
        if (!container) {
            return
        }

        this.#loaded = true

        await this.updateComplete

        if ('pagination' in this.#parameters && this.#parameters.pagination !== false) {
            if (this.#parameters.pagination === null || typeof this.#parameters.pagination !== 'object') {
                this.#parameters.pagination = {}
            }
            this.#parameters.pagination.el = this.shadowRoot?.querySelector<HTMLElement>('.swiper-pagination')
        }

        if ('navigation' in this.#parameters && this.#parameters.navigation !== false) {
            if (this.#parameters.navigation === null || typeof this.#parameters.navigation !== 'object') {
                this.#parameters.navigation = {}
            }
            this.#parameters.navigation.nextEl = this.shadowRoot?.querySelector<HTMLElement>(
                '.swiper-button-next'
            )
            this.#parameters.navigation.prevEl = this.shadowRoot?.querySelector<HTMLElement>(
                '.swiper-button-prev'
            )
        }

        if ('scrollbar' in this.#parameters && this.#parameters.scrollbar !== false) {
            if (this.#parameters.scrollbar === null || typeof this.#parameters.scrollbar !== 'object') {
                this.#parameters.scrollbar = {}
            }
            this.#parameters.scrollbar.el = this.shadowRoot?.querySelector<HTMLElement>('.swiper-scrollbar')
        }

        if (this._config && 'start_card' in this._config) {
            let index = this._config.start_card ?? 0
            if (index < 0) {
                index = Math.max(0, (this._cards?.length ?? 0) + index)
            }
            this.#parameters.initialSlide = index
        }

        this.#swiper = new Swiper(
            container,
            this.#parameters
        )

        if ((this._config?.reset_after ?? -1) > 0) {
            this.#swiper.on('slideChange', () => {
                this.startResetTimer()
            })
            this.#swiper.on('click', () => {
                this.startResetTimer()
            })
            this.#swiper.on('touchEnd', () => {
                this.startResetTimer()
            })
        }
    }

    private startResetTimer (): void {
        if (this.#resetTimer >= 0) {
            window.clearTimeout(this.#resetTimer)
        }
        this.#resetTimer = window.setTimeout(() => {
            this.#swiper?.slideTo(this.#parameters.initialSlide ?? 0)
        }, (this._config?.reset_after ?? 1) * 1000)
    }

    private async createCards (): Promise<void> {
        this.#cardPromises = Promise.all(
            (this._config?.cards ?? []).map(async (config) => await this.createCardElement(config))
        )

        this._cards = await this.#cardPromises
        const observer = this.#ro
        if (observer) {
            this._cards.forEach((card) => {
                observer.observe(card)
            })
        }
        this.#swiper?.update()
    }

    private async createCardElement (cardConfig: LovelaceCardConfig): Promise<LovelaceCard | HTMLElement> {
        let element: LovelaceCard | HTMLElement
        if (cardConfig.type === 'swiper-image') {
            element = document.createElement('div')
            let baseImage = `<img class="swiper-slide-image" loading="lazy" src="${cardConfig.src ?? ''}" /><div class="swiper-lazy-preloader"></div>`
            if ('zoom' in this.#parameters) {
                baseImage = `<div class="swiper-zoom-container">${baseImage}</div>`
            }
            element.innerHTML = `${baseImage}${'html' in cardConfig && typeof 'html' === 'string' ? cardConfig.html : ''}`
        } else if (cardConfig.type === 'swiper-html') {
            element = document.createElement('div')
            element.innerHTML = 'html' in cardConfig && typeof 'html' === 'string' ? cardConfig.html : ''
        } else {
            try {
                element = (await HELPERS).createCardElement(cardConfig)
            } catch (e) {
                element = document.createElement('hui-warning')
                element.innerText = (e as any).message
            }
        }
        element.className = 'swiper-slide'
        if ('card_width' in (this._config ?? {})) {
            element.style.width = this._config?.card_width
        }
        if (this.#hass) {
            if ('hass' in element) { element.hass = this.#hass }
        }
        element.addEventListener(
            'll-rebuild',
            (ev) => {
                ev.stopPropagation()
                void this.rebuildCard(element, cardConfig)
            },
            {
                once: true
            }
        )
        return element
    }

    private async rebuildCard (cardElToReplace: LovelaceCard | HTMLElement, config: LovelaceCardConfig): Promise<void> {
        let newCardEl = await this.createCardElement(config)
        try {
            if ('hass' in newCardEl) { newCardEl.hass = this.hass }
        } catch (e) {
            newCardEl = document.createElement('hui-warning')
            newCardEl.innerText = (e as any).message
        }
        if (cardElToReplace.parentElement) {
            cardElToReplace.parentElement.replaceChild(newCardEl, cardElToReplace)
        }
        this._cards = (this._cards ?? []).map((curCardEl) =>
            curCardEl === cardElToReplace ? newCardEl : curCardEl
        )
        this.#ro?.unobserve(cardElToReplace)
        this.#ro?.observe(newCardEl)
        this.#swiper?.update()
    }

    async getCardSize (): Promise<number> {
        await this.#cardPromises

        if (!this._cards || this._cards.length <= 0) {
            return 0
        }

        const results = await Promise.all(this._cards.map(async it => await computeCardSize(it)))

        return Math.max(...results)
    }
}

console.info(
    `%c  SWIPER-CARD \n%c ${CARD_VERSION}    `,
    'color: orange; font-weight: bold; background: black',
    'color: white; font-weight: bold; background: dimgray'
)
