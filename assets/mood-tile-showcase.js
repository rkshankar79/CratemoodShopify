/*
 * CrateMood mood tile showcase
 * Clicking a mood chip swaps the displayed tile text on the sign preview.
 * Optional auto-rotate cycles through the moods.
 */
if (!customElements.get('mood-tile-showcase')) {
  customElements.define(
    'mood-tile-showcase',
    class MoodTileShowcase extends HTMLElement {
      connectedCallback() {
        this.chips = Array.from(this.querySelectorAll('.mood-chip'));
        this.display = this.querySelector('[data-mood-display]');
        this.timer = null;

        this.chips.forEach((chip, index) => {
          chip.addEventListener('click', () => this.select(index, true));
        });

        const autoplay = parseInt(this.dataset.autoplay, 10);
        if (autoplay && this.chips.length > 1 && !this.prefersReducedMotion()) {
          this.startAutoplay(autoplay);
          this.addEventListener('mouseenter', () => this.stopAutoplay());
          this.addEventListener('focusin', () => this.stopAutoplay());
        }
      }

      disconnectedCallback() {
        this.stopAutoplay();
      }

      prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }

      select(index, userInitiated) {
        const chip = this.chips[index];
        if (!chip || !this.display) return;

        this.chips.forEach((c) => {
          c.classList.remove('mood-chip--active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('mood-chip--active');
        chip.setAttribute('aria-pressed', 'true');

        this.display.classList.add('mood-sign__tile--swap');
        window.setTimeout(() => {
          this.display.textContent = chip.dataset.mood;
          this.display.classList.remove('mood-sign__tile--swap');
        }, 120);

        this.activeIndex = index;
        if (userInitiated) this.stopAutoplay();
      }

      startAutoplay(interval) {
        this.activeIndex = 0;
        this.timer = window.setInterval(() => {
          const next = (this.activeIndex + 1) % this.chips.length;
          this.select(next, false);
        }, interval);
      }

      stopAutoplay() {
        if (this.timer) {
          window.clearInterval(this.timer);
          this.timer = null;
        }
      }
    }
  );
}
