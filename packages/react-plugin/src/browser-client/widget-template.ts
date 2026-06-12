/**
 * Widget CSS and HTML template for the Pi Design Mode browser client.
 *
 * Extracted from browser-client.ts for maintainability.
 */

export const WIDGET_CSS = `
  :host { all: initial; }
  .widget { position: fixed; bottom: 16px; right: 16px; width: 340px; background: #1e1e2e; color: #cdd6f4; border: 1px solid #45475a; border-radius: 12px; padding: 12px; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); z-index: 999999; transition: transform 0.2s ease, opacity 0.2s ease; }
  .widget.expanded { width: 520px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .title { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
  .close-btn { background: none; border: none; color: #6c7086; cursor: pointer; padding: 2px 6px; font-size: 16px; border-radius: 4px; line-height: 1; }
  .close-btn:hover { color: #cdd6f4; background: #313244; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #f38ba8; display: inline-block; }
  .dot.connected { background: #a6e3a1; }
  .selections { max-height: 180px; overflow-y: auto; margin-bottom: 8px; }
  .color-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; margin-right: 3px; }
  .selection-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: #313244; border-radius: 6px; margin-bottom: 4px; font-size: 12px; cursor: pointer; transition: background 0.1s; }
  .selection-item:hover { background: #45475a; }
  .selection-item .tag { color: #89b4fa; font-family: monospace; }
  .selection-item .file { color: #a6adc8; flex: 1; margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .selection-item .remove { background: none; border: none; color: #f38ba8; cursor: pointer; padding: 0 4px; font-size: 14px; }
  .selection-item .remove:hover { color: #eba0ac; }
  .input-row { display: flex; gap: 6px; align-items: flex-end; }
  .input-row textarea { flex: 1; background: #313244; border: 1px solid #45475a; border-radius: 6px; padding: 6px 8px; color: #cdd6f4; font-size: 13px; outline: none; resize: none; overflow-y: auto; max-height: 120px; line-height: 1.4; font-family: inherit; }
  .input-row textarea:focus { border-color: #89b4fa; }
  .submit-btn { background: #89b4fa; color: #1e1e2e; border: none; border-radius: 6px; padding: 6px 12px; font-weight: 600; cursor: pointer; font-size: 13px; }
  .submit-btn:hover { background: #b4d0fb; }
  .submit-btn:disabled { background: #45475a; color: #6c7086; cursor: not-allowed; }
  .processing { color: #f9e2af; font-size: 12px; text-align: center; margin-top: 6px; }
  .processing .cancel { background: none; border: none; color: #f9e2af; cursor: pointer; text-decoration: underline; font-size: 12px; padding: 0; margin-left: 4px; }
  .error-banner { background: #45475a; color: #f38ba8; font-size: 12px; padding: 6px 8px; border-radius: 6px; margin-bottom: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
  .hint { color: #6c7086; font-size: 11px; margin-top: 6px; }
  .quick-actions { display: none; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
  .qa-btn { background: #313244; color: #cdd6f4; border: 1px solid #45475a; border-radius: 12px; padding: 2px 10px; font-size: 11px; cursor: pointer; }
  .qa-btn:hover { background: #45475a; border-color: #89b4fa; }
  .qa-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .history-panel { position: absolute; top: 8px; right: calc(100% - 1px); bottom: 8px; width: 200px; background: #1e1e2e; border: 1px solid #45475a; border-right: none; border-radius: 12px 0 0 12px; padding: 8px 0; overflow-y: auto; display: none; flex-direction: column; box-shadow: -4px 4px 16px rgba(0,0,0,0.2); }
  .history-panel-title { padding: 4px 10px 8px; font-size: 11px; color: #6c7086; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .history-item { padding: 6px 10px; font-size: 12px; line-height: 1.4; color: #cdd6f4; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
  .history-item:hover { background: #313244; }
  .history-clear { padding: 8px 10px; font-size: 11px; color: #f38ba8; cursor: pointer; text-align: center; border-top: 1px solid #313244; margin-top: auto; }
  .history-clear:hover { background: #313244; }
`;

export const WIDGET_HTML = `
  <div class="header"><div class="title"><span class="dot"></span> Pi Design Mode</div><button class="close-btn" title="Close design mode">✕</button></div>
  <div class="error-banner" style="display:none">⚠️ <span class="error-msg"></span></div>
  <div class="selections"></div>
  <div class="input-row">
    <textarea rows="1" placeholder="Describe the change..."></textarea>
    <button class="submit-btn">Submit</button>
  </div>
  <div class="quick-actions">
    <button class="qa-btn" data-action="center">Center</button>
    <button class="qa-btn" data-action="fullwidth">Full width</button>
    <button class="qa-btn" data-action="equal-spacing" data-multi="true">Equal spacing</button>
    <button class="qa-btn" data-action="same-size" data-multi="true">Same size</button>
    <button class="qa-btn" data-action="revert">Revert</button>
  </div>
  <div class="hint">Alt+Click elements to select · Enter to submit · Shift+Enter for new line</div>
  <div class="processing" style="display:none">⏳ Processing... <button class="cancel">Cancel</button></div>
  <div class="history-panel"><div class="history-panel-title">History</div></div>
`;
