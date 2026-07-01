import type { ChatAction } from "@/lib/intent-schema";
import { CORPORATE_ONLY_MODE } from "@/lib/site-type";

/** Kurumsal site düzenleme asistanında aktif komutlar */
export const ENABLED_CHAT_ACTIONS = [
  "change_color",
  "change_font",
  "change_layout",
  "change_site_title",
  "change_hero_text",
  "update_contact",
  "add_service",
] as const;

/** Geçici olarak pasif bırakılan komutlar (kurumsal akış dışı veya henüz eklenmemiş) */
export const DISABLED_CHAT_ACTIONS = ["add_product"] as const;

export type EnabledChatAction = (typeof ENABLED_CHAT_ACTIONS)[number];
export type DisabledChatAction = (typeof DISABLED_CHAT_ACTIONS)[number];

export function isChatActionEnabled(
  actionType: ChatAction["actionType"],
): boolean {
  if (actionType === "unsupported") {
    return true;
  }

  if (
    CORPORATE_ONLY_MODE &&
    (DISABLED_CHAT_ACTIONS as readonly string[]).includes(actionType)
  ) {
    return false;
  }

  return (ENABLED_CHAT_ACTIONS as readonly string[]).includes(actionType);
}

export function sanitizeChatAction(action: ChatAction): ChatAction {
  if (!isChatActionEnabled(action.actionType)) {
    return {
      actionType: "unsupported",
      target: action.target,
      value: "",
    };
  }

  return action;
}

export function getEnabledChatActionDescription(): string {
  return ENABLED_CHAT_ACTIONS.join(" | ");
}

export function getUnsupportedMessage(): string {
  return [
    "Bu istek şu an desteklenmiyor.",
    'Deneyebilirsiniz: "Hero başlığını X yap", "E-postayı info@firma.com yap", "Danışmanlık hizmeti ekle", "Ana rengi lacivert yap".',
  ].join(" ");
}
