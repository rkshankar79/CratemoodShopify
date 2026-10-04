/*
 * Extra CrateMood Mood Tile
 * Isolated from Full Size / Mini personalization.
 * Toggles Standard Mood vs Custom Saying, disables unused inputs
 * so they are not submitted, and validates before Dawn add-to-cart.
 */
(function () {
  'use strict';

  const SELECTOR = '[data-cratemood-extra-tile]';

  function showError(fieldWrapper, message) {
    if (!fieldWrapper) return;
    const el = fieldWrapper.querySelector('[data-cratemood-error]');
    fieldWrapper.classList.add('cratemood-extra-tile__field--invalid');
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  }

  function clearError(fieldWrapper) {
    if (!fieldWrapper) return;
    const el = fieldWrapper.querySelector('[data-cratemood-error]');
    fieldWrapper.classList.remove('cratemood-extra-tile__field--invalid');
    if (el) {
      el.textContent = '';
      el.hidden = true;
    }
  }

  class CrateMoodExtraTile {
    constructor(root) {
      this.root = root;
      this.form = document.getElementById(root.dataset.formId);
      this.typeInputs = Array.from(root.querySelectorAll('[data-extra-tile-type]'));
      this.typeField = root.querySelector('[data-extra-tile-type-field]');
      this.standardField = root.querySelector('[data-extra-tile-standard]');
      this.customField = root.querySelector('[data-extra-tile-custom]');
      this.moodSelect = root.querySelector('[data-extra-tile-mood]');
      this.sayingInput = root.querySelector('[data-extra-tile-saying]');
      this.counter = root.querySelector('[data-extra-tile-counter]');

      this.bindTypeToggle();
      this.bindCounter();
      this.bindClearOnInput();
      this.applyType(this.selectedType());
      this.bindSubmitGuard();
    }

    selectedType() {
      const checked = this.typeInputs.find((input) => input.checked);
      return checked ? checked.dataset.extraTileType : '';
    }

    applyType(type) {
      const isCustom = type === 'custom';

      if (this.standardField) this.standardField.hidden = isCustom;
      if (this.customField) this.customField.hidden = !isCustom;

      if (this.moodSelect) {
        this.moodSelect.disabled = isCustom;
        if (isCustom) this.moodSelect.value = '';
      }

      if (this.sayingInput) {
        this.sayingInput.disabled = !isCustom;
        if (!isCustom) this.sayingInput.value = '';
      }

      this.updateCounter();
      clearError(this.typeField);
      clearError(this.standardField);
      clearError(this.customField);
    }

    bindTypeToggle() {
      this.typeInputs.forEach((input) => {
        input.addEventListener('change', () => this.applyType(this.selectedType()));
      });
    }

    updateCounter() {
      if (!this.sayingInput || !this.counter) return;
      const max = this.sayingInput.getAttribute('maxlength') || '20';
      this.counter.textContent = `${this.sayingInput.value.length}/${max}`;
    }

    bindCounter() {
      if (!this.sayingInput) return;
      this.sayingInput.addEventListener('input', () => this.updateCounter());
      this.updateCounter();
    }

    bindClearOnInput() {
      this.moodSelect?.addEventListener('change', () => clearError(this.standardField));
      this.sayingInput?.addEventListener('input', () => clearError(this.customField));
    }

    validate() {
      let firstInvalid = null;
      const fail = (wrapper, message) => {
        showError(wrapper, message);
        if (!firstInvalid) firstInvalid = wrapper;
      };

      const type = this.selectedType();
      if (!type) {
        fail(this.typeField, 'Please choose a tile type.');
        return firstInvalid;
      }

      if (type === 'standard') {
        if (!this.moodSelect || this.moodSelect.value.trim() === '') {
          fail(this.standardField, 'Please choose a mood.');
        }
      }

      if (type === 'custom') {
        const saying = this.sayingInput ? this.sayingInput.value.trim() : '';
        const max = this.sayingInput ? parseInt(this.sayingInput.getAttribute('maxlength'), 10) || 20 : 20;
        if (saying === '') {
          fail(this.customField, 'Please enter a custom saying.');
        } else if (saying.length > max) {
          fail(this.customField, `Custom saying must be ${max} characters or fewer.`);
        }
      }

      return firstInvalid;
    }

    bindSubmitGuard() {
      if (!this.form) return;
      this.submitHandler = (evt) => {
        if (evt.target !== this.form) return;
        const firstInvalid = this.validate();
        if (firstInvalid) {
          evt.preventDefault();
          evt.stopImmediatePropagation();
          const focusable = firstInvalid.querySelector('input, select, textarea');
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          focusable?.focus({ preventScroll: true });
        }
      };
      document.addEventListener('submit', this.submitHandler, true);
    }
  }

  function init() {
    document.querySelectorAll(SELECTOR).forEach((root) => {
      if (root.dataset.cratemoodInit === 'true') return;
      root.dataset.cratemoodInit = 'true';
      new CrateMoodExtraTile(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
})();
