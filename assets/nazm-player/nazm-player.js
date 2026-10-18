/* Nazm Films • portable, dependency-free player. Load films-data.js and film-engine.js first. */
(() => {
  'use strict';
  if (customElements.get('nazm-film')) return;
  let instanceCount = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clock = seconds => {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
  };
  const records = () => Array.isArray(window.NAZM_FILMS) ? window.NAZM_FILMS : (window.NAZM_FILMS?.surahs || []);

  class NazmFilm extends HTMLElement {
    static get observedAttributes() { return ['surah', 'data-base']; }

    connectedCallback() { this.render(); }
    disconnectedCallback() { this.dispose(); }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue && this.isConnected) this.render();
    }

    get record() { return records().find(item => String(item.id) === String(this.getAttribute('surah'))) || records()[0]; }
    get duration() { return Number.isFinite(this.video?.duration) ? this.video.duration : Number(this.record?.duration || 0); }
    get assetBase() { return (this.getAttribute('data-base') || '/assets/nazm-films/').replace(/\/?$/, '/'); }
    setSurah(id) { this.setAttribute('surah', String(id)); }

    dispose() {
      this.events?.abort();
      if (this.video) {
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.querySelectorAll('source, track').forEach(node => node.remove());
        this.video.load();
      }
      this.resizeObserver?.disconnect();
    }

    render() {
      this.dispose();
      this.events = new AbortController();
      const signal = this.events.signal;
      const record = this.record;
      if (!record) {
        this.innerHTML = '<p class="nf-unavailable" role="status">The film library could not be loaded. Please use the surah’s written structure below.</p>';
        return;
      }
      const uid = `nf-${++instanceCount}`;
      const chapters = record.chapters || [];
      const base = this.assetBase;
      const slug = encodeURIComponent(record.slug);
      // Choose once per surah render. Resizing does not interrupt the active source.
      this.portrait = window.matchMedia('(max-width:600px)').matches;
      const mediaSlug = slug + (this.portrait ? '-portrait' : '');
      this.mode = 'watch';
      this.activeChapter = -1;
      this.selectedPair = 0;
      this.classList.add('nazm-film');
      this.classList.toggle('nf-portrait', this.portrait);
      this.innerHTML = `
        <div class="nf-heading">
          <div><p class="nf-eyebrow">THE STRUCTURE, IN MOTION</p><h3 id="${uid}-title">${escape(record.name)} <span lang="ar" dir="rtl">${escape(record.ar)}</span></h3></div>
          <div class="nf-tabs" role="group" aria-label="Player mode">
            <button type="button" class="nf-mode is-active" data-mode="watch" aria-pressed="true">Watch <span aria-hidden="true">↗</span></button>
            <button type="button" class="nf-mode" data-mode="explore" aria-pressed="false">Explore <span aria-hidden="true">↔</span></button>
          </div>
        </div>
        <div class="nf-stage" aria-labelledby="${uid}-title">
          <video class="nf-video" preload="metadata" playsinline controls poster="${escape(base + mediaSlug + '.jpg')}" aria-label="${escape(record.name)} thematic structure film">
            <source src="${escape(base + mediaSlug + '.mp4')}" type="video/mp4">
            <track kind="captions" srclang="en" label="English guide" src="${escape(base + slug + '.vtt')}">
            Your browser cannot play this video. Use the film download or written walkthrough below.
          </video>
          <canvas class="nf-canvas" hidden role="img" aria-label="Interactive structure of ${escape(record.name)}. Choose a pair below for its explanation."></canvas>
          <div class="nf-explore-badge" hidden>EXPLORE · SELECT A MIRROR PAIR BELOW</div>
        </div>
        <div class="nf-controls" role="group" aria-label="Film playback controls">
          <button type="button" class="nf-play" aria-label="Play film"><span aria-hidden="true">▶</span><span class="nf-sr">Play</span></button>
          <output class="nf-time" aria-label="Playback time" aria-live="off">0:00 / ${clock(record.duration)}</output>
          <input class="nf-scrub" type="range" min="0" max="${Number(record.duration) || 1}" value="0" step="0.1" aria-label="Seek through film" aria-valuetext="0:00">
          <button type="button" class="nf-cc" aria-label="Show English captions" aria-pressed="false">CC</button>
          <button type="button" class="nf-fullscreen" aria-label="Enter full screen">⛶</button>
        </div>
        <p class="nf-status" role="status" aria-live="polite">Caption-led, silent film. Press play when you’re ready.</p>
        <div class="nf-chapter-header"><p class="nf-eyebrow">JUMP TO A CHAPTER</p><span>${chapters.length} moments</span></div>
        <div class="nf-chapters" role="group" aria-label="Film chapters">${chapters.map((chapter, index) => `
          <button type="button" class="nf-chapter" data-chapter="${index}" aria-label="${escape(chapter.title)}, ${clock(chapter.time)}">
            <span class="nf-chapter-no">${String(index + 1).padStart(2, '0')}</span><span>${escape(chapter.title)}</span><time>${clock(chapter.time)}</time>
          </button>`).join('')}
        </div>
        <div class="nf-explorer" hidden>
          <div class="nf-pair-buttons" role="group" aria-label="Choose a mirror pair">${(record.pairs || []).map((pair, index) => `<button type="button" class="nf-pair" data-pair="${index}" aria-pressed="${index === 0}">${escape(record.units?.[pair.a]?.label || pair.a + 1)} <span aria-hidden="true">↔</span> ${escape(record.units?.[pair.b]?.label || pair.b + 1)}</button>`).join('')}${Number.isInteger(record.centreIndex) ? '<button type="button" class="nf-pair nf-centre" data-pair="centre" aria-pressed="false">The centre</button>' : ''}</div>
          <div class="nf-pair-detail" role="status" aria-live="polite"></div>
        </div>
        <div class="nf-meta"><p>Thematic study · ${escape(record.reading || 'One reading of the surah’s structure')}<br><span>Labels summarise themes; they are not translations of the ayat.</span></p><a class="nf-download" href="${escape(base + mediaSlug + '.mp4')}" download>Download MP4 <span aria-hidden="true">↓</span></a></div>
        <details class="nf-transcript"><summary>Read the complete walkthrough <span aria-hidden="true">＋</span></summary>
          <div class="nf-transcript-body">
            <p>${escape(record.note || '')}</p>
            <ol class="nf-unit-list">${(record.units || []).map((unit, index) => `<li${index === record.centreIndex ? ' class="is-centre"' : ''}><span class="nf-unit-letter">${escape(unit.label)}</span><div><p><strong>${escape(unit.title)}</strong> <span>${escape(unit.range)}</span></p><p>${escape(unit.gloss)}</p></div></li>`).join('')}</ol>
            <h4>Mirror connections</h4><ul class="nf-connections">${(record.pairs || []).map(pair => `<li><strong>${escape(pair.title)}</strong><p>${escape(pair.explanation)}</p></li>`).join('')}</ul>
            <h4>Film chapter transcript</h4><ol class="nf-connections">${chapters.map(chapter => `<li><strong>${clock(chapter.time)} · ${escape(chapter.title)}</strong><p>${escape(chapter.description)}</p></li>`).join('')}</ol>
            <p class="nf-source">Reading from <a href="${escape(record.sourceUrl || 'https://farissuhail.com/nazm.html')}" target="_blank" rel="noopener">${escape(record.sourceLabel || 'Faris Suhail · Nazm')}</a>.</p>
          </div>
        </details>`;

      this.video = this.querySelector('video');
      this.canvas = this.querySelector('canvas');
      this.scrub = this.querySelector('.nf-scrub');
      this.status = this.querySelector('.nf-status');
      this.video.controls = false;
      this.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => this.setMode(button.dataset.mode), {signal}));
      this.querySelector('.nf-play').addEventListener('click', () => this.togglePlay(), {signal});
      this.scrub.addEventListener('input', () => { this.video.currentTime = Number(this.scrub.value); this.updateTime(); }, {signal});
      this.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click', () => this.playChapter(Number(button.dataset.chapter)), {signal}));
      this.querySelectorAll('[data-pair]').forEach(button => button.addEventListener('click', () => this.highlightPair(button.dataset.pair === 'centre' ? 'centre' : Number(button.dataset.pair)), {signal}));
      this.querySelector('.nf-cc').addEventListener('click', () => this.toggleCaptions(), {signal});
      this.querySelector('.nf-fullscreen').addEventListener('click', async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else if (this.querySelector('.nf-stage').requestFullscreen) await this.querySelector('.nf-stage').requestFullscreen();
          else if (this.video.webkitEnterFullscreen) this.video.webkitEnterFullscreen();
          else this.announce('Full screen is not available in this browser.');
        } catch { this.announce('Full screen is not available in this browser.'); }
      }, {signal});
      ['timeupdate', 'durationchange', 'loadedmetadata', 'seeked'].forEach(event => this.video.addEventListener(event, () => this.updateTime(), {signal}));
      ['play', 'pause', 'ended'].forEach(event => this.video.addEventListener(event, () => this.updatePlay(), {signal}));
      this.video.addEventListener('error', () => {
        this.announce('This browser could not load the MP4. Explore the structure, read the walkthrough, or download the film below.');
        this.video.controls = true;
      }, {signal});
      const source = this.querySelector('source');
      source.addEventListener('error', () => this.announce('The film file is unavailable. You can still explore the structure and read the complete walkthrough.'), {signal});
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.video.pause(); }, {signal});
      document.addEventListener('fullscreenchange', () => {
        this.video.controls = Boolean(document.fullscreenElement === this.querySelector('.nf-stage'));
      }, {signal});
      this.addEventListener('keydown', event => {
        if (event.target.matches('input,button,a,summary,select') || this.mode !== 'watch') return;
        if (event.key.toLowerCase() === 'k' || event.key === ' ') { event.preventDefault(); this.togglePlay(); }
        if (event.key === 'ArrowRight') { event.preventDefault(); this.video.currentTime = Math.min(this.duration, this.video.currentTime + 5); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); this.video.currentTime = Math.max(0, this.video.currentTime - 5); }
      }, {signal});
      this.video.tabIndex = 0;
      if (!window.NazmFilmEngine) {
        this.querySelector('[data-mode="explore"]').disabled = true;
        this.querySelector('[data-mode="explore"]').title = 'The interactive renderer is unavailable; watch the film or read its walkthrough.';
      }
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => { if (this.mode === 'explore') this.drawExplore(); });
        this.resizeObserver.observe(this.querySelector('.nf-stage'));
      } else window.addEventListener('resize', () => this.drawExplore(), {signal});
      this.updateTime();
    }

    announce(message) { this.status.textContent = message; }

    async togglePlay() {
      if (this.mode !== 'watch') this.setMode('watch');
      if (this.video.paused) {
        try { await this.video.play(); this.announce('Film playing. Use chapters to jump to a connection.'); }
        catch { this.announce('The film could not start. Try downloading the MP4 or use Explore.'); }
      } else this.video.pause();
    }

    updatePlay() {
      const playing = !this.video.paused && !this.video.ended;
      const button = this.querySelector('.nf-play');
      button.setAttribute('aria-label', playing ? 'Pause film' : 'Play film');
      button.innerHTML = `<span aria-hidden="true">${playing ? 'Ⅱ' : '▶'}</span><span class="nf-sr">${playing ? 'Pause' : 'Play'}</span>`;
      if (this.video.ended) this.announce('Film complete. Explore a connection or replay a chapter.');
    }

    updateTime() {
      const currentTime = this.video.currentTime || 0;
      const duration = this.duration;
      this.scrub.max = duration || 1;
      this.scrub.value = currentTime;
      this.scrub.style.setProperty('--nf-progress', `${duration ? 100 * currentTime / duration : 0}%`);
      this.scrub.setAttribute('aria-valuetext', `${clock(currentTime)} of ${clock(duration)}`);
      this.querySelector('.nf-time').textContent = `${clock(currentTime)} / ${clock(duration)}`;
      if (this.mode === 'explore') return;
      const chapters = this.record.chapters || [];
      let index = -1;
      chapters.forEach((chapter, i) => { if (currentTime >= chapter.time && currentTime < (chapter.end || duration + 1)) index = i; });
      if (index === this.activeChapter) return;
      this.activeChapter = index;
      this.querySelectorAll('[data-chapter]').forEach((button, i) => {
        button.classList.toggle('is-active', i === index);
        if (i === index) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      if (index >= 0) {
        const chapter = chapters[index];
        this.dispatchEvent(new CustomEvent('nazm:chapter', {bubbles: true, detail: {surahId: this.record.id, chapterIndex: index, chapter, pairIndex: chapter.pairIndex ?? null, source: 'nazm-film'}}));
      }
    }

    playChapter(index) {
      const chapter = this.record.chapters?.[index];
      if (!chapter) return;
      if (this.mode === 'explore' && (Number.isInteger(chapter.pairIndex) || chapter.kind === 'centre')) {
        this.highlightPair(chapter.kind === 'centre' ? 'centre' : chapter.pairIndex);
      } else {
        this.setMode('watch');
        this.video.currentTime = chapter.time;
        this.updateTime();
      }
      this.announce(`${chapter.title}. ${chapter.description || ''}`);
    }

    setMode(mode) {
      if (mode === 'explore' && !window.NazmFilmEngine) return;
      this.mode = mode;
      const exploring = mode === 'explore';
      if (exploring) this.video.pause();
      this.video.hidden = exploring;
      this.canvas.hidden = !exploring;
      this.querySelector('.nf-explore-badge').hidden = !exploring;
      this.querySelector('.nf-explorer').hidden = !exploring;
      this.querySelector('.nf-controls').hidden = exploring;
      this.querySelectorAll('[data-mode]').forEach(button => {
        const active = button.dataset.mode === mode;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (exploring) {
        this.highlightPair(this.selectedPair);
        this.announce('Exploration paused in place. Select a mirror pair or the centre to read its connection.');
      } else {
        this.activeChapter = -1;
        this.updateTime();
        this.announce('Watch mode. Press play to continue.');
      }
    }

    highlightPair(index, emit = true) {
      if (index !== 'centre' && !this.record.pairs?.[index]) return;
      this.selectedPair = index;
      if (this.mode !== 'explore') { this.setMode('explore'); return; }
      const record = this.record;
      const pair = index === 'centre' ? null : record.pairs?.[index];
      const centre = record.units?.[record.centreIndex];
      if (!pair && !centre) return;
      const detail = this.querySelector('.nf-pair-detail');
      if (pair) {
        const first = record.units[pair.a], second = record.units[pair.b];
        detail.innerHTML = `<p class="nf-eyebrow">${escape(first.label)} · ${escape(first.range)} <span aria-hidden="true">↔</span> ${escape(second.label)} · ${escape(second.range)}</p><h4>${escape(pair.title)}</h4><p>${escape(pair.explanation)}</p>`;
      } else {
        detail.innerHTML = `<p class="nf-eyebrow">THE CENTRE · ${escape(centre?.range)}</p><h4>${escape(centre?.title)}</h4><p>${escape(centre?.gloss)}</p>`;
      }
      this.querySelectorAll('[data-pair]').forEach(button => {
        const active = button.dataset.pair === String(index);
        button.setAttribute('aria-pressed', String(active));
        button.classList.toggle('is-active', active);
      });
      const chapterIndex = record.chapters.findIndex(chapter => index === 'centre' ? chapter.kind === 'centre' : chapter.kind === 'pair' && chapter.pairIndex === index);
      this.querySelectorAll('[data-chapter]').forEach((button, i) => {
        button.classList.toggle('is-active', i === chapterIndex);
        if (i === chapterIndex) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      this.drawExplore();
      if (emit) this.dispatchEvent(new CustomEvent('nazm:pair', {bubbles: true, detail: {surahId: record.id, pairIndex: index === 'centre' ? null : index, centre: index === 'centre', source: 'nazm-film'}}));
    }

    drawExplore() {
      if (this.mode !== 'explore' || !window.NazmFilmEngine) return;
      const box = this.querySelector('.nf-stage').getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(240, box.width), height = width * (this.portrait ? 16 / 9 : 9 / 16);
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;
      const chapter = this.selectedPair === 'centre' ? this.record.chapters.find(item => item.kind === 'centre') : this.record.chapters.find(item => item.pairIndex === this.selectedPair && item.kind === 'pair');
      const time = chapter ? chapter.time + Math.min(3, (chapter.end - chapter.time) / 2) : this.duration * .65;
      window.NazmFilmEngine.draw(ctx, this.record, time, this.canvas.width, this.canvas.height, {pairIndex: this.selectedPair === 'centre' ? -1 : this.selectedPair, explore: true});
    }

    toggleCaptions() {
      const tracks = this.video.textTracks;
      if (!tracks.length) { this.announce('Caption file is unavailable. The full walkthrough is below.'); return; }
      const showing = tracks[0].mode !== 'showing';
      tracks[0].mode = showing ? 'showing' : 'hidden';
      const button = this.querySelector('.nf-cc');
      button.setAttribute('aria-pressed', String(showing));
      button.setAttribute('aria-label', showing ? 'Hide English captions' : 'Show English captions');
    }
  }

  customElements.define('nazm-film', NazmFilm);
})();
