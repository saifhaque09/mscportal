import en from "@messages/en.json";
import fr from "@messages/fr.json";

export function loadMessages(locale) {
  switch (locale) {
    case "fr":
      return fr;
    default:
      return en;
  }
}
