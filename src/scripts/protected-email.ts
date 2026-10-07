/** Gegenstück zu lib/protect-email.ts: löst das Rätsel und entschlüsselt die Adresse. */
const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function solve(salt: string, challenge: string, max: number): Promise<number | null> {
  for (let n = 0; n < max; n++) {
    const h = hex(await crypto.subtle.digest('SHA-256', enc.encode(`${salt}:${n}`)));
    if (h === challenge) return n;
  }
  return null;
}

export async function reveal(el: HTMLElement): Promise<string | null> {
  const { salt = '', challenge = '', max = '0', iv = '', data = '' } = el.dataset;
  const n = await solve(salt, challenge, Number(max));
  if (n === null) return null;
  const keyBytes = await crypto.subtle.digest('SHA-256', enc.encode(`key:${salt}:${n}`));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(data));
  return new TextDecoder().decode(plain);
}

export function initProtectedEmails(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-protected-email]').forEach((el) => {
    const btn = el.querySelector<HTMLButtonElement>('button');
    const status = el.querySelector<HTMLElement>('[role="status"]');
    btn?.addEventListener('click', async () => {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      if (status) status.textContent = el.dataset.msgBusy ?? '…';
      try {
        const email = await reveal(el);
        if (!email) throw new Error('not found');
        const a = document.createElement('a');
        a.href = `mailto:${email}${el.dataset.subject ? `?subject=${encodeURIComponent(el.dataset.subject)}` : ''}`;
        a.textContent = email;
        a.className = btn.className.replace('protected-email__btn', 'protected-email__link');
        btn.replaceWith(a);
        a.focus();
        if (status) status.textContent = `${el.dataset.msgDone ?? ''} ${email}`;
      } catch {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        if (status) status.textContent = el.dataset.msgFail ?? '';
      }
    });
  });
}
