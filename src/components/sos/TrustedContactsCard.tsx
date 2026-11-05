"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  Phone,
  MessageCircle,
  Trash2,
  ShieldCheck,
  Check,
  AlertCircle,
} from "lucide-react";
import { type TrustedContact } from "@/types/sos";
import { useAppMode } from "@/context/AppModeContext";

interface TrustedContactsCardProps {
  contacts: TrustedContact[];
  onAddContact: (name: string, phone: string, relationship: string) => boolean;
  onRemoveContact: (id: string) => void;
  getWhatsAppLink: (phone: string) => string;
}

export function TrustedContactsCard({
  contacts,
  onAddContact,
  onRemoveContact,
  getWhatsAppLink,
}: TrustedContactsCardProps) {
  const { triggerHaptic } = useAppMode();
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("Familiar");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(30);

    if (!name.trim()) {
      setFormError("Ingresa el nombre del contacto");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setFormError("El celular debe tener al menos 10 dígitos (ej. 3201234567)");
      return;
    }

    const success = onAddContact(name, phone, relationship);
    if (success) {
      setName("");
      setPhone("");
      setFormError(null);
      setShowAddForm(false);
      triggerHaptic(50);
    } else {
      setFormError("No se pudo agregar el contacto");
    }
  };

  const handleRemove = (id: string) => {
    triggerHaptic(40);
    onRemoveContact(id);
  };

  return (
    <section
      aria-label="Contactos de Confianza y Red de Apoyo"
      className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-red-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">
            Red de Contactos de Confianza
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setShowAddForm(!showAddForm);
          }}
          aria-expanded={showAddForm}
          aria-label="Agregar nuevo contacto de confianza"
          className="touch-target-min min-h-[44px] px-3 flex items-center gap-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold active:scale-95 transition"
        >
          <UserPlus className="w-4 h-4 text-red-400" />
          <span>{showAddForm ? "Cancelar" : "Agregar"}</span>
        </button>
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Guarda tus seres queridos o abogado para alertarlos al instante por llamada o WhatsApp con tu ubicación GPS.
      </p>

      {/* Formulario de Agregar Contacto */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-black/60 rounded-xl p-3 border border-red-500/40 space-y-2.5 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-300">
              Nuevo Contacto de Respaldo
            </span>
            <span className="text-[10px] text-gray-400">Guarda en tu celular</span>
          </div>

          {formError && (
            <div className="bg-red-950/60 border border-red-700 text-red-300 text-xs rounded-lg p-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="contact-name"
              className="block text-[11px] font-semibold text-gray-300 mb-1"
            >
              Nombre Completo
            </label>
            <input
              id="contact-name"
              type="text"
              required
              maxLength={40}
              placeholder="Ej: Mamá, Pareja o Abogado"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="contact-phone"
                className="block text-[11px] font-semibold text-gray-300 mb-1"
              >
                Celular (Colombia)
              </label>
              <input
                id="contact-phone"
                type="tel"
                required
                maxLength={15}
                placeholder="300 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="contact-rel"
                className="block text-[11px] font-semibold text-gray-300 mb-1"
              >
                Parentesco
              </label>
              <select
                id="contact-rel"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="Mamá / Papá">Mamá / Papá</option>
                <option value="Pareja">Pareja</option>
                <option value="Hijo / Hija">Hijo / Hija</option>
                <option value="Hermano(a)">Hermano(a)</option>
                <option value="Abogado(a)">Abogado(a)</option>
                <option value="Amigo(a)">Amigo(a)</option>
                <option value="Vecino(a)">Vecino(a)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="touch-target-min min-h-[48px] w-full mt-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold active:scale-95 transition shadow-md shadow-red-900/40"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Contacto de Confianza</span>
          </button>
        </form>
      )}

      {/* Lista de Contactos */}
      <div className="space-y-2">
        {contacts.map((contact) => {
          const waUrl = getWhatsAppLink(contact.phone);
          return (
            <div
              key={contact.id}
              className={`rounded-xl p-3 border flex items-center justify-between gap-2.5 transition ${
                contact.isCivicOfficial
                  ? "bg-emerald-950/30 border-emerald-700/60"
                  : "bg-gray-950/80 border-gray-800"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-white truncate">
                    {contact.name}
                  </p>
                  {contact.isCivicOfficial && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-600/50">
                      <ShieldCheck className="w-3 h-3 text-emerald-300" />
                      Oficial
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                  <span className="font-mono text-gray-300">{contact.phone}</span>
                  <span>•</span>
                  <span className="truncate">{contact.relationship}</span>
                </div>
              </div>

              {/* Botones de Acción de 1 Toque */}
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`tel:${contact.phone}`}
                  onClick={() => triggerHaptic(40)}
                  aria-label={`Llamar a ${contact.name}`}
                  className="touch-target-min min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 active:scale-95 transition"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                </a>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic(40)}
                  aria-label={`Enviar alerta SOS por WhatsApp a ${contact.name}`}
                  className="touch-target-min min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-600/50 text-white active:scale-95 transition"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-300" />
                </a>

                {!contact.isCivicOfficial && (
                  <button
                    type="button"
                    onClick={() => handleRemove(contact.id)}
                    aria-label={`Eliminar contacto ${contact.name}`}
                    className="touch-target-min min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-gray-900 hover:bg-red-950/60 text-gray-500 hover:text-red-400 active:scale-95 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
