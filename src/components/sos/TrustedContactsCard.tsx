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
      className="space-y-4 border-t border-gray-800 pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-5 w-5 shrink-0 text-gray-400" />
          <h2 className="text-base font-semibold text-white">
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
          className="touch-target-min flex shrink-0 items-center gap-2 rounded-lg bg-gray-800 px-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-700"
        >
          <UserPlus className="w-4 h-4 text-red-400" />
          <span>{showAddForm ? "Cancelar" : "Agregar"}</span>
        </button>
      </div>

      <p className="text-sm leading-relaxed text-gray-400">
        Guarda tus seres queridos o abogado para alertarlos al instante por llamada o WhatsApp con tu ubicación GPS.
      </p>

      {/* Formulario de Agregar Contacto */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-gray-700 bg-gray-900/50 p-4"
        >
          <div className="space-y-1">
            <p className="text-base font-semibold text-white">
              Nuevo Contacto de Respaldo
            </p>
            <p className="text-sm text-gray-400">Guarda en tu celular</p>
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-700 bg-red-950/60 p-3 text-sm text-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="contact-name"
              className="mb-2 block text-sm font-medium text-gray-300"
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
              className="min-h-14 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white placeholder-gray-400 focus:border-red-400 focus:outline-none"
            />
          </div>

          <div className="grid gap-4">
            <div>
              <label
                htmlFor="contact-phone"
                className="mb-2 block text-sm font-medium text-gray-300"
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
                className="min-h-14 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white placeholder-gray-400 focus:border-red-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="contact-rel"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Parentesco
              </label>
              <select
                id="contact-rel"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="min-h-14 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white focus:border-red-400 focus:outline-none"
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
            className="touch-target-min flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Contacto de Confianza</span>
          </button>
        </form>
      )}

      {/* Lista de Contactos */}
      <div className="divide-y divide-gray-800">
        {contacts.map((contact) => {
          const waUrl = getWhatsAppLink(contact.phone);
          return (
            <div
              key={contact.id}
              className="space-y-3 py-4 first:pt-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-base font-semibold text-white">
                    {contact.name}
                  </p>
                  {contact.isCivicOfficial && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-300" />
                      Oficial
                    </span>
                  )}
                </div>

                <div className="mt-1 space-y-1 text-sm leading-relaxed text-gray-400">
                  <p className="font-tabular text-gray-300">{contact.phone}</p>
                  <p>{contact.relationship}</p>
                </div>
              </div>

              {/* Botones de Acción de 1 Toque */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`tel:${contact.phone}`}
                  onClick={() => triggerHaptic(40)}
                  aria-label={`Llamar a ${contact.name}`}
                  className="touch-target-min flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-3 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-700"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Llamar</span>
                </a>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic(40)}
                  aria-label={`Enviar alerta SOS por WhatsApp a ${contact.name}`}
                  className="touch-target-min flex items-center justify-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-900/60"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-300" />
                  <span>WhatsApp</span>
                </a>

                {!contact.isCivicOfficial && (
                  <button
                    type="button"
                    onClick={() => handleRemove(contact.id)}
                    aria-label={`Eliminar contacto ${contact.name}`}
                    className="touch-target-min flex items-center justify-center rounded-lg bg-gray-900 text-gray-400 transition-colors hover:bg-red-950/60 hover:text-red-300"
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

