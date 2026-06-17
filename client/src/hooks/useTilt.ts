import { useEffect, useRef } from 'react';

export function useTilt(strength = 8) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function animate() {
      currentX = lerp(currentX, targetX, 0.12);
      currentY = lerp(currentY, targetY, 0.12);
      el.style.transform = `perspective(700px) rotateX(${currentX}deg) rotateY(${currentY}deg) translateZ(6px)`;
      raf = requestAnimationFrame(animate);
    }

    function onMove(e: MouseEvent) {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetY = x * strength;
      targetX = -y * strength;
    }

    function onEnter() {
      raf = requestAnimationFrame(animate);
    }

    function onLeave() {
      cancelAnimationFrame(raf);
      targetX = 0; targetY = 0;
      // Spring back
      let frames = 0;
      function springBack() {
        currentX = lerp(currentX, 0, 0.18);
        currentY = lerp(currentY, 0, 0.18);
        el.style.transform = `perspective(700px) rotateX(${currentX}deg) rotateY(${currentY}deg) translateZ(0)`;
        if (Math.abs(currentX) > 0.01 || Math.abs(currentY) > 0.01) {
          frames++;
          if (frames < 40) requestAnimationFrame(springBack);
        } else {
          el.style.transform = '';
        }
      }
      requestAnimationFrame(springBack);
    }

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      el.style.transform = '';
    };
  }, [strength]);

  return ref;
}
