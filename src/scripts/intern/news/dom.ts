/** Kleiner DOM-Baukasten für die Redaktion: h('button', { class, text, onclick }, ...kinder) */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...kinder: (Node | string | null | false | undefined)[]) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') el.textContent = String(v);
    else if (k === 'value') (el as HTMLInputElement).value = String(v);
    else if (k === 'class') el.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  el.append(...kinder.filter((x): x is Node | string => !!x));
  return el;
}
