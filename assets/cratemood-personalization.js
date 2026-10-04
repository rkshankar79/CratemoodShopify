/*
 * CrateMood personalization
 * - Live character counter for the pet name.
 * - Toggles Mood Tile 3 & 4 based on the selected package variant.
 *   (Disabled tiles are NOT submitted, keeping orders clean.)
 * - Validates required line-item properties before add-to-cart, since Dawn's
 *   product form is `novalidate`.
 */
(function () {
  'use strict';

  const SELECTOR = '[data-cratemood-personalization]';

  function parseFourTileVariants(root) {
    return (root.dataset.fourTileVariants || '')
      .split('||')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function sectionIdFromForm(formId) {
    return (formId || '').replace(/^product-form-/, '');
  }

  function showError(fieldWrapper, message) {
    if (!fieldWrapper) return;
    const el = fieldWrapper.querySelector('[data-cratemood-error]');
    fieldWrapper.classList.add('cratemood-field--invalid');
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  }

  function clearError(fieldWrapper) {
    if (!fieldWrapper) return;
    const el = fieldWrapper.querySelector('[data-cratemood-error]');
    fieldWrapper.classList.remove('cratemood-field--invalid');
    if (el) {
      el.textContent = '';
      el.hidden = true;
    }
  }

  class CrateMoodPersonalization {
    constructor(root) {
      this.root = root;
      this.formId = root.dataset.formId;
      this.sectionId = sectionIdFromForm(this.formId);
      this.form = document.getElementById(this.formId);
      this.fourTileVariants = parseFourTileVariants(root);

      this.nameInput = root.querySelector('[data-cratemood-name]');
      this.counter = root.querySelector('[data-cratemood-counter]');
      this.moodFields = Array.from(root.querySelectorAll('[data-cratemood-mood-field]'));

      this.isFourTile = root.dataset.initialFourTile === 'true';

      this.bindNameCounter();
      this.applyPackageState(this.isFourTile);
      this.bindVariantChange();
      this.bindSubmitGuard();
      this.bindClearOnInput();
    }

    bindNameCounter() {
      if (!this.nameInput) return;
      const max = this.nameInput.getAttribute('maxlength') || '12';
      const update = () => {
        if (this.counter) this.counter.textContent = `${this.nameInput.value.length}/${max}`;
      };
      this.nameInput.addEventListener('input', update);
      update();
    }

    bindClearOnInput() {
      this.root.querySelectorAll('[data-cratemood-required]').forEach((control) => {
        const evt = control.type === 'radio' ? 'change' : 'input';
        control.addEventListener(evt, () => {
          clearError(control.closest('.cratemood-field'));
        });
      });
      this.moodFields.forEach((field) => {
        const control = field.querySelector('[data-cratemood-mood]');
        control?.addEventListener('change', () => clearError(field));
      });
    }

    // Enable/disable + require tiles 3 & 4 depending on the package variant.
    applyPackageState(isFourTile) {
      this.isFourTile = isFourTile;
      this.moodFields.forEach((field) => {
        const index = parseInt(field.dataset.cratemoodMoodField, 10);
        if (index < 3) return; // tiles 1 & 2 always on
        const control = field.querySelector('[data-cratemood-mood]');
        field.hidden = !isFourTile;
        if (control) {
          control.disabled = !isFourTile; // disabled inputs are not submitted
          if (isFourTile) {
            control.dataset.cratemoodRequired = 'true';
          } else {
            delete control.dataset.cratemoodRequired;
            control.value = '';
          }
        }
        if (!isFourTile) clearError(field);
      });
      this.root.classList.toggle('cratemood-personalization--four-tile', isFourTile);
    }

    variantIsFourTile(variant) {
      if (!variant) return this.isFourTile;
      const candidates = [variant.title, variant.option1, variant.option2, variant.option3]
        .filter(Boolean)
        .map((s) => String(s).trim());
      return this.fourTileVariants.some((name) => candidates.includes(name));
    }

    bindVariantChange() {
      if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;
      this.unsubscribe = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
        const data = event && event.data;
        if (!data) return;
        if (data.sectionId && this.sectionId && data.sectionId !== this.sectionId) return;
        this.applyPackageState(this.variantIsFourTile(data.variant));
      });
    }

    validate() {
      let firstInvalid = null;
      const fail = (wrapper, message) => {
        showError(wrapper, message);
        if (!firstInvalid) firstInvalid = wrapper;
      };

      // Pet name
      if (this.nameInput && this.nameInput.value.trim() === '') {
        fail(this.nameInput.closest('.cratemood-field'), 'Please enter your pet’s name.');
      }

      // Name color
      const colorInputs = this.root.querySelectorAll('[data-cratemood-color]');
      if (colorInputs.length && !Array.from(colorInputs).some((i) => i.checked)) {
        fail(colorInputs[0].closest('.cratemood-field'), 'Please choose a name color.');
      }

      // Mood tiles (only those currently required / enabled)
      this.moodFields.forEach((field) => {
        const control = field.querySelector('[data-cratemood-mood]');
        if (!control || control.disabled) return;
        if (control.dataset.cratemoodRequired === 'true' && control.value.trim() === '') {
          fail(field, 'Please select a mood tile.');
        }
      });

      return firstInvalid;
    }

    bindSubmitGuard() {
      if (!this.form) return;
      // Capture phase on document runs before product-form's bubble-phase submit handler.
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
      new CrateMoodPersonalization(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init when the theme editor re-renders the section.
  document.addEventListener('shopify:section:load', init);
})();
