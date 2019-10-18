class MultipleEntityRow extends Polymer.Element {

    static get template() {
        return Polymer.html`
<style>
  :host {
    display: flex;
    align-items: center;
  }
  .flex {
    flex: 1;
    margin-left: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-width: 0;
  }
  .info {
    flex: 1 0 60px;
  }
  .info, .info > * {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .flex ::slotted(*) {
    margin-left: 8px;
    min-width: 0;
  }
  .flex ::slotted([slot="secondary"]) {
    margin-left: 0;
  }
  .secondary, ha-relative-time {
    display: block;
    color: var(--secondary-text-color);
  }
  state-badge {
    flex: 0 0 40px;
  }
  .entity {
    margin-right: 16px;
    text-align: center;
  }
  .entity span {
    font-size: 10px;
    color: var(--secondary-text-color);
  }
  .entity:last-of-type {
    margin-right: 0;
  }
  .state {
    min-width: 45px;
  }
  .toggle {
    margin-left: 8px;
  }
</style>
<state-badge state-obj="[[main.stateObj]]" override-icon="[[main.icon]]"></state-badge>
<div class="flex">
  <div class="info">
    [[entityName(main)]]
    <div class="secondary">
      <template is="dom-if" if="{{info}}">
        [[entityName(info)]] [[entityState(info)]]
      </template>
      <template is="dom-if" if="{{displayLastChanged}}">
        <ha-relative-time datetime="[[main.stateObj.last_changed]]" hass="[[_hass]]"></ha-relative-time>
      </template>
    </div>
  </div>
  <template is="dom-if" if="{{primary}}">
      <div class="entity" on-click="primaryMoreInfo">
        <span>[[entityName(primary)]]</span>
        <div>[[entityState(primary)]]</div>
      </div>
  </template>
  <template is="dom-if" if="{{secondary}}">
      <div class="entity" on-click="secondaryMoreInfo">
        <span>[[entityName(secondary)]]</span>
        <div>[[entityState(secondary)]]</div>
      </div>
  </template>
  <template is="dom-if" if="{{tertiary}}">
    <div class="entity" on-click="tertiaryMoreInfo">
      <span>[[entityName(tertiary)]]</span>
      <div>[[entityState(tertiary)]]</div>
    </div>
  </template>
  <template is="dom-if" if="{{displayValue}}">
    <div class="state entity">
      <template is="dom-if" if="{{displayHeader}}">
        <span>[[_config.name_state]]</span>
      </template>
      <div>[[entityState(main)]]</div>
    </div>
  </template>
  <template is="dom-if" if="{{displayToggle}}">
    <div class="toggle">
      <ha-entity-toggle state-obj="[[main.stateObj]]" hass="[[_hass]]"></ha-entity-toggle>
    </div>
  </template>
</div>`;
    }

    primaryMoreInfo(e) {
        e.stopPropagation();
        this.fireEvent(this._config.primary.entity)
    }

    secondaryMoreInfo(e) {
        e.stopPropagation();
        this.fireEvent(this._config.secondary.entity)
    }

    tertiaryMoreInfo(e) {
        e.stopPropagation();
        this.fireEvent(this._config.tertiary.entity)
    }

    entityName(data) {
        return data && data.stateObj && data.name !== false ? this.computeStateName(data.stateObj, data.name) : null;
    }

    entityState(data) {
        if (!data || !data.stateObj) return this._hass.localize('state.default.unavailable');
        return data.attribute
            ? (data.attribute in data.stateObj.attributes)
                ? `${data.stateObj.attributes[data.attribute]} ${data.unit ? data.unit : ''}`
                : this._hass.localize('state.default.unavailable')
            : this.computeStateValue(data.stateObj, data.unit);
    }

    computeStateName(stateObj, name) {
        return name || (stateObj.attributes.friendly_name === undefined
            ? stateObj.entity_id.substr(stateObj.entity_id.indexOf('.') + 1).replace(/_/g, ' ')
            : stateObj.attributes.friendly_name || '');
    }

    computeStateValue(stateObj, unit) {
        let display;
        const domain = stateObj.entity_id.substr(0, stateObj.entity_id.indexOf("."));

        if (domain === "binary_sensor") {
            if (stateObj.attributes.device_class) {
                display = this._hass.localize(`state.${domain}.${stateObj.attributes.device_class}.${stateObj.state}`);
            }
            if (!display) {
                display = this._hass.localize(`state.${domain}.default.${stateObj.state}`);
            }
        } else if (unit !== false && (unit || stateObj.attributes.unit_of_measurement) && !["unknown", "unavailable"].includes(stateObj.state)) {
            display = `${stateObj.state} ${unit || stateObj.attributes.unit_of_measurement}`;
        } else if (domain === "zwave") {
            display = ["initializing", "dead"].includes(stateObj.state)
                ? this._hass.localize(`state.zwave.query_stage.${stateObj.state}`, 'query_stage', stateObj.attributes.query_stage)
                : this._hass.localize(`state.zwave.default.${stateObj.state}`);
        } else {
            display = this._hass.localize(`state.${domain}.${stateObj.state}`);
        }

        return display ||
            this._hass.localize(`state.default.${stateObj.state}`) ||
            this._hass.localize(`component.${domain}.state.${stateObj.state}`) ||
            stateObj.state;
    }

    setConfig(config) {
        if (!config.entity) throw new Error('Please define an entity.');
        if (config.primary && !config.primary.entity) throw new Error('Please define a primary entity.');
        if (config.secondary && !config.secondary.entity) throw new Error('Please define a secondary entity.');
        if (config.tertiary && !config.tertiary.entity) throw new Error('Please define a tertiary entity.');

        this.displayToggle = config.toggle === true;
        this.displayValue = !this.displayToggle && !config.hide_state;
        this.displayHeader = this.displayValue && config.name_state;
        this.displayLastChanged = config.secondary_info === 'last-changed';

        this._config = config;
    }

    set hass(hass) {
        this._hass = hass;

        if (hass && this._config) {
            const stateObj = this._config.entity in hass.states ? hass.states[this._config.entity] : null;
            if (stateObj) {
                this.main = Object.assign({}, this._config, {stateObj});
                this.primary = this.initEntity(hass, this._config, 'primary');
                this.secondary = this.initEntity(hass, this._config, 'secondary');
                this.tertiary = this.initEntity(hass, this._config, 'tertiary');
                this.info = this.initEntity(hass, this._config, 'info');
            }
            this.displayToggle = this.validateToggle(this._config, stateObj);
            this.displayValue = !this.displayToggle && !this._config.hide_state;
        }
    }

    initEntity(hass, config, field) {
        const stateObj = config[field] && config[field].entity && hass.states[config[field].entity];
        return stateObj ? Object.assign({}, config[field], {
            stateObj: stateObj,
            toggle: this.validateToggle(config[field], stateObj),
        }) : null;
    }

    validateToggle(config, stateObj) {
        return config.toggle === true && stateObj && (stateObj.state === "on" || stateObj.state === "off");
    }

    fireEvent(entity, options = {}) {
        const event = new Event('hass-more-info', {
            bubbles: options.bubbles || true,
            cancelable: options.cancelable || true,
            composed: options.composed || true,
        });
        event.detail = {entityId: entity};
        this.shadowRoot.dispatchEvent(event);
        return event;
    }
}

customElements.define('multiple-entity-row', MultipleEntityRow);
