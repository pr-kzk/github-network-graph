// chrome.i18n.getMessage の薄いラッパ。
//
// 文字列リソースは public/_locales/<locale>/messages.json で管理する。
// このモジュールはキー型を狭めて誤用を防ぎ、placeholder 解決を Chrome の標準
// (https://developer.chrome.com/docs/extensions/reference/api/i18n) に委譲する。
//
// 文言を追加する時は messages.json (en/ja) に同じキーを追加し、ここの MessageKey
// にも追記すること。両ファイルでキー集合が一致している必要がある。

export type MessageKey =
  | 'ext_name'
  | 'ext_description'
  | 'action_default_title'
  | 'popup_header_title'
  | 'popup_header_subtitle'
  | 'popup_open_options'
  | 'popup_launcher_title'
  | 'popup_launcher_description'
  | 'popup_launcher_open_detected'
  | 'popup_launcher_not_on_github'
  | 'popup_launcher_input_placeholder'
  | 'popup_launcher_submit'
  | 'popup_launcher_input_error'
  | 'popup_recent_title'
  | 'popup_recent_aria_label'
  | 'options_title'
  | 'options_saved'
  | 'options_mode_heading'
  | 'options_mode_description'
  | 'options_mode_legend'
  | 'options_mode_network_label'
  | 'options_mode_network_desc'
  | 'options_mode_repo_only_label'
  | 'options_mode_repo_only_desc'
  | 'options_theme_heading'
  | 'options_theme_description'
  | 'options_theme_legend'
  | 'options_theme_dark_label'
  | 'options_theme_dark_desc'
  | 'options_theme_light_label'
  | 'options_theme_light_desc'
  | 'relative_now'
  | 'relative_minutes'
  | 'relative_hours'
  | 'relative_days'
  | 'relative_weeks'
  | 'graph_header_brand'
  | 'graph_mode_repo_only'
  | 'graph_mode_network'
  | 'graph_refresh'
  | 'graph_loading'
  | 'graph_empty_commits'
  | 'graph_repo_prompt_prefix'
  | 'graph_repo_prompt_suffix'
  | 'graph_footer_load_error'
  | 'graph_footer_loading_more'
  | 'graph_footer_will_load_more'
  | 'graph_footer_retry'
  | 'graph_repoform_label'
  | 'graph_repoform_placeholder'
  | 'graph_repoform_submit'
  | 'graph_repoform_error'
  | 'error_auth_heading'
  | 'error_notfound_heading'
  | 'error_network_heading'
  | 'error_empty_heading'
  | 'error_shape_heading'
  | 'error_http_heading'
  | 'error_unknown_heading'
  | 'error_auth_body'
  | 'error_notfound_body'
  | 'error_network_body'
  | 'error_empty_body'
  | 'error_shape_body'
  | 'error_shape_json_body'
  | 'error_http_body'
  | 'error_unknown_body'
  | 'error_commit_notfound_body'
  | 'error_ratelimit_body'
  | 'error_auth_denied_body'
  | 'error_auth_required_body'
  | 'error_target_label'
  | 'error_retry'
  | 'error_signin_link'
  | 'commit_detail_select_prompt'
  | 'commit_detail_no_message'
  | 'commit_detail_action_open_github'
  | 'commit_detail_action_copy_sha'
  | 'commit_detail_action_copy_short_sha'
  | 'commit_detail_action_copy_subject'
  | 'commit_detail_action_jump_parent'
  | 'commit_detail_parents_heading'
  | 'commit_detail_parents_empty'
  | 'commit_detail_children_heading'
  | 'commit_detail_children_empty'
  | 'commit_detail_changes_heading'
  | 'commit_detail_changes_loading'
  | 'commit_detail_changes_no_files'
  | 'commit_detail_changes_files_singular'
  | 'commit_detail_changes_files_truncated'
  | 'commit_detail_changes_truncated_note'
  | 'commit_unknown_author';

// chrome.i18n.getMessage の薄いラッパ。
// - subs は単一文字列 or 文字列配列。messages.json の placeholders に渡る。
// - 戻り値が空文字列 (= キー未定義) の場合:
//     DEV ビルドでは throw して取りこぼしを早期検知。
//     prod ビルドでは fail-safe で key 自身を返す。
// - chrome.i18n が未定義の test 環境 (fixture 未注入時) でも key を返して壊さない。
export function t(key: MessageKey, substitutions?: string | string[]): string {
  const getMessage = (globalThis as { chrome?: { i18n?: { getMessage?: (key: string, subs?: string | string[]) => string } } }).chrome?.i18n?.getMessage;
  if (!getMessage) return key;
  const value = getMessage(key, substitutions);
  if (value === '') {
    if (import.meta.env.DEV) {
      throw new Error(`[i18n] missing message for key: ${key}`);
    }
    return key;
  }
  return value;
}

// 名前付き placeholder を順序対応の subs に変換するシュガー。
//
// 重要: 内部では Object.values(named) を **そのまま** subs として渡す。
// 挿入順 (= 呼び出し側が記述した順) は保たれるが、messages.json の placeholders
// 宣言順 (= $1, $2, ...) と一致している必要がある。
// 順序の責任は呼び出し側にあるため、placeholder が 2 個以上ある key を使う場合は
// messages.json の content ($1, $2) と引数オブジェクトのキー順を必ず確認すること。
export function tWith(key: MessageKey, named: Record<string, string>): string {
  return t(key, Object.values(named));
}
