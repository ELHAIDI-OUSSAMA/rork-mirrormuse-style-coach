type SocialImportEvent =
  | 'import_social_home_cta_tapped'
  | 'import_social_hub_opened'
  | 'import_link_submitted'
  | 'import_link_success'
  | 'import_link_failed'
  | 'import_screenshot_selected'
  | 'import_screenshot_success'
  | 'imported_outfit_saved'
  | 'imported_outfit_build_similar'
  | 'imported_outfit_match_closet';

export function trackSocialImportEvent(event: SocialImportEvent, payload?: Record<string, unknown>) {
  console.log(`[Analytics] ${event}`, payload || {});
}
