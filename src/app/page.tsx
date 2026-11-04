import Image from "next/image";
import Link from "next/link";
import { ShieldAlert, Scale, HeartHandshake, Radar } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-dvh px-4 py-6 justify-between">
      {/* Cabecera / Status Bar Cívico */}
      <header className="flex items-center justify-between border-b border-gray-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden ring-2 ring-cyan-500/40 bg-gray-900 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Image
              src="/assets/alzabot/bot-standard.png"
              alt="Alza Bot"
              fill
              sizes="44px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              AlzaVoz
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Medellín
              </span>
            </h1>
            <p className="text-xs text-gray-400">Protección & Alza Bot Activo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            100% En Vivo
          </span>
        </div>
      </header>

      {/* Hero Visual Alza Bot */}
      <section className="relative my-4 rounded-2xl overflow-hidden border border-cyan-500/30 bg-gray-900/60 p-4 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
        <div className="relative h-44 w-full rounded-xl overflow-hidden mb-3">
          <Image
            src="/assets/alzabot/bot-standard-scene.jpg"
            alt="Alza Bot Escena"
            fill
            sizes="(max-width: 480px) 100vw, 448px"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent" />
          <div className="absolute bottom-2 left-3 right-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Alza Bot al rescate
            </span>
            <h2 className="text-sm font-bold text-white leading-tight">
              Defensa legal, auxilio SOS y reporte confidencial
            </h2>
          </div>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          Tecnología ciudadana para los 16 barrios y corregimientos de Medellín. Sin registro obligatorio, rápida respuesta y confidencialidad asegurada.
        </p>
      </section>

      {/* 4 Módulos de Reacción Inmediata (Fitts' Law >= 56px) */}
      <section className="grid grid-cols-2 gap-3 my-2" aria-label="Módulos de Emergencia y Acción">
        <Link
          href="#sos"
          className="min-h-[72px] min-w-[56px] flex flex-col items-center justify-center p-3 rounded-xl bg-red-950/40 border border-red-500/40 hover:bg-red-900/50 active:scale-95 transition text-center shadow-[0_0_15px_rgba(239,68,68,0.2)]"
        >
          <ShieldAlert className="w-7 h-7 text-red-400 mb-1" />
          <span className="text-sm font-bold text-white">Botón SOS</span>
          <span className="text-[10px] text-red-300">Policía 123 & GPS</span>
        </Link>

        <Link
          href="#defensa"
          className="min-h-[72px] min-w-[56px] flex flex-col items-center justify-center p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900/50 active:scale-95 transition text-center shadow-[0_0_15px_rgba(245,158,11,0.2)]"
        >
          <Scale className="w-7 h-7 text-amber-400 mb-1" />
          <span className="text-sm font-bold text-white">Defensor Legal</span>
          <span className="text-[10px] text-amber-300">Retenes & Choques</span>
        </Link>

        <Link
          href="#violeta"
          className="min-h-[72px] min-w-[56px] flex flex-col items-center justify-center p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 hover:bg-purple-900/50 active:scale-95 transition text-center shadow-[0_0_15px_rgba(139,92,246,0.2)]"
        >
          <HeartHandshake className="w-7 h-7 text-purple-400 mb-1" />
          <span className="text-sm font-bold text-white">Escudo Violeta</span>
          <span className="text-[10px] text-purple-300">Línea 155 Segura</span>
        </Link>

        <Link
          href="#radar"
          className="min-h-[72px] min-w-[56px] flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/50 active:scale-95 transition text-center shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        >
          <Radar className="w-7 h-7 text-emerald-400 mb-1" />
          <span className="text-sm font-bold text-white">Radar Barrial</span>
          <span className="text-[10px] text-emerald-300">Búsqueda & Ruido</span>
        </Link>
      </section>

      {/* Pie institucional directo */}
      <footer className="mt-4 pt-3 border-t border-gray-800 text-center">
        <p className="text-[11px] text-gray-500">
          Iniciativa cívica en apoyo al Concejo de Medellín • WhatsApp Oficial: +57 3234306794
        </p>
      </footer>
    </div>
  );
}
