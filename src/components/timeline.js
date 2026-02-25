const track = document.getElementById('timeline-track');
const progress = document.getElementById('timeline-progress');
const thumb = document.getElementById('timeline-thumb');
const stopsContainer = document.getElementById('timeline-stops');

let stops = [];
let onSeek = null;

export function initTimeline(journeyStops, seekCallback) {
  stops = journeyStops;
  onSeek = seekCallback;

  stops.forEach((stop, index) => {
    const dot = document.createElement('div');
    dot.className = 'timeline-dot';
    dot.dataset.index = index;

    const label = document.createElement('div');
    label.className = 'timeline-dot-label';
    label.textContent = stop.name;
    dot.appendChild(label);

    dot.addEventListener('click', () => {
      if (onSeek) onSeek(index);
    });

    stopsContainer.appendChild(dot);
  });

  track.addEventListener('click', (e) => {
    const rect = track.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const index = Math.round(pct * (stops.length - 1));
    if (onSeek) onSeek(Math.max(0, Math.min(index, stops.length - 1)));
  });
}

export function resetTimeline() {
  stopsContainer.innerHTML = '';
  stops = [];
  onSeek = null;
}

export function updateTimeline(activeIndex) {
  const pct = stops.length > 1 ? (activeIndex / (stops.length - 1)) * 100 : 0;

  progress.style.width = `${pct}%`;
  thumb.style.left = `${pct}%`;

  const dots = stopsContainer.querySelectorAll('.timeline-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === activeIndex);
    dot.classList.toggle('visited', i < activeIndex);
  });
}
