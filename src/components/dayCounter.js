/**
 * Urgency Counter — "XX DAYS REMAINING"
 * Color-coded: green (>40), gold (20-40), orange (5-20), red (<5)
 */
import gsap from 'gsap';

const urgencyEl = document.getElementById('urgency-number');
const counterDiv = document.getElementById('urgency-counter');
let currentDay = 1;

function getUrgencyClass(remaining) {
  if (remaining > 40) return 'urgency-safe';
  if (remaining > 15) return 'urgency-ok';
  if (remaining > 5) return 'urgency-warn';
  return 'urgency-critical';
}

export function updateDayCounter(newDay) {
  if (newDay === currentDay) return;

  const remaining = Math.max(0, 80 - newDay);
  const oldRemaining = Math.max(0, 80 - currentDay);

  // Animate the number counting down
  const obj = { val: oldRemaining };
  gsap.to(obj, {
    val: remaining,
    duration: 1,
    ease: 'power2.out',
    onUpdate: () => {
      urgencyEl.textContent = Math.round(obj.val);
    },
    onComplete: () => {
      currentDay = newDay;
      // Pulse on arrival
      gsap.fromTo(urgencyEl,
        { scale: 1.5, textShadow: '0 0 40px currentColor' },
        { scale: 1, textShadow: '0 0 20px currentColor', duration: 0.5, ease: 'back.out(2)' }
      );
    },
  });

  // Update urgency color class
  counterDiv.className = '';
  counterDiv.id = 'urgency-counter';
  counterDiv.classList.add(getUrgencyClass(remaining));
}

export function setDayInstant(day) {
  currentDay = day;
  const remaining = Math.max(0, 80 - day);
  urgencyEl.textContent = remaining;
  counterDiv.className = '';
  counterDiv.id = 'urgency-counter';
  counterDiv.classList.add(getUrgencyClass(remaining));
}
