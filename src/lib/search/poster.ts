import { NOTICE_LABELS, type PublicNotice } from './contracts';

function lines(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const result: string[] = [];
  let line = '';
  for (const character of text) {
    if (character === '\n' || context.measureText(line + character).width > maxWidth) {
      result.push(line); line = character === '\n' ? '' : character;
    } else line += character;
  }
  if (line) result.push(line);
  return result;
}
export async function downloadPoster(notice: PublicNotice): Promise<void> {
  const { toCanvas } = await import('qrcode');
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 1700;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este navegador no puede generar el afiche.');
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#0B0F19'; context.font = 'bold 32px system-ui';
  context.fillText('ALZAVOZ · BÚSQUEDA COMUNITARIA', 80, 110);
  context.font = 'bold 60px system-ui';
  context.fillText(NOTICE_LABELS[notice.kind].toLocaleUpperCase('es'), 80, 215);
  context.font = 'bold 46px system-ui';
  let y = 300;
  for (const line of lines(context, notice.title.replace(/\s+/g, ' '), 1040)) { context.fillText(line, 80, y); y += 60; }
  context.font = '32px system-ui';
  context.fillText(`Comuna ${notice.commune} · ${new Date(`${notice.eventDate}T12:00:00Z`).toLocaleDateString('es-CO', { timeZone: 'UTC' })}`, 80, y + 18);
  y += 90;
  // Fixed line budget and wrapping also bound long unbroken input; QR keeps its own clear area.
  const description = lines(context, notice.description, 1040);
  const budget = Math.max(1, Math.floor((1090 - y) / 42));
  description.slice(0, budget).forEach((line, index) => context.fillText(index === budget - 1 && description.length > budget ? `${line.slice(0, -2)}…` : line, 80, y + index * 42));
  if (description.length > budget) { context.font = '24px system-ui'; context.fillText('Descripción completa en el aviso: escanea el QR.', 80, 1150); }
  const target = new URL('/search', window.location.origin); target.searchParams.set('id', notice.id);
  const qr = document.createElement('canvas');
  await toCanvas(qr, target.href, { width: 420, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } });
  context.drawImage(qr, 390, 1180);
  context.font = '28px system-ui'; context.textAlign = 'center';
  context.fillText('Escanea para consultar el aviso y aportar una pista privada.', 600, 1610);
  context.font = '24px system-ui'; context.fillText('Aviso no verificado. No confirma identidades.', 600, 1655);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo crear el PNG.')), 'image/png'));
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = objectUrl; link.download = `alzavoz-${notice.id}.png`; link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
