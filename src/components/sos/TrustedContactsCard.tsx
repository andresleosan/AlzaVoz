"use client";

import { useRef, useState } from "react";
import {
  Users,
  UserPlus,
  Phone,
  MessageCircle,
  Trash2,
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
  const [relationship, setRelationship] = useState<string>("Mamá / Papá");
  const [formError, setFormError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<"name" | "phone" | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");
  const addToggleRef = useRef<HTMLButtonElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  const handleToggleForm = () => {
    triggerHaptic(20);
    setShowAddForm((prev) => {
      const next = !prev;
      setFormError(null);
      setInvalidField(null);
      window.setTimeout(() => {
        if (next) {
          nameInputRef.current?.focus();
        } else {
          addToggleRef.current?.focus();
        }
      }, 0);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(30);

    if (!name.trim()) {
      setFormError("Ingresa el nombre del contacto");
      setInvalidField("name");
      window.setTimeout(() => nameInputRef.current?.focus(), 0);
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setFormError("El celular debe tener al menos 10 dígitos (ej. 3201234567)");
      setInvalidField("phone");
      window.setTimeout(() => phoneInputRef.current?.focus(), 0);
      return;
    }

    const success = onAddContact(name, phone, relationship);
    if (success) {
      setName("");
      setPhone("");
      setFormError(null);
      setInvalidField(null);
      setShowAddForm(false);
      setLiveAnnouncement("Contacto guardado en tu red de confianza.");
      triggerHaptic(50);
      window.setTimeout(() => addToggleRef.current?.focus(), 0);
    } else {
      setFormError("No se pudo agregar el contacto");
      setInvalidField("name");
    }
  };

  const handleRemove = (id: string) => {
    triggerHaptic(40);
    onRemoveContact(id);
    setLiveAnnouncement("Contacto eliminado de tu red de confianza.");
    window.setTimeout(() => addToggleRef.current?.focus(), 0);
  };

  return (
    <section
      aria-label="Contactos de Confianza y Red de Apoyo"
      className="space-y-4 border-t border-gray-800 pt-6"
    >
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="trusted-contacts-live-status"
      >
        {liveAnnouncement}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white">
            Red de Contactos de Confianza
          </h2>
        </div>

        <button
          ref={addToggleRef}
          type="button"
          onClick={handleToggleForm}
          aria-expanded={showAddForm}
          aria-controls="trusted-contact-form"
          aria-label={
            showAddForm
              ? "Cancelar nuevo contacto de confianza"
              : "Agregar nuevo contacto de confianza"
          }
          className="touch-target-min flex shrink-0 items-center gap-2 rounded-lg bg-gray-800 px-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-700"
        >
          <UserPlus className="w-4 h-4 text-red-400" aria-hidden="true" />
          <span>{showAddForm ? "Cancelar" : "Agregar"}</span>
        </button>
      </div>

      <p className="text-sm leading-relaxed text-gray-400">
        Guarda tus contactos para llamarles o preparar un mensaje con la ubicación disponible. Tú confirmas el envío en WhatsApp.
      </p>

      {/* Formulario de Agregar Contacto */}
      {showAddForm && (
        <form
          id="trusted-contact-form"
          noValidate
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
            <div
              id="trusted-contact-form-error"
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-700 bg-red-950/60 p-3 text-sm text-red-200"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
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
              ref={nameInputRef}
              id="contact-name"
              type="text"
              required
              maxLength={40}
              placeholder="Ej: Mamá, Pareja o Abogado"
              value={name}
              aria-invalid={invalidField === "name" || undefined}
              aria-describedby={formError ? "trusted-contact-form-error" : undefined}
              onChange={(e) => {
                setName(e.target.value);
                if (formError) {
                  setFormError(null);
                  setInvalidField(null);
                }
              }}
              className="min-h-14 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white placeholder-gray-400 focus:border-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
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
                ref={phoneInputRef}
                id="contact-phone"
                type="tel"
                required
                maxLength={15}
                placeholder="300 123 4567"
                value={phone}
                aria-invalid={invalidField === "phone" || undefined}
                aria-describedby={formError ? "trusted-contact-form-error" : undefined}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (formError) {
                    setFormError(null);
                    setInvalidField(null);
                  }
                }}
                className="min-h-14 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white placeholder-gray-400 focus:border-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
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
                className="min-h-14 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white focus:border-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
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
            <Check className="w-4 h-4" aria-hidden="true" />
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
                  <Phone className="w-4 h-4 text-emerald-400" aria-hidden="true" />
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
                  <MessageCircle className="w-4 h-4 text-emerald-300" aria-hidden="true" />
                  <span>WhatsApp</span>
                </a>

                {!contact.isAppSupport && (
                  <button
                    type="button"
                    onClick={() => handleRemove(contact.id)}
                    aria-label={`Eliminar contacto ${contact.name}`}
                    className="touch-target-min flex items-center justify-center rounded-lg bg-gray-900 text-gray-400 transition-colors hover:bg-red-950/60 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
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

