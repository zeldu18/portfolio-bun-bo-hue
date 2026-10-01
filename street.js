const doors = [...document.querySelectorAll('[data-room]')];
const returns = new WeakMap();
let opening = false;
function openRoom(id, trigger) {
  const current = document.querySelector('dialog[open]');
  const returnTarget = current ? returns.get(current) : trigger;
  if (current) current.close();
  const next = document.getElementById(id);
  returns.set(next, returnTarget);
  next.showModal();
  next.scrollTop = 0;
}
doors.forEach(door => door.addEventListener('click', () => {
  if (opening) return;
  opening = true;
  door.classList.add('opening');
  const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360;
  setTimeout(() => { openRoom(door.dataset.room, door); opening = false; }, delay);
}));
document.querySelectorAll('[data-open]').forEach(button => {
  button.addEventListener('click', () => openRoom(button.dataset.open, button));
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    doors.forEach(door => door.classList.remove('opening'));
    if (!document.querySelector('dialog[open]')) returns.get(dialog)?.focus();
  });
});
const motion = document.querySelector('#motion-toggle');
motion.addEventListener('click', () => {
  const paused = document.body.classList.toggle('paused');
  motion.setAttribute('aria-pressed', String(paused));
  motion.textContent = paused ? 'Resume street motion' : 'Pause street motion';
});
const stops = [...document.querySelectorAll('[data-stop]')];
function selectStop(name) {
  document.querySelector('.scene').dataset.stop = name;
  stops.forEach(item => {
    const selected = item.dataset.stop === name;
    item.classList.toggle('selected', selected);
    if (selected) item.setAttribute('aria-current', 'true');
    else item.removeAttribute('aria-current');
  });
  const labels = {city: 'Policy, people, and public spaces.', restroom: 'The restroom. Naturally.', factory: 'Inside the data factory.'};
  document.querySelector('.street-caption p').textContent = labels[name];
}
stops.forEach(stop => stop.addEventListener('click', () => selectStop(stop.dataset.stop)));
doors.forEach(door => door.addEventListener('focus', () => {
  if (matchMedia('(max-width: 700px)').matches) selectStop(door.dataset.room);
}));
const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab) {
  tabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(i + tabs.length - 1) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs[tabs.length - 1];
    if (next) { event.preventDefault(); activateTab(next); next.focus(); }
  });
});

// Stop background work when the illustration is not visible.
let streetVisible = true;
function syncStreetMotion() {
  document.body.classList.toggle('street-idle', document.hidden || !streetVisible);
}
new IntersectionObserver(([entry]) => {
  streetVisible = entry.isIntersecting;
  syncStreetMotion();
}).observe(document.querySelector('.scene'));
document.addEventListener('visibilitychange', syncStreetMotion);
syncStreetMotion();

if (location.hash === "#about") openRoom("about", document.querySelector("[data-open=about]"));
