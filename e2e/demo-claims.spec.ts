import { test, expect } from "@playwright/test";

test("Actualiza el contacto precargado sin atribuir aval ni borrar los contactos guardados", async ({ page }) => {
  await page.goto("/sos");
  await page.evaluate(() => localStorage.setItem("alzavoz_trusted_contacts", JSON.stringify([
    { id: "official-concejal", name: "Despacho Concejal Medellín (AlzaVoz)", phone: "+573234306794", relationship: "Canal Oficial de Apoyo Cívico", isCivicOfficial: true, createdAt: 0 },
    { id: "contact-demo", name: "Contacto de prueba", phone: "+573000000001", relationship: "Amigo(a)", createdAt: 1 },
  ])));
  await page.reload();
  const contacts = page.getByRole("region", { name: "Contactos de Confianza y Red de Apoyo" });
  await expect(contacts).toContainText("Apoyo AlzaVoz");
  await expect(contacts).toContainText("Contacto de prueba");
  await expect(contacts).not.toContainText(/Oficial|Despacho Concejal/);
  await expect(contacts.getByRole("link", { name: "Llamar a Apoyo AlzaVoz" })).toHaveAttribute("href", "tel:+573234306794");
});
