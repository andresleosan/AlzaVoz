import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldAlert, Video, Scale, HeartHandshake, MessageCircle, MapPin, Radar } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export default function HomePage() {
  return (
    <AppShell>
      <div className="home-heading">
        <h1>¿En qué necesitas ayuda?</h1>
        <p>Orientación y herramientas para cuidarte en Medellín.</p>
      </div>

      <div className="home-layout">
        <div className="home-primary">
          <section className="emergency-entry" aria-labelledby="emergency-title">
            <div className="emergency-heading"><ShieldAlert size={24} aria-hidden="true" /><h2 id="emergency-title">¿Hay una emergencia?</h2></div>
            <p>Llama al 123, consulta tu ubicación y avisa a tus contactos.</p>
            <Link href="/sos" prefetch={false} className="emergency-link">Abrir SOS <ArrowRight size={18} aria-hidden="true" /></Link>
          </section>

          <section aria-labelledby="tools-title" className="tools-section">
            <h2 id="tools-title">Herramientas de protección</h2>
            <div className="tool-list">
              <Link href="/record" prefetch={false} className="tool-entry">
                <Video className="tool-icon" size={24} aria-hidden="true" />
                <div><h3>Grabar evidencia</h3><p>Captura video o audio y recupera tus clips con una clave privada.</p></div>
                <ArrowRight size={18} className="tool-arrow" aria-hidden="true" />
              </Link>
              <Link href="/defender" prefetch={false} className="tool-entry">
                <Scale className="tool-icon" size={24} aria-hidden="true" />
                <div><h3>Defensor en retén</h3><p>Consulta tus derechos en un procedimiento o un choque sin lesiones.</p></div>
                <ArrowRight size={18} className="tool-arrow" aria-hidden="true" />
              </Link>
              <Link href="/report" prefetch={false} className="tool-entry tool-violet">
                <HeartHandshake className="tool-icon" size={24} aria-hidden="true" />
                <div><h3>Denuncia confidencial · Escudo Violeta</h3><p>Limpia metadatos de fotos, protege tu voz y radica con código único o por WhatsApp.</p></div>
                <ArrowRight size={18} className="tool-arrow" aria-hidden="true" />
              </Link>
              <a href="tel:155" className="tool-entry tool-violet">
                <HeartHandshake className="tool-icon" size={24} aria-hidden="true" />
                <div><h3>Línea 155 · Escudo Violeta</h3><p>Orientación telefónica ante violencias contra las mujeres.</p></div>
                <ArrowRight size={18} className="tool-arrow" aria-hidden="true" />
              </a>
            </div>
          </section>

          <section className="upcoming-tool" aria-labelledby="radar-title">
            <Radar size={20} aria-hidden="true" />
            <div><h2 id="radar-title">Radar barrial</h2><p>Observa 15 segundos de sonido y consulta avisos por comuna.</p><Link href="/community" prefetch={false} className="contact-link">Abrir convivencia barrial <ArrowRight size={16} aria-hidden="true" /></Link></div>
          </section>
        </div>

        <aside className="home-secondary" aria-label="Orientación y contacto">
          <section className="guide-section" aria-labelledby="guide-title">
            <Image src="/assets/alzabot/bot-standard.png" alt="Alza Bot Cívico" width={64} height={64} className="guide-avatar" />
            <h2 id="guide-title">Privacidad en pantalla</h2>
            <p>Activa el ojo de la cabecera para desenfocar datos sensibles. Usa Salir rápido si necesitas abrir Google.</p>
            <div className="location-note"><MapPin size={18} aria-hidden="true" /><p>Tu ubicación se consulta dentro de SOS, cuando la necesites.</p></div>
          </section>
          <section className="contact-section" aria-labelledby="contact-title">
            <MessageCircle size={22} aria-hidden="true" />
            <h2 id="contact-title">Canal de apoyo</h2>
            <p>Contacta al equipo de AlzaVoz por WhatsApp.</p>
            <a href="https://wa.me/573234306794?text=Hola%20AlzaBot%20necesito%20apoyo%20en%20Medellin" target="_blank" rel="noopener noreferrer" className="contact-link">Abrir WhatsApp <ArrowRight size={16} aria-hidden="true" /></a>
            <small>Para una emergencia, usa la línea 123.</small>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
